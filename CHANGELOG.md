# CHANGELOG

Přehled toho, co jsme reálně udělali. Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/)
a projekt používá [sémantické verzování](https://semver.org/lang/cs/).

Typy změn: **Přidáno**, **Změněno**, **Opraveno**, **Odebráno**.
Podrobnosti k diskuzím a rozhodnutím viz [docs/NOTES.md](docs/NOTES.md).

## [Nevydáno]

## [0.8.1] – 2026-08-31 · Obrázkový sprite Pokémon Centra
### Přidáno
- Pixel-art sprite Pokémon Centra (dodal uživatel) → `sprite` v `data/buildings.js`. CSS fasáda zůstává fallback.
### Změněno
- Travnaté pozadí spritu odstraněno klíčováním podle zelené (Pillow) a ořezáno → průhledná budova. Zdroj `pokecenter.png` ponechán.

## [0.8.0] – 2026-08-31 · Druhá budova: Pokémon Centrum
### Přidáno
- Nová budova **Pokémon Centrum** (`data/buildings.js`): po každém vítězství doléčí aktivnímu Pokémonovi část max HP (Lv 1 = 10 %, +5 % za úroveň). Existuje od začátku, upgrade zvyšuje doléčení.
- `healPercent()` v `buildingSystem.js`; `battleSystem` doléčí hráče po výhře (mimo level-up, kde se HP plní na max) a zapíše to do logu.
- Detail budovy (`buildingView.js`) je nyní **datově obecný**: sekce a akce se skládají podle schopností budovy (`ball` = nákup Poké Ballů, `heal` = doléčení). Upgrade je společný.
- CSS fasáda Pokémon Centra (bílá klinika) jako fallback, když budova nemá obrázek.
### Rozhodnutí
- R-014: druhá budova = Pokémon Centrum; efekt „doléčení po vítězství" (celá čísla HP, škáluje s upgradem i max HP). Bez změny verze save – jen nový záznam v `city.buildings`.

## [0.7.0] – 2026-08-31 · Obrázkový sprite budovy (Poké Mart)
### Přidáno
- Grafické assety: složka `assets/buildings/` + pixel-art sprite Poké Martu (dodal uživatel).
- Budova se ve městě zobrazuje jako **obrázek** (pole `sprite` v `data/buildings.js`); CSS domeček zůstává jako fallback, když sprite chybí.
- `image-rendering: pixelated` pro ostrý pixel-art.
### Změněno
- Pozadí spritu odstraněno (flood fill z rohů přes Pillow) a ořezáno → průhledná budova na trávě.
### Rozhodnutí
- R-013: budovy mohou být obrázkové sprity (lokální assety, žádná závislost); vzhled řízený daty.

## [0.6.3] – 2026-08-31 · Poké Mart jako výloha (ne kostka)
### Změněno
- Budova už není jednobarevná kostka: **střecha (barva z dat) + krémové stěny** + čelní **výloha** (červená markýza, okna, vchod) – čistě CSS `clip-path`.
- Emoji budovy `🛒` → `🏪` (obchod).
### Přidáno
- Fasáda je stylovaná per budova (`.iso-b-<id>`), takže každá budova může mít vlastní vzhled.

## [0.6.2] – 2026-08-31 · Izometrické 2.5D město
### Změněno
- Město překresleno na **izometrické 2.5D** (čistě CSS, bez závislostí): budovy jsou prostorové domečky (střecha + 2 stěny přes `clip-path`) na travnaté ploše, volné parcely jako ploché kosočtverce.
- Barva střechy budovy je datová (`color` v `data/buildings.js`).
### Rozhodnutí
- R-012: vizualizace města = izometrické CSS (skutečné WebGL 3D odloženo jako pozdější volitelný upgrade – přidávalo by závislost a je to nejnižší priorita dle zadání).

## [0.6.1] – 2026-08-31 · Město jako klikatelná mapa
### Změněno
- Záložka **Město** už není seznam karet, ale **vizuální město**: budovy jsou dlaždice v mapě + volné parcely pro budoucí budovy.
- **Klik na budovu otevře její detail** (modal) s možnostmi (Koupit Poké Ball / Vylepšit); čísla se v něm živě aktualizují, zavření tlačítkem / Esc / klikem mimo.
### Přidáno
- `src/ui/buildingView.js` (detail budovy) + styly mapy města a detailu.

## [0.6.0] – 2026-08-31 · Krok 5 (město + building) → MVP hotovo
### Přidáno
- Koncept **City → Building**: datová definice `data/buildings.js` + logika `src/systems/buildingSystem.js`.
- První budova **Poké Mart**: nákup Poké Ballů za gold; **upgrade budovy snižuje cenu** (úrovně 1–10, cena vylepšení roste ×1,6).
- Funkční záložka **Město** `src/ui/cityView.js` (karta budovy, tlačítka Koupit / Vylepšit s disabled stavem) + styly budov.
- Stav rozšířen o `city.buildings`; migrace save **v2 → v3**.
### Změněno
- `CURRENT_SAVE_VERSION` = 3; `leftPanel` předává `onStatus` do města.
### Rozhodnutí
- R-010: první building = Poké Mart (nákup Poké Ballů, upgrade snižuje cenu). Tímto krokem je **MVP (Kroky 0–5) hotové**.

## [0.5.1] – 2026-08-31 · Oprava citlivosti offline progresu
### Opraveno
- Krátká nepřítomnost (~1 min) nezobrazovala žádný offline zisk. Příčiny: minimální práh 60 s a zaokrouhlení počtu poražených dolů (za krátkou dobu → 0).
### Změněno
- `MIN_OFFLINE_SECONDS` sníženo 60 → 15 s.
- Offline se počítá ze **zlomkového** počtu poražených (žádný ztracený progres); odměny se zaokrouhlují až nakonec. Přehled se ukáže, jakmile vyjde aspoň nějaké XP/gold/loot.

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
