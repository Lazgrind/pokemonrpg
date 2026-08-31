# CHANGELOG

Přehled toho, co jsme reálně udělali. Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/)
a projekt používá [sémantické verzování](https://semver.org/lang/cs/).

Typy změn: **Přidáno**, **Změněno**, **Opraveno**, **Odebráno**.
Podrobnosti k diskuzím a rozhodnutím viz [docs/NOTES.md](docs/NOTES.md).

## [Nevydáno]

## [0.5.0] – 2026-08-31 · Krok 4 (idle/offline progres + loot)
### Přidáno
- **Offline (idle) progres** `src/systems/idle.js`: po návratu dopočítá odměnu za dobu pryč (odhad podle síly), se stropem 8 h. Počítá se jen z běžícího souboje.
- Konstanta `OFFLINE_EFFICIENCY = 0.1` – offline je záměrně 10× slabší než aktivní hraní (laditelné jedním číslem).
- **Loot** `src/systems/loot.js` (`rollLoot`, `expectedLoot`) + datová drop tabulka v `data/areas.js` (Route 1: šance na Poké Ball).
- Přehledový panel po návratu `src/ui/offlineView.js` (kolik času pryč, poražení, XP, gold, loot) + styly modalu.
- Sdílené vzorce v `battleSystem.js`: `battleRewards`, `avgDamage`, `makeCombatant`, `lootLabel` (jeden zdroj pravdy pro souboj i idle).
### Změněno
- `handleFaint` losuje loot z oblasti a přičítá ho do zdrojů (+ zápis do logu).
- `src/main.js`: po načtení aplikuje offline progres (před obnovou souboje) a zobrazí přehled; hned uloží (reset `lastSaved`).
### Rozhodnutí
- R-008 (v0.4.1), R-009: idle model = odhad podle síly, offline účinnost 1/10, loot minimální (drop Poké Ball).

## [0.4.1] – 2026-08-31 · Přímý save souboje
### Opraveno
- **F5 už „neoživuje“ Pokémony.** Rozehraný souboj (HP hráče i nepřítele, log, oblast, rychlost, pořadí týmu) se ukládá do save a po načtení se obnoví – pozastavený, hráč ho znovu rozběhne tlačítkem.
### Přidáno
- `serialize()` / `restore()` v `src/systems/battleSystem.js`; `persist()` volaný v `emit()` promítá souboj do herního stavu.
- Pole `battle` v herním stavu (`createNewGame`); migrace save **v1 → v2** doplní `battle: null`.
### Změněno
- `CURRENT_SAVE_VERSION` = 2.
- `src/main.js` po načtení/založení hry volá `restore(getState().battle)`.

## [0.4.0] – 2026-08-31 · Krok 3 (Battle Area)
### Přidáno
- Typová efektivita `data/types.js` (`typeMultiplier`).
- Progression `src/systems/progression.js` (`xpForNextLevel`, `grantXp`).
- `computeStats` v `src/systems/pokemonSystem.js`.
- Battle systém `src/systems/battleSystem.js`: auto souboj, damage s typy, XP/level, gold, start/pauza, rychlost 1/2/4×, `stopBattle`.
- Vizuální `src/ui/battleView.js`: HP bary, ovládání, log.
- Událost `BATTLE_UPDATE`; styly Battle Area.
### Změněno
- `saveControls.js` volá `stopBattle` při Nové hře / Importu.
### Rozhodnutí
- R-007: battle MVP = typová efektivita + auto režim se start/pauzou a rychlostí.

## [0.3.0] – 2026-08-31 · Krok 2 (tým a získávání Pokémonů)
### Přidáno
- Pokémon systém `src/systems/pokemonSystem.js` (`createPokemon`).
- Team systém `src/systems/team.js`: `chooseStarter`, `catchWild`, `addToTeam`, `removeFromTeam`, `moveInTeam`, `getTeamPokemon`, `isInTeam`.
- UI záložky levého panelu Tým / Kolekce / Město: `src/ui/leftPanel.js`, `src/ui/teamView.js`.
- Styly záložek, odznaků typů a prvků týmu.
### Změněno
- `src/main.js` používá `renderLeftPanel` a překresluje ho při změně stavu.
### Rozhodnutí
- R-006: levý panel se záložkami (zachovává tři panely dle zadání).

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
