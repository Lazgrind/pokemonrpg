# Backlog – připraveno / rozhodnuto, ale nedoděláno

Seznam věcí, které jsme **záměrně připravili nebo se na nich domluvili**, ale
ještě nejsou hotové. Ať na ně nezapomeneme. Detaily rozhodnutí viz
[NOTES.md](NOTES.md), historie hotového viz [../CHANGELOG.md](../CHANGELOG.md).

Legenda stavu: 🟡 připraveno (seam/data hotová) · ⚪ jen rozhodnuto (nic v kódu) · 🔵 částečně · ✅ hotovo (ponecháno kvůli navazující práci)

---
## Achievementy (in-game) — PŘED 1.0.0

- ⚪ **Achievementy in-game (rozhodnuto uživatelem 2026-09-11, dělat před 1.0.0).**
  Systém herních úspěchů/odznaků za milníky – uživatel je chce mít hotové ještě
  před vydáním 1.0.0. Zatím jen rozhodnuto, nic v kódu. **Návrhové poznámky (k
  upřesnění, až na to dojde):**
  - Datově řízený registr `data/achievements.js` (`{ id, name, desc, icon,
    category, condition }`) + `state.achievements` (unlocked ids + timestamp).
  - Průběžné vyhodnocování na existujících eventech (STATE_CHANGED / chycení /
    evoluce / výhra nad gymem / vylíhnutí / shiny…), toast/popup při odemčení.
  - Kandidáti na kategorie: **Pokédex** (chyť 10/50/151, celý dex, první shiny,
    X shiny), **Souboj/Trenéři** (poraž 1./všechny gym leadery, Elite Four,
    Champion, X trenérů), **Sběr** (naplň box, X druhů, každý typ), **Breeding/
    vejce** (první vylíhnutí, shiny z vejce), **Ekonomika/idle** (našetři X gold,
    X hodin idle), **Boosty/budovy** (max linka boost budovy). Napojit na
    idle-boost budovu i shiny charm až budou hotové.
  - UI: nový tab/sekce v **Profile** (`profileView.js`) – mřížka odemčených/
    zamčených úspěchů (ztmavené jako badge case). Provázat s trainer card.
  - Pravidla: respektovat single-playthrough dostupnost, žádný nevratný lock.

---
## ROADMAP – Kanto / všechny generace (před 1.0)

- ✅ **Datová expanze Kanto (v0.54.0) – HOTOVO:**
  1. ✅ **`data/moves.js`** – tahy Kanta (kanonická data z PokeAPI, viz níže).
  2. ✅ **`data/pokemon.js`** – **151 druhů** (celý Kanto s kanonickými daty, evolucemi, gender/egg groups).
  3. ✅ **`data/learnsets.js`** – kompletní level-up movepooly pro všech 151 druhů.
  4. ✅ **Křížová validace** – integrity checks, guardy pro null hodnoty, všechny cíle evolucí a tahy ověřeny.

- ✅ **Přesnost learnsetů + moves z PokeAPI (v0.56.0) – HOTOVO:** původní data
  (v0.54.0) byla LLM aproximace se starogeneračními úrovněmi. Přegenerováno
  kanonicky z **PokeAPI (Gen 9 Scarlet/Violet)** generačně nezávislým skriptem
  `tools/gen_movepools.py` (druhy čte z `data/pokemon.js`, VG fallback řetězec,
  merge zachovává ruční `effect`/`ailment`). Skript je **znovupustitelný na další
  generace**. **Zbývá:** ruční efekty u nově přidaných tahů (teď jen odvozená
  bezpečná podmnožina + damage).
  
- 🔵 **Mechaniky pro dokončení Kanta – ZBÝVÁ:**
  - ✅ **Evoluce kamenem + trade-item (v0.59.0) – HOTOVO:** kamenné evoluce (Fire/Water/Thunder/Leaf/Moon-stone) + `linking-cord` (výměna); větvené evoluce (Eevee) řeší volba kamene. UI: použití z batohu → výběr cíle. Data: pole `evolutions` u 18 druhů + vynulované levelové `evolvesTo`.
  - ✅ **Item systém rozšíření (v0.59.0) – HOTOVO:** evoluční kameny + `linking-cord` v `data/items.js` (kategorie „evolution"), kupitelné v obchodě Items.
  - ✅ **Spawny/oblasti pro Kanto routes + rarita (v0.89.0) – HOTOVO:** všechny routy/jeskyně mají v `data/areas.js` seznam druhů; nově **raritní tiery** – položka `species` je buď string (`common`), nebo `{ id, rarity }` (`uncommon`/`rare`/`veryrare`). `RARITY_WEIGHTS` + `areaEncounters()` + vážený `spawnEnemy` (`pickWeighted`). Kánon: Pikachu/Clefairy/Abra… `rare`, Safari/Cerulean Cave speciály (Chansey, Scyther, Dratini…) `veryrare`. ✅ **Per-oblast level ranges – HOTOVO (v0.91.0):** `AREA_LEVELS` v `data/areas.js` (tabulka `id → [min,max]`) + helpery `areaLevelRange`/`rollAreaLevel`; `spawnEnemy` losuje level z pásma (fallback = staré `recommendedLevel`..+1); popisky na mapě i v „kde chytit" ukazují `Lv min–max`. **Zbývá do budoucna:** jemné doladění, které druhy jsou kde přesně / per-druh level (data existují, tiery i pásma odhadnuté dle kánonu).
  - ✅ **Sprity všech druhů – HOTOVO:** všech **151/151** má reálné sprity ve `assets/pokemon/<id>/`
    (front/back/shiny + gif varianty), žádný „?" fallback.
  - ✅ **Multi-stat boost tahy (v0.59.0) – HOTOVO:** engine efektů umí `effect.changes[]` (víc statů jedním tahem). Dragon Dance / Calm Mind / Bulk Up / Shell Smash napojeny.
  - ✅ **Dokončení soubojů (v0.61.0) – HOTOVO:** deferované **transform / copyMove (Mimic) / forceSwitch (Whirlwind/Roar)** už fungují (dočasný `volatile.moveOverride` přes `activeMoves` helper; blow-away nového soupeře / vytažení hráče). Přidány i **Substitute, Counter, Rest, Reflect/Light Screen** a **Sleep + Freeze jako trvalé non-volatile statusy** (spánek 1–3 kola, freeze 20 %/kolo + Fire thaw, Ice imunní). ✅ **Zbytek dokončen (Haze/Metronome/Dig dříve, Bide + Fly/Dive v0.95.0):** Bide (sbírá 2 kola, vrátí ×2, `volatile.biding`), Fly přidán do `data/moves.js` (twoTurn), Dive opraven na twoTurn. **Engine efektů tahů je feature-complete pro Gen 1.**
  
- **Pravidlo dat (rozhodnuto):** **1 kanonický záznam na druh** dle **nejnovější
  mainline generace** (base staty, typy, movepool…). **Region = jen spawn-filtr**
  (`area.species` / `area.gen`), druh se NIKDY neduplikuje per generace/region.
  (Viz „Model gen vs. výskyt" v sekci Mapa světa.)
- ✅ **PC Boxy (Boxes) – HOTOVO v0.55.0** – viz sekce „Kolekce → Boxy (PC)".

---
## Hatching

- ✅ **Líhnutí – formátování času – HOTOVO v0.58.0.** Bug kdy se zobrazovalo „9 min 13.539999999999964 s" (nezaokrouhlený čas). Opraveno v `idle.js` – `formatDuration` zaokrouhluje vstup `Math.round(sec)` před formátováním.

## Pokémoni – hodnoty jedince

- ✅ **EV (Effort Values) – získávání (v0.44.0).** Zdroj EV = nová budova
  **Training Grounds** (`data/buildings.js` `training-grounds`, logika
  `buildingSystem.trainEv/trainingEvPerSession/trainingCost`, UI
  `buildingView.openTrainingStats`): za gold přidá EV do zvoleného statu přes
  `addEv` (stropy 252/stat, 510 celkem); upgrade budovy zvyšuje EV/lekci. EV se
  dál NEzískávají ze soubojů (R-017). **Zbývá:** pasivní/idle EV track; sprite
  budovy (`assets/buildings/training-grounds.png` – teď CSS fallback domeček).
- ✅ **Povahy (natures) (v0.44.0).** 25 povah v `data/natures.js`; `computeStats`
  aplikuje ±10 % na jeden non-HP stat (`natureMultiplier`), losuje se ve
  `createPokemon` (`randomNature`), save v16 dorovná staré jedince. Zobrazení na
  kartě (řádek Nature + barevné osy radaru). ✅ **Dědičnost povahy (Everstone)
  hotovo v0.49.0** – drží-li rodič v breedingu 🪨 Everstone, potomek zdědí jeho
  povahu (`breed.nature` v `breedingSystem`, předáno v `eggSystem` do
  `createPokemon`); jinak náhodná.

## Získávání Pokémonů – pravidlo duplikátů

- ✅ **`acquirePokemon()` – merge, ne duplikát (R-018).** Hotovo v 0.13.0
  (`team.js`). Napojeno na chytání v souboji. **Zbývá napojit na líhnutí**, až
  bude hotové.
- 🔵 **Pročištění starých duplikátů v save** – merge pravidlo neřeší existující
  duplikáty ve starém save (nevratné mazání). Nabídnuto pročistit na vyžádání.

## Chytání v souboji

- ✅ **Chytání jen v souboji + autocatch (R-019).** Hotovo v 0.13.0. Ruční 🔴 Catch
  na aktuálního nepřítele, šance dle jeho HP; autocatch přepínač v `settings.autocatch`.
  Auto-catch **zjednodušen v 0.29.0** na mód `{ enabled, mode }` – `mode: "all" |
  "shiny"` (výběr vedle přepínače Auto catch). Filtry *Better IVs* a *New species*
  zrušeny (Better IVs případně vrátit později jako mód).
- ✅ **Redesign Catch tlačítka + interface okna souboje (HOTOVO, ověřeno proti kódu 2026-09-03).**
  Manuální souboj má plné menu à la klasická hra (`battleView.js`): kořen
  **Battle/Run/Items/Switch** (`rootMenuHtml`), podmenu tahů s typovými barvami a
  PP (`fightMenuHtml`), **Items** s výběrem cíle (`itemTargetMenuHtml`) a **ball
  picker + hod s % šance** (`bagMenuHtml` → `throw-ball`), Switch (`switchMenuHtml`),
  výherní/chytací **interlude okno** s „Next battle" (`interludeHtml`). Catch je
  integrovaný do Items (volba ballu + %). **Zbývá jen kosmetika/další iterace, pokud
  bude uživatel chtít** – základ i „další krok interface" jsou hotové.
- ✅ **Rarita druhu ovlivní catch rate** (v0.42.0) – `catchChanceFor` násobí HP
  base šanci koeficientem `RARITY_CATCH_MULT` (common 1 → uncommon .85 → rare .6
  → epic .45 → legendary .3).
- ✅ **Nepřátelé podle oblasti** – hotovo v 0.15.0: `ENEMY_POOL` přesunut do dat
  oblasti (`data/areas.js` → `species`), `spawnEnemy` losuje odtud. Zbývá přidat
  další oblasti a případně rarity/váhy výskytu per oblast.
- ✅ **Skryté druhy na cestě / postup chycení (R-023) – HOTOVO v0.92.0.** Hlavička
  Battle Area (`battleView.js`) ukazuje malý odznak **`🔴 chyceno/N`** pro aktuální
  divokou oblast (NE na uzlu mapy – tam zabíral moc místa); počítá kolik druhů z
  poolu oblasti hráč už CHYTIL. Helper `areaCatchProgress(area)` (`src/systems/pokedex.js`).

## Vajíčka a líhnutí

- ✅ **Vajíčka + líhnutí (R-021).** Hotovo v 0.15.0: drop po výhře
  (`EGG_DROP_CHANCE`), druh z oblasti (`area.species`), inventář `state.eggs`,
  inkubace ve druhém slotu Školky (aktivně i offline), doba dle rarity
  (`data/eggs.js`), líhnutí přes `acquirePokemon()` (genetika až při vylíhnutí).
  `eggGroups`/`rarity` na druzích už se využívají (rarity → doba líhnutí).
- ✅ **Upgrade Školky: rychlost líhnutí + sloty (tracks).** Hotovo v 0.16.0: dvě
  samostatné upgrade linie (`BuildingDef.tracks`) – Hatch speed (Lv 1→50,
  +1 %/lvl, až +50 %) a Egg slots (Lv 1→10, inkubace více vajec naráz).
  Obecný, datově řízený mechanismus v `buildingSystem.js` (znovupoužitelný pro
  jiné budovy). Inkubace přešla ze single slotu na pole `city.daycare.eggs`.
- ⚪ **Šance na drop / doba líhnutí per oblast** – teď globální `EGG_DROP_CHANCE`
  a doba jen dle rarity. Zvážit `eggChance` v datech oblasti.
- ✅ **Shiny-boost u vajec (Masuda-styl)** – hotovo v 0.20.0 pro breeding vejce:
  `BREED_SHINY_CHANCE = 1/4096` (2× běžná `SHINY_CHANCE`). Nalezená bojová vejce
  mají dál běžnou šanci.
- ⚪ **Vylíhnutí druhu, který už máš** – přes merge (R-018) se „pustí" a jen
  zlepší IV/EV/shiny. Záměr; případně nabídnout volbu ponechat jako duplikát.
- ✅ **Sprite vajíčka per druh – HOTOVO v0.62.0.** Procedurální SVG vejce
  (`src/ui/eggSprite.js` → `eggSpriteHtml(speciesId,{size})`): skořápka + puntíky
  deterministicky z hashe `speciesId` (uživatel zvolil variantu „per druh", ne
  per-průchod → znalost přenosná). Zapojeno v `buildingView.js` (sloty líhně +
  dlaždice výběru vejce). Vědomě změkčuje R-021: druh se vizuálně NAZNAČUJE
  (hráč se učí vzory), ale jméno/staty zůstávají skryté (žádný text názvu).

## Breeding

- ✅ **Breeding podle egg groups (R-022).** Hotovo v 0.20.0: breeding sloty ve
  Školce (`city.daycare.breeding`), kompatibilita přes sdílenou egg group nebo
  žolíka Ditta (`data/breeding.js`), produkce vejce aktivně i offline
  (`breedingSystem.js`), dědění 3 IV + shiny 1/4096 při vylíhnutí
  (`inheritIvs` v `pokemonSystem.js`, `makeBredEgg` v `eggSystem.js`), UI okno
  „💞 Breeding" (`buildingView.js`). Druh i genetika skryté do vylíhnutí (R-021).
- ✅ **Ditto ze startérů – HOTOVO v0.56.0.** Ditto již není dočasný starter. Odebráno z `STARTERS` a ponecháno v Pokédexu jako běžný chytatelný druh pro breeding.
- ✅ **Dědičnost tahů (egg moves) – HOTOVO v0.59.0.** Vejce z breedingu předá
  potomkovi sjednocení aktivních tahů obou rodičů, ponechá jen ty, které druh
  potomka umí naučit (celý level-up movepool), max 4 s předností před výchozí
  sadou. `computeEggMoves` v `breedingSystem.js` → `breed.eggMoves` na vejci →
  `applyEggMoves` (setActiveMoves) při vylíhnutí v `eggSystem.js`. Zpětně
  kompatibilní (stará vejce beze změny), bez save migrace.
- ✅ **Destiny Knot (item) – HOTOVO v0.62.0.** Held item `destiny-knot`
  (`data/items.js`, 2000 g); drží-li ho rodič ve Školce, potomek zdědí 5 IV místo 3.
  `breedingSystem.accrueBreeding` → `breed.inherit=DESTINY_KNOT_IV_COUNT`,
  `eggSystem` předá do `inheritIvs(parents, count)`. Zpětně kompat., bez migrace.
- 🚫 **Rychlost breedingu jako upgrade linie Školky – ZAMÍTNUTO uživatelem
  (nikdy nedělat).** `BREED_MINUTES` zůstává fixní; žádný track na zkracování
  produkce vejce se dělat NEBUDE.
- ✅ **Potomek = základní forma – HOTOVO v0.62.0.** `chooseChildSpeciesId` vrací
  `baseFormOf(...)` (kořen evoluční linie ne-Ditto rodiče), `baseFormOf` iteruje
  `evolvesTo` reverzně nad `POKEMON_SPECIES` (`data/breeding.js`).
- ✅ **Rodič v breedingu vs. tým.** Hotovo v 0.20.1: `addToTeam` odmítne jedince
  ve Školce/breedingu (guard přes nový `pokemonEngagement(uid)` v
  `buildingSystem.js`) a Kolekce mu místo „Add to team" ukáže „in Day Care" /
  „in breeding". Pravidlo „jedinec jen na jednom místě" je tím uzavřené v obou
  směrech (pickery Školky/breedingu tým vylučovaly už dřív).

## Evoluce

- ✅ **Evoluce – DOBROVOLNÁ, tlačítkem (v0.49.0).** Druhy mají `evolvesTo` +
  `evolutionLevel` (`data/pokemon.js`), přidáno 9 evolučních druhů (ivysaur…
  raticate) s Gen1 baseStats + learnsety. Logika `src/systems/evolutionSystem.js`
  (`canEvolveNow`, `evolvePokemon(uid)` – jeden krok, in-place, přepočet HP,
  doučení tahů, emit `POKEMON_EVOLVED`). NENÍ automatická: tlačítko **✨ Evolve**
  na slotu Týmu a na kartě Pokémona (i z Pokédexu), objeví se od `evolutionLevel`.
  Level cap **100** (`progression.MAX_LEVEL`), takže i nevyvinutý druh doroste.
  **Everstone** blokuje tlačítko. ✅ **Reálné sprity 9 evolucí doplněny v0.52.0**
  (vč. shiny; shiny se při evoluci zachovává). **Zbývá:** evoluce kamenem/itemem
  (Vodní/Ohnivý kámen…) jako alternativní trigger; případně evoluce z breedingu =
  základní forma potomka (viz Breeding).

## Poké Bally

- ✅ **Typy Poké Ballů (R-020).** Hotovo v 0.14.0: `data/pokeballs.js` (13 typů),
  `pokeballSystem.js` (násobiče + podmíněné bonusy), inventář po typech
  (`resources.balls`), přepínač v souboji, obchod v Poké Martu, odemykání dle
  `progress.tier`. Ikony jsou zatím emoji.
- ✅ **Odemykání ballů napojené na reálný postup – HOTOVO v0.94.0.** `unlockedBallTier()`
  už nečte nikdy nezapisovaný seam `progress.tier` (proto šel dřív koupit jen tier 1),
  ale odvozuje tier z **počtu odznaků**: 0–1 → t1, 2–4 → t2, 5+ → t3. Explicitní
  `progress.tier` smí tier už jen zvýšit (dev/budoucnost). Obchod navíc ukazuje
  **náhled zamčených ballů** dalšího tieru (🔒 N badges). Bez save migrace.
- ✅ **Jak získat Master Ball – HOTOVO (v0.81.0).** Odměna za vyčištění **Silph Co.**
  gauntletu v Saffronu (payoff větev v `battleSystem.js finishTrainerBattle`, přidá
  `resources.balls.master`). Ball `data/pokeballs.js` `{ id:"master", guaranteed:true }`
  (jistota chycení, neprodejný).
- ✅ **Autocatch – výběr míčku + auto-vypnutí (ZMĚNA v0.64.0).** ~~Dřív (v0.58.0)
  fallback na nejlevnější vlastněný~~ → uživatel to VRÁTIL: autocatch teď má
  **vlastní výběr typu** (`#ac-ball` select, `autocatch.ball`, ukazuje počty) a
  používá **JEN vybraný typ**. Když dojde → `resolveAutocatchBall` vrátí null a
  tick loop **autocatch automaticky vypne** (`setAutocatch({enabled:false})`) +
  hláška do logu. NIKDY nesáhne po jiném (dražším) míčku.
- ✅ **Skutečné ikony ballů – HOTOVO.** `src/ui/ballIcon.js` (`ballIconHtml(ballId)`)
  kreslí `<img>` z `assets/pokeballs/<id>-ball.png` s emoji fallbackem; používá se
  všude (souboj, obchod, horní lišta, karta Pokémona). Všech 13 ballů má reálný sprite.
- ✅ **Ball na kartě Pokémona (vizuál) – HOTOVO.** Při chytání se ukládá `caughtBall`
  na jedince (`battleSystem.js`), karta Pokémona ho vykreslí přes `ballIconHtml`
  (`pokemonCard.js`). (Řádek slotu Týmu = drobná kosmetika, pokud vůbec.)
- ⚪ **Fast Ball práh** – teď base speed ≥ 100; naši startovní druhy tak rychlí
  nejsou, uplatní se až u rychlejších druhů (záměr, případně doladit).
- 🔵 **Bally jako loot (pozor).** Loot tabulka oblastí zůstává, ale ball dropy
  jsme zrušili (bally jen z obchodu, R-020). Kdyby se někdy měl ball dropovat,
  loot aplikace (`handleFaint`/`idle.js`) počítá `res[resource]` – ball id by
  muselo jít do `res.balls[id]`, ne přímo do `resources`.
- 🔵 **Rezervované bally (comingSoon) – ČÁSTEČNĚ HOTOVO (v0.62.0, v0.94.0).** ✅ Odemčeny
  **Love** (`loveMatch` ×8), **Heavy** (`heavy`, dle hmotnosti), **Dream**
  (`statusEnemy` ×4/×6 spící), **Moon** (`moonStone` ×4) v0.62.0. ✅ v0.94.0 přidány
  **Dusk** (`darkPlace` ×3 v jeskyních `biome:"cave"`) a **Dive** (`waterPlace` ×3.5
  ve vodních oblastech `biome:"water"`) – `catchContext()` nově předává `biome`.
  **Zbývají (stále comingSoon,** `tier:null`/`price:null`, jen sprite+id): **Lure**
  (rybaření), Safari/Sport/Park/Cherish (eventy), Premier (kosmetika za hromadný
  nákup), Friend (friendship) – čekají na chybějící mechaniky (rybaření/eventy/
  friendship), záměrně nevymýšlíme naslepo. Zapojení = doplnit `tier`/`price`/`bonus`
  + case v `ballMultiplier`.
- ⚪ **Beast Ball (Ultra Beasts).** Jediný chybějící ball z celého kánonu – NEMÁ
  zatím ani sprite (`beast-ball.png`) ani datovou položku. Řešit **až** s Ultra
  Beasts; teď záměrně vynecháno.

## Obchod (Market)

- 🔵 **Sekce Marketu.** Hotovo v 0.19.0: okno „🛒 Market" s obchodem po sekcích
  (`buildingView.js` → `openMarket`, dept-cards). ✅ **Items** (léčení/statusy/revive)
  přidány v **0.45.0** (`openItemShop`, data `data/items.js`). ✅ **Hromadný nákup**
  (×1/×5/×10/Max) v obou obchodech v **0.58.0**. ✅ **Evoluční kameny** (Fire/Water/
  Thunder/Leaf/Moon + Linking Cord) kupitelné v sekci Items (kategorie „evolution",
  `data/items.js` + `buildingView.openItemShop`, v0.59.0) → **CELÁ SEKCE HOTOVÁ**.

## Itemy & léčení

- ✅ **Léčivé itemy (v0.45.0).** DATA `data/items.js` (potiony HP, léčení statusů,
  revive) + `itemSystem.js` (`buyItem`, `useItem`, `canUseItem`). Sekce **Items**
  v Poké Martu, **🎒 Bag** na záložce Tým (výběr itemu → cíl z kolekce), a itemy
  v bojovém batohu (na aktivního, spotřebují kolo). Save v17 (`resources.items`).
- ✅ **Revive v souboji (HOTOVO, ověřeno 2026-09-03).** `canUseItem` povolí revive
  na vyřazeného člena (`itemSystem.js:71`), item-target menu v souboji nabízí celý
  tým vč. vyřazených (`battleView.js:479`), `playerUseItem` to provede a spotřebuje
  kolo (`battleSystem.js`). **Pozn.:** nabízí jen členy TÝMU, ne jedince v PC boxech.
- ✅ **Hromadný nákup itemů – HOTOVO v0.58.0** (×1/×5/×10/Max, `buildingView.js`).
- ✅ **Prodej itemů + řazení batohu – HOTOVO v0.59.0** (`itemSystem.sellItem`, výkup 50 %, tlačítka Sell 1 / Sell all v batohu; seznamy řazené abecedně). 🚫 Batch use (použití víc kusů naráz) **ZAMÍTNUTO uživatelem – itemy vždy jen po 1 ks.**
- ✅ **Held items** (item nesený jedincem) – **HOTOVO v0.92.0.** `OwnedPokemon.heldItem`
  (`state.js`); funkční **Everstone** (blok evoluce + dědičnost povahy) a **Destiny Knot**
  (5 IV dědičnost, `breedingSystem.js`); v souboji held-item efekty (low-HP heal /
  end-turn heal, `battleSystem.js`). ✅ Sortiment rozšířen o **Sitrus Berry** (heal 30
  pod 50 % HP) a **Focus Sash** (přežití KO z plného HP s 1 HP, hook `focusSash`);
  ✅ **UI pro nasazení/sundání** drženého předmětu je v kartě Pokémona (dropdown +
  Equip/Unequip, `pokemonCard.js`), mimo breeding. **Zbývá do budoucna:** choice items
  (vyžadují move-lock + vynucení v manuálním souboji – záměrně odloženo).
- ✅ **Ekonomika léčení – ROZHODNUTO v0.62.0: zůstává ZDARMA.** Uživatel zvolil
  nechat Heal team / Cure v Poké Centru zdarma; potiony mají smysl hlavně v souboji
  (do Centra tam nelze). Jen zpřehledněno UI: „Heal team (free)" + explicitní
  info, že obnoví plné HP, status i PP.

## Sprity Pokémonů + struktura dat

- 🔵 **Sprity Pokémonů – konvence složek (R-024).** ✅ Zapojeno a živé ve hře
  (v0.27.0): Pokédex i Karta Pokémona kreslí reálný sprite z
  `assets/pokemon/<id>/<view>.png`, shiny přes `shiny-<view>`, samice přes
  volitelnou příponu `-f` s fallbackem na výchozí. Standard 256×256 / postava
  232 px (nástroj `tools/prep_sprite.py`; Python+PIL JSOU v shellu). **✅ VŠECH 15
  druhů má teď reálné sprity** (v0.52.0 doplněno 9 evolucí z pokemondb.net vč.
  shiny a samičích variant venusaur/raticate; front/back/shiny-front/shiny-back).
  Budovy: ✅ všech 5 má sprite (training-grounds + move-tutor doplněny v0.52.0).
  **Zbývá:** `back`/shiny-back plně využít v souboji (R-029); sprity dalších druhů
  až přibudou nové.
  Původní návrh:
- ⚪ **Sprity Pokémonů – konvence složek (návrh, R-024).** Uživatel chce každý
  druh jako vlastní složku se sprity, hledatelnou **podle jména** (u 1000+ druhů
  je číslo nepoužitelné). Složky jsou **naplocho, všechny druhy vedle sebe**
  (bez dělení po generacích – rozhodnutí uživatele 2026-09-01). **Doporučená
  konvence:** `assets/pokemon/<id>/front.png` (soupeř / Pokédex / karta) a
  `back.png` (náš Pokémon v souboji), později volitelně `front-shiny.png` /
  `back-shiny.png`. Pozn.: `species.id` **JE slug jména** (`bulbasaur`,
  `pikachu`), ne dex číslo – takže složky jsou de facto pojmenované jménem a řadí
  se abecedně. Slug (ne zobrazované `name`) proto, že jméno může mít
  mezery/diakritiku/apostrof (`Mr. Mime`, `Farfetch'd`), což se v cestách chová
  špatně. Cesty se **odvozují z `species.id`** (`spritePath(id, "front")`), nic
  se neregistruje ani nepíše per druh – to je ta „rychlejší metoda". Chybějící
  sprite → fallback (silueta / emoji).
- ✅ **Rozšíření schématu druhu.** Hotovo v 0.21.0: do `data/pokemon.js` přidány
  **`gen`** + **`genderRatio`** u všech druhů + typedefy. ✅ **`height`/`weight`/
  `genus`/`dexEntry` doplněny v0.57.0** všem 151 druhům z PokeAPI generačně
  nezávislým skriptem `tools/gen_pokedex_info.py` (id+dexNo z dat, idempotentní);
  zobrazeno na Kartě Pokémona; `height` navíc řídí velikost spritu v Battle Area
  (`spriteScaleForHeight`, `--mon-scale`). Sprite se do dat neukládá – odvozuje se
  z `id`. Pozn.: DATA zůstávají centrálně v `data/pokemon.js`; až druhů přibude,
  rozdělit **po generacích** (`data/pokemon/gen1.js` …). Složku per druh jen na
  ASSETY (sprity).

## Karta Pokémona

- ✅ **Detail jedince = „karta Pokémona" (R-025, 0.23.0).** Modal
  (`src/ui/pokemonCard.js`), otevře klik na slot v Týmu nebo kartu v Pokédexu.
  Obsah: sprite (`front`, shiny varianta), jméno + dex + typy + rarita, level +
  **EXP bar**, tabulka 6 statů (base / hodnota / IV bar / EV bar) + IV %/total a
  EV total, poměr pohlaví, egg groups, generace, shiny. „Kde chytit" z
  `area.species`. Viděný (nechycený) druh = silueta + base staty (bez IV/EV).
- ✅ **Ball, ve kterém byl chycen – na kartě (0.24.0).** Přidáno pole `caughtBall`
  na `OwnedPokemon` (zaznamená se při chycení v souboji; startér = „poke";
  vylíhnutí/dar = null), save v10 + migrace (staré jedince dorovná na „poke").
  Karta ukazuje ikonu + název ballu. Ikony ballů z assetu přes `ballIcon.js`
  (horní lišta, výběr ballu v souboji, Poké Mart) – konvence `<id>-ball.png`.
- ✅ **Per-jedinec pohlaví (0.25.0).** Každý jedinec má vlastní `gender`
  (`"m"|"f"|"genderless"`), rozlosuje se z `genderRatio` druhu ve `createPokemon`
  (`rollGender`). Save v11 (migrace dorovná staré jedince). ♂/♀ se ukazuje na
  kartě (jméno + řádek Gender), na chycených kartách Pokédexu a ve slotech Týmu.
  Helper `src/ui/gender.js` (`genderSymbolHtml`), CSS `.gender.male/.female`.
- ✅ **Hezčí vizualizace statů (radar) (v0.44.0).** Hexagonový SVG radar 6 statů
  (Value) na kartě jedince nad tabulkou (`pokemonCard.statRadar`); jedna série →
  jedna sekvenční modrá, bez legendy (dataviz), osy povahou barevně odlišené
  (+zelená / −červená). Normalizace na nejsilnější stat jedince (tvar nezávislý
  na levelu). **Zbývá volitelně:** hover/tooltip na osách, EV-only radar se stropy.

## Pokédex

- ✅ **Pokédex jako záložka místo Kolekce (R-026, 0.22.0).** Záložka Pokédex
  nahradila Kolekci. Karty všech druhů řazené podle `dexNo`, ukazatel „chyceno
  X / z Y" (Y = délka `POKEMON_SPECIES`). Karta = sprite + dex číslo + jméno.
  Přidání do týmu a výběr startéra se přesunuly sem (`src/ui/pokedexView.js`).
- ✅ **Stavy objevení (0.22.0).** „neviděn" (silueta + „???") / „viděn" (silueta
  + jméno + tag Seen, potkán v souboji) / „chycen" (sprite + akce Team). Přidán
  stav `state.pokedex = { seen: [] }` (caught se odvozuje z kolekce), save v9.
  Logika v `src/systems/pokedex.js`, `markSeen` volá `battleSystem.spawnEnemy`.
- ✅ **Hledání + filtry (0.22.0).** Search (jméno u objevených / dex číslo),
  filtry stav (All/Caught/Seen/Missing) a typ, řazení dle dexNo. Znovupoužit
  vzor `.filter-bar`. Fokus/caret/scroll přežijí překreslení levého panelu.
- ✅ **Detail v Pokédexu = kde se druh vyskytuje (HOTOVO, ověřeno 2026-09-03).**
  Karta Pokémona má sekci „Where to catch" (`whereToCatch` → `areasForSpecies`,
  `pokemonCard.js:104`), v caughtBody i seenBody. Karta se otevře jen pro chycený
  (`uid`) nebo viděný (`speciesId`) druh → neobjeveným se výskyt neukáže (drží R-023).
- ✅ **Ikona Pokédexu v horní liště – HOTOVO v0.58.0.** Položka „📕 Pokédex"
  (počet chycených) je klikatelná → `leftPanel.openLeftPanelTab("pokedex")`.

## Kolekce → Boxy (PC)

- ✅ **PC Boxy (R-027) – HOTOVO v0.55.0.** Nová záložka **PC** vedle Team
  (`src/ui/pcView.js`). Box = **30 slotů** (mřížka 6×5), více boxů, přepínání
  ◀/▶ + „＋ Box". Jedinci jako sprity. **Drag & drop** (přeuspořádání v boxu),
  **klik → Karta Pokémona**, „＋ Team". Datově `state.pcBoxes = [{name, slots:
  (uid|null)[30]}]` (save v19); `state.collection` zůstává zdroj pravdy,
  `pcSystem.reconcile` sladí boxy (jedinec mimo tým = právě 1 slot). Team oddělený
  (max 6), integrace automatická přes reconcile. **Pokédex netknutý.**
- ✅ **PC boxy – doladit – HOTOVO v0.58.0.** Drag & drop **mezi boxy** (drop na
  ◀/▶ → `pcSystem.moveToBox`), **přejmenování boxu** (klik na jméno →
  `renameBox`), **30 boxů napevno** (`PC_BOX_COUNT`, ＋ Box zrušen). Volitelně
  do budoucna: řazení/hromadné operace, počet obsazených na boxu, „odeslat do
  boxu" přímo z Týmu.

## Mapa světa

- 🔵 **Klikací mapa Kanto (MVP) – HOTOVO v0.64.0.** Obrázek `assets/map/kanto.webp`
  + absolutně (%) pozicované klikací markery (`src/ui/mapView.js`), model odemykání
  přes **visited-graf** (`unlock:{start}|{visited}|{badge}`, `progress.visited[]`),
  volba oblasti klikem → `setActiveArea`. Save v21→v24. Nový **tabový layout**
  (`src/ui/mainPanel.js`: Battle/City/PC/Pokédex nahoře, Team 3×2 dlaždice dole,
  mapa vpravo). `leftPanel.js` smazán. **Badge-gating základ** připraven
  (`isAreaUnlocked(area, visited, badges)` + `unlock.badge`), zatím nevyužit.

### DALŠÍ KROKY — POŘADNÍK (priorita shora, aktualizováno 2026-09-10)
1. ✅ **Player Profile / Trainer Card (nový tab) — HOTOVO (v0.65.0).**
   Profile view (`src/ui/profileView.js`) – **otevírá se tlačítkem 👤 v horní liště**
   (vedle Goldu); Trainer card se jménem, Pokédex souhrnem, badge case (8/8), zlatem, časem.
2. ✅ **Trenéři + Gymy — FÁZE 1–3: HOTOVO (v0.66.0–v0.80.0).**
   `data/trainers.js` (route trenéři + gym leadeři), `data/badges.js` (8 odznaků),
   `data/gyms.js` (8 gymů), trenérský engine v `src/systems/battleSystem.js` (souboje,
   výhra, odznaky), gym UI (`src/ui/gymView.js`), vícevrstvý gating (`area.unlock`).
   **Všechny 8 gymů Kanta funční s leaderama i odznaky.**
3. ✅ **Trenéři + Gymy — FÁZE 4: sprity — v0.67.0–v0.80.0, částečně dodáno.**
   Trenérské třídy v `assets/trainers/`, 8 gym leaderů (assets/gym-leaders/), odznak ikony.
   Zbývá: doplnit chybějící sprity (SPRITES-TODO.md).
4. ✅ **Trenéři + Gymy — FÁZE 5: badge-gaty — HOTOVO (v0.80.0, v0.81.0).**
   Victory Road / Route 23 = 8 odznaků (Earth Badge od Giovanniho), Indigo Plateau
   jen po poražení Ligy. Všechny kanonické gaty napojené.
5. ⚪ **Sprity (uživatel dodá)** — zbývající trenérské třídy, legendární ptáci,
   pozadí pro nové oblasti. Seznam v `docs/SPRITES-TODO.md`.
6. ⚪ **Odemknout fázi 5 Kanto** (spawny nových druhů dle oblastí) z
   alldex-data-strategy — navázat na postup po mapě + `progress.tier` pro bally.
7. ⚪ **Vizuální ověření layoutu** ve hře (mapa, team-grid 3×2, přepínání tabů) —
   doladit CSS podle oka, průběžně.

**Později (bez pevného pořadí):** TM odměny za gymy, HM systém, mapa per generace
(viz příslušné sekce).

- ⚪ **Mapa vpravo dole (původní návrh, R-028).** V pravém panelu (nebo jeho spodní
  části) reálný obrázek oblasti s vyznačením, **kde postava je**. Cíl přesunu
  zatím jako bar/výběr (kam jít). Držet klasická progress pravidla per mapa
  (postup odemyká další lokace). Nová `data/map.js` (uzly lokací + souřadnice pro
  obrázek + vazby postupu); obrázky map dodá uživatel do `assets/maps/`.
  Napojit na `data/areas.js` (uzel mapy ↔ oblast). Provázat s R-023/Pokédex
  (odemykání) a odemykáním ballů dle `progress.tier`.
- ⚪ **Mapy per generace (návrh, R-032).** Cíl: **mapa pro každou generaci**
  (Kanto první), a na dané mapě jdou chytit **jen Pokémoni té generace**.
  `progress.tier` / odemykání ballů navázat na postup napříč generacemi. Dělení
  per generace je jen v DATECH/mapách; sprity zůstávají v jedné ploché složce
  (R-024).
- ⚪ **Model gen vs. výskyt – JEDEN záznam na druh (rozhodnuto).** Důležité
  rozlišení, aby se druh nikdy neduplikoval:
  - **`species.gen`** = generace, ve které byl druh *představen* (jeho identita,
    jako National Dex). Vždy **jedna hodnota**, i když se druh objevuje ve hrách
    víc generací. Slouží k organizaci (Pokédex, budoucí rozdělení dat po gen).
  - **Výskyt / „kde se dá chytit"** = `area.species` (už existuje). Druh může být
    ve víc oblastech → přidá se jeho `id` do víc `area.species`; **stále jeden
    záznam druhu**.
  - Pravidlo „na mapě jen Pokémoni dané generace" = **konvence při psaní dat
    oblastí** (oblast/mapa má `gen`; do jejích `species` dáváme jen druhy s
    odpovídajícím `gen`), volitelně hlídaná helperem, který filtruje
    `area.species` na `area.gen`. NENÍ to napevno přes `gen` – kdybychom chtěli
    (jako v reálných hrách) gen-1 druh i na pozdější mapě, jen ho přidáme do dané
    oblasti.
  - **Nové evoluce/baby formy** představené později = **vlastní druh s vlastním
    `gen`** (ne duplikát). **Regionální formy** (Alolan…) = řešit přes samostatné
    `id` / pole „forma", ne přes `gen`.

## Trenéři, Gymy a vícevrstvý gating

✅ **IMPLEMENTOVÁNO v kódu (v0.66.0–v0.80.0).** Kompletní systém: `data/trainers.js`
(route trenéři + gym leadeři), `data/badges.js` (8 odznaků), `data/gyms.js` (8 gymů Kanta),
engine v `src/systems/battleSystem.js` (souboje, výhra, odznaky), UI `src/ui/gymView.js`
(gym tabu), vícevrstvý gating (`area.unlock`). Všechny tři implementační fáze (1. data,
2. engine, 3. UI) jsou **hotové a ověřené v kódu**. Zbývá: dodaná sprity od uživatele (Fáze 4)
a badge-gating na kanonická místa (Fáze 5).
Klíč: **trenér = jen „scénář" (fronta soupeřů) pro STÁVAJÍCÍ battle engine**, žádný
nový bojový mód. Auto AI odbojuje frontu; autocatch se u trenéra vypne.

### Route trenéři (⚪ jen rozhodnuto)
- **`data/trainers.js`**: `{ id, name, class, sprite, areaId, team:[{speciesId,level}],
  reward:{gold}, gate?:bool }`.
- **Objevení = fixní ~15 %** místo divokého encounteru; losuje se jen z **nezdolaných**
  trenérů poolu routy. **Max 5 trenérů/routa.**
- **Týmy = reprezentativní pool s chronologickým omezením:** trenér na routě N smí mít
  jen druhy dostupné z rout ≤ N **+ jejich evoluce, pokud level dovolí**. **Max level =
  dle levelu následujícího gym bosse.**
- Souboj: fronta soupeřů (po KO další), HP/PP se přenáší; **léčení = itemy + switch ANO,
  „Heal team" NE**; **nejde chytat ani utéct**; **autocatch vypnut**.
- **1. porážka** = prize money (kanonicky, base třídy × top level) + XP + zápis do
  `progress.defeatedTrainers`. **Rematch** (po zdolání poolu) = jen XP, **lehce nad
  úrovní divokých Pokémonů routy** (bez peněz – ekonomika nerozbitá).
- **Prohra = bez postihu** (padne celý tým → jen „zkus znovu"; kvůli idle).

### Gym = samostatný tab v Battle Areně, sekvenční progres (⚪ jen rozhodnuto)
- Když je hráč **v gym-městě a lze do gymu vstoupit** → na Battle Areně se objeví
  **nový tab „Gym"**. V něm **řada trenérů + gym leader na konci.**
- **Progres uvnitř gymu:** odemčený jen 1. trenér → po výhře další → … → nakonec
  **gym leader.** Počet gym trenérů **dle kánonu**, **všichni POVINNÍ**. Souboje =
  **manual mode.** Stav progrese uvnitř gymu se drží v save.
- **Gym leadeři = věrné kopie kánonu, ale těžší: plné IV (31) + EV (252/252)**,
  kanonické levely. Tým **tématický** (Brock=Rock…), **kanonické pořadí** 8 gymů.
- **Výhra nad leaderem = odznak** (`progress.badges`, **kanonická jména odznaků**) +
  peníze. **MVP odměna = jen odznak + peníze.**
- **„Překvapení týmu"** – hráč dopředu nevidí soupeřův tým.
- Datově: gym = uzel s uspořádaným seznamem trenérů + leader (`data/gyms.js` nebo
  příznak `gym:true` v `data/trainers.js`), `{ cityId, type, badge:"<id>", trainers:[...],
  leader:{...} }`.

### Vícevrstvý gating oblastí (⚪ jen rozhodnuto)
- `area.unlock` rozšířit na skládatelné podmínky (AND):
  ```
  unlock: { start?, visited?:"<areaId>", trainer?:"<trainerId>", badge?:"<badgeId>", /* budoucí: hm?, item? */ }
  ```
- `isAreaUnlocked(area, {visited, defeatedTrainers, badges})` – rozšířit stávající
  signaturu (teď bere `visited, badges`).
- **Blokace postupu = JEDEN mini-boss / gate trenér** na gatující routě (ostatní trenéři
  = volitelný bonus). Uzel se **zobrazí** po visited, **vstup** až po poražení gate.
- **Gating dle kánonu**; hlavní badge-gate = **Victory Road / Route 23 = 8 odznaků**.
- 🟢 **Forma mini-bosse (A2b) – SCHVÁLENO:** rival = speciální třída gate-mini-bosse.
  Na kanonických místech rivala je gate **rival**, jinde **silný trenér** na uzlu před
  gym-městem. Jeden gate-mini-boss = jedna podmínka `unlock.trainer`.

### UX souboje s trenérem (⚪ jen rozhodnuto)
- **Ukazatel Poké Ballů** u soupeřova HP: barevné = zbývající Pokémoni, ztmavené =
  poražení.
- **Texty souboje:** auto mód je **auto-odklikává po chvilce**, manuál **kliká hráč**.
- **Scéna:** uvidíš trenéra, **vyhodí Poké Ball**, a **trenér zůstane v pozadí** za
  svým aktuálním Pokémonem.

### Implementační fáze (pořadí)
1. **Data:** `data/trainers.js` (+ gymy), rozšíření `area.unlock` o `trainer`,
   `progress.defeatedTrainers` + gym-progres, save migrace.
2. **Engine:** trenérský souboj (fronta, bez chytání/útěku, pravidla léčení, ball
   ukazatel, auto-odklik textů), výhra/odměna/badge, ~15 % spawn v proudu, gym
   sekvence, vícevrstvý `isAreaUnlocked`.
3. **UI:** route panel sekce Trainers (✓/✗), **gym tab v Battle Areně** (sekvence),
   hláška u zamčeného uzlu.
4. **Sprity (uživatel dodá):** trenérské třídy + 8 gym leaderů + 8 ikon odznaků + pozadí.
5. **Badge-gaty** na kanonická místa (zapne odložený badge-gating).

### Gym Challenges (minihry před souboji)

- ✅ **Vermilion Gym Challenge – trash cans (v0.88.0).** Framework `src/ui/gymChallengeView.js`
  (datově řízený registr `CHALLENGES` po gymech; `hasGymChallenge`, `isGymChallengeDone`,
  `startGymChallenge`). Vermilion (Lt. Surge) má klikací mřížku 5×3 košů – najdi první
  vypínač, druhý je vedle, špatný tip resetuje zámek. Splnění se ukládá do
  `state.story.vermilionGymSwitches`. Integrování do `src/ui/gymView.js`: challenge karty
  v Gym tabu, zámek na souboje trenérů, žádná migrace (staré save s `started`/`cleared`
  challenge obejdou).
- ✅ **Saffron Gym Challenge – teleportační dlaždice (v0.88.0).** `buildTeleportPads`: mřížka
  3×3 warp padů, jedna pevná správná posloupnost 4 padů k Sabrině; správný pad se rozsvítí,
  špatný tě teleportuje zpět na vstup (bludiště se nemíchá → férové paměťové puzzle). Flag
  `state.story.saffronGymIntro`. Zobrazí se až po osvobození Silph Co. (existující story gate).
- ✅ **Fuchsia Gym Challenge – neviditelné zdi (v0.88.0).** `buildInvisibleWalls`: bludiště 5×5
  se skrytými zdmi, hráč se hmatem prodírá z dolního vchodu ke Kogovi (🥷); náraz do zdi ji
  odhalí (🧱). Pevné, zaručeně řešitelné rozložení. Flag `state.story.fuchsiaGymWalls`.
- ✅ **Blaine (Cinnabar) – kvíz (v0.77.0).** Již hotový (pravda/nepravda otázky v `popup.choices`).

### Budoucí rozšíření (⚪ zapsat, dělat časem)
- ✅ **TM systém + odměny za gymy (v0.93.0).** Kompletní Gen 1 TM01–TM50 (`data/tms.js`,
  `data/tmCompat.js`, `src/systems/tmSystem.js`): jednorázové itemy v `resources.items`,
  kanonická kompatibilita per druh (všech 151), naučení tahu z karty Pokémona
  („Teach TM" + výběr slotu k přepsání). Zdroje TM dle kánonu: **gym leadeři** (Brock→TM34
  Bide, Misty→TM11 Bubble Beam, Surge→TM24 Thunderbolt, Erika→TM21 Mega Drain, Koga→TM06
  Toxic, Sabrina→TM46 Psywave, Blaine→TM38 Fire Blast, Giovanni→TM27 Fissure), **Poké Mart**
  (kupitelné), **Game Corner** (TM13/23/48 za coiny) a **vzácný wild drop** (~1,5 %). Batoh
  má read-only TM sekci. HM zůstávají samostatné klíčové itemy (viz níže).
- ✅ **HM systém (v0.96.0) – HOTOVO.** HM01 Cut / HM02 Fly / HM03 Surf / HM04 Strength / HM05 Flash jsou reálné **znovupoužitelné učitelné tahy** (nespotřebují se, učí se neomezeně kompatibilním druhům). Data: `data/hms.js` (mapování HM→tah+item+flag), `data/hmCompat.js` (kanonická kompatibilita všech 151), `src/systems/hmSystem.js` (logika, `teachHm` NEspotřebovává). UI: sekce „Teach HM" na kartě (`pokemonCard.js`, vedle „Teach TM"). Odemykání HM přes story flagy beze změny (hasSurf/hasStrength apod.). Nově přidáno: item `hm02-fly`, move `flash`; Fly se uděluje na S.S. Anne, je JEN bojový move. Save v44 (backfill `hm02-fly`, `hasFly`). **Zámínka pro budoucnost:** Až bude třeba **gating po HM** (např. stromy/vodní plochy jako skutečné bloky), převést na `unlock.hm` ve vzoru `area.unlock`; zatím jsou HM oblasti volné (jen visited). Zbývá: doladit gating HM-oblastí (bude-li potřeba).

## Player Profile / Trainer Card (nový tab)

- ✅ **Tab „Profile" (trainer card) – HOTOVO** (`src/ui/profileView.js`, zapojeno v
  `mainPanel.js`). Badge case, Pokédex souhrn, peníze/jméno/čas. Původní zadání níže:
- (historie) **Tab „Profile" (trainer card)** – nápad uživatele 2026-09-07. Samostatný tab
  v layoutu (`src/ui/mainPanel.js`) s přehledem hráče:
  - **Badge case** – 8 slotů odznaků, získané barevné (`progress.badges`), chybějící
    ztmavené; ikony z `assets/badges/<id>.png`. (Přirozený domov pro odznaky z gymů.)
  - **Pokédex souhrn** – chyceno / viděno / z 151 (`collection`, `pokedex.seen`).
  - **Peníze** (`resources`), **jméno hráče**, **odehraný čas**.
  - Volitelně později: portrét hráče, statistiky (nachyceno shiny, počet evolucí,
    poražených trenérů…), přejmenování hráče.
  - Levné: všechna data už v `state`, jde hlavně o čtení + vykreslení (žádná nová
    herní logika). Váže se na badge systém z gymů (sekce výše).

## Souboj – přepracování (sprity + reálný boj)

- 🔵 **Přepracovat souboj na spritový (R-029).** Fázový plán (detail v NOTES
  2026-09-01). Cíl: z textového auto-souboje plnohodnotná bojová obrazovka.
  - **Fáze 1 – vizuál (rozpracováno, v0.27.0):** ✅ Battle Area je **scéna**
    (`.battle-field` poměr 3:2, pozadí `cover` vyplní celé okno, bojovníci jsou
    overlay: soupeř nahoře `front`, náš dole `back`, jméno+HP/XP v průsvitném
    panelu; respektuje shiny + `-f`). ✅ **Pozadí sdílená přes biome** (obrázky
    naplocho v `assets/backgrounds/`, `data/backgrounds.js` `BACKGROUND_BIOMES`,
    oblast → `area.biome`; výběr `battleSystem.pickBackground`, přehazuje se každé
    nové setkání, drží se v `battle.background`). ✅ **Útok-animace + reakce na
    zásah** (v0.39.0): útočník vyrazí vpřed (`is-attacking` → `atkLungeDown/Up`),
    zasažený se otřese a zabliká doruda (`is-hit` → `hitShake`/`hitFlash`);
    navěšuje `battleView.playHit` na `BATTLE_HIT`. Physical útok = doskok NA
    soupeře (`jumpAttack` počítá vzdálenost z DOM → `--jx/--jy`, `atkPounce`,
    v0.39.1–2). ✅ **Faint animace** (v0.41.0): padlý klesne, nakloní se a
    vybledne (`is-fainting` → `faintDrop`, `forwards`), event `BATTLE_FAINT`,
    faint se vyhodnotí až po animaci (jen manuál – krokové kolo). ✅ **GIF
    animace na obou stranách v manuálu** (v0.56.0): `combatantHtml(..., animated)`
    volí gif→png→glyph, `draw()` předává `anim = !getAutoBattle()` oběma stranám;
    statické PNG v auto/idle. Gify se stahují `tools/dl_gifs.py` (druhy z dat).
    ✅ **Škálování spritů podle úhlopříčky** (v0.56.0): `battleView.applySpriteScale`
    počítá `--sprite` z `Math.hypot(w,h)` battle areny (`ResizeObserver`); úzký
    panel ošetřen (`.c-info` se scvrkne, nepřekrývá sprite). **Zbývá:** dodat
    další pozadí/biome + chybějící `back`/`front` sprity druhů; gify zbylých
    druhů (`python tools/dl_gifs.py --all`); (faint animace v auto módu – teď jen manuál).
  - **Fáze 2 – Auto / Manual:** ⚙ částečně (v0.28–0.29): **Auto battle**
    (`settings.autoBattle`) je samostatný přepínač MÓDU, oddělený od Pause/Resume
    (`running`). V auto módu běží automatická kola (`schedule()` je pustí jen když
    `running && autoBattle`); Pause jen pozastaví. ✅ **Manual mód hotový (ověřeno
    2026-09-03):** `schedule()` se ukončí, když není Auto battle (`battleSystem.js:915`);
    v manuálu běží kola jen z tlačítek (`canManualAct` → `playerAttack/UseItem/Switch`
    → `resolveManualRound`). Souboj čeká na hráče, plné menu tahů/itemů/switche.
  - **Fáze 2b – trvalé HP (hotovo, v0.30.0):** ✅ `owned.hp` je trvalé (save v12),
    boj čte/píše přes `makeCombatant` accessor, swap na dalšího živého, `teamView`
    ukazuje reálné HP i fainted. Doléčení po výhře jen v auto módu; **Heal team**
    v Poké Centru; manuál léčí ručně; background idle HP ignoruje.
  - **Fáze 3 – Move systém (velký, po krocích):** ✅ krok 1–5 hotové.
    ✅ krok 1–2 (v0.30.0): `data/moves.js` (physical/special + accuracy + PP) a
    `data/learnsets.js` (level-up + `movesAtLevel`). ✅ krok 3 (v0.31.0, save v13):
    `owned.moves` + PP (přiřazení z learnsetu v `createPokemon`, migrace, učení
    při level-upu). ✅ krok 4 (v0.32.0): damage/turn engine přes tahy
    (`calcMoveDamage` – kategorie/STAB/typová efektivita, accuracy/miss, PP,
    Struggle při 0 PP; `chooseAction` = nejvyšší očekávaný damage; `turnOrder` =
    priority → speed). ✅ krok 5 (v0.35.0): **manuální UI** – menu
    Battle/Run/Items/Switch (+ podmenu tahů, batohu s míčky, přehození týmu);
    akce `playerMove/Switch/Catch/Run` sdílí `runActions()` s `tick()`; ruční
    léčení přes Heal team. ✅ **popup nahrazení tahu** při plných 4 slotech
    (`moveLearnQueue` v save v14, `moveLearnView.js`, `resolveMoveLearn`).
    ✅ **Učení tahu při level-upu podle módu** (v0.51.0): **manual battle** se ptá
    (popup, jako dřív), **auto battle** + offline/Školka **přepíšou nejslabší tah
    sám** (`grantXp({auto})` → `learnLevelUpMoves({auto})` → `autoReplaceMove`;
    nikdy nezhorší sadu).
    ✅ **Move Tutor – budova** (v0.51.0): `data/buildings.js` `move-tutor`
    (`moveTutor:true`), UI `buildingView.openMoveTutorEditor` staví na
    `learnableMovesAtLevel` (celý level-up movepool ≤ level) + `setActiveMoves`
    (zachová PP). Řeší přeučení „přepsaných" tahů i **movepool po evoluci**
    (evolvovaný druh má v learnsetu i své nízkoúrovňové tahy). Přeučení zdarma.
    ✅ **Kompletní level-up movepooly** (v0.50.0): `data/moves.js` rozšířen na
    ~55 tahů, `data/learnsets.js` má plné level-up sady všech 15 druhů (vč.
    status/support tahů). Tahy nesou volitelné pole **`effect`** (statChange,
    sleep, confuse, flinch, recoil, drain, leechSeed, twoTurn, thrash, trap,
    rapidSpin, highCrit, critUp, rage, fixedDamageHalf, forceSwitch, copyMove,
    transform, heal, weather, tailwind, pursuit, suckerPunch). ⚠️ **Engine tyto
    efekty ZATÍM NEPROVÁDÍ** – data jsou „připravená" (uživatel: „že nějaké útoky
    zatím nic nedělají neřeš… připravené být mohou"). Nový typ **Dark** není v
    TYPE_CHART → efektivita ×1. DEV level-setter na kartě (`devSetLevel`) na
    testování evolucí/learnsetů.
  - ✅ **Implementovat efekty tahů (`move.effect`) (v0.53.0).** Data hotová
    (v0.50.0), zapojeno v `battleSystem`: **stat-stage systém** (7 statů
    Attack/Defense/Sp.Atk/Sp.Def/Speed/accuracy/evasion, klasické násobiče →
    damage, pořadí tahů, přesnost/úhyb; Growl/Leer/Growth/Swords Dance/Agility/
    Withdraw/Sand-Attack…), spánek/zmatení/flinch, recoil (Take Down/Double-Edge),
    drain, heal (Roost/Synthesis), Leech Seed, trap (Fire Spin), rapidSpin,
    highCrit/critUp (Focus Energy), Super Fang (fixedDamageHalf), two-turn charge
    (Solar Beam/Skull Bash), thrash (Petal Dance – zámek + zmatení), weather/déšť
    (Rain Dance: Water ×1.5, Fire ×0.5), tailwind (×2 Speed), rage. Sjednocené
    **residuální poškození konce kola** (otrava/popálení + Leech Seed + trap,
    krokově v manuálu); sebe-KO z recoilu/zmatení správně vyřadí. **TYPE_CHART
    rozšířen na plných 18 typů** (mj. Dark + Fairy), dvojtypy se násobí korektně.
    ✅ **DODĚLÁNO (v0.61.0):** **transform**, **copyMove** (Mimic), **forceSwitch**
    (Whirlwind/Roar), **Substitute**, **Counter**, **Rest**, **Reflect/Light Screen**
    už engine PROVÁDÍ (viz `battleSystem.js`). ✅ **DODĚLÁNO (v0.92.0):** **Haze**
    (nuluje stat-stages obou), **Metronome** (spustí náhodný tah dedikovaným resolverem),
    **Dig/Bounce/Fly/Dive** semi-invulnerabilita během nabíjecího kola (cílené útoky
    minou). ⚠️ **Zbývá:** **Bide** – v datech `moves.js` zatím žádný záznam (žádný dead case).
  - **Fáze 4 (později):** víc oblastí; Struggle recoil.
    ✅ **Auto-battle politika** (v0.48.0): `chooseAutoPlayerTurn` (auto-heal <30 %
    HP, auto-switch při enemy eff ≥2× s guardem, jinak move); `chooseAction`
    skóruje `dmg(avg)×acc` + bonus za ailment na zdravém cíli. Čisté status tahy
    (power 0) NOVĚ ve hře JSOU (v0.50.0) – power0-větev jim dá score 0/1, AI
    proto vždy sáhne po damage tahu (efekty status tahů engine zatím neaplikuje).
    ✅ **Kritické zásahy** (v0.42.0): ~1/16 šance, ×1.5 (`CRIT_CHANCE`/`CRIT_MULT`
    v `calcMoveDamage`), hláška „A critical hit!", větší žluté číslo (`.dmg-float.is-crit`).
    ✅ **Statusy poison/burn** (v0.42.0): data `ailment`/`ailmentChance` na tazích
    (poison-sting 30 %, ember 10 %); `maybeInflict` (typová imunita Fire/Poison/Steel);
    DoT na konci kola (`STATUS_DOT` 1/8, 1/16) – manuál krokově (`runEndOfRound`/
    `processDot` s číslem a faint animací), auto synchronně (`applyStatusDotAuto`);
    burn půlí fyzický damage; badge PSN/BRN (`statusBadge`).
    ✅ **Perzistence + zobrazení + paralýza + léčení statusu** (v0.43.0, save v15):
    status přesunut z běhového combatantu na **trvalý `owned.status`** (accessor v
    `makeCombatant`, jako `hp`) → přežije switch i refresh, čistí ho až léčení.
    Status nepřítele (mimo kolekci) se (de)serializuje v `serialize`/`restore`
    (`enemy.status`, `playerStatus`). Migrace v15 dorovná `status:null`. **Paralýza:**
    `PARALYSIS_FIZZLE=0.25` (šance vypadnutí tahu, bez spotřeby PP, kontrola v `useMove`),
    `PARALYSIS_SPEED_MULT=0.5` (přes `effSpeed` v `turnOrder`), imunita Electric, zdroj
    nový tah **Body Slam** (Normal, power 60, `ailment:"paralysis"` 30 %) v learnsetu
    rattata L9 / pidgey L11. `useMove` nově zvládá **status tahy power 0** (jen navěsí
    efekt) – seam pro Thunder Wave/Stun Spore. **Zobrazení:** sdílený `src/ui/statusBadge.js`
    (PSN/BRN/PAR) v Battle Areně (oba), Teamu i kartě Pokémona. **Léčení:** `healTeam`
    čistí i status; `healStatus(uid)` (tlačítko 💊 Cure v Teamu) sundá jen status bez HP/PP.
    ✅ **Itemy proti statusu s cenou** (v0.45.0): Antidote/Burn Heal/Paralyze Heal/Full Heal
    (viz sekce „Itemy & léčení").
    ✅ **Spánek + zmrznutí jako trvalé statusy** (v0.61.0): non-volatile na `owned.status`
    (serializují se, přežijí switch). Spánek 1–3 kola, freeze 20 %/kolo rozmrznutí + Fire
    tah rozmrazí, Ice-typ imunní; badge SLP/FRZ. Thunder Wave (power0 ailment) funguje.
    ✅ **Doplňování PP v auto módu** (v0.33.0): linie **PP regen** v Poké Centru
    doplní % PP tahů po každé výhře (jen auto battle; 0 % dokud se nekoupí).
    ✅ **Plovoucí damage čísla** (v0.33.0): červené „-N" nad zasaženým bojovníkem
    ve scéně (event `BATTLE_HIT`, CSS animace `dmgFloat`).
  - Staví na `battleSystem.js` / `battleView.js`; souboj zůstává transient, HP i
    Moves/PP ale patří do save (trvalé vlastnosti jedince).
- ⚪ **Move systém (předpoklad reálných útoků).** Zatím damage bez konkrétních
  útoků. Reálný boj s útoky vyžaduje `data/moves.js` + movepool na druzích. Velký
  kus – naplánovat samostatně, až se rozhodne pro fázi (3) výše.

## Nastavení hry

- 🔵 **Okno Nastavení / herní modifikátory (R-030).** ⚙ **Seam hotový (v0.28.0):**
  tlačítko ⚙ v horní liště otevírá menu globálních voleb (`src/ui/settingsView.js`);
  první volba je **Game speed** (přesunuta z okna souboje, `settings.speed`).
  ✅ **Přepsáno na sdílený modal (v0.56.0):** `openSettingsModal()` je jeden modal
  volaný z horní lišty ⚙ i z **title screenu** (SETTINGS hotspot).
  ✅ **Herní režimy (v0.61.0) – HOTOVO:** sekce Rules v Nastavení; `settings.rules=
  {noItems,noPotions,nuzlocke}` + top-level `nuzlockeCaught:{}` (save v20). **No items**
  (zákaz všech předmětů v souboji vč. auto-heal), **No potions** (jen HP kategorie),
  **Nuzlocke** (permadeath přes `releasePokemon` + chytání jen 1 druhu/oblast).
  `battleSystem.getRules()`/`itemsAllowed()` – systémy jen respektují.
  ✅ **Level cap (v0.92.0) – HOTOVO.** Rule „Level cap" (default off): strop = ace
  level dalšího neporaženého gym leadera → po 8 odznacích Elite Four/Champion ace →
  po titulu Champion strop zmizí (MAX_LEVEL 100). Centrálně v `grantXp()`
  (`progression.currentLevelCap()`), takže ho respektují všechny zdroje XP.

## Úvodní obrazovka (title screen)

- ✅ **Title screen (v0.56.0).** Při startu se ukáže `assets/Title_screen.png`
  (`index.html` `#title-screen`, `src/ui/titleScreen.js`). Tlačítka jsou
  **namalovaná v obrázku** → nad ně jsou napozicované **průhledné klikací zóny**
  (`.title-hotspot`, souřadnice v % z rozměrů obrázku): CONTINUE schová overlay,
  SETTINGS otevře sdílený modal nastavení. ✅ **Title screen jako BRÁNA (v0.57.0):**
  offline souhrn / nabídky tahů / výběr startéra se spustí až PO Continue
  (`onContinue` v `main.js`), overlay nad hrou (z-index 200), modaly nad ním (300).
  **Zbývá:** až budou save sloty / nová hra, napojit CONTINUE vs. New game;
  případně další hotspoty (kredity apod.).

## Responzivní layout

- ✅ **Přizpůsobení rozlišení (R-031) – HOTOVO v0.63.0.** Layout tří panelů reagující na
  velikost obrazovky: pod hranicí 1000px se panely skládají do jednoho sloupce (levé menu → souboj → mapa),
  celá stránka smí svisle scrollovat. Tři režimy: **Auto** (přizpůsobí se), **Široké** (vždy 2 sloupce),
  **Pod sebou** (vždy 1 sloupec). Řešeno CSS grid + media queries (bez zásahu do logiky).
- ⚪ **Plně přizpůsobitelný layout (budoucí).** Drag & drop uspořádání panelů – uživatel si sám
  rozhodne o pořadí/velikosti (nad rámec předdefinovaných presetů).

## Ladění / drobnosti

- ⚪ **Šance na shiny** – aktuálně `SHINY_CHANCE = 1/8192` (klasika). Laditelné
  jedním číslem v `pokemonSystem.js`.
