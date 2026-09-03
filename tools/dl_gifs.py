"""
dl_gifs.py - stáhne animované Gen 5 (Black/White) gif sprity z PokeAPI.

Druhy i jejich Pokédex čísla si NAČÍTÁ z `data/pokemon.js` (id + dexNo), takže
se nikde neudržuje ruční seznam. Pro každý druh stáhne 4 pohledy
(front, back, shiny-front, shiny-back) do `assets/pokemon/<id>/<view>.gif`.
Statické .png tam už jsou jako fallback (gif → png → glyph).

Použití:
  python tools/dl_gifs.py               # všechny druhy, co MAJÍ složku v assets/pokemon
  python tools/dl_gifs.py --all         # úplně všechny druhy z pokemon.js
  python tools/dl_gifs.py bulbasaur pikachu   # jen vyjmenované slugy
  přidej --force                        # přepsat i už stažené gify

Existující .gif se defaultně přeskočí (idempotentní). curl na tomto stroji
selhává (HTTP 000), proto urllib ze standardní knihovny.
"""

import os
import re
import sys
import urllib.request

HERE = os.path.dirname(__file__)
ROOT = os.path.join(HERE, "..", "assets", "pokemon")
POKEMON_JS = os.path.join(HERE, "..", "data", "pokemon.js")

BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated"

# view -> podcesta na PokeAPI (dex se doplní za lomítko)
VIEWS = {
    "front": "",
    "back": "back",
    "shiny-front": "shiny",
    "shiny-back": "back/shiny",
}


def load_species():
    """Vytáhne z data/pokemon.js mapu slug(id) -> národní dex číslo."""
    with open(POKEMON_JS, encoding="utf-8") as f:
        src = f.read()
    # Páry `id: "slug"` ... `dexNo: N` v pořadí, jak jdou v každém objektu.
    pairs = re.findall(r'id:\s*"([a-z0-9-]+)"[^}]*?dexNo:\s*(\d+)', src, re.S)
    return {slug: int(dex) for slug, dex in pairs}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def main():
    args = sys.argv[1:]
    force = "--force" in args
    want_all = "--all" in args
    slugs = [a for a in args if not a.startswith("--")]

    species = load_species()
    if not species:
        print("Nenašel jsem žádné druhy v data/pokemon.js – zkontroluj regex/cestu.")
        sys.exit(1)

    if slugs:
        targets = slugs
    elif want_all:
        targets = list(species)
    else:
        # Default: jen druhy, co UŽ MAJÍ složku v assets/pokemon (drží se workflow).
        targets = [s for s in species if os.path.isdir(os.path.join(ROOT, s))]

    ok = skip = fail = 0
    for slug in targets:
        dex = species.get(slug)
        if dex is None:
            print(f"ERR {slug}: není v data/pokemon.js")
            fail += 1
            continue
        outdir = os.path.join(ROOT, slug)
        os.makedirs(outdir, exist_ok=True)
        for view, sub in VIEWS.items():
            dest = os.path.join(outdir, f"{view}.gif")
            if os.path.exists(dest) and not force:
                skip += 1
                continue
            path = f"{sub}/{dex}.gif" if sub else f"{dex}.gif"
            url = f"{BASE}/{path}"
            try:
                data = fetch(url)
                with open(dest, "wb") as f:
                    f.write(data)
                print(f"OK  {slug}/{view}.gif  ({len(data)} B)")
                ok += 1
            except Exception as e:
                print(f"ERR {slug}/{view}.gif  {e}")
                fail += 1

    print(f"\nHotovo: {ok} staženo, {skip} přeskočeno (už existuje), {fail} chyb. "
          f"Cílů: {len(targets)}.")


if __name__ == "__main__":
    main()
