"""
gen_pokedex_info.py – doplní do data/pokemon.js Pokédex info z PokeAPI:
  height   (metry;   PokeAPI height v decimetrech / 10)
  weight   (kg;      PokeAPI weight v hektogramech / 10)
  genus    (angl. druhový popisek, např. "Seed Pokémon")
  dexEntry (angl. flavor text, vyčištěný od zalomení/form-feed/soft-hyphenů)

GENERAČNĚ NEZÁVISLÝ: druhy (id + dexNo) si čte z data/pokemon.js, takže se dá
pustit znovu, jak budou generace přibývat. IDEMPOTENTNÍ: případná stávající pole
height/weight/genus/dexEntry nejdřív odstraní a doplní čerstvá – lze pouštět opakovaně.

Vkládá se hned ZA řádek `evolutionLevel: …,` každého druhu, takže se zachová
pořadí i formátování zbytku souboru (helper getSpecies apod. zůstává netknutý).

Použití:
  python tools/gen_pokedex_info.py            # zapíše data/pokemon.js.new (k ověření)
  python tools/gen_pokedex_info.py --write     # rovnou přepíše data/pokemon.js
  python tools/gen_pokedex_info.py --only 1-9   # jen část Dexu (rychlý test)

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
API = "https://pokeapi.co/api/v2"

# Verze flavor textů: nejnovější → starší. Bereme první dostupný anglický entry.
FT_PRIORITY = [
    "scarlet", "violet", "sword", "shield", "lets-go-pikachu", "lets-go-eevee",
    "ultra-sun", "ultra-moon", "sun", "moon", "omega-ruby", "alpha-sapphire",
    "x", "y", "black-2", "white-2", "black", "white", "heartgold", "soulsilver",
    "platinum", "diamond", "pearl", "firered", "leafgreen", "emerald", "ruby",
    "sapphire", "crystal", "gold", "silver", "yellow", "red", "blue",
]

NEW_KEYS = ("height", "weight", "genus", "dexEntry")


def fetch(url, _cache={}):
    if url in _cache:
        return _cache[url]
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(3):
        try:
            data = json.load(urllib.request.urlopen(req, timeout=40))
            _cache[url] = data
            return data
        except Exception:
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


def clean_text(t):
    """Vyčistí flavor text: form-feed/nové řádky/soft-hyphen → mezera, sloučí mezery."""
    t = t.replace("­\n", "").replace("­", "")
    t = t.replace("\f", " ").replace("\r", " ").replace("\n", " ")
    t = re.sub(r"\s+", " ", t).strip()
    return t


def js_str(s):
    """Bezpečný JS string literál v uvozovkách."""
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def en_flavor(species_json):
    entries = {}
    for e in species_json.get("flavor_text_entries", []):
        if e["language"]["name"] != "en":
            continue
        ver = e["version"]["name"]
        entries.setdefault(ver, e["flavor_text"])
    for ver in FT_PRIORITY:
        if ver in entries:
            return clean_text(entries[ver])
    # fallback: cokoli anglického
    for _, txt in entries.items():
        return clean_text(txt)
    return ""


def en_genus(species_json):
    for g in species_json.get("genera", []):
        if g["language"]["name"] == "en":
            return g["genus"]
    return ""


def strip_old_keys(block):
    """Odstraní z bloku druhu případné stávající řádky s NEW_KEYS (idempotence)."""
    out = []
    for line in block:
        stripped = line.lstrip()
        if any(stripped.startswith(k + ":") for k in NEW_KEYS):
            continue
        out.append(line)
    return out


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

    # 1) Stáhni info pro každý druh.
    info = {}  # slug -> dict(height, weight, genus, dexEntry)
    for slug, dex in species:
        try:
            pj = fetch(f"{API}/pokemon/{dex}/")
            sj = fetch(f"{API}/pokemon-species/{dex}/")
        except Exception as e:
            print(f"  ERR {slug} (#{dex}): {e}")
            continue
        info[slug] = {
            "height": round(pj["height"] / 10, 1),
            "weight": round(pj["weight"] / 10, 1),
            "genus": en_genus(sj),
            "dexEntry": en_flavor(sj),
        }
        print(f"  {slug:14s} #{dex:<4d} {info[slug]['height']}m {info[slug]['weight']}kg  {info[slug]['genus']}")
        time.sleep(0.03)

    # 2) Vlož pole do pokemon.js za `evolutionLevel: …,` každého druhu.
    lines = open(POKEMON_JS, encoding="utf-8").read().splitlines(keepends=True)
    out = []
    cur_id = None
    cur_block = []       # řádky aktuálního druhu (kvůli strip_old_keys)
    for line in lines:
        m = re.match(r'\s*id:\s*"([a-z0-9-]+)"', line)
        if m:
            cur_id = m.group(1)
        # Zjisti odsazení pole (stejné jako u ostatních polí druhu).
        ev = re.match(r'(\s*)evolutionLevel:', line)
        out.append(line)
        if ev and cur_id in info:
            indent = ev.group(1)
            rec = info[cur_id]
            out.append(f'{indent}height: {rec["height"]},\n')
            out.append(f'{indent}weight: {rec["weight"]},\n')
            out.append(f'{indent}genus: {js_str(rec["genus"])},\n')
            out.append(f'{indent}dexEntry: {js_str(rec["dexEntry"])},\n')

    # 2b) Idempotence: nejdřív odstraň případná dřívější NEW_KEYS pole, PAK vlož.
    #     (Odstranění děláme na PŮVODNÍM vstupu, aby se nezdvojovala.)
    src_text = "".join(lines)
    if any(re.search(rf'^\s*{k}:', src_text, re.M) for k in NEW_KEYS):
        # Přegeneruj: znovu projdi PŮVODNÍ řádky bez starých NEW_KEYS řádků.
        clean_lines = [l for l in lines
                       if not any(l.lstrip().startswith(k + ":") for k in NEW_KEYS)]
        out = []
        cur_id = None
        for line in clean_lines:
            m = re.match(r'\s*id:\s*"([a-z0-9-]+)"', line)
            if m:
                cur_id = m.group(1)
            ev = re.match(r'(\s*)evolutionLevel:', line)
            out.append(line)
            if ev and cur_id in info:
                indent = ev.group(1)
                rec = info[cur_id]
                out.append(f'{indent}height: {rec["height"]},\n')
                out.append(f'{indent}weight: {rec["weight"]},\n')
                out.append(f'{indent}genus: {js_str(rec["genus"])},\n')
                out.append(f'{indent}dexEntry: {js_str(rec["dexEntry"])},\n')

    result = "".join(out)
    path = POKEMON_JS if write else POKEMON_JS + ".new"
    open(path, "w", encoding="utf-8", newline="\n").write(result)
    print(f"\nZapsáno: {path} ({len(info)} druhů doplněno).")
    if not write:
        print("(Ověř .new soubor; pak spusť s --write pro přepis ostrých dat.)")


if __name__ == "__main__":
    main()
