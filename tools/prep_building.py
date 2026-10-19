"""
prep_building.py - odstrani POZADI budovy (i barevne: trava, obloha), ne jen bilou.

Budovy od uzivatele jsou casto cele sceny (budova nakreslena v prostredi s travou
a oblohou). prep_sprite.py umi odstranit jen bilou plochu; tenhle skript pouziva
BAREVNE-TOLERANTNI flood fill od okraju (region growing): pixel je pozadi, kdyz je
dosazitelny od okraje pres kroky, kde je barva dost blizka predchozimu pixelu.
Tim se odstrani spojita travnata/obloha plocha az k ostrele hrane budovy, ale
vnitrek budovy (jina barva / tmava obrysova linka) zustane.

Pak: orez na budovu (bbox neprusvitnych pixelu) -> zmenseni na TARGET (delsi strana)
-> vycentrovani na pruhledne platno CANVAS x CANVAS. Stejny vystupni format jako
prep_sprite.py (256x256, alfa).

Pouziti:
  python tools/prep_building.py <vstup.png> <vystup.png> [--tol N]

Rezim --normalize-only preskoci odstraneni pozadi a jen sjednoti velikost
(orez na bbox -> delsi strana = TARGET -> vycentrovani na CANVAS). Vhodne pro
uz pruhledne (rucne orezane) budovy, aby vsechny mely stejnou velikost obsahu:
  python tools/prep_building.py <vstup.png> <vystup.png> --normalize-only
"""

import sys
from collections import deque
from PIL import Image

CANVAS = 256
TARGET = 232
DEFAULT_TOL = 42  # L1 vzdalenost barev; travni/obloha texturu prekroci, ostrou hranu ne


def remove_bg(img, tol):
    """Flood fill od vsech okraju, UKOTVENY K BARVE SEMINKA.

    Kazdy okrajovy pixel je "seminko" se svou barvou. Soused se stane pozadim jen
    kdyz je do tol (L1) od barvy SEMINKA, ne od sousedniho pixelu. Tim se zabrani
    driftu pres antialiasovany prechod (napr. bezova strecha ma skoro stejny zeleny
    i modry kanal jako trava; lokalni flood by po malych krocich "premostil" do
    budovy). Ukotveni k seminku takovy most utne.
    """
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    bg = [[False] * w for _ in range(h)]
    q = deque()

    def push(x, y, seed):
        if not bg[y][x]:
            bg[y][x] = True
            q.append((x, y, seed))

    for x in range(w):
        push(x, 0, px[x, 0])
        push(x, h - 1, px[x, h - 1])
    for y in range(h):
        push(0, y, px[0, y])
        push(w - 1, y, px[w - 1, y])

    def close(a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2]) <= tol

    while q:
        x, y, seed = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not bg[ny][nx] and close(px[nx, ny], seed):
                bg[ny][nx] = True
                q.append((nx, ny, seed))

    for y in range(h):
        for x in range(w):
            if bg[y][x]:
                r, g, b, _ = px[x, y]
                px[x, y] = (r, g, b, 0)
    return img


def normalize(img):
    """Orez na budovu -> zmenseni na TARGET (delsi strana) -> vycentrovani na platno."""
    bbox = img.getbbox()
    if not bbox:
        return img
    cropped = img.crop(bbox)
    cw, ch = cropped.size
    scale = TARGET / max(cw, ch)
    nw, nh = max(1, round(cw * scale)), max(1, round(ch * scale))
    resample = Image.NEAREST if scale >= 1 else Image.LANCZOS
    resized = cropped.resize((nw, nh), resample)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.paste(resized, ((CANVAS - nw) // 2, (CANVAS - nh) // 2), resized)
    return canvas


def process(src, dst, tol, normalize_only=False):
    img = Image.open(src).convert("RGBA")
    out = normalize(img if normalize_only else remove_bg(img, tol))
    out.save(dst)
    bbox = out.getbbox()
    cw = (bbox[2] - bbox[0]) if bbox else 0
    ch = (bbox[3] - bbox[1]) if bbox else 0
    mode = "normalize-only" if normalize_only else f"tol={tol}"
    print(f"OK: {src} -> {dst}  budova {cw}x{ch} ({mode})")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    tol = DEFAULT_TOL
    if "--tol" in sys.argv:
        tol = int(sys.argv[sys.argv.index("--tol") + 1])
    normalize_only = "--normalize-only" in sys.argv
    if len(args) < 2:
        print("Pouziti: python tools/prep_building.py <vstup.png> <vystup.png> [--tol N] [--normalize-only]")
        sys.exit(1)
    process(args[0], args[1], tol, normalize_only)


if __name__ == "__main__":
    main()
