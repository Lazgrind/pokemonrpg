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

## Dokumentace
- Deník a rozhodnutí: [`docs/NOTES.md`](docs/NOTES.md)
- Historie verzí: [`CHANGELOG.md`](CHANGELOG.md)
