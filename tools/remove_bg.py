"""
remove_bg.py – odstranění bílého pozadí u spritu flood fillem od okrajů.

Nepálí všechny bílé pixely (to by sežralo světlé břicho uvnitž postavy), ale
jen souvislou bílou plochu spojenou s okrajem obrázku. Anti-aliased lem kolem
postavy navíc změkčíme částečnou průhledností podle „bělosti" pixelu.

Použití: python tools/remove_bg.py <vstup.png> [<výstup.png>]
"""

import sys
from collections import deque
from PIL import Image


def is_whitish(px, min_ch=200, max_sat=30):
    """Světlý, málo sytý (bílá/šedá) pixel = kandidát na pozadí."""
    r, g, b = px[0], px[1], px[2]
    return min(r, g, b) >= min_ch and (max(r, g, b) - min(r, g, b)) <= max_sat


def main():
    if len(sys.argv) < 2:
        print("Použití: python tools/remove_bg.py <vstup.png> [<výstup.png>]")
        sys.exit(1)
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else src

    img = Image.open(src).convert("RGBA")
    w, h = img.size
    px = img.load()

    # 1) Flood fill od všech okrajových pixelů: souvislé bílé = pozadí → alpha 0.
    bg = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_whitish(px[x, y]) and not bg[y][x]:
                bg[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_whitish(px[x, y]) and not bg[y][x]:
                bg[y][x] = True
                q.append((x, y))

    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not bg[ny][nx] and is_whitish(px[nx, ny]):
                bg[ny][nx] = True
                q.append((nx, ny))

    removed = 0
    for y in range(h):
        for x in range(w):
            if bg[y][x]:
                r, g, b, _ = px[x, y]
                px[x, y] = (r, g, b, 0)
                removed += 1

    # 2) Změkčení lemu: neodstraněný pixel, který ale sousedí s pozadím a je dost
    #    světlý, dostane částečnou průhlednost úměrnou své „bělosti" (potlačí
    #    bílý halo z anti-aliasingu, aniž bychom ukrojili barevné tělo).
    feathered = 0
    for y in range(h):
        for x in range(w):
            if bg[y][x]:
                continue
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            touches_bg = any(
                0 <= x + dx < w and 0 <= y + dy < h and bg[y + dy][x + dx]
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
            )
            if not touches_bg:
                continue
            lightness = min(r, g, b)  # jak blízko bílé (0–255)
            if lightness >= 210:
                new_a = int(a * (255 - lightness) / 45)  # 210→plná, 255→0
                if new_a < a:
                    px[x, y] = (r, g, b, new_a)
                    feathered += 1

    img.save(dst)
    print(f"OK: {src} -> {dst}  (pozadí {removed}px, lem {feathered}px)")


if __name__ == "__main__":
    main()
