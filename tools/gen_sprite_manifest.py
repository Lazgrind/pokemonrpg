"""
gen_sprite_manifest.py - naskenuje `assets/trainers/<class>/<n>.png` a vygeneruje
`data/spriteVariants.js` s počtem variant na trenérskou třídu.

Proč manifest: prohlížeč neumí za běhu vylistovat složku, ale pro NÁHODNÝ výběr
spritu při souboji musí kód znát, kolik variant existuje. Soubor je
AUTO-GENEROVANÝ – po každém doplnění/odebrání spritů ho přegeneruj:

  python tools/gen_sprite_manifest.py

(Nemodifikuj ho ručně; drop nového `<n>.png` + spuštění tohohle = varianta se objeví.)
"""

import os
import re

HERE = os.path.dirname(__file__)
TRAINERS = os.path.join(HERE, "..", "assets", "trainers")
OUT = os.path.join(HERE, "..", "data", "spriteVariants.js")

NUM_PNG = re.compile(r"^(\d+)\.png$")


def counts():
    result = {}
    if not os.path.isdir(TRAINERS):
        return result
    for cls in sorted(os.listdir(TRAINERS)):
        d = os.path.join(TRAINERS, cls)
        if not os.path.isdir(d):
            continue
        nums = [int(m.group(1)) for f in os.listdir(d) if (m := NUM_PNG.match(f))]
        if nums:
            result[cls] = len(nums)
    return result


def main():
    data = counts()
    lines = [
        "/**",
        " * spriteVariants.js – AUTO-GENEROVÁNO tools/gen_sprite_manifest.py.",
        " * Počet spritů (`<n>.png`) na trenérskou třídu v assets/trainers/.",
        " * NEUPRAVUJ ručně – přidej soubor a spusť: python tools/gen_sprite_manifest.py",
        " */",
        "export const TRAINER_SPRITE_COUNTS = {",
    ]
    for cls, n in data.items():
        lines.append(f'  "{cls}": {n},')
    lines.append("};")
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")
    print(f"Zapsáno {os.path.relpath(OUT)}: {len(data)} tříd, "
          f"celkem {sum(data.values())} spritů.")


if __name__ == "__main__":
    main()
