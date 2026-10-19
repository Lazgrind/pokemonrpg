"""
dl_web.py - stáhne sprity z webových URL vypsaných v `docs/` souborech.

Formát vstupního docs souboru: řádek `# nazev` uvádí entitu, následující řádky
s URL (http…) jsou její obrázky. Prázdné řádky a hlavičky bez URL se ignorují
(např. `# building` v backgrounds, co má jen poznámku).

Režimy (`--mode`) = kam a jak se ukládá:
  gym-leaders  docs/gym_leaders_gen1  -> assets/gym-leaders/<id>/front.png   (1. funkční URL)
  trainers     docs/trainer_sprites_gen1 -> assets/trainers/<class>/<n>.png  (VŠECHNY URL, číslované)
  badges       docs/badges            -> assets/badges/<id>.png              (1. funkční URL)
  backgrounds  docs/backgrounds       -> assets/backgrounds/<biome>-<n>.png  (VŠECHNY URL)

`<id>`/`<class>`/`<biome>` = slug hlavičky (malá písmena, mezery→pomlčky), takže
"Boulder badge" → "boulder-badge", "lt-surge" zůstane. Číslují se jen ÚSPĚŠNĚ
stažené (1..k souvisle), aby manifest (gen_sprite_manifest.py) seděl s realitou.

Vše se ukládá jako PNG (přes Pillow – sjednotí jpeg/webp/… na png). Fotky/thumbnaily
pak (kromě backgrounds) prožeň `tools/prep_sprite.py` (ořez + průhledné pozadí).

Použití:
  python tools/dl_web.py docs/gym_leaders_gen1 --mode gym-leaders [--force]
  python tools/dl_web.py docs/trainer_sprites_gen1 --mode trainers
  python tools/dl_web.py docs/badges --mode badges
  python tools/dl_web.py docs/backgrounds --mode backgrounds
"""

import io
import os
import re
import sys
import urllib.request

from PIL import Image

HERE = os.path.dirname(__file__)
ASSETS = os.path.join(HERE, "..", "assets")

# mode -> (podsložka v assets, "single" = jen 1. URL / "multi" = všechny URL)
MODES = {
    "gym-leaders": ("gym-leaders", "single"),
    "trainers": ("trainers", "multi"),
    "badges": ("badges", "single"),
    "backgrounds": ("backgrounds", "multi"),
}


def slug(header):
    s = header.strip().lstrip("#").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def parse_doc(path):
    """Vrátí [(slug, [url, ...]), ...] v pořadí, jak jdou v souboru."""
    entries = []
    cur = None
    with open(path, encoding="utf-8") as f:
        for line in f:
            t = line.strip()
            if t.startswith("#"):
                cur = (slug(t), [])
                entries.append(cur)
            elif t.lower().startswith("http") and cur is not None:
                cur[1].append(t)
    return [(name, urls) for name, urls in entries if urls]


def fetch_png(url):
    """Stáhne URL a vrátí PNG bajty (přes Pillow → sjednocení formátu)."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read()
    img = Image.open(io.BytesIO(raw)).convert("RGBA")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def save(data, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as f:
        f.write(data)


def main():
    args = sys.argv[1:]
    force = "--force" in args
    rest = [a for a in args if not a.startswith("--")]
    if "--mode" in args:
        mode = args[args.index("--mode") + 1]
        rest = [a for a in rest if a != mode]
    else:
        mode = None
    if not rest or mode not in MODES:
        print("Použití: python tools/dl_web.py <docs-soubor> --mode "
              f"{{{'|'.join(MODES)}}} [--force]")
        sys.exit(1)

    doc = rest[0]
    subdir, kind = MODES[mode]
    outroot = os.path.join(ASSETS, subdir)

    entries = parse_doc(doc)
    ok = skip = fail = 0
    for name, urls in entries:
        n = 0  # počítadlo ÚSPĚŠNĚ uložených (číslování multi + stop u single)
        for url in urls:
            # single (gym-leaders, badges): jakmile máme 1 soubor, dost.
            if kind == "single" and n >= 1:
                break
            # cílová cesta podle režimu (číslo = pořadí úspěšného stažení)
            if mode == "gym-leaders":
                dest = os.path.join(outroot, name, "front.png")
            elif mode == "badges":
                dest = os.path.join(outroot, f"{name}.png")
            elif mode == "trainers":
                dest = os.path.join(outroot, name, f"{n + 1}.png")
            else:  # backgrounds
                dest = os.path.join(outroot, f"{name}-{n + 1}.png")

            if os.path.exists(dest) and not force:
                print(f"SKIP {os.path.relpath(dest, ASSETS)} (existuje)")
                skip += 1
                n += 1
                continue
            try:
                data = fetch_png(url)
                save(data, dest)
                print(f"OK  {os.path.relpath(dest, ASSETS)}  ({len(data)} B)")
                ok += 1
                n += 1
            except Exception as e:
                print(f"ERR {name} <- {url[:60]}…  {type(e).__name__}: {e}")
                fail += 1
                # single: spadne na další URL jako náhradu; multi: číslo nepřeskočíme

    print(f"\nHotovo [{mode}]: {ok} staženo, {skip} přeskočeno, {fail} chyb. "
          f"Entit: {len(entries)}.")


if __name__ == "__main__":
    main()
