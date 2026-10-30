"""
convert_classic_learnsets.py – převede tools/classic_learnsets.json (z
fetch_classic_learnsets.py) na herní learnsety po generacích.

  data/gen1/learnsets.js  LEARNSETS_GEN1 = Kanto: Yellow (fallback Red/Blue), dex 1–151
                          → jen útoky z Gen 1
  data/gen2/learnsets.js  LEARNSETS_GEN2 = Johto: Crystal (fallback Gold/Silver), dex 1–251
                          → útoky z Gen 1 + Gen 2, i pro Gen 1 druhy chycené v Johtu

Který learnset jedinec používá, řídí region chycení (data/learnsets.js getLearnset).
Id druhů se berou z data/gen1|gen2/pokemon.js (podle dexNo). Každý útok musí
existovat v data/moves.js – chybějící skript vypíše a skončí s chybou.

Použití:  python tools/convert_classic_learnsets.py
"""

import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC = os.path.join(ROOT, "tools", "classic_learnsets.json")


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def species_ids():
    """dexNo → id druhu ze hry (gen1 + gen2 pokemon.js)."""
    out = {}
    for rel in ("data/gen1/pokemon.js", "data/gen2/pokemon.js"):
        for sid, dex in re.findall(r'id: "([^"]+)",\s*\n\s*dexNo: (\d+),', read(rel)):
            out[int(dex)] = sid
    return out


def pick(sets, order):
    """První neprázdný learnset podle pořadí verzí."""
    for vg in order:
        if sets.get(vg):
            return vg, sets[vg]
    return None, []


def render(const, header, entries):
    lines = [header, f"export const {const} = {{"]
    for sid, moves in entries:
        key = sid if re.fullmatch(r"[a-z_$][a-z0-9_$]*", sid) else f'"{sid}"'
        lines.append(f"  {key}: [")
        for level, move in moves:
            lines.append(f'    {{ level: {level}, move: "{move}" }},')
        lines.append("  ],")
    lines.append("};")
    return "\n".join(lines) + "\n"


def main():
    data = json.load(open(SRC, encoding="utf-8"))
    ids = species_ids()
    known_moves = set(re.findall(r'\{ id: "([^"]+)"', read("data/moves.js")))

    gen1, gen2, missing, sources = [], [], set(), {}
    for dex in range(1, 252):
        sid = ids.get(dex)
        sets = data["species"][str(dex)]["learnsets"]
        if not sid:
            sys.exit(f"Druh s dexNo {dex} není v data/gen*/pokemon.js")
        if dex <= 151:
            vg, moves = pick(sets, ["yellow", "red-blue"])
            gen1.append((sid, moves))
            sources[vg] = sources.get(vg, 0) + 1
        vg, moves = pick(sets, ["crystal", "gold-silver"])
        gen2.append((sid, moves))
        sources[vg] = sources.get(vg, 0) + 1
        missing |= {m for _, m in moves} - known_moves
    if missing:
        sys.exit(f"Tyto útoky chybí v data/moves.js: {sorted(missing)}")

    h1 = """/**
 * DATA: level-up learnsety KANTA (generace 1) – podle Pokémon Yellow (fallback Red/Blue).
 * Jen útoky z Gen 1. Používá je jedinec chycený v Kantu (viz ../learnsets.js getLearnset).
 * Generováno: tools/fetch_classic_learnsets.py → tools/convert_classic_learnsets.py.
 * Ručně needitovat – přegenerovat.
 */
"""
    h2 = """/**
 * DATA: level-up learnsety JOHTA (generace 2) – podle Pokémon Crystal (fallback Gold/Silver).
 * Útoky z Gen 1 + Gen 2, pro VŠECH 251 druhů: i Gen 1 druh chycený v Johtu (Zubat,
 * Onix, Dratini…) se učí podle Crystalu. Viz ../learnsets.js getLearnset.
 * Generováno: tools/fetch_classic_learnsets.py → tools/convert_classic_learnsets.py.
 * Ručně needitovat – přegenerovat.
 */
"""
    for rel, text in (("data/gen1/learnsets.js", render("LEARNSETS_GEN1", h1, gen1)),
                      ("data/gen2/learnsets.js", render("LEARNSETS_GEN2", h2, gen2))):
        with open(os.path.join(ROOT, rel), "w", encoding="utf-8", newline="") as f:
            f.write(text)
    print(f"OK – Kanto {len(gen1)} druhů, Johto {len(gen2)} druhů; zdroje: {sources}")


if __name__ == "__main__":
    main()
