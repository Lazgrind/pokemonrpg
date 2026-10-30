"""
pixelize_buildings.py - převede sprite budovy na pixel art pro mapu města shora.

Postup: oříznutí na budovu → zmenšení na cílovou šířku (realistické měřítko vůči
ostatním budovám) → 16 barev bez ditheru → průhlednost bez poloprůhledných okrajů
→ tmavý obrys 1 px. Výsledek se ve hře zobrazuje ostře (image-rendering: pixelated)
na mapě 320×180 px (src/ui/cityMap.js).

Použití:
  python tools/pixelize_buildings.py <vstup.png> <výstup.png> --width 46
  python tools/pixelize_buildings.py --all assets/gen1/buildings   # všechny podle tabulky WIDTH (přepíše soubory!)

Šířka podle velikosti budovy (WIDTH): domek ~32–38, Poké Center 46, laboratoř 56–62,
velké budovy 54–68, loď 88. Novou budovu přidej do WIDTH, ať má stálé měřítko.
POZOR: --all přepisuje soubory na místě. Vstupem má být velký zdrojový obrázek (např. 256×256),
ne už převedený pixel art (opakovaný převod kvalitu zhorší).
"""
import sys
from pathlib import Path
from PIL import Image

WIDTH = {
    "player-home": 34, "rival-home": 34, "mr-fuji-house": 30, "viridian-trade-house": 34, "cerulean-trade-house": 38,
    "vermilion-trade-house": 36, "vermilion-fishing-hut": 30, "fuchsia-fishing-house": 32, "warden-house": 32,
    "poke-center": 44, "poke-mart": 40, "boost-center": 34, "day-care": 34, "move-tutor": 34,
    "oak-lab": 54, "elm-lab": 54, "sprout-tower": 32, "azalea-kiln": 34, "kurts-house": 40, "radio-tower": 44, "bills-house": 36, "goldenrod-flower-shop": 32, "goldenrod-underground": 32, "bell-tower": 24, "burned-tower": 44, "dance-theater": 64, "ecruteak-house": 34, "olivine-house": 36, "olivine-lighthouse": 40, "ss-aqua": 84, "cianwood-pharmacy": 36, "blackthorn-house": 40, "dragons-den": 38, "pokemon-lab": 60, "pewter-museum": 64, "game-corner": 52, "fighting-dojo": 48,
    "celadon-mansion": 42, "dept-store": 52, "silph-co": 42, "pokemon-tower": 26, "pokemon-mansion": 66,
    "training-grounds": 48, "ss-anne": 86, "gym": 56,
    # Pokémon League (Indigo Plateau): zdroj je výřez s budovou i nádvořím – rozdělit pod první dvojicí soch
    # na league.png (budova) a league-plaza.png (nádvoří + schody), obojí na šířku 84 (stejné měřítko)
    "league": 84, "league-plaza": 84,
}
OUTLINE = (30, 24, 36, 255)


def pixelize(src: Path, dst: Path, width: int) -> tuple[int, int]:
    im = Image.open(src).convert("RGBA")
    im = im.crop(im.getbbox() or (0, 0, *im.size))
    small = im.resize((width, max(1, round(im.height * width / im.width))), Image.LANCZOS)
    alpha = small.getchannel("A").point(lambda v: 255 if v > 110 else 0)
    rgb = small.convert("RGB").quantize(colors=16, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    body = rgb.convert("RGBA")
    body.putalpha(alpha)
    W, H = body.size
    out = Image.new("RGBA", (W + 2, H + 2), (0, 0, 0, 0))
    bp, op = body.load(), out.load()
    for y in range(H):
        for x in range(W):
            if bp[x, y][3]:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    op[x + 1 + dx, y + 1 + dy] = OUTLINE
    out.alpha_composite(body, (1, 1))
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, optimize=True)
    return out.size


def main():
    args = sys.argv[1:]
    if args[:1] == ["--all"] and len(args) == 2:
        folder = Path(args[1])
        for f in sorted(folder.glob("*.png")):
            w = WIDTH.get(f.stem)
            if not w:
                print(f"SKIP {f.name} (není v tabulce WIDTH)")
                continue
            print(f"{f.name:28} -> {'x'.join(map(str, pixelize(f, f, w)))}")
        return
    if len(args) == 4 and args[2] == "--width":
        print("x".join(map(str, pixelize(Path(args[0]), Path(args[1]), int(args[3])))))
        return
    sys.exit(__doc__)


if __name__ == "__main__":
    main()
