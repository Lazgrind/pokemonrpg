# Pokémon Idle RPG

Webová **idle RPG** hra inspirovaná světem Pokémonů. Buduje se postupně od malého
MVP až po rozsáhlou hru (regiony, souboje, město, questy, …). Hostováno na GitHub Pages.

## Technologie
- Čisté **HTML + CSS + JavaScript (ES moduly)** — bez build kroku.
- Architektura odděluje **DATA → SYSTEM → UI** (viz `docs/NOTES.md`).

## Struktura
```
index.html        vstupní bod
css/              styly
src/
  main.js         bootstrap + herní smyčka
  core/           jádro (verze, stav, loop)
  systems/        herní logika (battle, team, save, …) — přibývá v dalších krocích
  ui/             vykreslování (cityView, battleView, mapView)
data/             herní data (pokemon, moves, items, areas, …)
assets/           obrázky, sprity, zvuky
docs/NOTES.md     deník projektu a rozhodnutí
CHANGELOG.md      verzovaný přehled změn
```

## Lokální spuštění (local build)
ES moduly potřebují lokální server (ne otevření souboru přes `file://`):

```bash
# ve složce projektu
python -m http.server 8000
# pak v prohlížeči otevři:
# http://localhost:8000
```

## Rozsah projektu
<!-- LOC:START -->
**Celkem 63 540 řádků** v 177 souborech (k 2026-10-30, bez `assets/`).

| Kategorie | Soubory | Řádky |
| --- | ---: | ---: |
| Kód | 144 | 53 229 |
| Nástroje | 24 | 3 701 |
| Dokumentace | 9 | 6 610 |
| **Celkem** | **177** | **63 540** |

**Obrázků celkem: 2 531** (46.0 MB, vč. `assets/`).

| Typ | Počet |
| --- | ---: |
| `.png` | 1 419 |
| `.gif` | 1 108 |
| `.jpg` | 1 |
| `.webp` | 3 |
| **Celkem** | **2 531** |
<!-- LOC:END -->

Přegenerování: `python tools/count_lines.py`

## Dokumentace
- Deník a rozhodnutí: [`docs/NOTES.md`](docs/NOTES.md)
- Historie verzí: [`CHANGELOG.md`](CHANGELOG.md)
