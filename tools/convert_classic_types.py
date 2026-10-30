"""
convert_classic_types.py – převede tools/classic_types.json (z fetch_classic_types.py)
na typy po generacích:

  data/gen1/types.js  TYPES_GEN1 = Kanto (Gen 1): tabulka účinnosti Gen 1 (15 typů),
                      typy Pokémonů a útoků, jak byly v Red/Blue/Yellow
  data/gen2/types.js  TYPES_GEN2 = Johto (Gen 2): tabulka Gen 2 (17 typů, bez Fairy),
                      typy jako v Gold/Silver/Crystal
  data/moveGens.js    MOVES_GEN1 / MOVES_GEN2 = útoky, které v dané generaci přibyly
                      (Metronome v souboji vybírá jen útoky z generace regionu)

Do `species` a `moves` se zapíšou jen ODCHYLKY od současných dat (data/gen*/pokemon.js,
data/moves.js). Útok bez typu (Curse v Gen 2 = „???") má hodnotu null.

Použití:  python tools/convert_classic_types.py
"""

import json
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC = os.path.join(ROOT, "tools", "classic_types.json")
TARGET_VG = {1: "yellow", 2: "crystal"}  # podle čeho se berou hodnoty útoků
# Typy, které v dané generaci existují (pořadí jako v současné tabulce data/types.js).
# Útoky z data/moves.js, které v classic_types.json zatím nejsou (přidané po stažení).
EXTRA_MOVE_GEN = {"attract": 2}
ORDER = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
         "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"]


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def cap(t):
    return t[:1].upper() + t[1:]


def gen_index(name, gens):
    return gens.index(name) + 1  # "generation-i" → 1


def current_species_types():
    """{id: [Typ, …]} ze současných dat."""
    out = {}
    for rel in ("data/gen1/pokemon.js", "data/gen2/pokemon.js"):
        for sid, types in re.findall(r'id: "([^"]+)",[^}]*?types: \[([^\]]*)\]', read(rel), re.S):
            out[sid] = re.findall(r'"([^"]+)"', types)
    return out


def current_move_types():
    return dict(re.findall(r'\{ id: "([^"]+)",[^}\n]*?type: "([^"]+)"', read("data/moves.js")))


def species_ids():
    out = {}
    for rel in ("data/gen1/pokemon.js", "data/gen2/pokemon.js"):
        for sid, dex in re.findall(r'id: "([^"]+)",\s*\n\s*dexNo: (\d+),', read(rel)):
            out[int(dex)] = sid
    return out


def types_in_gen(sp, g, gens):
    """Typy druhu v generaci g: nejbližší past_types s generací ≥ g, jinak současné."""
    past = sorted(sp["past_types"], key=lambda p: gen_index(p["generation"], gens))
    for p in past:
        if gen_index(p["generation"], gens) >= g:
            return p["types"]
    return sp["types"]


def move_type_in_vg(mv, vg, vg_order):
    """Typ útoku ve version group vg: první past_values s VG po vg (a s typem), jinak současný."""
    at = vg_order.index(vg)
    past = sorted(mv["past_values"], key=lambda p: vg_order.index(p["version_group"]))
    for p in past:
        if vg_order.index(p["version_group"]) > at and p["type"]:
            return p["type"]
    return mv["type"]


def chart_in_gen(types, g, gens):
    """{Útočící: {Bránící: násobek}} pro generaci g (jen typy, které v ní existují)."""
    exist = [t for t in ORDER if t in types and gen_index(types[t]["generation"], gens) <= g]
    chart = {}
    for t in exist:
        past = sorted(types[t]["past_damage_relations"], key=lambda p: gen_index(p["generation"], gens))
        rel = next((p["damage_relations"] for p in past if gen_index(p["generation"], gens) >= g),
                   types[t]["damage_relations"])
        row = {}
        for key, mult in (("double_damage_to", 2), ("half_damage_to", 0.5), ("no_damage_to", 0)):
            for d in rel.get(key, []):
                if d in exist:
                    row[cap(d)] = mult
        chart[cap(t)] = {k: row[k] for k in sorted(row, key=lambda x: ORDER.index(x.lower()))}
    return chart


def js_value(v):
    if v is None:
        return "null"
    if isinstance(v, str):
        return f'"{v}"'
    if isinstance(v, (int, float)):
        return str(int(v)) if float(v).is_integer() else str(v)
    if isinstance(v, list):
        return "[" + ", ".join(js_value(x) for x in v) + "]"
    raise TypeError(v)


def js_key(k):
    return k if re.fullmatch(r"[A-Za-z_$][\w$]*", k) else f'"{k}"'


def render(gen, region, chart, species, moves, games):
    lines = [
        "/**",
        f" * DATA: typy {region.upper()} (generace {gen}) – jak byly v {games}.",
        " * chart   = tabulka účinnosti (útočící → { bránící: násobek }, jen odchylky od 1);",
        f" *           obsahuje jen typy, které v generaci {gen} existují.",
        " * species = typy Pokémonů, které se v této generaci LIŠÍ od data/genN/pokemon.js.",
        " * moves   = typy útoků, které se LIŠÍ od data/moves.js (null = útok bez typu „???\").",
        f" * Používá je jedinec chycený v {region.capitalize()} a souboj v {region.capitalize()} (viz ../types.js).",
        " * Generováno: tools/fetch_classic_types.py → tools/convert_classic_types.py. Ručně needitovat.",
        " */",
        f"export const TYPES_GEN{gen} = {{",
        "  chart: {",
    ]
    for atk, row in chart.items():
        inner = ", ".join(f"{d}: {js_value(m)}" for d, m in row.items())
        lines.append(f"    {atk}: {{ {inner} }},")
    lines.append("  },")
    lines.append("  species: {")
    for sid, types in species.items():
        lines.append(f"    {js_key(sid)}: {js_value(types)},")
    lines.append("  },")
    lines.append("  moves: {")
    for mid, t in moves.items():
        lines.append(f"    {js_key(mid)}: {js_value(t)},")
    lines.append("  },")
    lines.append("};")
    return "\n".join(lines) + "\n"


def main():
    d = json.load(open(SRC, encoding="utf-8"))
    gens, vg_order = d["generation_order"], d["version_group_order"]
    ids, cur_sp, cur_mv = species_ids(), current_species_types(), current_move_types()

    for gen, region, last_dex, games in ((1, "kanto", 151, "Red/Blue/Yellow"),
                                         (2, "johto", 251, "Gold/Silver/Crystal")):
        chart = chart_in_gen(d["types"], gen, gens)
        species = {}
        for dex in range(1, last_dex + 1):
            sid = ids[dex]
            t = [cap(x) for x in types_in_gen(d["species"][str(dex)], gen, gens)]
            if t != cur_sp.get(sid):
                species[sid] = t
        moves = {}
        for mid, mv in sorted(d["moves"].items()):
            t = move_type_in_vg(mv, TARGET_VG[gen], vg_order)
            t = None if t in ("unknown", "shadow") else cap(t)
            if t != cur_mv.get(mid):
                moves[mid] = t
        path = os.path.join(ROOT, "data", f"gen{gen}", "types.js")
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(render(gen, region, chart, species, moves, games))
        print(f"Gen {gen}: {len(chart)} typů, {len(species)} druhů s jiným typem, {len(moves)} útoků s jiným typem")
    write_move_gens(d, gens)


def write_move_gens(d, gens):
    """data/moveGens.js – seznamy útoků z Gen 1 a Gen 2 (jen ty, co jsou v data/moves.js)."""
    known = set(re.findall(r'\{ id: "([^"]+)"', read("data/moves.js")))
    by_gen = {1: [], 2: []}
    for mid in sorted(known):
        g = EXTRA_MOVE_GEN.get(mid) or (gen_index(d["moves"][mid]["generation"], gens) if mid in d["moves"] else None)
        if g is None:
            print(f"  ! {mid}: generace neznámá – doplň do EXTRA_MOVE_GEN")
        elif g in by_gen:
            by_gen[g].append(mid)
    lines = [
        "/**",
        " * DATA: útoky podle generace, ve které přibyly (jen útoky z data/moves.js).",
        " * Útok, který tu není, je z Gen 3+. Používá Metronome (vybírá jen útoky z generace regionu).",
        " * Generováno: tools/fetch_classic_types.py → tools/convert_classic_types.py. Ručně needitovat.",
        " */",
    ]
    for g, ids in by_gen.items():
        lines.append(f"export const MOVES_GEN{g} = [")
        for i in range(0, len(ids), 6):
            lines.append("  " + ", ".join(f'"{x}"' for x in ids[i:i + 6]) + ",")
        lines.append("];")
    with open(os.path.join(ROOT, "data", "moveGens.js"), "w", encoding="utf-8", newline="") as f:
        f.write("\n".join(lines) + "\n")
    print(f"Útoky: Gen 1 {len(by_gen[1])}, Gen 2 {len(by_gen[2])}")


if __name__ == "__main__":
    main()
