"""
gen_species.py – KOMPLETNÍ gen-aware generátor obsahu jedné generace z PokeAPI.

Vygeneruje pro zadaný rozsah Pokédexu (např. gen 2 = 152–251) do složky
data/gen<N>/:
  • pokemon.js   (SPECIES_GEN<N>): id, dexNo, name, gen, types, baseStats,
                 genderRatio, eggGroups, rarity, evolvesTo/evolutionLevel
                 (level-up) NEBO evolutions[] (item/trade/happiness/den-noc),
                 height, weight, genus, dexEntry.
  • learnsets.js (LEARNSETS_GEN<N>): JEN s přepínačem --learnsets. Od v1.65.0 learnsety
                 generuje tools/convert_classic_learnsets.py (Kanto Yellow, Johto Crystal
                 pro všech 251) – tenhle nástroj by gen2 learnsety zúžil na 152–251.
  • evYields.js  (EV_YIELDS_GEN<N>)

Navíc:
  • MERGE nových tahů do sdíleného data/moves.js (ADITIVNĚ – existující tahy
    i jejich ruční `effect`/`ailment` se ZACHOVAJÍ; přidají se jen chybějící).
  • Doplní gen<N> druhy do data/tmCompat.js a data/hmCompat.js (z „machine" metody).

EVOLUČNÍ PRAVIDLA (dle zadání – engine viz src/systems/evolutionSystem.js):
  • level-up + min_level        → evolvesTo + evolutionLevel (top-level)
  • level-up + min_happiness    → evolutions[{ method:"happiness" }]
        (+ time_of_day "day"/"night" → "happiness-day"/"happiness-night")
  • use-item                    → evolutions[{ method:"item", item:<id> }]
  • trade (S ITEMEM I BEZ)      → evolutions[{ method:"trade" }]  (řeší Linking Cord)
    (Trade s drženým předmětem se ZÁMĚRNĚ NErozlišuje – trade = jen Linking Cord.)

CROSS-GEN hrany (rodič z NIŽŠÍ generace → dítě v této generaci, např. Onix→Steelix)
NELZE zapsat do gen<N>/pokemon.js (rodič patří jinam) → vypíšou se na konci jako
PATCH k ručnímu doplnění do data/gen<rodič>/pokemon.js.

Použití:
  python tools/gen_species.py --gen 2 --range 152-251            # zapíše *.new
  python tools/gen_species.py --gen 2 --range 152-251 --write     # přepíše ostrá data
  python tools/gen_species.py --gen 2 --range 152-154 --write     # jen část (test)

Jen Python stdlib (urllib). curl/jq/node zde nejsou.
"""

import json
import os
import re
import sys
import time
import urllib.request

# Windows konzole (cp1250) neumí emoji/některé znaky – vynuť UTF-8 výstup.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

HERE = os.path.dirname(__file__)
DATA = os.path.join(HERE, "..", "data")
MOVES_JS = os.path.join(DATA, "moves.js")
TMCOMPAT_JS = os.path.join(DATA, "tmCompat.js")
HMCOMPAT_JS = os.path.join(DATA, "hmCompat.js")
API = "https://pokeapi.co/api/v2"

# Version-group priorita PODLE GENERACE: nejdřív hry té generace (éra-věrné
# movesety), pak novější jako fallback. Přidání gen 3+ = doplnit řádek.
VG_PRIORITY_BY_GEN = {
    2: ["crystal", "gold-silver", "heartgold-soulsilver",
        "black-2-white-2", "black-white", "platinum", "diamond-pearl"],
}
VG_FALLBACK = [
    "scarlet-violet", "sword-shield", "ultra-sun-ultra-moon", "sun-moon",
    "omega-ruby-alpha-sapphire", "x-y", "black-2-white-2", "black-white",
    "heartgold-soulsilver", "platinum", "diamond-pearl", "firered-leafgreen",
    "emerald", "ruby-sapphire", "crystal", "gold-silver", "yellow", "red-blue",
]

# Flavor-text verze: nejdřív gen 2 hry (éra-věrný dex text), pak novější.
FT_PRIORITY = [
    "crystal", "gold", "silver", "heartgold", "soulsilver",
    "scarlet", "violet", "sword", "shield", "ultra-sun", "ultra-moon",
    "sun", "moon", "x", "y", "black-2", "white-2", "black", "white",
    "platinum", "diamond", "pearl", "firered", "leafgreen", "emerald",
    "ruby", "sapphire", "yellow", "red", "blue",
]

# PokeAPI egg group slug → náš slovník (viz data/gen1/pokemon.js).
EGG_GROUP_MAP = {
    "water1": "water-1", "water2": "water-2", "water3": "water-3",
    "ground": "field", "plant": "grass", "humanshape": "human-like",
    "indeterminate": "amorphous",
}

# PokeAPI stat name → náš klíč (baseStats / EV).
STAT_MAP = {
    "hp": "hp", "attack": "attack", "defense": "defense",
    "special-attack": "spAttack", "special-defense": "spDefense", "speed": "speed",
}

# PokeAPI evoluční item slug → naše item id (data/items.js).
EVO_ITEM_MAP = {
    "fire-stone": "fire-stone", "water-stone": "water-stone",
    "thunder-stone": "thunder-stone", "leaf-stone": "leaf-stone",
    "moon-stone": "moon-stone", "sun-stone": "sun-stone",
}

# Přímé ailmenty, které engine řeší přes pole `ailment` (ne effect).
DIRECT_AILMENTS = {"paralysis", "burn", "poison"}


def fetch(url, _cache={}):
    if url in _cache:
        return _cache[url]
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(4):
        try:
            data = json.load(urllib.request.urlopen(req, timeout=45))
            _cache[url] = data
            return data
        except Exception:
            if attempt == 3:
                raise
            time.sleep(1.2)


def cap_type(t):
    return t[:1].upper() + t[1:]


def js_str(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def clean_text(t):
    t = t.replace("­\n", "").replace("­", "")
    t = t.replace("\f", " ").replace("\r", " ").replace("\n", " ")
    return re.sub(r"\s+", " ", t).strip()


def header_before(path, marker):
    src = open(path, encoding="utf-8").read()
    i = src.index(marker)
    return src[:i]


def footer_after(path, open_marker, close_char):
    lines = open(path, encoding="utf-8").read().splitlines(keepends=True)
    start = next(i for i, l in enumerate(lines) if open_marker in l)
    for i in range(start + 1, len(lines)):
        if lines[i].rstrip("\n") == close_char:
            return "".join(lines[i + 1:])
    return ""


# ─────────────────────────────────────────────────────────────────────────────
# Core species fields
# ─────────────────────────────────────────────────────────────────────────────
def rarity_for(species_json):
    if species_json.get("is_legendary") or species_json.get("is_mythical"):
        return "legendary"
    cr = species_json.get("capture_rate", 255)
    if cr <= 45:
        return "epic"
    if cr <= 75:
        return "rare"
    if cr <= 150:
        return "uncommon"
    return "common"


def gender_ratio(species_json):
    rate = species_json.get("gender_rate", -1)
    if rate == -1:
        return '"genderless"'
    f = rate / 8
    m = round(1 - f, 3)
    f = round(f, 3)
    return f"{{ m: {fmt_num(m)}, f: {fmt_num(f)} }}"


def fmt_num(x):
    if x == int(x):
        return str(int(x))
    return ("%g" % x)


def egg_groups(species_json):
    out = []
    for g in species_json.get("egg_groups", []):
        n = g["name"]
        out.append(EGG_GROUP_MAP.get(n, n))
    return out


def en_genus(species_json):
    for g in species_json.get("genera", []):
        if g["language"]["name"] == "en":
            return g["genus"]
    return ""


def en_flavor(species_json):
    entries = {}
    for e in species_json.get("flavor_text_entries", []):
        if e["language"]["name"] != "en":
            continue
        entries.setdefault(e["version"]["name"], e["flavor_text"])
    for ver in FT_PRIORITY:
        if ver in entries:
            return clean_text(entries[ver])
    for _, txt in entries.items():
        return clean_text(txt)
    return ""


# ─────────────────────────────────────────────────────────────────────────────
# Evolution chain → náš model
# ─────────────────────────────────────────────────────────────────────────────
def slug_dex_map(names):
    """slug → dexNo pro rychlé rozhodnutí gen (cross-gen hrany)."""
    return names


def parse_evolution(child_details):
    """Z evolution_details[0] dítěte vrátí popis, JAK se rodič vyvine na dítě.
    Vrací dict: {kind:"level", level:N} | {kind:"item", item:id}
                | {kind:"trade"} | {kind:"happiness", when:None|"day"|"night"}
                | None (nepodporováno)."""
    if not child_details:
        return None
    d = child_details[0]
    trig = (d.get("trigger") or {}).get("name")
    if trig == "trade":
        return {"kind": "trade"}
    if trig == "use-item":
        item = (d.get("item") or {}).get("name")
        mapped = EVO_ITEM_MAP.get(item)
        if mapped:
            return {"kind": "item", "item": mapped}
        # neznámý kámen → fallback trade (Linking Cord), ať druh jde získat
        return {"kind": "trade"}
    if trig == "level-up":
        if d.get("min_happiness") is not None:
            tod = d.get("time_of_day") or ""
            when = tod if tod in ("day", "night") else None
            return {"kind": "happiness", "when": when}
        if d.get("min_level") is not None:
            return {"kind": "level", "level": d["min_level"]}
        # level-up s jinou podmínkou (držený item / tah / lokace) – pro Johto
        # se prakticky nevyskytuje; fallback: bez levelu nelze → None
        return None
    return None


def species_dex_from_url(url):
    m = re.search(r"/pokemon-species/(\d+)/?$", url)
    return int(m.group(1)) if m else 0


def walk_chain(node, out_edges):
    """Naplní out_edges seznamem (parent_slug, child_slug, evo_desc, child_dex)."""
    parent = node["species"]["name"]
    for child in node.get("evolves_to", []):
        desc = parse_evolution(child.get("evolution_details"))
        cdex = species_dex_from_url(child["species"]["url"])
        out_edges.append((parent, child["species"]["name"], desc, cdex))
        walk_chain(child, out_edges)


# ─────────────────────────────────────────────────────────────────────────────
# Learnsets / moves
# ─────────────────────────────────────────────────────────────────────────────
def choose_levelup(pokemon_json, prio):
    by_vg = {}
    for m in pokemon_json["moves"]:
        name = m["move"]["name"]
        for v in m["version_group_details"]:
            if v["move_learn_method"]["name"] != "level-up":
                continue
            vg = v["version_group"]["name"]
            by_vg.setdefault(vg, []).append((v["level_learned_at"], name))
    for vg in prio:
        if by_vg.get(vg):
            return vg, sorted(set(by_vg[vg]))
    for vg, entries in by_vg.items():
        return vg, sorted(set(entries))
    return None, []


def machine_moves(pokemon_json, prio):
    """Množina move id, které se druh učí metodou 'machine' (TM/HM) v první VG dle priority."""
    by_vg = {}
    for m in pokemon_json["moves"]:
        name = m["move"]["name"]
        for v in m["version_group_details"]:
            if v["move_learn_method"]["name"] != "machine":
                continue
            by_vg.setdefault(v["version_group"]["name"], set()).add(name)
    for vg in prio:
        if by_vg.get(vg):
            return by_vg[vg]
    for vg, s in by_vg.items():
        return s
    return set()


def parse_existing_moves(path):
    src = open(path, encoding="utf-8").read()
    out = {}
    for line in src.splitlines():
        m = re.search(r'id:\s*"([a-z0-9-]+)"', line)
        if not m:
            continue
        mid = m.group(1)
        rec = {"line": line}
        out[mid] = rec
    return out


def derive_effect_and_ailment(move_json):
    meta = move_json.get("meta") or {}
    ail = (meta.get("ailment") or {}).get("name")
    ac = meta.get("ailment_chance") or 0
    if ail in DIRECT_AILMENTS:
        return {"ailment": ail, "ailmentChance": ac if ac else 100}
    if ail == "sleep":
        return {"effect": {"kind": "sleep"}}
    if ail == "freeze":
        return {"ailment": "freeze", "ailmentChance": ac if ac else 100}
    if ail == "confusion":
        e = {"kind": "confuse"}
        if ac:
            e["chance"] = ac
        return {"effect": e}
    if meta.get("flinch_chance"):
        return {"effect": {"kind": "flinch", "chance": meta["flinch_chance"]}}
    drain = meta.get("drain") or 0
    if drain > 0:
        return {"effect": {"kind": "drain", "frac": round(drain / 100, 2)}}
    if drain < 0:
        return {"effect": {"kind": "recoil", "frac": round(-drain / 100, 2)}}
    if meta.get("healing"):
        return {"effect": {"kind": "heal", "frac": round(meta["healing"] / 100, 2)}}
    sc = move_json.get("stat_changes") or []
    if len(sc) == 1 and sc[0]["stat"]["name"] in STAT_MAP:
        change = sc[0]["change"]
        e = {"kind": "statChange", "target": "self" if change > 0 else "enemy",
             "stat": STAT_MAP[sc[0]["stat"]["name"]], "stages": change}
        if ac and ac < 100:
            e["chance"] = ac
        return {"effect": e}
    return {}


def js_effect(obj):
    order = ["kind", "target", "stat", "stages", "chance", "frac", "weather"]
    parts = []
    for k in order:
        if k in obj:
            v = obj[k]
            parts.append(f'{k}: "{v}"' if isinstance(v, str) else f"{k}: {v}")
    return "{ " + ", ".join(parts) + " }"


def en_move_name(mj):
    for n in mj.get("names", []):
        if n["language"]["name"] == "en":
            return n["name"]
    return "-".join(w.capitalize() for w in mj["name"].split("-"))


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
def main():
    args = sys.argv[1:]
    write = "--write" in args
    gen = int(args[args.index("--gen") + 1]) if "--gen" in args else 2
    rng = args[args.index("--range") + 1] if "--range" in args else "152-251"
    lo, hi = (int(x) for x in rng.split("-"))
    prio = VG_PRIORITY_BY_GEN.get(gen, []) + VG_FALLBACK

    gendir = os.path.join(DATA, f"gen{gen}")
    POKE_OUT = os.path.join(gendir, "pokemon.js")
    LEARN_OUT = os.path.join(gendir, "learnsets.js")
    EV_OUT = os.path.join(gendir, "evYields.js")

    dexnums = list(range(lo, hi + 1))
    print(f"Gen {gen}: druhů {len(dexnums)} (#{lo}–#{hi}), VG priorita: {prio[:3]}…")

    species = []       # seřazené záznamy pro pokemon.js
    learnsets = {}     # slug -> [(level, move)]
    evyields = {}      # slug -> {stat:val}
    used_moves = set()
    tm_compat_add = {}  # slug -> set(machine move ids) (přeloží se na čísla později)
    slug_by_dex = {}
    dex_by_slug = {}
    chain_cache = {}
    child_edge = {}     # child_slug -> (parent_slug, desc)  (pro sestavení evoluce)

    # 1) Základní data + learnsety + EV + evoluční hrany.
    for dex in dexnums:
        try:
            pj = fetch(f"{API}/pokemon/{dex}/")
            sj = fetch(f"{API}/pokemon-species/{dex}/")
        except Exception as e:
            print(f"  ERR #{dex}: {e}")
            continue
        slug = pj["name"]
        slug_by_dex[dex] = slug
        dex_by_slug[slug] = dex

        stats = {STAT_MAP[s["stat"]["name"]]: s["base_stat"] for s in pj["stats"]}
        evs = {STAT_MAP[s["stat"]["name"]]: s["effort"]
               for s in pj["stats"] if s["effort"]}
        types = [cap_type(t["type"]["name"]) for t in
                 sorted(pj["types"], key=lambda t: t["slot"])]

        species.append({
            "id": slug, "dexNo": dex, "name": sj_name(sj, slug),
            "gen": gen, "types": types, "baseStats": stats,
            "genderRatio": gender_ratio(sj), "eggGroups": egg_groups(sj),
            "rarity": rarity_for(sj), "height": round(pj["height"] / 10, 1),
            "weight": round(pj["weight"] / 10, 1), "genus": en_genus(sj),
            "dexEntry": en_flavor(sj),
        })
        evyields[slug] = evs

        vg, entries = choose_levelup(pj, prio)
        learnsets[slug] = entries
        for _, name in entries:
            used_moves.add(name)
        tm_compat_add[slug] = machine_moves(pj, prio)

        # evoluční řetěz (cache dle url)
        chain_url = sj["evolution_chain"]["url"]
        if chain_url not in chain_cache:
            chain_cache[chain_url] = fetch(chain_url)
        edges = []
        walk_chain(chain_cache[chain_url]["chain"], edges)
        for parent, child, desc, cdex in edges:
            child_edge[child] = (parent, desc, cdex)

        print(f"  {slug:14s} #{dex:<4d} {'/'.join(types):14s} lvl-up={len(entries):2d} VG={vg}")
        time.sleep(0.02)

    # 2) Doplnění evolucí do species záznamů + cross-gen patch list.
    cross_gen = []  # (parent_slug, child_slug, desc)
    evo_by_parent = {}  # parent_slug -> list of (child_slug, desc, child_dex)
    for child, (parent, desc, cdex) in child_edge.items():
        # Emituj JEN evoluce na druhy v rozsahu této hry (gen1..gen<N>, tj. dexNo <= hi).
        # Zahodí dangling evoluce na pozdější generace (togekiss, honchkrow, porygon-z…).
        if cdex > hi:
            continue
        evo_by_parent.setdefault(parent, []).append((child, desc, cdex))

    sp_by_slug = {s["id"]: s for s in species}
    for parent, kids in evo_by_parent.items():
        if parent in sp_by_slug:
            attach_evolutions(sp_by_slug[parent], [(c, d) for c, d, _ in kids])
        else:
            # rodič není v této generaci (nižší gen) → patch pro ruční doplnění,
            # ale jen pokud aspoň jedno dítě je v této generaci
            for child, desc, _ in kids:
                if child in sp_by_slug:
                    cross_gen.append((parent, child, desc))

    # 3) Serializace pokemon.js
    poke_txt = serialize_species(POKE_OUT, gen, species)
    # 4) Serializace learnsets.js / evYields.js
    learn_txt = serialize_learnsets(LEARN_OUT, gen, species, learnsets)
    ev_txt = serialize_evyields(EV_OUT, gen, species, evyields)

    # 5) MERGE nových tahů do moves.js (aditivně)
    moves_txt, added = merge_moves(used_moves, prio)

    # 6) TM/HM compat pro gen<N> druhy
    tm_txt, hm_txt = merge_compat(tm_compat_add, species)

    # Zápis
    def out(path, txt):
        p = path if write else path + ".new"
        open(p, "w", encoding="utf-8", newline="\n").write(txt)
        print(f"  zapsáno: {os.path.relpath(p, os.path.join(HERE,'..'))}")

    print("\nVÝSTUP:")
    out(POKE_OUT, poke_txt)
    if "--learnsets" in args:
        out(LEARN_OUT, learn_txt)
    else:
        print("  learnsets.js přeskočen (generuje tools/convert_classic_learnsets.py; vynutit --learnsets)")
    out(EV_OUT, ev_txt)
    out(MOVES_JS, moves_txt)
    print(f"    (+{added} nových tahů do moves.js)")
    out(TMCOMPAT_JS, tm_txt)
    out(HMCOMPAT_JS, hm_txt)

    if cross_gen:
        report = os.path.join(HERE, "cross_gen_edges.txt")
        with open(report, "w", encoding="utf-8", newline="\n") as fh:
            fh.write("CROSS-GEN evolucni hrany (rodic z nizsi generace) – rucne "
                     "doplnit do data/gen<rodic>/pokemon.js:\n\n")
            for parent, child, desc in cross_gen:
                fh.write(f"  {parent:12s} -> {child:12s}  {desc}\n")
        print(f"\n[!] CROSS-GEN evolucni hrany ({len(cross_gen)}) zapsany do "
              f"{os.path.relpath(report, os.path.join(HERE, '..'))}")

    if not write:
        print("\n(Ověř .new soubory; pak spusť s --write.)")


def sj_name(sj, slug):
    for n in sj.get("names", []):
        if n["language"]["name"] == "en":
            return n["name"]
    return "-".join(w.capitalize() for w in slug.split("-"))


def attach_evolutions(sp, kids):
    """Zapíše evoluce do species záznamu. Jedna level-up větev → top-level
    evolvesTo/evolutionLevel; ostatní (item/trade/happiness) → evolutions[]."""
    level_kids = [(c, d) for c, d in kids if d and d["kind"] == "level"]
    other_kids = [(c, d) for c, d in kids if d and d["kind"] != "level"]
    # top-level level-up (bereme první; víc level větví je vzácné)
    if level_kids:
        c, d = level_kids[0]
        sp["evolvesTo"] = c
        sp["evolutionLevel"] = d["level"]
    if other_kids:
        evos = []
        for c, d in other_kids:
            if d["kind"] == "item":
                evos.append(f'{{ toId: "{c}", method: "item", item: "{d["item"]}" }}')
            elif d["kind"] == "trade":
                evos.append(f'{{ toId: "{c}", method: "trade" }}')
            elif d["kind"] == "happiness":
                m = "happiness"
                if d.get("when") == "day":
                    m = "happiness-day"
                elif d.get("when") == "night":
                    m = "happiness-night"
                evos.append(f'{{ toId: "{c}", method: "{m}" }}')
        sp["evolutions"] = evos


def serialize_species(path, gen, species):
    head = header_before(path, "export const SPECIES_GEN")
    L = [head, f"export const SPECIES_GEN{gen} = [\n"]
    for s in species:
        L.append("  {\n")
        L.append(f'    id: "{s["id"]}",\n')
        L.append(f'    dexNo: {s["dexNo"]},\n')
        L.append(f'    name: {js_str(s["name"])},\n')
        L.append(f'    gen: {s["gen"]},\n')
        L.append(f'    types: [{", ".join(js_str(t) for t in s["types"])}],\n')
        bs = s["baseStats"]
        L.append(f'    baseStats: {{ hp: {bs["hp"]}, attack: {bs["attack"]}, '
                 f'defense: {bs["defense"]}, spAttack: {bs["spAttack"]}, '
                 f'spDefense: {bs["spDefense"]}, speed: {bs["speed"]} }},\n')
        L.append(f'    genderRatio: {s["genderRatio"]},\n')
        L.append(f'    eggGroups: [{", ".join(js_str(g) for g in s["eggGroups"])}],\n')
        L.append(f'    rarity: {js_str(s["rarity"])},\n')
        L.append(f'    evolvesTo: {js_str(s["evolvesTo"]) if s.get("evolvesTo") else "null"},\n')
        el = s.get("evolutionLevel")
        L.append(f'    evolutionLevel: {el if el is not None else "null"},\n')
        L.append(f'    height: {fmt_num(s["height"])},\n')
        L.append(f'    weight: {fmt_num(s["weight"])},\n')
        L.append(f'    genus: {js_str(s["genus"])},\n')
        L.append(f'    dexEntry: {js_str(s["dexEntry"])},\n')
        if s.get("evolutions"):
            L.append(f'    evolutions: [{", ".join(s["evolutions"])}],\n')
        L.append("  },\n")
    L.append("];\n")
    return "".join(L)


def serialize_learnsets(path, gen, species, learnsets):
    head = header_before(path, "export const LEARNSETS_GEN")
    L = [head, f"export const LEARNSETS_GEN{gen} = {{\n"]
    for s in species:
        slug = s["id"]
        entries = learnsets.get(slug, [])
        L.append(f'  {slug if slug.isidentifier() else js_str(slug)}: [\n')
        for level, name in sorted(entries, key=lambda e: (e[0], e[1])):
            L.append(f'    {{ level: {level}, move: "{name}" }},\n')
        L.append("  ],\n")
    L.append("};\n")
    return "".join(L)


def serialize_evyields(path, gen, species, evyields):
    head = header_before(path, "export const EV_YIELDS_GEN")
    L = [head, f"export const EV_YIELDS_GEN{gen} = {{\n"]
    for s in species:
        slug = s["id"]
        ev = evyields.get(slug, {})
        body = ", ".join(f"{k}: {v}" for k, v in ev.items())
        key = slug if slug.isidentifier() else js_str(slug)
        L.append(f'  {key}: {{ {body} }},\n' if body else f'  {key}: {{}},\n')
    L.append("};\n")
    return "".join(L)


def merge_moves(used_moves, prio):
    """Aditivně přidá do moves.js chybějící tahy; existující (i ruční effect) nechá."""
    existing = parse_existing_moves(MOVES_JS)
    to_add = [m for m in sorted(used_moves) if m not in existing]
    new_lines = {}
    for mid in to_add:
        try:
            mj = fetch(f"{API}/move/{mid}/")
        except Exception as e:
            print(f"  ERR move {mid}: {e}")
            continue
        power = mj["power"] or 0
        acc = mj["accuracy"]
        acc = 101 if acc is None else acc
        s = (f'  {{ id: "{mid}", name: "{en_move_name(mj)}", type: "{cap_type(mj["type"]["name"])}", '
             f'category: "{mj["damage_class"]["name"]}", power: {power}, '
             f'accuracy: {acc}, pp: {mj["pp"] or 0}')
        if mj.get("priority"):
            s += f', priority: {mj["priority"]}'
        der = derive_effect_and_ailment(mj)
        if "ailment" in der:
            s += f', ailment: "{der["ailment"]}", ailmentChance: {der["ailmentChance"]}'
        elif "effect" in der:
            s += f', effect: {js_effect(der["effect"])}'
        s += " },\n"
        new_lines[mj["id"]] = s   # klíč = PokeAPI id kvůli řazení
        time.sleep(0.02)

    # Vlož nové řádky před uzavírací "];" MOVES pole, seřazené dle sort id.
    src = open(MOVES_JS, encoding="utf-8").read()
    lines = src.splitlines(keepends=True)
    close_idx = None
    start = next(i for i, l in enumerate(lines) if "export const MOVES = [" in l)
    for i in range(start + 1, len(lines)):
        if lines[i].rstrip("\n") == "];":
            close_idx = i
            break
    add_block = "".join(new_lines[k] for k in sorted(new_lines))
    out = lines[:close_idx] + [add_block] + lines[close_idx:]
    return "".join(out), len(new_lines)


def merge_compat(tm_compat_add, species):
    """Doplní gen<N> druhy do tmCompat.js/hmCompat.js. Čísla TM/HM se odvodí
    z našich tms.js/hms.js podle move id (machine moves druhu ∩ naše TM/HM)."""
    tms = read_num_move_map(os.path.join(DATA, "tms.js"), "TMS")
    hms = read_num_move_map(os.path.join(DATA, "hms.js"), "HMS")
    move_to_tm = {mv: num for num, mv in tms.items()}
    move_to_hm = {mv: num for num, mv in hms.items()}

    tm_add = {}
    hm_add = {}
    for s in species:
        slug = s["id"]
        machine = tm_compat_add.get(slug, set())
        tnums = sorted({move_to_tm[m] for m in machine if m in move_to_tm})
        hnums = sorted({move_to_hm[m] for m in machine if m in move_to_hm})
        tm_add[slug] = tnums
        hm_add[slug] = hnums

    tm_txt = insert_compat(TMCOMPAT_JS, "TM_COMPAT", tm_add)
    hm_txt = insert_compat(HMCOMPAT_JS, "HM_COMPAT", hm_add)
    return tm_txt, hm_txt


def read_num_move_map(path, const):
    src = open(path, encoding="utf-8").read()
    out = {}
    for m in re.finditer(r'num:\s*(\d+),\s*move:\s*"([a-z0-9-]+)"', src):
        out[int(m.group(1))] = m.group(2)
    return out


def insert_compat(path, const, add):
    """Vloží/aktualizuje klíče v ploché mapě `export const CONST = { ... }`.
    Existující klíče přepíše, nové přidá před uzavírací '};'."""
    src = open(path, encoding="utf-8").read()
    lines = src.splitlines(keepends=True)
    start = next(i for i, l in enumerate(lines) if f"export const {const}" in l)
    close_idx = next(i for i in range(start + 1, len(lines))
                     if lines[i].rstrip("\n") == "};")
    # odfiltruj existující řádky přidávaných slugů (idempotence)
    keys = set(add.keys())
    body = []
    for i in range(start + 1, close_idx):
        m = re.match(r'\s*"?([a-z0-9-]+)"?\s*:', lines[i])
        if m and m.group(1) in keys:
            continue
        body.append(lines[i])
    add_block = []
    for slug in sorted(add):
        nums = add[slug]
        key = f'"{slug}"' if not slug.isidentifier() else slug
        add_block.append(f'  {key}: [{", ".join(str(n) for n in nums)}],\n')
    out = lines[:start + 1] + body + add_block + lines[close_idx:]
    return "".join(out)


if __name__ == "__main__":
    main()
