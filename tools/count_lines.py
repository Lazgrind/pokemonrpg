"""
count_lines.py – spočítá řádky napříč projektem a zapíše je do README.md.

Prochází celý projekt (kromě `assets/`, `.git/` a skrytých složek), počítá řádky
textových/zdrojových souborů podle přípony, roztřídí je do kategorií a přepíše
blok v README.md mezi značkami:

    <!-- LOC:START -->
    …tabulka…
    <!-- LOC:END -->

Spusť po větší změně, ať README ukazuje aktuální rozsah:

  python tools/count_lines.py            # přegeneruje blok v README.md
  python tools/count_lines.py --print    # jen vypíše, README nesahá

Číslo je „počet řádků celkově" – tedy vč. dokumentace a nástrojů, ne jen kódu.
"""

import os
import sys
from datetime import date

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, ".."))
README = os.path.join(ROOT, "README.md")

START = "<!-- LOC:START -->"
END = "<!-- LOC:END -->"

SKIP_DIRS = {"assets", ".git", "node_modules", "__pycache__"}

# přípona -> (kategorie, popisek); pořadí kategorií drží CATEGORIES
EXT_CATEGORY = {
    ".js": "Kód",
    ".css": "Kód",
    ".html": "Kód",
    ".py": "Nástroje",
    ".md": "Dokumentace",
}
CATEGORIES = ["Kód", "Nástroje", "Dokumentace"]

# Obrázky/grafika – počítají se napříč CELÝM repem VČETNĚ assets/ (sprity, mapy,
# pozadí, míčky i tvé vlastní speciální soubory). Pořadí drží IMAGE_EXTS.
IMAGE_EXTS = [".png", ".gif", ".jpg", ".jpeg", ".webp", ".svg", ".bmp", ".ico"]
# Složky, které i u obrázků přeskakujeme (verzovací / cache), assets/ se NEskáče.
IMG_SKIP_DIRS = {".git", "node_modules", "__pycache__"}


def count_lines(path):
    """Počet řádků souboru (tolerantní k binárnímu obsahu / kódování)."""
    try:
        with open(path, "rb") as f:
            return f.read().count(b"\n") + 1
    except OSError:
        return 0


def scan():
    """Vrátí {kategorie: {"files": n, "lines": n}} a celkový součet."""
    stats = {c: {"files": 0, "lines": 0} for c in CATEGORIES}
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for name in filenames:
            ext = os.path.splitext(name)[1].lower()
            cat = EXT_CATEGORY.get(ext)
            if not cat:
                continue
            stats[cat]["files"] += 1
            stats[cat]["lines"] += count_lines(os.path.join(dirpath, name))
    return stats


def scan_images():
    """Vrátí {přípona: počet} obrázků napříč repem (VČETNĚ assets/) + celkem."""
    counts = {ext: 0 for ext in IMAGE_EXTS}
    total_bytes = 0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in IMG_SKIP_DIRS and not d.startswith(".")]
        for name in filenames:
            ext = os.path.splitext(name)[1].lower()
            if ext in counts:
                counts[ext] += 1
                try:
                    total_bytes += os.path.getsize(os.path.join(dirpath, name))
                except OSError:
                    pass
    return counts, total_bytes


def fmt(n):
    """Číslo s mezerou jako oddělovačem tisíců (12345 → '12 345')."""
    return f"{n:,}".replace(",", " ")


def fmt_size(nbytes):
    """Velikost v čitelných jednotkách (KB/MB)."""
    if nbytes >= 1024 * 1024:
        return f"{nbytes / (1024 * 1024):.1f} MB"
    if nbytes >= 1024:
        return f"{nbytes / 1024:.0f} KB"
    return f"{nbytes} B"


def render(stats, images, image_bytes):
    total_lines = sum(s["lines"] for s in stats.values())
    total_files = sum(s["files"] for s in stats.values())
    lines = [
        START,
        f"**Celkem {fmt(total_lines)} řádků** v {total_files} souborech "
        f"(k {date.today().isoformat()}, bez `assets/`).",
        "",
        "| Kategorie | Soubory | Řádky |",
        "| --- | ---: | ---: |",
    ]
    for cat in CATEGORIES:
        s = stats[cat]
        lines.append(f"| {cat} | {s['files']} | {fmt(s['lines'])} |")
    lines.append(f"| **Celkem** | **{total_files}** | **{fmt(total_lines)}** |")

    # Obrázky/grafika (napříč celým repem vč. assets/: sprity, mapy, pozadí, …).
    total_imgs = sum(images.values())
    lines += [
        "",
        f"**Obrázků celkem: {fmt(total_imgs)}** ({fmt_size(image_bytes)}, vč. `assets/`).",
        "",
        "| Typ | Počet |",
        "| --- | ---: |",
    ]
    for ext in IMAGE_EXTS:
        if images.get(ext):
            lines.append(f"| `{ext}` | {fmt(images[ext])} |")
    lines.append(f"| **Celkem** | **{fmt(total_imgs)}** |")
    lines.append(END)
    return "\n".join(lines)


def update_readme(block):
    with open(README, encoding="utf-8") as f:
        text = f.read()
    if START in text and END in text:
        pre = text[: text.index(START)]
        post = text[text.index(END) + len(END):]
        new = pre + block + post
    else:
        # blok ještě není → přidej sekci na konec
        new = text.rstrip() + "\n\n## Rozsah projektu\n" + block + "\n"
    with open(README, "w", encoding="utf-8", newline="\n") as f:
        f.write(new)


def main():
    stats = scan()
    images, image_bytes = scan_images()
    block = render(stats, images, image_bytes)
    if "--print" in sys.argv:
        print(block)
        return
    update_readme(block)
    total = sum(s["lines"] for s in stats.values())
    total_imgs = sum(images.values())
    print(f"README.md aktualizováno: {total} řádků, {total_imgs} obrázků.")


if __name__ == "__main__":
    main()
