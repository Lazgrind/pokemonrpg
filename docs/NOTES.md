# NOTES – deník projektu Pokémon Idle RPG

Chronologický záznam všeho, o čem se bavíme: diskuze, rozhodnutí, otázky, nápady.
Nejnovější nahoře. Slouží k tomu, abychom vše zpětně dohledali.

> **Stav nasazení:** GitHub Pages zapnuto a funkční na https://lazgrind.github.io/pokemonrpg/ (repo je veřejné → Pages zdarma). Ověřeno 2026-08-31.

Legenda stavů rozhodnutí:
- 🟡 **NÁVRH** – navrženo, čeká na potvrzení
- 🟢 **SCHVÁLENO** – odsouhlaseno, platí
- 🔴 **ZAMÍTNUTO** – neschváleno / opuštěno
- ⚪ **OTEVŘENO** – k dořešení později

---

## 2026-08-31 – Izometrické 2.5D město (v0.6.2)

### Zpětná vazba uživatele
- Mřížka čtverců mu nestačila, chtěl **3D vizualizaci města**.

### Rozhodnutí (probráno jako větší feature)
- Nabídnuty 3 cesty: A) izometrické 2.5D (CSS), B) skutečné 3D (Three.js/WebGL), C) 2D ilustrované.
- Upozornění: skutečné 3D přidává externí závislost, výrazně složitější kód, potřebuje víc prostoru než úzký levý panel, a vzhled je dle zadání nejnižší priorita.
- **R-012 🟢 Vizualizace města = izometrické 2.5D (CSS).** (schváleno 2026-08-31)
  - WebGL 3D odloženo jako pozdější volitelný upgrade (klidně v celoobrazovkovém režimu města).

### Co jsme udělali
- `cityView.js` + CSS: izometrické domečky (střecha + 2 stěny přes `clip-path`, stínování přes `brightness`), travnatá plocha, volné parcely jako ploché kosočtverce, hover „nadzvednutí“.
- Barva střechy je datová (`color` v `data/buildings.js`).
- Detail budovy (modal z v0.6.1) beze změny.
- Otestováno v local buildu (moduly HTTP 200).

### K ověření uživatelem v prohlížeči (tvrdý refresh!)
- Záložka Město ukáže izometrické domky na trávě; Poké Mart je klikatelný a otevře detail; volné parcely jsou naznačené.

---

## 2026-08-31 – Město jako klikatelná mapa (v0.6.1)

### Zpětná vazba uživatele
- Budovy nechtěl jako seznam, ale jako **skutečné město**, kde se klikne na jednotlivou budovu a otevře se její menu s možnostmi.

### Co jsme udělali
- `cityView.js` přepsán na **mapu města**: budovy = klikatelné dlaždice (ikona, název, úroveň) + volné parcely (🏗️) naznačující růst města.
- Nový `src/ui/buildingView.js`: **detail budovy jako modal** – po kliknutí na budovu; možnosti (Koupit Poké Ball / Vylepšit), živě aktualizovaná čísla (přes STATE_CHANGED), zavření tlačítkem / Esc / klikem mimo.
- Styly mapy města (`.city-map`, `.plot`…) a detailu budovy.
- Bez zásahu do herní logiky/dat (jen UI) – `buildingSystem.js` a `data/buildings.js` beze změny.
- Otestováno v local buildu (moduly HTTP 200).

### Rozhodnutí
- **R-011 🟢 Město jako vizuální klikatelná mapa; možnosti budovy v detailu (modal).** (schváleno 2026-08-31)
  - Rozšiřitelné: přidání budovy = jen data; volné parcely dají prostor pro růst.

### K ověření uživatelem v prohlížeči
- Záložka Město ukáže mapu; klik na Poké Mart otevře detail s nákupem/vylepšením; zavření funguje; po akci se čísla i úroveň dlaždice aktualizují.

---

## 2026-08-31 – Krok 5: město + building → MVP hotovo (v0.6.0)

### Co jsme udělali
- Zaveden koncept **City → Building**: `data/buildings.js` (definice, cenové křivky) + `src/systems/buildingSystem.js` (`getLevel`, `upgradeCost`, `upgradeBuilding`, `ballPrice`, `buyPokeballs`).
- První budova **Poké Mart**: nákup Poké Ballů za gold; vylepšení budovy (Lv 1–10) postupně snižuje cenu Poké Ballu (z 30 na min. 6). Cena vylepšení roste ×1,6.
- Funkční záložka **Město** `src/ui/cityView.js` (karta budovy, tlačítka Koupit / Vylepšit, disabled při nedostatku goldu). Styly budov + disabled tlačítek.
- Stav rozšířen o `city.buildings`, `CURRENT_SAVE_VERSION = 3`, migrace v2 → v3.
- Otestováno v local buildu (moduly HTTP 200).

### Rozhodnutí
- **R-010 🟢 První building = Poké Mart (nákup Poké Ballů, upgrade snižuje cenu).** (schváleno 2026-08-31)
  - Uzavírá ekonomickou smyčku: gold z bojů/idle → Poké Bally → víc chytání → větší tým.
  - Budovy jsou datově řízené; další budovy (bonus gold/XP, léčení…) půjdou přidat jen do dat.

### 🎉 MVP hotové
- Tímto krokem jsou splněné **Kroky 0–5** z roadmapy (R-003): kostra → save → tým → souboj → idle/loot → město. Hra má kompletní základní smyčku.

### K ověření uživatelem v prohlížeči
- Záložka **Město**: kup Poké Ball (ubere gold, přidá Poké Ball v liště); vylepši Poké Mart (ubere gold, zvýší Lv, klesne cena Poké Ballu); tlačítka se samy zablokují při nedostatku goldu; vše přežije refresh; starý save se načte (migrace na v3).

### Další na řadě (po MVP)
- ⚪ Rozšíření obsahu: víc oblastí, víc druhů Pokémonů, další budovy, Move systém, questy – vše převážně přidáváním dat.

---

## 2026-08-31 – Krok 4: idle/offline progres + loot (v0.5.0)

### Co jsme udělali
- **Idle systém** `src/systems/idle.js`: `applyOfflineProgress(savedBattle, elapsedMs)` – z uloženého souboje odhadne rychlost zabíjení (průměrný damage vs HP nepřítele), spočítá počet poražených za čas pryč × `OFFLINE_EFFICIENCY`, aplikuje XP/gold/loot. Počítá se jen z **běžícího** uloženého souboje; strop `OFFLINE_CAP_HOURS = 8`; ignoruje pauzy < 60 s.
- **Loot systém** `src/systems/loot.js`: `rollLoot(area)` (aktivní souboj) a `expectedLoot(area, kills)` (offline průměr). Drop tabulka je v datech oblasti (`data/areas.js` → Route 1: 12% šance na Poké Ball).
- Sdílené vzorce vytaženy z `battleSystem.js`: `battleRewards`, `avgDamage`, `makeCombatant`, `lootLabel` (jeden zdroj pravdy).
- `handleFaint` nově losuje a připisuje loot + píše ho do logu.
- `main.js`: offline se počítá ze snímku PŘED `restore` (jinak by běh přepsal na pauzu), pak přehled `src/ui/offlineView.js` a okamžité uložení (reset `lastSaved` → žádné dvojí počítání).
- Otestováno v local buildu (moduly HTTP 200).

### Rozhodnutí
- **R-009 🟢 Idle model = odhad podle síly; offline účinnost 1/10; loot minimální.** (schváleno 2026-08-31)
  - Uživatel chtěl offline záměrně slabší, aby návrat po 8 h nebyl jako 8 h aktivní hry. Zvoleno `OFFLINE_EFFICIENCY = 0.1` (jedna laditelná konstanta – Claude mírně preferuje ~1/4, doladíme podle reálných čísel).
  - Progres se počítá jen když hráč nechal souboj běžet (pauza/stop = neidluje) – intuitivní a čisté.
  - Loot zatím bez Item/Inventory systému: dropy jsou datově řízené a jdou přímo do `resources` (zatím Poké Ball). Plný inventář přijde později.

### K ověření uživatelem v prohlížeči
- Spusť souboj, nech ho **běžet**, zavři/refresh a vrať se za chvíli → po návratu se ukáže panel „Vítej zpět!“ s XP/gold/lootem (řádově 1/10 aktivního zisku).
- Kontrola nerfu: srovnej zisk za X minut aktivního hraní vs X minut offline – offline má být výrazně nižší.
- Loot: v aktivním souboji občas v logu přibude „+1 Poké Ball“ a počet Poké Balls v liště roste.
- Pauznutý/ukončený souboj = po návratu žádný offline zisk.

### Další na řadě
- ⚪ Krok 5: malé město + jeden building upgrade → dokončení MVP.

---

## 2026-08-31 – Oprava: přímý save souboje (v0.4.1)

### Zpětná vazba uživatele
- Po testu Kroku 3: „Vše vypadá super, akorát F5 mi oživý pokemony, takže to jakoby není ‚přímý save‘.“
- V R-007 byl souboj záměrně transient (mezi souboji i po refreshi plné HP). Uživatel to považuje za chybu – chce, aby refresh zachoval stav.

### Co jsme udělali
- Souboj se nyní **ukládá do save** a po načtení obnoví (pozastavený).
- `battleSystem.js`: `serialize()` (snapshot: oblast, rychlost, běží/výsledek, teamCursor, log, hráč uid+HP, nepřítel druh+level+HP), `restore(saved)` (znovu sestaví bojovníky, souboj `running=false`), `persist()` volaný v `emit()`.
- `state.js`: pole `battle` v `createNewGame`, `CURRENT_SAVE_VERSION = 2`.
- `save.js`: migrace v1 → v2 doplní `battle: null`.
- `main.js`: po načtení/založení volá `restore(getState().battle)`.
- Otestováno v local buildu (moduly HTTP 200).

### Rozhodnutí
- **R-008 🟢 „Přímý save“ souboje.** Rozehraný souboj přežije refresh a obnoví se pozastavený. (schváleno 2026-08-31)
  - Upřesňuje R-007: souboj už není čistě transient. Připravuje půdu pro Krok 4 (idle/offline progres).

### K ověření uživatelem v prohlížeči
- Spustit souboj → F5: HP hráče i nepřítele, log a nepřítel zůstanou; souboj je pozastavený a tlačítkem se znovu rozběhne (žádné „oživení“ na plné HP).

### Další na řadě
- ⚪ Krok 4: jedna oblast + idle/offline progres + základní loot.

---

## 2026-08-31 – Krok 3: Battle Area (v0.4.0)

### Co jsme udělali
- Datová tabulka typové efektivity `data/types.js` + `typeMultiplier`.
- `computeStats` v `pokemonSystem.js` (staty z base + level).
- Progression `src/systems/progression.js` (XP křivka, level-up).
- Battle systém `src/systems/battleSystem.js`: automatický souboj, kola dle rychlosti, damage s typovou efektivitou, XP+level, gold odměna, střídání týmu, prohra; start/pauza/rychlost; `stopBattle`.
- Vizuální `src/ui/battleView.js`: HP bary, VS layout, ovládání, log.
- `stopBattle` napojen na Nová hra / Import v `saveControls.js`.
- Otestováno v local buildu (moduly HTTP 200).

### Rozhodnutí
- **R-007 🟢 Battle MVP: damage s typovou efektivitou (datová tabulka) + auto režim se start/pauzou a rychlostí 1/2/4×.** (schváleno 2026-08-31)
  - Manuální výběr útoků a Move systém přijdou později. Souboj je transient (neukládá se), do save jde jen výsledek (XP/level/gold). Mezi souboji se Pokémon léčí na plné HP (zjednodušení MVP).

### K ověření uživatelem v prohlížeči
- Battle Area → Start: HP bary klesají, log běží, super efektivní/slabé zásahy; přepínání rychlosti; po výhře další nepřítel; gold v liště roste; level-up při dostatku XP; prohra při vyřazení celého týmu.

### Další na řadě
- ⚪ Krok 4: jedna oblast + idle/offline progres + základní loot.

---

## 2026-08-31 – Krok 2: tým a získávání Pokémonů (v0.3.0)

### Co jsme udělali
- Pokémon systém (`src/systems/pokemonSystem.js`) – tvorba jedinců z druhů.
- Team systém (`src/systems/team.js`) – výběr startéra, chytání divokých (za Poké Ball), přidání/odebrání/řazení v týmu (max 6), pomocné funkce.
- UI: levý panel má záložky Tým / Kolekce / Město (`src/ui/leftPanel.js`, `src/ui/teamView.js`).
- Napojeno v `main.js` (překreslení levého panelu na změnu stavu).
- Otestováno v local buildu (moduly HTTP 200).

### Rozhodnutí
- **R-006 🟢 Levý panel se záložkami (Tým / Kolekce / Město).** (schváleno 2026-08-31)
  - Proč: tým i správa Pokémonů potřebují místo; zachováváme tři panely dle zadání a jen zpřehledňujeme levý sloupec. Zadání layout povoluje měnit (sekce 16).

### K ověření uživatelem v prohlížeči
- Nová hra → záložka Kolekce nabídne startéra; po výběru je v týmu.
- Chytání divokých ubírá Poké Balls a plní kolekci; přidání do týmu respektuje max 6; řazení a odebírání funguje; vše přežije refresh.

### Další na řadě
- ⚪ Krok 3: vizuální Battle Area + automatický souboj + XP/level.

---

## 2026-08-31 – Krok 1: perzistentní základ (v0.2.0)

### Co jsme udělali
- Rozhodnutí uživatele: pokračovat ve vývoji lokálně (local build), verze posílat na GitHub po každém hotovém kroku.
- Postaven základ perzistence: event sběrnice, jádro stavu, save systém, datová vrstva Pokémonů, UI pro save.
- Implementováno: `src/core/events.js`, `src/core/state.js`, `src/systems/save.js`, `data/pokemon.js`, `src/ui/saveControls.js`; upraven `src/main.js`; zdrojová lišta čte reálný stav.
- Save je verzovaný (`saveVersion`) s připraveným migračním bodem; export/import přes .txt dle zadání (sekce 7, 15).
- Otestováno v local buildu (všechny moduly HTTP 200).

### K ověření uživatelem v prohlížeči
- Tlačítka Uložit / Export / Import / Nová hra fungují, stav přežije refresh (localStorage), export stáhne .txt, import ho načte zpět.

### Další na řadě
- ⚪ Krok 2: tým (max 6) + získání startovních Pokémonů.

---

## 2026-08-31 – Zahájení projektu

### O čem jsme se bavili
- Naučili jsme se naklonovat a otestovat repozitář z pracovního (firemního) počítače.
- Ověřili jsme technické prostředí a dostupnost GitHubu.
- Přečetli jsme kompletní zadání `Zadání ver. 1.0.docx` (22 sekcí).
- Navrhl jsem technologii, architekturu a postup po krocích.
- Zavedli jsme tuto dokumentaci (NOTES.md + CHANGELOG.md).

### Zjištění o prostředí
- Git 2.54, účet: Dominik Šamanek / dominik.samanek@t-mobile.cz.
- **GitHub přes HTTPS funguje** (klon i push ověřeny). **SSH (port 22) je blokován** firewallem → používáme HTTPS remotes.
- **Node.js / npm nejsou nainstalované** → volíme technologii bez build kroku.
- **Python 3.14.6 je dostupný** (`python` / `py`) → použijeme ho jako lokální server pro testování (`python -m http.server`).
- Repo: https://github.com/Lazgrind/pokemonrpg.git (větev `main`).

### Rozhodnutí k projednání
Detaily a odůvodnění jsou u každého bodu níže; stav se aktualizuje po potvrzení.

- **R-001 🟢 Technologie: Vanilla JavaScript + nativní ES moduly, bez build kroku.** (schváleno 2026-08-31)
  - Proč: není Node/npm; zadání chce jednoduchý deployment; ES moduly pokryjí modularitu.
  - Alternativa (zamítnuto pro teď): TypeScript + Vite – potřebuje build nástroje, které nemáme. Náhrada: typová nápověda přes JSDoc bez buildu. K TS lze přejít později.
  - Upřesnění uživatele: nic se neinstaluje ani netestuje přes vývojové prostředí na počítači; testuje se maximálně v **local buildu** (lokálně v prohlížeči). Viz R-005.

- **R-002 🟢 Architektura složek** oddělující DATA → SYSTEM → UI: (schváleno 2026-08-31)
  ```
  pokemonrpg/
  ├── index.html
  ├── css/
  ├── src/
  │   ├── main.js
  │   ├── core/       (game loop, event bus, stav)
  │   ├── systems/    (logika: battle, team, idle, save …)
  │   └── ui/         (vykreslování: cityView, battleView, mapView)
  ├── data/           (pokemon, moves, items, areas …)
  ├── assets/
  └── docs/
  ```

- **R-003 🟢 Postup po krocích (roadmapa):** (schváleno 2026-08-31)
  - Krok 0: kostra projektu + rozvržení hlavní obrazovky + zapnutí GitHub Pages.
  - Krok 1: datová vrstva + jádro stavu + Save (localStorage) + export/import .txt.
  - Krok 2: tým (max 6) + startovní Pokémoni.
  - Krok 3: vizuální Battle Area + automatický souboj + XP/level.
  - Krok 4: jedna oblast + idle/offline progres + základní loot.
  - Krok 5: malé město + jeden building upgrade → MVP.

- **R-004 🟢 Dokumentace projektu:** vést `docs/NOTES.md` (deník) a `CHANGELOG.md` (verze) uvnitř repa, verzované přes git. (schváleno 2026-08-31)

- **R-005 🟢 Testování jen v „local buildu“.** (schváleno 2026-08-31)
  - Nic se neinstaluje jako vývojové prostředí na počítač. Lokální testování běží přes `python -m http.server` (Python 3.14 je na stroji dostupný) a otevření `http://localhost:8000` v prohlížeči.
  - Stažení knihoven přes CDN je přípustné, pokud to bude přínosné; zatím ale držíme projekt bez závislostí (čistě vanilla).

### Otevřené otázky
- ✅ Rozhodnutí R-001 až R-005 schválena → pouštíme Krok 0.
- ⚪ Zapnutí GitHub Pages provede uživatel v nastavení repa (návod je součástí Kroku 0).
