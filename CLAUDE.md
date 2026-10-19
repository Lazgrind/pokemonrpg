# Pokémon Idle RPG – pravidla projektu

Tenhle soubor čte Claude Code automaticky při každé práci v této složce.
Je určený i lidem: **před každým releasem projdi „Kontrolu před pushem“.**

## Postup hráčů se nesmí nikdy ztratit

Save je v `localStorage` prohlížeče hráče (patří k adrese hry). Každá nová verze
ho musí umět načíst. Systém je v `src/systems/save.js`, podrobnosti a historie
v `docs/NOTES.md` → „Save kompatibilita“ (2026-10-19).

Při **každé** změně datového modelu savu (`createNewGame()` v `src/core/state.js`):

1. **Nové pole** → jen přidat do `createNewGame()`. Doplní se hráčům samo.
   Žádná migrace, žádné zvýšení `CURRENT_SAVE_VERSION`.
   - Výjimka: mapy `id → hodnota` v `MAP_PATHS` (`save.js`: balls, items, story,
     buildings, achievements…) se po klíčích nedoplňují.
2. **Přejmenování / přesun / změna typu nebo významu pole** →
   `CURRENT_SAVE_VERSION + 1` + nový krok **na konec** `MIGRATIONS` v `save.js`
   (`{ to, note, run(data) }`) **a** staré pole odebrat z `createNewGame()`.
3. **Vydaný krok migrace se nikdy needituje ani nemaže.**
4. **Id v datech** (Pokémon, item, oblast, story flag, budova…), na která save
   odkazuje, se nemažou ani nepřejmenovávají bez migrace.
5. `SAVE_EPOCH` (`state.js`) se mění **jen při záměrném resetu všech hráčů**.
   Poslední reset: 2026-10-19 (smazaná a znovu založená hra).
6. **Adresa hry se nesmí změnit**: https://lazgrind.github.io/pokemonrpg/
   (repo `Lazgrind/pokemonrpg`). Jiná adresa = hráči přijdou o save.
7. Save hráče se nikdy nepřepíše naslepo – při chybě se zazálohuje (🗂️ Backups).

## Texty: žádná emoji v dialozích

**Do dialogů nikdy nedávej emoji** (rozhodnutí autora 2026-10-19, vyčištěno).
Dialog = nadpis i obsah vyskakovacích oken (`showPopup`, `bus.emit(EVENTS.STORY_POPUP, …)`,
`alert`), řeč postav a vyprávění (`<p class="story-text">`, `quote:` u trenérů,
popisy legend), intro a tutoriál. Peníze v textu piš jako `500₽`, ne `500 💰`.

**Zůstávají** (nejsou dialog): ikony na tlačítkách (`<button>`, volby `choices`),
záložky a jejich ikony (`tabIcon`, `tabLabel`), ikony v horní liště, nadpisy panelů
budov, `icon:` pole v datech, náhradní glyfy za chybějící sprite, stavový řádek
(`setStatus`) a typografické symboly `✓ ✕ → ➜ ★ ♂ ♀`.
**Výjimka – minihry v gymech:** emoji, která v návodu vysvětlují ikony na herní ploše
(např. Kogovo bludiště: „Koga (🥷 top)“, „reveals itself (🧱)“), zůstávají – bez nich
by hráč nevěděl, co ikony znamenají.

## Obrázky z odkazů (Gen 2)

Autor dodává obrázky jako odkazy v jednom souboru `docs/gen2_odkazy.txt`
(vygenerováno ze `docs/SPRITES-TODO-GEN2.md`): `## typ` = druh a cílová složka,
`# id` = id ze hry, pod ním URL. Zpracování: `tools/dl_web.py` (rozšířit o čtení
sekcí `## typ` a cest `assets/gen2/...`), pak úprava nástroji (`prep_sprite.py`,
`remove_bg.py`, `gen_sprite_manifest.py`; budovy vždy `pixelize_buildings.py`), hotové řádky smazat
ze `SPRITES-TODO-GEN2.md`. Pokémoni a cries se stahují automaticky
(`dl_static.py`, `dl_gifs.py`, `fetch_cries.ps1`; formy jako Unown A–Z přes tabulku `FORMS` v obou `dl_*.py`).

## Panel města: mapa shora v pixel artu

Každé město s mapou (`data/gen<N>/cityMaps.js`, zatím celé Kanto) se v záložce City
kreslí jako mapa shora 320×180 px (`src/ui/cityMap.js`), zvětšená bez rozmazání.
Rozložení podle originálních her (FireRed/LeafGreen; pro Johto HeartGold/SoulSilver).
- Na mapě jsou **jen budovy, které ve městě opravdu jsou** (`CITY_BUILDINGS`) + `gym`,
  má-li město gym (klik otevře záložku Gym) + `league` na oblasti s Ligou (klik otevře záložku
  League, bez všech odznaků jen vysvětlení). Žádné jiné budovy navíc. Plošné obrázky pod budovami
  (nádvoří Ligy) jsou v `decals`.
- Město bez mapy (zatím Johto) ukáže původní rozložení budov.
- Po každé změně mapy nebo budov města: `python tools/citymapcheck.py` (budovy, gym,
  překryvy, okraje mapy).
- Den a noc se na mapě zatím nekreslí (rozhodnutí autora).
- Obrázková i kreslená (SVG) pozadí měst byla zrušena – **nepřidávat zpět**.

## Region-lock (Kanto ↔ Johto)

- Každý Pokémon nese `caughtRegion`; bojovat, trénovat a chovat smí jen v regionu, kde byl chycen.
  Tým, budovy, HM, Školka a vejce jsou per-region a prohazují se v `travelToRegion` (battleSystem).
- **Johto je gen2-locked:** v johtských encounterech, rybaření, Safari i Contestu jen Gen 2 druhy
  + `dexImports` (Gen 1 předchůdci Gen 2 evolucí), a to tam, kde byli v HeartGold/SoulSilver.
  Gen 2 druhy, které v HGSS Johtu divoké nebyly, jsou v johtské Safari (`extra: true`).
- Každý Gen 2 druh musí jít v Johtu získat tak, aby šel mít v PC najednou s celou linií.
- Regionální Pokédex počítá jen jedince chycené v tom regionu. Bonusoví (Dratini z Dragon's Den,
  Red Gyarados) jsou v PC navíc a do dexu se nepočítají.
- Pravidla hranice hráči vysvětluje celník (`showJohtoCustomsTutorial`) – při změně zámku ho aktualizuj.

## Safari Zone: Kanto a Johto jsou dvě různé hry

Kantská Safari (`safariSystem.js` / `safariView.js`, výprava do hloubky, HM03 Surf) a johtská
(`johtoSafariSystem.js` / `johtoSafariView.js` / `data/gen2/safari.js`, bloky jako v HGSS, jen Gen 2)
**nesdílí kód**. Zbylí startéři regionu se po Lize daného regionu chytají v jeho Safari.

## Sprity budov: jen pixel art

Všechny sprity budov (`assets/gen<N>/buildings/`, včetně `gym.png`, `league.png`, `league-plaza.png`;
v Gen 1 i Gen 2) jsou pixel art
v realistickém měřítku (domek ~36 px, Poké Center 46, Dept. Store 54×62…).
Nový sprite budovy se vždy převede: `python tools/pixelize_buildings.py <zdroj.png> <cíl.png> --width N`
(šířku přidat do tabulky `WIDTH` v nástroji). Původní velké obrázky se nepoužívají.

## Verze hry

- **Každá větší věc má vlastní verzi** (`1.X.0`), **menší úpravy patch verzi** (`1.X.Y`) –
  i když se vydávají v jednom balíčku (rozhodnutí autora 2026-10-19). Větší = nová funkce, nová
  oblast/systém, velká sada assetů; menší = oprava, úprava textu, drobné doladění.
- **Každá změna zvedá `VERSION`** v `src/core/version.js` (semver) a přidá
  záznam do **`CHANGELOG.md`** – jediný changelog pro vše (Kanto, Johto i společné věci),
  nejnovější verze nahoře. Samostatný Gen 2 changelog byl zrušen (2026-10-19), Gen 2 se neskrývá. Podle `VERSION` se hráčům před aktualizací dělá záloha savu.
- Aktuálně řada **1.x**. Gen 2 je hotová kromě obrázků/assetů; po jejich
  dokončení přijde **2.0.0** (zatím ne – rozhodne autor).

## Kontrola před pushem

1. `VERSION` zvednutá (+ changelog).
2. Mění-li se save model: pravidla výše dodržena.
3. `python tools/savecheck.py` → musí skončit `fail=0`.
   (Node tu není; skript si vezme Node z VS Code.)
4. `python tools/importcheck.py` → OK.
5. `python tools/citymapcheck.py` → OK (mění-li se mapy nebo budovy měst).
6. Hru jednou otevřít lokálně: `python -m http.server 8000` → http://localhost:8000

## Přenos na soukromé PC a push (firemní síť pustí jen Google Disk / Docs)

1. Pracovní PC: `python ../prenos_pokemonrpg/pack_for_docs.py --message "vX.Y.Z – …"`
   → `out/<sestavení>/part_001.txt` (vždy celý projekt).
2. Nahrát na Google Disk `part_001.txt` (+ `00_instalator.txt` jen úplně poprvé).
3. Soukromé PC: stáhnout do složky s `pokemonrpg_install.py`, spustit
   `python pokemonrpg_install.py` → sám složí projekt, commitne a pushne
   do GitHubu (nikdy force). Instalátor se z balíčku sám aktualizuje.
