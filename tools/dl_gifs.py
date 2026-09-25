"""
dl_gifs.py - stáhne animované Gen 5 (Black/White) gif sprity z PokeAPI.

Druhy, jejich Pokédex čísla i GENERACI si NAČÍTÁ z per-gen souborů
`data/gen<N>/pokemon.js` (id + dexNo; gen podle složky), takže se nikde neudržuje
ruční seznam. Pro každý druh stáhne 4 pohledy (front, back, shiny-front,
shiny-back) do `assets/gen<N>/pokemon/<id>/<view>.gif` (per generace druhu).
Statické .png tam už jsou jako fallback (gif → png → glyph).

Použití:
  python tools/dl_gifs.py               # všechny druhy, co MAJÍ složku v assets/gen<N>/pokemon
  python tools/dl_gifs.py --all         # úplně všechny druhy z data/gen*/pokemon.js
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
ASSETS = os.path.join(HERE, "..", "assets")
# Per-gen zdroje druhů (data/pokemon.js je teď jen aggregator bez literálů).
GEN_FILES = {
    1: os.path.join(HERE, "..", "data", "gen1", "pokemon.js"),
    2: os.path.join(HERE, "..", "data", "gen2", "pokemon.js"),
}

BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated"

# view -> podcesta na PokeAPI (dex se doplní za lomítko)
VIEWS = {
    "front": "",
    "back": "back",
    "shiny-front": "shiny",
    "shiny-back": "back/shiny",
}


def load_species():
    """Vytáhne z data/gen<N>/pokemon.js mapu slug(id) -> (národní dex číslo, gen)."""
    out = {}
    for gen, path in GEN_FILES.items():
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as f:
            src = f.read()
        # Páry `id: "slug"` ... `dexNo: N` v pořadí, jak jdou v každém objektu.
        pairs = re.findall(r'id:\s*"([a-z0-9-]+)"[^}]*?dexNo:\s*(\d+)', src, re.S)
        for slug, dex in pairs:
            out[slug] = (int(dex), gen)
    return out


def species_dir(slug, gen):
    """Cílová složka spritů druhu: assets/gen<N>/pokemon/<slug>."""
    return os.path.join(ASSETS, f"gen{gen}", "pokemon", slug)


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
        print("Nenašel jsem žádné druhy v data/gen*/pokemon.js – zkontroluj regex/cestu.")
        sys.exit(1)

    if slugs:
        targets = slugs
    elif want_all:
        targets = list(species)
    else:
        # Default: jen druhy, co UŽ MAJÍ složku v assets/gen<N>/pokemon (drží se workflow).
        targets = [s for s in species if os.path.isdir(species_dir(s, species[s][1]))]

    ok = skip = fail = 0
    for slug in targets:
        info = species.get(slug)
        if info is None:
            print(f"ERR {slug}: není v data/gen*/pokemon.js")
            fail += 1
            continue
        dex, gen = info
        outdir = species_dir(slug, gen)
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
                print(f"OK  gen{gen}/{slug}/{view}.gif  ({len(data)} B)")
                ok += 1
            except Exception as e:
                print(f"ERR gen{gen}/{slug}/{view}.gif  {e}")
                fail += 1

    print(f"\nHotovo: {ok} staženo, {skip} přeskočeno (už existuje), {fail} chyb. "
          f"Cílů: {len(targets)}.")


if __name__ == "__main__":
    main()
