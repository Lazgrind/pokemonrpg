# CHANGELOG – Gen 2 (Johto) · ve vývoji

Změny týkající se **generace 2 (Johto)**. Tento soubor se commituje na GitLab
(záloha + verzování vývoje), ale ve hře se zobrazuje **jen když je gen 2 aktivní**
(localhost, nebo produkce po `GEN2_RELEASED = true`). Na produkci ho hráči nevidí.

> Při vydání gen 2: obsah tohoto souboru se přesune do hlavního `CHANGELOG.md`.

Change types: **Added**, **Changed**, **Fixed**, **Removed**.

## [1.17.0] – 2026-09-25 · Asset split per generace (všechny obsahové kategorie)
> Dev verze (Gen 2 skrytá na produkci za `GEN2_ENABLED`). Změny patří do skryté
> Gen 2 infrastruktury; na veřejném `CHANGELOG.md` záznam záměrně není.

### Changed
- **Sprity Pokémonů a cries žijí per generace** (`src/core/assets.js` *(nový)*,
  `src/ui/sprites.js`, `src/systems/audioSystem.js`): cesty ke gen-specifickým
  assetům skládá nový gen-aware helper `pokemonAssetDir(id)` / `cryUrl(id)`
  (generace z `getSpecies(id).gen`). Sprity se přesunuly z `assets/pokemon/<id>/`
  do `assets/gen<N>/pokemon/<id>/` (gen 1 = 151 druhů, gen 2 = 3 startéři) a cries
  z `assets/audio/cries/<id>.mp3` do `assets/gen<N>/cries/<id>.mp3`.
- **Všechny obsahové kategorie assetů jsou nově per generace** (`src/core/assets.js`
  rozšířen, `data/trainers.js`, `data/badges.js`, `src/ui/cityView.js`,
  `profileView.js`, `battleView.js`, `gymView.js`, `diploma.js`, `introScene.js`,
  `data/gen1/index.js`, `data/gen2/index.js`): gym-leaders, trainers, badges, city,
  buildings, npc a map se čtou z `assets/gen<N>/<kat>/…`. Generace se odvodí z druhu
  (pokemon/cries), z dat entity (`getBadge(id).gen` – odznaky) nebo z aktivního
  regionu (`currentGen()` – trenéři, města, budovy, npc). Nové helpery:
  `gymLeaderSpriteUrl`, `trainerClassSpriteUrl`, `badgeUrl`, `cityBgUrl`,
  `buildingSpriteUrl`, `npcUrl`, `currentGen`, `regionGen`. Odznaky dostaly pole
  `gen`. **Globální (mimo gen složky) zůstávají jen** assety bez regionálního
  vizuálu: `items`, `pokeballs`, `backgrounds` (biomy), `audio/sfx`, `audio/bgm`,
  `title`.
- **Fyzický přesun + gen 2 skeleton**: veškeré gen 1 assety přesunuty do
  `assets/gen1/<kat>/` (badges, buildings, city, gym-leaders, npc, trainers, map).
  Založen kompletní strom `assets/gen2/<kat>/` pro celé Johto (dle
  `docs/SPRITES-TODO-GEN2.md`): 10 Johto gym-leaderů/E4, 14 nových tříd trenérů,
  prázdné badges/city/npc/map (`.gitkeep`). **Vracející se entity duplikovány** do
  gen 2: leadeři koga + elite-four-bruno + champion-lance (z gen 1 elite-four-lance),
  všechny generické třídy trenérů (33) a sdílené budovy (poke-center, poke-mart,
  day-care, move-tutor, dept-store, game-corner) → cesta je vždy `assets/gen<N>/…`
  bez fallback logiky.
- **Generátory assetů jsou gen-aware** (`tools/fetch_cries.ps1`, `tools/dl_static.py`,
  `tools/dl_gifs.py`): čtou druhy z per-gen souborů `data/gen<N>/pokemon.js` (root
  `data/pokemon.js` je teď jen aggregator bez literálů) a stahují do
  `assets/gen<N>/…` podle generace druhu. `tools/prep_sprite.py` beze změny (bere
  cílovou složku jako argument – spouští se na `assets/gen1/pokemon` a `assets/gen2/pokemon`).

## [1.16.0] – 2026-09-24 · New Bark Town, Prof. Elm + region-lock týmu
> Dev verze (Gen 2 skrytá na produkci za `GEN2_ENABLED`). Číslo `version.js`
> odpovídá dev buildu; na veřejném `CHANGELOG.md` tahle verze záměrně nemá
> záznam, protože všechny změny patří do skryté Gen 2 (viz zvolené schéma
> verzování). Při vydání Gen 2 se obsah přesune do `CHANGELOG.md`.

### Added
- **New Bark Town** (`data/gen2/areas.js`): první Johto město jako placeholder
  (bez divokých druhů) – vstupní uzel po připlutí. Battle area už tedy neukazuje
  Vermilion City, ale Johto.
- **Placeholder plátno mapy s uzly** (`mapView.js` + `.map-placeholder-bg`):
  region s oblastmi, ale bez `mapImage` (Johto), vykreslí klikatelné uzly nad
  barevným plátnem „ve výstavbě". Uzly fungují, jen chybí art mapy.
- **Prof. Elm's Lab** (`storyBuildingView.js`, budova `elm-lab`): jednorázový výběr
  **Johto startéra** – Chikorita / Cyndaquil / Totodile (level 5). Kanto starter
  (`player.starterId`) se nepřepisuje; ukládá se `story.johtoStarterId`.
- **Johto startéři** (`data/gen2/`): chikorita (#152), cyndaquil (#155),
  totodile (#158) – druhy, learnsety, EV yieldy.
- **Region-lock týmu** (`team.js` `canBattleInRegion`): Pokédex i kolekce se mezi
  regiony přenášejí, ale bojovat v regionu smí **jen Pokémoni jeho generace**
  (gen 1 v Kantu, gen 2 v Johtu). Vynuceno ve `battleSystem` (start souboje,
  náhradník po KO, auto-nasazení, Switch) i v Switch UI (nezpůsobilí zašedlí).

### Changed
- **Obousměrná plavba mezi regiony** (`travelToRegion`): tým i poslední aktivní
  oblast se pamatují **per region** (`progress.teamByRegion`, `progress.lastAreaByRegion`,
  lazy-init). Při odchodu z regionu se jeho tým **celý uklidí do PC** (vyprázdní
  `s.team`; kolekce/Pokédex zůstávají) a při návratu se obnoví – hráč se tak vrátí
  na stejné místo i se stejným týmem. Gen 1 → Gen 2 tedy vyprázdní tým do PC
  (region-lock: v Johtu bojují jen gen 2), tým naplní až startér od Prof. Elma.
- **Johto startér se rovnou přidá do týmu** (`storyBuildingView.js`): po výběru
  u Elma jde nový Pokémon do týmu (prázdného po úklidu); když je plný, zůstane
  v PC a hráč dostane pokyn ho přehodit.

### Added (dev)
- **Provizorní dev návrat do Kanta** (`mapView.js`, gate `IS_DEV` z `gameConfig.js`):
  dočasné tlačítko „🛠️ Zpět do Kanto (dev)" nad mapou, jen na localhostu. Řádný
  hráčský návrat vznikne až s **lodí odemykanou v gen 2** (budoucí přístavní
  budova). Na produkci se tlačítko nikdy neukáže.

## [gen2-dev] – 2026-09-24 · Přechod Kanto → Johto přes S.S. Anne
### Added
- **Přechod mezi regiony**: nová funkce `travelToRegion(region)` (`battleSystem.js`)
  přepíná `state.progress.region` a aktivní oblast na vstupní uzel cílové generace.
- **S.S. Anne → Johto**: v okně S.S. Anne (Vermilion) se po zisku titulu **Champion**
  objeví tlačítko „⛴️ Set sail for Johto" (jen když `GEN2_ENABLED`). Klik přepluje do Johta.
- **Region-aware mapa** (`mapView.js`): mapa i uzly patří aktivnímu regionu; Johto je
  zatím prázdné **plátno „ve výstavbě"**. Návrat tlačítkem „⚓ Zpět do Kanto" nad mapou.
- **Stav regionu v save**: `progress.region` (default `"kanto"`) + migrace v49 → **v50**.

## [gen2-dev] – 2026-09-24 · Základ pro generace: složková struktura + feature flag
### Added
- **Architektura po generacích** (`data/gen1/`, `data/gen2/`, `data/generations.js`):
  každá generace má vlastní složku s kompletním obsahem (druhy, learnsets, EV yieldy,
  oblasti, legendární). Kořenové aggregatory (`data/pokemon.js`, `areas.js`,
  `learnsets.js`, `evYields.js`, `legendaries.js`) skládají data z registru generací;
  systémy a UI se nemění.
- **Feature flag `GEN2_ENABLED`** (`data/gameConfig.js`): na localhostu je gen 2 vždy
  zapnutá (testování), na produkci se řídí `GEN2_RELEASED` (vydání = jeden řádek).
- **Oddělený changelog gen 2** (`CHANGELOG-GEN2.md`): na produkci skrytý do vydání.
- Kostra Johto: prázdná mapa (`data/gen2/areas.js`), zatím bez druhů.
