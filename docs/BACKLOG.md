# Backlog – připraveno / rozhodnuto, ale nedoděláno

Seznam věcí, které jsme **záměrně připravili nebo se na nich domluvili**, ale
ještě nejsou hotové. Ať na ně nezapomeneme. Detaily rozhodnutí viz
[NOTES.md](NOTES.md), historie hotového viz [../CHANGELOG.md](../CHANGELOG.md).

Legenda stavu: 🟡 připraveno (seam/data hotová) · ⚪ jen rozhodnuto (nic v kódu) · 🔵 částečně · ✅ hotovo (ponecháno kvůli navazující práci)

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
  - **Spawny/oblasti pro Kanto routes**: rozšířit `data/areas.js` (kde se kterí Pokémoni chytají) + rarita per oblast.
  - **Sprity 135 chybějících druhů**: zatím fallback „?"; dodá uživatel po vyřešení pipeline.
  - ✅ **Multi-stat boost tahy (v0.59.0) – HOTOVO:** engine efektů umí `effect.changes[]` (víc statů jedním tahem). Dragon Dance / Calm Mind / Bulk Up / Shell Smash napojeny.
  - ✅ **Dokončení soubojů (v0.61.0) – HOTOVO:** deferované **transform / copyMove (Mimic) / forceSwitch (Whirlwind/Roar)** už fungují (dočasný `volatile.moveOverride` přes `activeMoves` helper; blow-away nového soupeře / vytažení hráče). Přidány i **Substitute, Counter, Rest, Reflect/Light Screen** a **Sleep + Freeze jako trvalé non-volatile statusy** (spánek 1–3 kola, freeze 20 %/kolo + Fire thaw, Ice imunní). Zbývá do budoucna: Bide, Dig/Fly, Haze, Metronome.
  
- **Pravidlo dat (rozhodnuto):** **1 kanonický záznam na druh** dle **nejnovější
  mainline generace** (base staty, typy, movepool…). **Region = jen spawn-filtr**
  (`area.species` / `area.gen`), druh se NIKDY neduplikuje per generace/region.
  (Viz „Model gen vs. výskyt" v sekci Mapa světa.)
- ✅ **PC Boxy (Boxes) – HOTOVO v0.55.0** – viz sekce „Kolekce → Boxy (PC)".

---
## Hatching

Potřeba opravit čas hatchování, je tam třeba - 8% · 9 min 13.539999999999964 s

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
- ⚪ **Skryté druhy na cestě (návrh, R-023).** Hráč by dopředu neviděl, KTEŘÍ
  Pokémoni na cestě jsou – jen náznak, KOLIK druhů tam může potkat (např.
  „?/N druhů objeveno"). Objevené druhy se odemykají v Pokédexu (viz sekce
  Pokédex) a teprve pak se ukazuje, kde se vyskytují. Napojení: `area.species`
  zůstává, jen se ve UI maskuje podle `state.pokedex.seen`.

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
- ⚪ **Ditto jako běžný úlovek.** Ditto je teď **dočasně starter** (aby šel
  breeding otestovat). Cílově ho odebrat ze starterů (`teamView.js` → `STARTERS`)
  a dát jako chytatelný druh do vhodné oblasti (`data/areas.js`), ideálně vzácně
  (řeší až rarity-váhy výskytu per oblast).
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
- ⚪ **Odemykání ballů napojit na skutečný postup oblastí.** `progress.tier` je
  teď seam (natvrdo 1). Až budou další oblasti na mapě, dosažení oblasti má
  zvyšovat `tier` a tím odemykat další typy ballů v obchodě.
- ⚪ **Jak získat Master Ball.** Teď neprodejný a bez zdroje. Navrhnout milník/
  odměnu (např. dokončení oblasti, achievement).
- ✅ **Autocatch fallback na jiný ball – HOTOVO v0.58.0.** Když vybraný typ dojde,
  autocatch přepne na nejlevnější vlastněný (`battleSystem.resolveAutocatchBall`).
- ⚪ **Skutečné ikony ballů** – místo emoji použít obrázky z `assets/pokeballs/`.
  Uživatel dodává sprite jednotlivých ballů; použít je **všude**, kde je ball
  vidět (souboj, obchod, lišta, karta týmu). Jedna pomocná funkce
  `ballIcon(ballId)` → `<img>`, ať se to nepíše na více místech. Fallback na
  emoji pro balls bez dodaného spritu.
- ⚪ **Ball na kartě týmu / kartě Pokémona (vizuál).** Ukázat, v jakém ballu byl
  jedinec chycen. Seam: při chytání ukládat `caughtBall` na jedince; UI pak
  vykreslí `ballIcon(caughtBall)`. Navazuje na „Skutečné ikony ballů" výše a na
  Kartu Pokémona.
- ⚪ **Fast Ball práh** – teď base speed ≥ 100; naši startovní druhy tak rychlí
  nejsou, uplatní se až u rychlejších druhů (záměr, případně doladit).
- 🔵 **Bally jako loot (pozor).** Loot tabulka oblastí zůstává, ale ball dropy
  jsme zrušili (bally jen z obchodu, R-020). Kdyby se někdy měl ball dropovat,
  loot aplikace (`handleFaint`/`idle.js`) počítá `res[resource]` – ball id by
  muselo jít do `res.balls[id]`, ne přímo do `resources`.
- 🔵 **Rezervované bally (comingSoon) – ČÁSTEČNĚ HOTOVO v0.62.0.** ✅ Odemčeny
  **Love** (`loveMatch` ×8), **Heavy** (`heavy`, dle hmotnosti), **Dream**
  (`statusEnemy` ×4/×6 spící), **Moon** (`moonStone` ×4) – doplněn tier/price/bonus
  + mechanika v `pokeballSystem.ballMultiplier`. Zbývají (stále comingSoon,
  `tier:null`/`price:null`, jen sprite+id): **Dusk** (noc/jeskyně – čeká na denní
  dobu/biome), **Dive** (pod vodou), **Lure** (rybaření), Safari/Sport/Park/
  Cherish/Premier (eventy/kosmetika), Friend (friendship). Zapojení = doplnit
  ballu `tier`/`price`/`bonus` + case v `ballMultiplier`.
- ⚪ **Beast Ball (Ultra Beasts).** Jediný chybějící ball z celého kánonu – NEMÁ
  zatím ani sprite (`beast-ball.png`) ani datovou položku. Řešit **až** s Ultra
  Beasts; teď záměrně vynecháno.

## Obchod (Market)

- 🔵 **Sekce Marketu.** Hotovo v 0.19.0: okno „🛒 Market" s obchodem po sekcích
  (`buildingView.js` → `openMarket`, dept-cards). ✅ **Items** (léčení/statusy/revive)
  přidány v **0.45.0** (`openItemShop`, data `data/items.js`). ✅ **Hromadný nákup**
  (×1/×5/×10/Max) v obou obchodech v **0.58.0**. Zbývá: **evoluční kameny**.

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
- ⚪ **Held items** (item nesený jedincem) – samostatný systém, později.
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

- ⚪ **Mapa vpravo dole (návrh, R-028).** V pravém panelu (nebo jeho spodní
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
    ⚠️ **DEFEROVÁNO** (data „připravená", zatím bez efektu / „but it failed!"):
    **transform**, **copyMove**, **forceSwitch** (Whirlwind). Do budoucna i další
    Gen1 mechaniky: Substitute, Counter, Bide, Dig/Fly, Rest, Reflect/Light
    Screen, Haze, Metronome…
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
  **Zbývá:** **Level cap** (podle nejsilnějšího trenéra v gymu – předpokládá gymy/trenéry,
  zatím neexistují) → DEFEROVÁNO.

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

- ⚪ **Přizpůsobení rozlišení (návrh, R-031).** Layout tří panelů reagující na
  velikost obrazovky: zúžit levý bar, roztáhnout pravý apod. Při úzkém rozlišení
  Město skládat logicky (domek pod domkem místo vedle sebe). Řešit přes CSS
  (media queries / clamp / grid) v `css/main.css`, ideálně bez zásahu do logiky.

## Ladění / drobnosti

- ⚪ **Šance na shiny** – aktuálně `SHINY_CHANCE = 1/8192` (klasika). Laditelné
  jedním číslem v `pokemonSystem.js`.
