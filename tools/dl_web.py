"""
dl_web.py - stáhne sprity z webových URL vypsaných v `docs/` souborech.

Formát vstupního docs souboru: řádek `# nazev` uvádí entitu, následující řádky
s URL (http…) jsou její obrázky. Ostatní řádky (popisy, prázdné) se ignorují.

SOUBOR SE SEKCEMI (docs/gen2_odkazy.txt, vygeneruje tools/gen_odkazy.py): řádek
`## typ` určí druh obrázku pro všechna `# id` pod ním, generaci bere z názvu
souboru (gen2_…) nebo z `--gen N`. Typy a cíle:
  gym-leaders  -> assets/gen<N>/gym-leaders/<id>/front.png   (1. funkční URL)
  badges       -> assets/gen<N>/badges/<id>.png              (1. funkční URL)
  npc          -> assets/gen<N>/npc/<id>.png                 (1. funkční URL)
  trainers     -> assets/gen<N>/trainers/<class>/<n>.png     (VŠECHNY URL, číslované)
  buildings    -> tools/_downloads/gen<N>/buildings/<id>.png (ZDROJ – budova se vždy
                  převede: pixelize_buildings.py <zdroj> assets/gen<N>/buildings/<id>.png --width N)
  backgrounds  -> assets/backgrounds/<biome>-<n>.png         (VŠECHNY URL, globální)

Starší soubory BEZ sekcí (`--mode`, generace `--gen`, výchozí 1):
  gym-leaders  docs/gym_leaders_gen1     -> assets/gen<N>/gym-leaders/<id>/front.png
  trainers     docs/trainer_sprites_gen1 -> assets/gen<N>/trainers/<class>/<n>.png
  badges       docs/badges               -> assets/gen<N>/badges/<id>.png
  backgrounds  docs/backgrounds          -> assets/backgrounds/<biome>-<n>.png

`<id>`/`<class>`/`<biome>` = slug hlavičky (malá písmena, mezery→pomlčky), takže
"Boulder badge" → "boulder-badge", "lt-surge" zůstane. Číslují se jen ÚSPĚŠNĚ
stažené (1..k souvisle), aby manifest (gen_sprite_manifest.py) seděl s realitou.

Vše se ukládá jako PNG (přes Pillow – sjednotí jpeg/webp/… na png). Fotky/thumbnaily
pak (kromě backgrounds) prožeň `tools/prep_sprite.py` (ořez + průhledné pozadí).

Použití:
  python tools/dl_web.py docs/gen2_odkazy.txt [--force]
  python tools/dl_web.py docs/gym_leaders_gen1 --mode gym-leaders [--gen 1] [--force]
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
DOWNLOADS = os.path.join(HERE, "_downloads")

# typ -> "single" (jen 1. funkční URL) / "multi" (všechny URL, číslované)
MODES = {
    "gym-leaders": "single",
    "trainers": "multi",
    "badges": "single",
    "npc": "single",
    "buildings": "single",
    "backgrounds": "multi",
}


def dest_for(typ, gen, name, n):
    """Cílová cesta souboru podle typu (n = pořadí úspěšného stažení od 0)."""
    g = os.path.join(ASSETS, f"gen{gen}")
    if typ == "gym-leaders":
        return os.path.join(g, "gym-leaders", name, "front.png")
    if typ == "badges":
        return os.path.join(g, "badges", f"{name}.png")
    if typ == "npc":
        return os.path.join(g, "npc", f"{name}.png")
    if typ == "trainers":
        return os.path.join(g, "trainers", name, f"{n + 1}.png")
    if typ == "buildings":
        return os.path.join(DOWNLOADS, f"gen{gen}", "buildings", f"{name}.png")
    return os.path.join(ASSETS, "backgrounds", f"{name}-{n + 1}.png")


def slug(header):
    s = header.strip().lstrip("#").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def parse_doc(path, default_type=None):
    """Vrátí [(typ, slug, [url, ...]), ...] v pořadí souboru. `## typ` mění typ
    pro další `# id`; bez sekcí platí `default_type` (z --mode)."""
    entries = []
    cur = None
    typ = default_type
    with open(path, encoding="utf-8") as f:
        for line in f:
            t = line.strip()
            if t.startswith("## "):
                typ = slug(t[3:])
                cur = None
            elif t.startswith("#"):
                cur = (typ, slug(t), [])
                entries.append(cur)
            elif t.lower().startswith("http") and cur is not None:
                cur[2].append(t)
    return [e for e in entries if e[2]]


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
    opt = lambda k: args[args.index(k) + 1] if k in args and args.index(k) + 1 < len(args) else None
    mode, gen_arg = opt("--mode"), opt("--gen")
    rest = [a for a in args if not a.startswith("--") and a not in (mode, gen_arg)]
    if not rest or (mode and mode not in MODES):
        print("Použití: python tools/dl_web.py <docs-soubor> [--mode "
              f"{'|'.join(MODES)}] [--gen N] [--force]")
        sys.exit(1)

    doc = rest[0]
    m = re.search(r"gen(\d+)", os.path.basename(doc))
    gen = int(gen_arg) if gen_arg else int(m.group(1)) if m else 1
    entries = parse_doc(doc, mode)
    if not entries:
        print("Žádné položky s odkazem (vlož URL pod `# id`).")
        return
    unknown = sorted({t for t, _, _ in entries if t not in MODES})
    if unknown:
        print(f"Neznámý typ sekce {unknown} – povolené: {', '.join(MODES)}. Bez sekcí použij --mode.")
        sys.exit(1)

    ok = skip = fail = 0
    done = {}  # typ -> [id] úspěšně stažených (pro připomínky na konci)
    for typ, name, urls in entries:
        kind = MODES[typ]
        n = 0  # počítadlo ÚSPĚŠNĚ uložených (číslování multi + stop u single)
        for url in urls:
            if kind == "single" and n >= 1:
                break
            dest = dest_for(typ, gen, name, n)
            if os.path.exists(dest) and not force:
                print(f"SKIP {os.path.relpath(dest, os.path.join(HERE, '..'))} (existuje)")
                skip += 1
                n += 1
                continue
            try:
                data = fetch_png(url)
                save(data, dest)
                print(f"OK  {os.path.relpath(dest, os.path.join(HERE, '..'))}  ({len(data)} B)")
                ok += 1
                n += 1
                done.setdefault(typ, []).append(name)
            except Exception as e:
                print(f"ERR {name} <- {url[:60]}…  {type(e).__name__}: {e}")
                fail += 1
                # single: spadne na další URL jako náhradu; multi: číslo nepřeskočíme

    print(f"\nHotovo [gen {gen}]: {ok} staženo, {skip} přeskočeno, {fail} chyb. Entit: {len(entries)}.")
    # Další kroky podle CLAUDE.md („Obrázky z odkazů").
    if done.get("buildings"):
        print("\nBudovy převeď na pixel art (šířku dej do WIDTH v nástroji):")
        for b in dict.fromkeys(done["buildings"]):
            print(f"  python tools/pixelize_buildings.py tools/_downloads/gen{gen}/buildings/{b}.png "
                  f"assets/gen{gen}/buildings/{b}.png --width N")
    if any(t in done for t in ("gym-leaders", "npc", "trainers", "badges")):
        print("\nPortréty / trenéry / odznaky ořízni a zprůhledni: tools/prep_sprite.py, tools/remove_bg.py")
    if done.get("trainers"):
        print("Trenéři: python tools/gen_sprite_manifest.py (počty variant)")
    if done:
        print(f"Hotové řádky smaž z docs/SPRITES-TODO-GEN{gen}.md a pusť python tools/gen_odkazy.py --gen {gen}.")


if __name__ == "__main__":
    main()
