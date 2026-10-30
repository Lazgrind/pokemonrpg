"""
gen_sprite_manifest.py - naskenuje `assets/gen<N>/trainers/<class>/<n>.png` a vygeneruje
`data/spriteVariants.js` s počtem variant na trenérskou třídu ZVLÁŠŤ PRO KAŽDOU GENERACI
(sprity jsou od v1.17.0 per generace; Gen 2 má jiné počty i jiné třídy).

Proč manifest: prohlížeč neumí za běhu vylistovat složku, ale pro NÁHODNÝ výběr
spritu při souboji musí kód znát, kolik variant existuje. Soubor je
AUTO-GENEROVANÝ – po každém doplnění/odebrání spritů ho přegeneruj:

  python tools/gen_sprite_manifest.py

(Nemodifikuj ho ručně; drop nového `<n>.png` + spuštění tohohle = varianta se objeví.)
"""

import os
import re

HERE = os.path.dirname(__file__)
ASSETS = os.path.join(HERE, "..", "assets")
GEN_DIR = re.compile(r"^gen(\d+)$")
OUT = os.path.join(HERE, "..", "data", "spriteVariants.js")

NUM_PNG = re.compile(r"^(\d+)\.png$")


def counts_for(trainers):
    """{třída: počet `<n>.png`} v jedné složce trainers/ (třídy bez spritu se vynechají)."""
    result = {}
    for cls in sorted(os.listdir(trainers)):
        d = os.path.join(trainers, cls)
        if not os.path.isdir(d):
            continue
        nums = [int(m.group(1)) for f in os.listdir(d) if (m := NUM_PNG.match(f))]
        if nums:
            result[cls] = len(nums)
    return result


def counts():
    """{generace: {třída: počet}} pro každou assets/gen<N>/trainers/."""
    result = {}
    for name in sorted(os.listdir(ASSETS)):
        m = GEN_DIR.match(name)
        trainers = os.path.join(ASSETS, name, "trainers")
        if m and os.path.isdir(trainers):
            result[int(m.group(1))] = counts_for(trainers)
    if not result:
        raise SystemExit("Nenalezena žádná složka assets/gen<N>/trainers – nic nepřepisuji.")
    return result


def main():
    data = counts()
    lines = [
        "/**",
        " * spriteVariants.js – AUTO-GENEROVÁNO tools/gen_sprite_manifest.py.",
        " * Počet spritů (`<n>.png`) na trenérskou třídu, PO GENERACÍCH:",
        " * TRAINER_SPRITE_COUNTS[<gen>][<třída>] podle assets/gen<N>/trainers/.",
        " * NEUPRAVUJ ručně – přidej soubor a spusť: python tools/gen_sprite_manifest.py",
        " */",
        "export const TRAINER_SPRITE_COUNTS = {",
    ]
    for gen, classes in data.items():
        lines.append(f"  {gen}: {{")
        for cls, n in classes.items():
            lines.append(f'    "{cls}": {n},')
        lines.append("  },")
    lines.append("};")
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")
    for gen, classes in data.items():
        print(f"Gen {gen}: {len(classes)} tříd, {sum(classes.values())} spritů")
    print(f"Zapsáno {os.path.relpath(OUT)}.")


if __name__ == "__main__":
    main()
