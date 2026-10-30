"""
fetch_classic_learnsets.py – stáhne level-up learnsety z PŮVODNÍCH her (PokeAPI).

Pro učení útoků po generacích (rozhodnutí autora 2026-10-20):
  - Kanto (Gen 1): Red/Blue/Yellow  → jen útoky z Gen 1
  - Johto (Gen 2): Gold/Silver/Crystal → útoky z Gen 1 a Gen 2 (i pro Gen 1 druhy,
    které se v Johtu chytají, např. Zubat → Crobat)

Pouští se na POČÍTAČI S INTERNETEM (firemní síť PokeAPI blokuje). Jen standardní
knihovna Pythonu, nic se neinstaluje. Do herních dat NIC nezapisuje – výsledek
uloží do jednoho souboru, který se přinese zpátky a převede do data/gen1|gen2.

Použití (ze složky projektu):
  python tools/fetch_classic_learnsets.py
  → vytvoří tools/classic_learnsets.json (~0,5 MB), trvá pár minut.
  Když se spojení přeruší, stačí pustit znovu – už stažené se vezme z cache
  (tools/.pokeapi_cache/).

Obsah výstupu:
  species[dexNo] = { name, learnsets: { "red-blue": [[level, move], …], "yellow": …,
                     "gold-silver": …, "crystal": … } }   (dex 1–251)
  moves[name]    = { id, generation, type, power, accuracy, pp, priority, damage_class,
                     ailment, ailment_chance, stat_changes, … }  (všechny použité útoky)
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request

API = "https://pokeapi.co/api/v2"
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, ".pokeapi_cache")
OUT = os.path.join(HERE, "classic_learnsets.json")
VERSION_GROUPS = ["red-blue", "yellow", "gold-silver", "crystal"]
LAST_DEX = 251


def get(path):
    """GET z PokeAPI s diskovou cache a opakováním při chybě sítě."""
    os.makedirs(CACHE, exist_ok=True)
    key = path.strip("/").replace("/", "_") + ".json"
    cached = os.path.join(CACHE, key)
    if os.path.exists(cached):
        with open(cached, encoding="utf-8") as f:
            return json.load(f)
    url = f"{API}/{path.strip('/')}/"
    req = urllib.request.Request(url, headers={"User-Agent": "pokemonrpg-learnset-fetch/1.0"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.load(r)
            with open(cached, "w", encoding="utf-8") as f:
                json.dump(data, f)
            time.sleep(0.15)  # šetrně k PokeAPI
            return data
        except (urllib.error.URLError, TimeoutError) as e:
            wait = 2 * (attempt + 1)
            print(f"  ! {url}: {e} – zkusím znovu za {wait} s")
            time.sleep(wait)
    sys.exit(f"Nepodařilo se stáhnout {url}. Zkontroluj internet a pusť skript znovu.")


def main():
    species = {}
    used_moves = set()
    for dex in range(1, LAST_DEX + 1):
        p = get(f"pokemon/{dex}")
        sets = {vg: [] for vg in VERSION_GROUPS}
        for entry in p["moves"]:
            move = entry["move"]["name"]
            for d in entry["version_group_details"]:
                vg = d["version_group"]["name"]
                if vg in sets and d["move_learn_method"]["name"] == "level-up":
                    sets[vg].append([d["level_learned_at"], move])
                    used_moves.add(move)
        for vg in sets:
            sets[vg].sort(key=lambda e: (e[0], e[1]))
        species[dex] = {"name": p["name"], "learnsets": sets}
        print(f"{dex:3d}/{LAST_DEX} {p['name']}: " + ", ".join(f"{vg} {len(s)}" for vg, s in sets.items()))

    moves = {}
    for i, name in enumerate(sorted(used_moves), 1):
        m = get(f"move/{name}")
        meta = m.get("meta") or {}
        moves[name] = {
            "id": m["id"],
            "generation": m["generation"]["name"],
            "name_en": next((n["name"] for n in m["names"] if n["language"]["name"] == "en"), name),
            "type": m["type"]["name"],
            "power": m["power"],
            "accuracy": m["accuracy"],
            "pp": m["pp"],
            "priority": m["priority"],
            "damage_class": m["damage_class"]["name"],
            "ailment": (meta.get("ailment") or {}).get("name"),
            "ailment_chance": meta.get("ailment_chance"),
            "flinch_chance": meta.get("flinch_chance"),
            "drain": meta.get("drain"),
            "healing": meta.get("healing"),
            "crit_rate": meta.get("crit_rate"),
            "stat_chance": meta.get("stat_chance"),
            "stat_changes": [[s["stat"]["name"], s["change"]] for s in m.get("stat_changes", [])],
            "target": m["target"]["name"],
        }
        print(f"  útok {i}/{len(used_moves)} {name} ({moves[name]['generation']})")

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"source": "pokeapi.co", "fetched": time.strftime("%Y-%m-%d"),
                   "version_groups": VERSION_GROUPS, "species": species, "moves": moves},
                  f, ensure_ascii=False, separators=(",", ":"))
    size = os.path.getsize(OUT) / 1024
    print(f"\nHotovo: {OUT} ({size:.0f} kB). Tenhle soubor přines zpátky do tools/.")


if __name__ == "__main__":
    main()
