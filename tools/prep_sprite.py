"""
prep_sprite.py – příprava spritu Pokémona do jednotné podoby:
  1) odstraní pozadí (bílá / světlá šachovnice) flood fillem od okrajů,
  2) ořízne na skutečnou postavu (bounding box neprůhledných pixelů),
  3) zmenší tak, aby delší strana postavy měla TARGET px (poměr stran zachován),
  4) vycentruje na průhledné čtvercové plátno CANVAS×CANVAS.

Tím jsou všechny postavičky „stejně velké" – největší rozměr sedí na TARGET a
sedí ve stejně velkém plátně, takže se dají renderovat jednotně.

Použití:
  python tools/prep_sprite.py <vstup.png> [<výstup.png>]   – jeden soubor
  python tools/prep_sprite.py <složka>                      – dávka (všechny .png
                                                              rekurzivně, na místě)
  přidej  --force                                           – přepracovat i už
                                                              hotové (256x256+alfa)
"""

import sys
from collections import deque
from pathlib import Path
from PIL import Image

CANVAS = 256   # velikost výsledného čtvercového plátna
TARGET = 232   # na kolik px se škáluje delší strana postavy (zbytek = okraj)


def is_whitish(px, min_ch=200, max_sat=30):
    """Světlý, málo sytý pixel (bílá / šedá šachovnice) = kandidát na pozadí."""
    r, g, b = px[0], px[1], px[2]
    return min(r, g, b) >= min_ch and (max(r, g, b) - min(r, g, b)) <= max_sat


def remove_bg(img):
    """Flood fill od okrajů: souvislé světlé pozadí → alpha 0. Vrací nový obrázek."""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    bg = [[False] * w for _ in range(h)]
    q = deque()

    def seed(x, y):
        if is_whitish(px[x, y]) and not bg[y][x]:
            bg[y][x] = True
            q.append((x, y))

    for x in range(w):
        seed(x, 0); seed(x, h - 1)
    for y in range(h):
        seed(0, y); seed(w - 1, y)

    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not bg[ny][nx] and is_whitish(px[nx, ny]):
                bg[ny][nx] = True
                q.append((nx, ny))

    for y in range(h):
        for x in range(w):
            if bg[y][x]:
                r, g, b, _ = px[x, y]
                px[x, y] = (r, g, b, 0)
    return img


def normalize(img):
    """Ořez na postavu → zmenšení na TARGET (delší strana) → vycentrování na plátno."""
    bbox = img.getbbox()
    if not bbox:
        return img
    cropped = img.crop(bbox)
    cw, ch = cropped.size
    scale = TARGET / max(cw, ch)
    nw, nh = max(1, round(cw * scale)), max(1, round(ch * scale))
    # Zvětšování → NEAREST (ostrý pixel-art, sedí k `image-rendering: pixelated`);
    # zmenšování → LANCZOS (hladké okraje bez aliasu u velkých/rozmazaných zdrojů).
    resample = Image.NEAREST if scale >= 1 else Image.LANCZOS
    resized = cropped.resize((nw, nh), resample)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.paste(resized, ((CANVAS - nw) // 2, (CANVAS - nh) // 2), resized)
    return canvas


def already_done(img):
    """Je obrázek už ve standardu? (CANVAS×CANVAS a má průhledné pozadí.)"""
    if img.size != (CANVAS, CANVAS):
        return False
    a = img.convert("RGBA").split()[3]
    return a.getextrema()[0] == 0  # existuje aspoň jeden plně průhledný pixel


def process(src, dst, force=False):
    img = Image.open(src)
    if not force and already_done(img):
        print(f"SKIP (už hotové): {src}")
        return
    out = normalize(remove_bg(img))
    out.save(dst)
    bbox = out.getbbox()
    cw = (bbox[2] - bbox[0]) if bbox else 0
    ch = (bbox[3] - bbox[1]) if bbox else 0
    print(f"OK: {src} -> {dst}  plátno {CANVAS}x{CANVAS}, postava {cw}x{ch}")


def main():
    args = [a for a in sys.argv[1:] if a != "--force"]
    force = "--force" in sys.argv
    if not args:
        print("Použití: python tools/prep_sprite.py <vstup.png|složka> [<výstup.png>] [--force]")
        sys.exit(1)

    target = Path(args[0])
    if target.is_dir():
        # Dávka: všechny .png rekurzivně, přepis na místě. Přeskočí _dočasné.
        pngs = sorted(p for p in target.rglob("*.png") if not p.name.startswith("_"))
        if not pngs:
            print(f"Ve složce {target} nejsou žádné .png.")
            return
        for p in pngs:
            process(str(p), str(p), force)
        print(f"Hotovo: zpracováno {len(pngs)} souborů (nová = zpracovaná, hotová přeskočená).")
    else:
        dst = args[1] if len(args) > 1 else str(target)
        process(str(target), dst, force)


if __name__ == "__main__":
    main()
