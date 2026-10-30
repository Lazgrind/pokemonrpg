"""
fetch_classic_types.py – stáhne z PokeAPI typy tak, jak byly v PŮVODNÍCH generacích.

Pro „typy přesně v generaci" (rozhodnutí autora 2026-10-20):
  - typy Pokémonů (past_types: Clefairy v Gen 1–5 Normal, Magnemite v Gen 1 jen Electric…)
  - typy (a další hodnoty) útoků (past_values: Bite v Gen 1 Normal, Gust Normal…)
  - tabulka účinnosti typů (past_damage_relations: Gen 1 bez Dark/Steel, Ghost → Psychic…)

Pouští se na počítači s přístupem na PokeAPI. Jen standardní knihovna Pythonu.
Do herních dat NIC nezapisuje – výsledek je tools/classic_types.json, který převede
tools/convert_classic_types.py. Sdílí cache s fetch_classic_learnsets.py
(tools/.pokeapi_cache/), takže už stažené Pokémony nestahuje znovu.

Použití (ze složky projektu):
  python tools/fetch_classic_types.py
  → tools/classic_types.json, trvá pár minut (~470 útoků + 18 typů).
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

API = "https://pokeapi.co/api/v2"
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, ".pokeapi_cache")
OUT = os.path.join(HERE, "classic_types.json")
MOVES_JS = os.path.join(HERE, "..", "data", "moves.js")
LAST_DEX = 251


def get(path):
    """GET z PokeAPI s diskovou cache a opakováním. 404 → None."""
    os.makedirs(CACHE, exist_ok=True)
    key = path.strip("/").replace("/", "_").replace("?", "_").replace("=", "_") + ".json"
    cached = os.path.join(CACHE, key)
    if os.path.exists(cached):
        with open(cached, encoding="utf-8") as f:
            return json.load(f)
    url = f"{API}/{path.strip('/')}"
    url = url if "?" in url else url + "/"
    req = urllib.request.Request(url, headers={"User-Agent": "pokemonrpg-types-fetch/1.0"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.load(r)
            with open(cached, "w", encoding="utf-8") as f:
                json.dump(data, f)
            time.sleep(0.15)  # šetrně k PokeAPI
            return data
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            wait = 2 * (attempt + 1)
            print(f"  ! {url}: HTTP {e.code} – zkusím znovu za {wait} s")
            time.sleep(wait)
        except (urllib.error.URLError, TimeoutError) as e:
            wait = 2 * (attempt + 1)
            print(f"  ! {url}: {e} – zkusím znovu za {wait} s")
            time.sleep(wait)
    sys.exit(f"Nepodařilo se stáhnout {url}. Zkontroluj internet a pusť skript znovu.")


def main():
    # Pořadí version group (chronologicky) – podle něj se vyhodnocují past_values.
    vgs = get("version-group?limit=100")["results"]
    vg_order = [v["name"] for v in vgs]
    # Pořadí generací.
    gens = [g["name"] for g in get("generation?limit=50")["results"]]

    species = {}
    for dex in range(1, LAST_DEX + 1):
        p = get(f"pokemon/{dex}")
        species[dex] = {
            "name": p["name"],
            "types": [t["type"]["name"] for t in sorted(p["types"], key=lambda t: t["slot"])],
            "past_types": [
                {"generation": pt["generation"]["name"],
                 "types": [t["type"]["name"] for t in sorted(pt["types"], key=lambda t: t["slot"])]}
                for pt in p.get("past_types", [])
            ],
        }
        if dex % 25 == 0:
            print(f"Pokémon {dex}/{LAST_DEX}")

    move_ids = sorted(set(re.findall(r'\{ id: "([^"]+)"', open(MOVES_JS, encoding="utf-8").read())))
    moves, missing = {}, []
    for i, mid in enumerate(move_ids, 1):
        m = get(f"move/{mid}")
        if m is None:
            missing.append(mid)
            continue
        moves[mid] = {
            "generation": m["generation"]["name"],
            "type": m["type"]["name"],
            "power": m["power"],
            "accuracy": m["accuracy"],
            "pp": m["pp"],
            "damage_class": m["damage_class"]["name"],
            "past_values": [
                {"version_group": pv["version_group"]["name"],
                 "type": (pv.get("type") or {}).get("name"),
                 "power": pv.get("power"),
                 "accuracy": pv.get("accuracy"),
                 "pp": pv.get("pp")}
                for pv in m.get("past_values", [])
            ],
        }
        if i % 50 == 0:
            print(f"útoky {i}/{len(move_ids)}")

    def relations(dr):
        return {k: sorted(x["name"] for x in v) for k, v in dr.items()}

    types = {}
    for t in get("type?limit=50")["results"]:
        d = get(f"type/{t['name']}")
        if d is None or not d.get("generation"):
            continue
        types[t["name"]] = {
            "generation": d["generation"]["name"],
            "damage_relations": relations(d["damage_relations"]),
            "past_damage_relations": [
                {"generation": pdr["generation"]["name"], "damage_relations": relations(pdr["damage_relations"])}
                for pdr in d.get("past_damage_relations", [])
            ],
        }

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"source": "pokeapi.co", "fetched": time.strftime("%Y-%m-%d"),
                   "version_group_order": vg_order, "generation_order": gens,
                   "species": species, "moves": moves, "types": types,
                   "moves_not_found": missing},
                  f, ensure_ascii=False, separators=(",", ":"))
    print(f"\nHotovo: {OUT} ({os.path.getsize(OUT) / 1024:.0f} kB). "
          f"{len(species)} Pokémonů, {len(moves)} útoků, {len(types)} typů"
          + (f", nenalezeno: {missing}" if missing else ""))


if __name__ == "__main__":
    main()
