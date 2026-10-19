"""
gen_movepools.py – vygeneruje data/learnsets.js + data/moves.js z PokeAPI.

GENERAČNĚ NEZÁVISLÝ: druhy i dexNo si čte z data/pokemon.js (kolik jich tam je),
takže se pustí na jakoukoli generaci znovu, jak budou přibývat. Pro každý druh
vybere LEVEL-UP movepool z první dostupné version group podle priority (nejnovější
→ starší), takže data jsou kanonická vůči nejnovější mainline hře, kde druh je.

MERGE do moves.js: objektivní staty (power/accuracy/pp/type/category/name/priority)
se berou z PokeAPI. RUČNĚ psaná bojová pole `effect` a `ailment`/`ailmentChance`
ze STÁVAJÍCÍHO moves.js se ZACHOVAJÍ (hand wins) – aby se neztratily efekty tahů
budované v enginu. U NOVÝCH tahů se z PokeAPI meta odvodí bezpečná podmnožina
efektů, které engine umí (ailment/sleep/confuse/flinch/statChange/recoil/drain/heal).

JSDoc hlavičky obou souborů se zachovají (přebírají se ze stávajících souborů).

Použití:
  python tools/gen_movepools.py            # zapíše data/*.new (k ověření)
  python tools/gen_movepools.py --write     # rovnou přepíše data/learnsets.js a moves.js
  python tools/gen_movepools.py --only 1-3   # jen část Dexu (rychlý test)

curl/jq/node na tomto stroji nejsou → jen Python urllib ze standardní knihovny.
"""

import json
import os
import re
import sys
import time
import urllib.request

HERE = os.path.dirname(__file__)
DATA = os.path.join(HERE, "..", "data")
POKEMON_JS = os.path.join(DATA, "pokemon.js")
MOVES_JS = os.path.join(DATA, "moves.js")
LEARN_JS = os.path.join(DATA, "learnsets.js")
API = "https://pokeapi.co/api/v2"

# Version group priority: nejnovější → nejstarší. Pro každý druh se vezme první,
# kde má level-up movepool. Přidávání nových her = doplnit na začátek.
VG_PRIORITY = [
    "scarlet-violet", "sword-shield", "ultra-sun-ultra-moon", "sun-moon",
    "omega-ruby-alpha-sapphire", "x-y", "black-2-white-2", "black-white",
    "heartgold-soulsilver", "platinum", "diamond-pearl", "firered-leafgreen",
    "emerald", "ruby-sapphire", "crystal", "gold-silver", "yellow", "red-blue",
]

# PokeAPI stat name → náš klíč (viz data/moves.js MoveEffect.stat)
STAT_MAP = {
    "attack": "attack", "defense": "defense", "special-attack": "spAttack",
    "special-defense": "spDefense", "speed": "speed", "accuracy": "accuracy",
    "evasion": "evasion",
}
# Ailmenty, které engine řeší přímo přes pole `ailment` (ne effect).
DIRECT_AILMENTS = {"paralysis", "burn", "poison"}


def fetch(url, _cache={}):
    if url in _cache:
        return _cache[url]
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(3):
        try:
            data = json.load(urllib.request.urlopen(req, timeout=40))
            _cache[url] = data
            return data
        except Exception as e:
            if attempt == 2:
                raise
            time.sleep(1.0)


def load_species():
    """id (slug) + dexNo z data/pokemon.js, v pořadí Dexu."""
    src = open(POKEMON_JS, encoding="utf-8").read()
    pairs = re.findall(r'id:\s*"([a-z0-9-]+)"[^}]*?dexNo:\s*(\d+)', src, re.S)
    seen = {}
    for slug, dex in pairs:
        seen[slug] = int(dex)
    return sorted(seen.items(), key=lambda kv: kv[1])


def header_before(path, marker):
    """Vrátí text souboru PŘED daným markerem (zachová JSDoc hlavičku)."""
    src = open(path, encoding="utf-8").read()
    i = src.index(marker)
    return src[:i]


def footer_after(path, open_marker, close_char):
    """Vrátí text souboru ZA uzavřením top-level literálu (zachová helper funkce
    jako getMove/movesAtLevel, které jsou v souboru AŽ ZA daty). `close_char` je
    řádek uzavírající literál na sloupci 0 (`};` pro objekt, `];` pro pole).
    Vrátí "" když soubor za daty nic nemá."""
    lines = open(path, encoding="utf-8").read().splitlines(keepends=True)
    start = next(i for i, l in enumerate(lines) if open_marker in l)
    for i in range(start + 1, len(lines)):
        if lines[i].rstrip("\n") == close_char:
            return "".join(lines[i + 1:])
    return ""


def parse_existing_moves(path):
    """Z aktuálního moves.js vytáhne per-id ruční pole k ZACHOVÁNÍ:
    raw řetězec `effect: {...}`, ailment a ailmentChance. effect je vždy
    jednoúrovňový objekt (bez vnořených {}), takže [^}]* stačí."""
    src = open(path, encoding="utf-8").read()
    out = {}
    for block in re.finditer(r'\{\s*id:\s*"([a-z0-9-]+)".*?\}', src):
        pass  # (nevyužito – řešíme po řádcích níže)
    for line in src.splitlines():
        m = re.search(r'id:\s*"([a-z0-9-]+)"', line)
        if not m:
            continue
        mid = m.group(1)
        rec = {}
        eff = re.search(r'effect:\s*(\{[^}]*\})', line)
        if eff:
            rec["effect_raw"] = eff.group(1)
        ail = re.search(r'ailment:\s*"([a-z]+)"', line)
        if ail:
            rec["ailment"] = ail.group(1)
        ac = re.search(r'ailmentChance:\s*(\d+)', line)
        if ac:
            rec["ailmentChance"] = int(ac.group(1))
        out[mid] = rec
    return out


def choose_levelup(pokemon_json):
    """Vrátí seřazený list (level, move_name) z první VG dle priority."""
    by_vg = {}
    for m in pokemon_json["moves"]:
        name = m["move"]["name"]
        for v in m["version_group_details"]:
            if v["move_learn_method"]["name"] != "level-up":
                continue
            vg = v["version_group"]["name"]
            by_vg.setdefault(vg, []).append((v["level_learned_at"], name))
    for vg in VG_PRIORITY:
        if by_vg.get(vg):
            entries = sorted(set(by_vg[vg]))
            return vg, entries
    # fallback: cokoli, co má level-up (druh mimo náš priority list)
    for vg, entries in by_vg.items():
        return vg, sorted(set(entries))
    return None, []


def cap_type(t):
    return t[:1].upper() + t[1:]


def js_effect(obj):
    """Serializuje odvozený effect dict do JS (pořadí klíčů čitelné)."""
    order = ["kind", "target", "stat", "stages", "chance", "frac", "weather"]
    parts = []
    for k in order:
        if k in obj:
            v = obj[k]
            if isinstance(v, str):
                parts.append(f'{k}: "{v}"')
            else:
                parts.append(f"{k}: {v}")
    return "{ " + ", ".join(parts) + " }"


def derive_effect_and_ailment(move_json):
    """Z PokeAPI move meta odvodí (ailment, ailmentChance, effect) pro NOVÝ tah –
    jen bezpečná podmnožina, kterou engine umí. Vrací dict s možnými klíči."""
    meta = move_json.get("meta") or {}
    out = {}
    ail = (meta.get("ailment") or {}).get("name")
    ac = meta.get("ailment_chance") or 0
    if ail in DIRECT_AILMENTS:
        out["ailment"] = ail
        out["ailmentChance"] = ac if ac else 100
        return out  # ailment má přednost, effect neřešíme
    if ail == "sleep":
        return {"effect": {"kind": "sleep"}}
    if ail == "confusion":
        e = {"kind": "confuse"}
        if ac:
            e["chance"] = ac
        return {"effect": e}
    # flinch
    if meta.get("flinch_chance"):
        return {"effect": {"kind": "flinch", "chance": meta["flinch_chance"]}}
    # drain / recoil (PokeAPI: drain>0 = odsátí, <0 = recoil)
    drain = meta.get("drain") or 0
    if drain > 0:
        return {"effect": {"kind": "drain", "frac": round(drain / 100, 2)}}
    if drain < 0:
        return {"effect": {"kind": "recoil", "frac": round(-drain / 100, 2)}}
    # heal
    if meta.get("healing"):
        return {"effect": {"kind": "heal", "frac": round(meta["healing"] / 100, 2)}}
    # jednoduchá stat změna (jeden stat)
    sc = move_json.get("stat_changes") or []
    if len(sc) == 1 and sc[0]["stat"]["name"] in STAT_MAP:
        change = sc[0]["change"]
        target = "self" if change > 0 else "enemy"
        e = {"kind": "statChange", "target": target,
             "stat": STAT_MAP[sc[0]["stat"]["name"]], "stages": change}
        if ac and ac < 100:
            e["chance"] = ac
        return {"effect": e}
    return out


def en_name(move_json):
    for n in move_json.get("names", []):
        if n["language"]["name"] == "en":
            return n["name"]
    # fallback: title-case ze slugu
    return "-".join(w.capitalize() for w in move_json["name"].split("-"))


def main():
    args = sys.argv[1:]
    write = "--write" in args
    only = None
    if "--only" in args:
        rng = args[args.index("--only") + 1]
        a, b = (rng.split("-") + [rng])[:2]
        only = (int(a), int(b))

    species = load_species()
    if only:
        species = [(s, d) for s, d in species if only[0] <= d <= only[1]]
    print(f"Druhů ke zpracování: {len(species)}")

    existing = parse_existing_moves(MOVES_JS)
    print(f"Stávajících tahů v moves.js: {len(existing)}")

    # 1) Learnsety + sběr všech použitých tahů.
    learnsets = {}   # slug -> [(level, move)]
    used_moves = set(existing.keys())  # ZACHOVÁME i stávající (žádné dangling refs)
    for slug, dex in species:
        try:
            pj = fetch(f"{API}/pokemon/{dex}/")
        except Exception as e:
            print(f"  ERR {slug} (#{dex}): {e}")
            learnsets[slug] = []
            continue
        vg, entries = choose_levelup(pj)
        learnsets[slug] = entries
        for _, name in entries:
            used_moves.add(name)
        print(f"  {slug:14s} #{dex:<4d} VG={vg} tahů={len(entries)}")
        time.sleep(0.03)

    # 2) Metadata všech použitých tahů.
    print(f"\nStahuji metadata {len(used_moves)} tahů…")
    moves = {}  # id -> dict pro serializaci
    for mid in sorted(used_moves):
        try:
            mj = fetch(f"{API}/move/{mid}/")
        except Exception as e:
            print(f"  ERR move {mid}: {e}")
            continue
        power = mj["power"] or 0
        acc = mj["accuracy"]
        acc = 101 if acc is None else acc
        rec = {
            "id": mid,
            "name": en_name(mj),
            "type": cap_type(mj["type"]["name"]),
            "category": mj["damage_class"]["name"],
            "power": power,
            "accuracy": acc,
            "pp": mj["pp"] or 0,
            "sort": mj["id"],
        }
        if mj.get("priority"):
            rec["priority"] = mj["priority"]
        old = existing.get(mid, {})
        if old.get("ailment"):          # ZACHOVAT ruční ailment
            rec["ailment"] = old["ailment"]
            rec["ailmentChance"] = old.get("ailmentChance", 100)
        if old.get("effect_raw"):        # ZACHOVAT ruční effect (verbatim)
            rec["effect_raw"] = old["effect_raw"]
        if "effect_raw" not in rec and "ailment" not in rec:
            # nový tah bez ručních polí → odvoď bezpečnou podmnožinu z PokeAPI
            der = derive_effect_and_ailment(mj)
            if "ailment" in der:
                rec["ailment"] = der["ailment"]
                rec["ailmentChance"] = der["ailmentChance"]
            elif "effect" in der:
                rec["effect_raw"] = js_effect(der["effect"])
        moves[mid] = rec
        time.sleep(0.02)

    # 3) Serializace moves.js (řazeno podle PokeAPI move id).
    #    POZOR: zachovat jak hlavičku (JSDoc PŘED daty), tak footer (helper funkce
    #    getMove/MOVES_BY_ID AŽ ZA daty) – jinak by se rozbily importy v src/.
    lines = [header_before(MOVES_JS, "export const MOVES")]
    lines.append("export const MOVES = [\n")
    for mid in sorted(moves, key=lambda k: moves[k]["sort"]):
        r = moves[mid]
        s = (f'  {{ id: "{r["id"]}", name: "{r["name"]}", type: "{r["type"]}", '
             f'category: "{r["category"]}", power: {r["power"]}, '
             f'accuracy: {r["accuracy"]}, pp: {r["pp"]}')
        if "priority" in r:
            s += f', priority: {r["priority"]}'
        if "ailment" in r:
            s += f', ailment: "{r["ailment"]}", ailmentChance: {r["ailmentChance"]}'
        if "effect_raw" in r:
            s += f', effect: {r["effect_raw"]}'
        s += " },\n"
        lines.append(s)
    lines.append("];\n")
    lines.append(footer_after(MOVES_JS, "export const MOVES = [", "];"))
    moves_out = "".join(lines)

    # 4) Serializace learnsets.js (druhy dle Dexu, uvnitř dle level, pak id).
    #    Rovněž zachovat footer (getLearnset/movesAtLevel/learnableMovesAtLevel).
    llines = [header_before(LEARN_JS, "export const LEARNSETS")]
    llines.append("export const LEARNSETS = {\n")
    for slug, dex in species:
        entries = learnsets.get(slug, [])
        # Klíč druhu VŽDY v uvozovkách – id s pomlčkou (nidoran-f, mr-mime, ho-oh…)
        # by jinak bylo neplatné JS (SyntaxError „Unexpected token '-'").
        llines.append(f'  "{slug}": [\n')
        for level, name in sorted(entries, key=lambda e: (e[0], e[1])):
            llines.append(f'    {{ level: {level}, move: "{name}" }},\n')
        llines.append("  ],\n")
    llines.append("};\n")
    llines.append(footer_after(LEARN_JS, "export const LEARNSETS = {", "};"))
    learn_out = "".join(llines)

    # 5) Zápis.
    mv_path = MOVES_JS if write else MOVES_JS + ".new"
    ln_path = LEARN_JS if write else LEARN_JS + ".new"
    open(mv_path, "w", encoding="utf-8", newline="\n").write(moves_out)
    open(ln_path, "w", encoding="utf-8", newline="\n").write(learn_out)
    print(f"\nZapsáno: {mv_path} ({len(moves)} tahů), {ln_path} ({len(species)} druhů).")
    if not write:
        print("(Ověř .new soubory; pak spusť s --write pro přepis ostrých dat.)")


if __name__ == "__main__":
    main()
