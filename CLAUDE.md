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

Dialog jsou i **okna příběhových budov** (`storyBuildingView.js`) – nadpis i text, bez emoji
(rozhodnutí autora 2026-10-20).
**Zůstávají** (nejsou dialog): ikony na tlačítkách (`<button>`, volby `choices`),
záložky a jejich ikony (`tabIcon`, `tabLabel`), ikony v horní liště, nadpisy panelů
služeb budov (`buildingView`), `icon:` pole v datech, náhradní glyfy za chybějící sprite, stavový řádek
(`setStatus`) a typografické symboly `✓ ✕ → ➜ ★ ♂ ♀`.
**Výjimka – herní plocha miniher** (automat a blackjack v Game Corneru: symboly válců, karty,
mince 🪙) zůstává. **Výjimka – minihry v gymech:** emoji, která v návodu vysvětlují ikony na herní ploše
(např. Kogovo bludiště: „Koga (🥷 top)“, „reveals itself (🧱)“), zůstávají – bez nich
by hráč nevěděl, co ikony znamenají.

## Obrázky z odkazů (Gen 2)

Autor dodává obrázky jako odkazy v jednom souboru `docs/gen2_odkazy.txt`
(generuje `python tools/gen_odkazy.py` ze `docs/SPRITES-TODO-GEN2.md`, vyplněné odkazy zachová):
`## typ` = druh a cílová složka, `# id` = id ze hry, pod ním URL. Stažení:
`python tools/dl_web.py docs/gen2_odkazy.txt` (ukládá do `assets/gen2/...`; budovy jako zdroj do
`tools/_downloads/` a vypíše příkaz pro `pixelize_buildings.py`), pak úprava nástroji (`prep_sprite.py`,
`remove_bg.py`, `gen_sprite_manifest.py` – počty variant trenérů per generace), hotové řádky smazat
ze `SPRITES-TODO-GEN2.md` a znovu `gen_odkazy.py`. Pokémoni a cries se stahují automaticky
(`dl_static.py`, `dl_gifs.py`, `fetch_cries.ps1`; formy jako Unown A–Z přes tabulku `FORMS` v obou `dl_*.py`).

## Panel města: mapa shora v pixel artu

Každé město s mapou (`data/gen<N>/cityMaps.js`, celé Kanto i Johto) se v záložce City
kreslí jako mapa shora 320×180 px (`src/ui/cityMap.js`), zvětšená bez rozmazání.
Rozložení podle originálních her: Kanto podle pret/pokefirered (`data/maps/<Město>/map.json`), Johto podle
pret/pokecrystal (`maps/<Město>.asm`) – souřadnice dveří, voda a východy přepočtené na 320×180; budovy drží
relativní polohu, posunuté jen kvůli velikosti spritů (2026-10-29). Pobřeží po celé výšce = `water.left` / `water.right`.
- Na mapě jsou **jen budovy, které ve městě opravdu jsou** (`CITY_BUILDINGS`) + `gym`,
  má-li město gym (klik otevře záložku Gym) + `league` na oblasti s Ligou (klik otevře záložku
  League, bez všech odznaků jen vysvětlení). Žádné jiné budovy navíc. Plošné obrázky pod budovami
  (nádvoří Ligy) jsou v `decals`.
- Město bez mapy ukáže původní rozložení budov.
- Budova bez spritu se na mapě kreslí jako **náhradní pixelová budova** v barvě budovy (rozměry a tvar
  v `BUILDING_PLACEHOLDERS`, `data/cityMaps.js`); po dodání spritu se automaticky použije sprite.
- Příběhové budovy (Sprout Tower, Dragon's Den…) se otevírají klikem z mapy města, **nejsou to
  samostatné oblasti** na mapě regionu (oblast jen tam, kde jsou divocí Pokémoni / legenda).
- Po každé změně mapy nebo budov města: `python tools/citymapcheck.py` (budovy, gym,
  překryvy, okraje mapy).
- Den a noc se na mapě zatím nekreslí (rozhodnutí autora).
- Obrázková i kreslená (SVG) pozadí měst byla zrušena – **nepřidávat zpět**.

## Region-lock (Kanto ↔ Johto)

- Každý Pokémon nese `caughtRegion`; bojovat, trénovat (Rare Candy, PP itemy, EV trénink, Move Tutor),
  vyvíjet, používat itemy a chovat smí jen v regionu, kde byl chycen (`isInCaughtRegion` v `pokemonSystem.js`).
  Evoluce ani mládě z chovu nesmí být z pozdější generace, než je region chycení / Školky.
  Pokédex, mapa i odznaky (diplom, úroveň ballů) se počítají per region.
  Tým, budovy, HM, Školka a vejce jsou per-region a prohazují se v `travelToRegion` (battleSystem).
- **Johto je gen2-locked:** v johtských encounterech, rybaření, Safari i Contestu jen Gen 2 druhy
  + `dexImports` (Gen 1 předchůdci Gen 2 evolucí), a to tam, kde byli v HeartGold/SoulSilver.
  **Každá johtská route / jeskyně má aspoň jeden Gen 2 druh** – kde v HGSS žádný nebyl, je doplněný
  tematicky podle místa (rozhodnutí autora 2026-10-26).
- **Rybaření má exkluzivní druhy:** co jde na lokalitě vylovit (`data/fishing.js`), není v jejích
  běžných soubojích (`species`). Výjimka jen Kanto Route 19/20 (v Yellow tam jen Tentacool).
  Gen 2 druhy, které v HGSS Johtu divoké nebyly, jsou v johtské Safari (`extra: true`).
- Každý Gen 2 druh musí jít v Johtu získat tak, aby šel mít v PC najednou s celou linií.
- Regionální Pokédex počítá jen jedince chycené v tom regionu. Bonusoví (Dratini z Dragon's Den,
  Red Gyarados) jsou v PC navíc a do dexu se nepočítají.
- Pravidla hranice hráči vysvětluje celník (`showJohtoCustomsTutorial`) – při změně zámku ho aktualizuj.

## Útoky po generacích (learnsety z původních her)

- Pokémon chycený v **Kantu** se učí podle **Yellow** (jen Gen 1 útoky), chycený v **Johtu** podle
  **Crystalu** (Gen 1 + Gen 2, i Gen 1 druhy). Řídí to `caughtRegion` → `getLearnset(id, region)`.
- Data: `tools/fetch_classic_learnsets.py` (PokeAPI, pustit na PC s internetem) → `tools/classic_learnsets.json`
  → `python tools/convert_classic_learnsets.py` → `data/gen1|gen2/learnsets.js`. Ručně needitovat.
- `tools/gen_movepools.py` (Scarlet/Violet) se už **nepoužívá** – přepsal by learnsety moderními útoky.
- **Typy taky přesně v generaci:** souboj v Kantu = tabulka Gen 1 a typy útoků z Gen 1, v Johtu Gen 2
  (`typeMultiplier(…, region)`, `moveType(move, region)`); typy Pokémonů podle regionu chycení
  (`speciesTypes(species, region)`, bez regionu = domovský region druhu). Data `data/gen1|gen2/types.js`
  generuje `tools/fetch_classic_types.py` → `tools/convert_classic_types.py`. Ručně needitovat.
  Fyzický/speciální útok zůstává podle útoku (ne podle typu jako v Gen 1–3) a síla/přesnost/PP moderní.
- Už naučené novější útoky ve starých savech zůstávají (rozhodnutí autora 2026-10-20, žádná migrace).
- **Bojová pravidla podle generace** jsou v jedné tabulce `data/battleRules.js` (Kanto = Gen 1,
  Johto = Gen 2; engine je čte přes `rules()` v battleSystem): krit (Gen 1 z base Speed, násobek ×2),
  délka spánku a kolo probuzení, poškození jedem/popáleninou, Wrap/Bind (Gen 1 znehybní), šance
  2–5 zásahů, Hyper Beam po vyřazení, Counter (Gen 1 jen Normal/Fighting), vrstvy Spikes.
  Nové pravidlo = nové pole v tabulce, žádné `if (region)` po kódu. Metronome jako v originálech: kterýkoli útok
  generace souboje (`data/moveGens.js`, generuje `convert_classic_types.py`) kromě `metronomeExcludes`,
  a provede se celý jako vlastní tah (`callMove` → `executeMove`; stejně Sleep Talk a Copycat).
  Záměrně moderní (rozhodnutí autora 2026-10-26): staty Sp. Atk/Sp. Def, natury, IV/EV, pohlaví,
  shiny, chov, předměty a bally v obou regionech, paralýza a zmrznutí.

## Gating postupu: přesně podle her

- Odemykání oblastí (`unlock` v `data/gen<N>/areas.js`), gymů (`requiresStory`) a příběhových budov
  kopíruje originál (Kanto = Red/Blue/Yellow, Johto = Gold/Silver/Crystal + HGSS) – rozhodnutí autora
  2026-10-26. **Žádná podmínka navíc**: co plyne z jiné podmínky, se nepíše znovu (např. Victory Road
  nechce Strength u Moltrese, když ho chce oblast).
- HM mimo souboj vyžaduje odznak jako ve hrách (Gen 1: Cut = Cascade, Surf = Soul, Strength = Rainbow;
  Gen 2: Flash = Zephyr, Whirlpool = Glacier…), pokud ho už nezaručuje jiná podmínka.
- **Gymy nejdou přeskočit** (rozhodnutí autora 2026-10-26): oblast za gymem chce jeho odznak, i když
  originál dovoluje jiné pořadí – Kanto: Route 5 Misty, Rock Tunnel Surge, Fuchsia Erika, moře na Cinnabar
  Koga + Sabrina; Johto: Route 35 Whitney, Route 38 Morty, Route 42 Chuck + Jasmine. Povinné příběhové
  souboje zůstávají povinné (rival v Burned Tower → teprve pak psi a Mortyho gym).
- Více cest do oblasti = `unlock.anyOf` (např. Route 17 od Snorlaxe NEBO z Route 18), více HM = `hm: [3, 7]`.
- Leadeři, Elite Four a šampioni mají po porážce text (`defeatText` v datech trenéra, nebo vlastní
  větev v `finishTrainerBattle`; šampion `clearPopup` Ligy).
- Strop levelu (volitelné pravidlo) = podle **počtu** odznaků regionu, ne podle pořadí gymů.

## Legendární: scéna příchodu

Každé legendární setkání (Legendary tab i Mew pod náklaďákem) začíná scénou ve vyskakovacím okně
(`src/ui/legendaryScene.js`, CSS „Scény legendárních" v `css/main.css`). Hraje se **vždy celá**, i při
shiny huntu; souboj začne až tlačítkem (rozhodnutí autora 2026-10-29). **Nová legenda = nový řádek
v `SCENES`** (klíč = `scene` z dat, jinak speciesId); bez něj začne souboj rovnou. Náhled všech scén:
dev menu v Nastavení → „Legend scene".

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

## Rozvržení: nikdy rozbité rozhraní (2026-10-27)

- Hra musí jít hrát v **jakékoli velikosti okna** (PC, tablet, telefon, zvětšení Windows 125–200 %).
  Žádný ořezaný obsah, nic mimo obrazovku (rozhodnutí autora 2026-10-27).
- **Scroll stránky jen ve skládaném režimu** (panely pod sebou). Ve 2 sloupcích se stránka nescrolluje.
  Vlastní scroll mají jen log souboje a dlouhé seznamy (PC, Pokédex) a obsah vyskakovacích oken.
- O rozvržení rozhoduje `src/ui/layoutFit.js` (měří, co se vejde): 2 sloupce → zhuštěné
  (`data-density="compact"`) → pod sebe (`data-flow="stack"`); pod 700 px scéna nad logem (`data-split="v"`).
  CSS čte tyto atributy body, ne `data-layout` (to je jen volba v nastavení).
- Výherní/chytací/prohrávací okno a bojové menu se v malé scéně zmenšují přes `@container`
  (konec `css/main.css`). Nový obsah ve scéně souboje musí mít kompaktní variantu taky.
- Po změně rozvržení ověřit v prohlížeči na malém okně (např. 1270×666, 1024×768, 390×844, 844×390).

## Verze hry

- **Každá větší věc má vlastní verzi** (`1.X.0`), **menší úpravy patch verzi** (`1.X.Y`) –
  i když se vydávají v jednom balíčku (rozhodnutí autora 2026-10-19). Větší = nová funkce, nová
  oblast/systém, velká sada assetů; menší = oprava, úprava textu, drobné doladění.
- **Každá změna zvedá `VERSION`** v `src/core/version.js` (semver) a přidá
  záznam do **`CHANGELOG.md`** – jediný changelog pro vše (Kanto, Johto i společné věci),
  nejnovější verze nahoře. Samostatný Gen 2 changelog byl zrušen (2026-10-19), Gen 2 se neskrývá. Podle `VERSION` se hráčům před aktualizací dělá záloha savu.
- Aktuálně řada **2.x** – **2.0.0 (2026-10-29) = vydání Gen 2 (Johto)**. Další větší věc = `2.X.0`,
  menší úprava = `2.X.Y`.
- **Gen 2 je na produkci ŽIVÁ** – `data/gameConfig.js` má `GEN2_RELEASED = true` (od 2.0.0). Hráči tak mají
  v savu i Johto: každá změna johtských dat teď podléhá pravidlům savu výše (id budov, oblastí, flagů…
  se už nemažou ani nepřejmenovávají bez migrace).

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
