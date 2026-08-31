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
