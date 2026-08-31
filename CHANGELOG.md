# CHANGELOG

Přehled toho, co jsme reálně udělali. Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/)
a projekt používá [sémantické verzování](https://semver.org/lang/cs/).

Typy změn: **Přidáno**, **Změněno**, **Opraveno**, **Odebráno**.
Podrobnosti k diskuzím a rozhodnutím viz [docs/NOTES.md](docs/NOTES.md).

## [Nevydáno]

## [0.2.0] – 2026-08-31 · Krok 1 (perzistentní základ)
### Přidáno
- Event sběrnice `src/core/events.js` (oddělení logiky od UI).
- Jádro herního stavu `src/core/state.js` (`GameState`, `createNewGame`, verzování `saveVersion`, `MAX_TEAM_SIZE`).
- Save systém `src/systems/save.js`: localStorage, autosave, verzovaný save s migrací, **export/import do .txt**.
- Datová vrstva `data/pokemon.js` (5 druhů: Bulbasaur, Charmander, Squirtle, Pidgey, Rattata + `getSpecies`).
- UI `src/ui/saveControls.js`: tlačítka Uložit / Export / Import / Nová hra.
- Zdrojová lišta napojená na reálný stav (Gold, Poké Balls, počet Pokémonů).
### Změněno
- `src/main.js`: bootstrap načítá/zakládá hru, napojuje UI na `STATE_CHANGED`, autosave à 30 s + při zavření karty.

## [0.1.0] – 2026-08-31 · Krok 0 (kostra projektu)
### Přidáno
- Projektová dokumentace: `docs/NOTES.md` (deník) a `CHANGELOG.md` (tento soubor).
- Schválena rozhodnutí R-001 až R-005 (technologie, architektura, roadmapa, dokumentace, testování).
- Kostra projektu: `index.html`, `css/main.css`.
- Modulární JS: `src/main.js` (bootstrap), `src/core/version.js`, UI moduly
  `src/ui/{cityView,battleView,mapView}.js`.
- Datová vrstva – ukázka: `data/areas.js` (první oblast Route 1).
- Rozvržení hlavní obrazovky: vlevo město, vpravo nahoře Battle Area, vpravo dole mapa.
- `.nojekyll`, `.gitignore`, aktualizovaný `README.md`.

---

## [0.0.0] – 2026-08-31
### Přidáno
- Založení repozitáře, prázdný `README.md` (Initial commit).
- Ověření git workflow z pracovního počítače (klon + push přes HTTPS funguje).
