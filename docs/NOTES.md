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

## 2026-08-31 – Breeding podle egg groups (v0.20.0)

### Zpětná vazba uživatele
- „Egg groups pojďme dořešit, má to být na stejném principu jako ve franchise:
  každý má egg group a stejné egg group (popřípadě žolíci) spolu udělají vajíčko,
  které může mít lepší IVs nebo být shiny, tentokrát s odds 1/4096."
- Na doplňující otázky: **přidat Ditto teď** (žolík); **dědění 3 IV / 3 random**
  s tím, že později přibude item Destiny Knot (pak 5 dědí).
- Následně: „Ditto nedávej na Route 1, dej mi ho prozatím jako startera."

### Co jsme udělali
- `data/pokemon.js`: přidán **Ditto** (dexNo 132, egg group `ditto`).
- `data/breeding.js` (nové): laditelná data + čistá pravidla nad druhy –
  `BREED_MINUTES=30`, `INHERIT_IV_COUNT=3`, `BREED_SHINY_CHANCE=1/4096`,
  `areCompatible()` (sdílená egg group / žolík; dva Ditti ne; `no-eggs` ne),
  `chooseChildSpeciesId()` (žolík → druhý rodič, jinak náhodně jeden).
- `pokemonSystem.js`: `inheritIvs(parents, count)` – zdědí `count` náhodných
  statů po náhodném rodiči, zbytek random (losuje se až při vylíhnutí).
- `buildingSystem.js`: breeding slot `city.daycare.breeding = { a, b, buffer }` +
  `get/setBreedingParent`, `clearBreedingParent`, `getBreedingParents`. Výcvik a
  breeding se navzájem vylučují.
- `breedingSystem.js` (nové): `breedingStatus`, `accrueBreeding` (produkce vejce
  aktivně i offline, více najednou), smyčka + `applyBreedingOffline`. Vejce vzniká
  přes `makeBredEgg` v `eggSystem.js` a nese `breed = { parents, inherit, shinyChance }`.
- `eggSystem.js`: při vylíhnutí breeding vejce použije `inheritIvs` + `shinyChance`.
- `buildingView.js`: okno **„💞 Breeding"** (dva rodičovské sloty, kompatibilita,
  progress). Výběr Pokémona sjednocen do obecného `openPokemonPicker` (sdílí
  Školka i breeding).
- `main.js` + `offlineView.js`: offline breeding + hláška `EVENTS.EGG_BRED`.
- Ditto **dočasně jako starter** (`teamView.js`), ať jde breeding vyzkoušet.
- Save **v7 → v8** (breeding slot lazy).

### Rozhodnutí
- **R-022 🟢 Breeding podle egg groups.** Sdílená egg group nebo žolík Ditto →
  vejce po `BREED_MINUTES`; dědí 3 IV (laditelné, budoucí Destiny Knot = 5), shiny
  1/4096. Druh i genetika skryté do vylíhnutí (drží R-021). (schváleno 2026-08-31)

### K ověření uživatelem v prohlížeči (tvrdý refresh!)
- Nová hra → jako startera lze vybrat **Ditto**. Chyť/měj druhý druh (např.
  bulbasaur), oba dej do Školky → „💞 Breeding" → Parent A/B.
- Ditto + cokoli = kompatibilní; dva stejné egg groupy = kompatibilní; nekompatibilní
  pár to hlásí. Progress bar roste; po čase (i offline) přibude 🥚 v inventáři.
- Vylíhni breeding vejce → potomek má část IV po rodičích, shiny šance vyšší.

### Otevřené / další v plánu
- ⚪ Ditto ze starterů → běžný úlovek; Destiny Knot item (5 IV); rychlost
  breedingu jako upgrade; potomek = základní forma po evolucích. (viz BACKLOG)

### Pracujeme LOKÁLNĚ
- Nic nepushováno – commit/push jen na výslovný pokyn.

---

## 2026-08-31 – Market okno v Poké Martu (v0.19.0)

### Zpětná vazba uživatele
- „V rámci Poké Martu bych chtěl tlačítko Market, pod kterým by se schovávaly
  itemy rozdělené do sekcí. Zatím udělej sekci pro pokebally."

### Co jsme udělali
- `buildingView.js`: `openMarket()` je **rozcestník sekcí** (departments) jako
  karty (`.dept-card`); `openBallShop()` je samostatné okno sekce Poké Balls,
  kde jsou jednotlivé bally přehledné **bary** (řádky `.ball-row`).
- **Zamčené / neodemčené věci se v obchodě neukazují** vůbec – seznam ballů
  filtruje `ball.price != null && isBallUnlocked(ball)`, takže je vidět jen to,
  co jde teď koupit. Připraveno na další sekce (items, kameny).
- `css/main.css`: `.market-depts / .dept-card` (rozcestník karty) +
  `.ball-shop / .ball-row / .ball-buy` (bary); `.ball-card*` odstraněny.

### Poznámka
- Doladění dle uživatele: rozcestník sekcí = okna (karty), jednotlivé bally =
  bary (přehlednost), a zamčené věci schované. Stejný vzor jako „Upgrades" –
  hlavní okno budovy zůstává čisté, detail je za klikacími okny.

---

## 2026-08-31 – Filtry v pickerech (v0.18.0)

### Zpětná vazba uživatele
- „Chtěl bych filtry jak u Day Care, tak u Hatch an egg – rarity, jméno atd."

### Rozhodnutí
- 🟢 Day Care picker: hledání jménem + přepínače **rarita**, **typ**, **jen
  shiny** + **řazení** (level ↓ / jméno / dex). Nabídky se staví z toho, co hráč
  vlastní.
- 🟢 Egg picker: **respektovat skrytí druhu** (R-021) – filtr jen podle rarity
  a řazení podle doby líhnutí (↑/↓). Žádné jméno/druh/typ (byl by to spoiler).

### Co jsme udělali
- `buildingView.js`: `openDaycarePicker` a `openEggPicker` přepsány na
  filtrovací panel (`.filter-bar`, chips `.filter-chip`, `renderGrid()` řadí a
  filtruje client-side, bez commitu). Dlaždice Pokémona ukazují i raritu/typ.
- `css/main.css`: styly `.filter-bar / .filter-row / .filter-chip / .filter-sort`.
- Na přání: celý filtrovací panel je schovaný pod tlačítkem **„🔎 Filters"**
  (`.filter-bar[hidden]` + toggle), aby picker zůstal čistý.

### Zpětná vazba uživatele
- „Hatch an egg chci mít vizuálně tak, že se ukáže max 10 egg breederů, tolik
  kolik mám odemčeno; zamčené budou zamčené. Pod nimi čudlík Hatch an egg."
- „Chci všude mít upgrade taky za klikacím menu… celé zpřehlednit."
- „Vajíčka nemáš vědět, co tam je za druh, dokud se nevylíhne."

### Rozhodnutí (výběr)
- 🟢 Upgrady: **podnabídka v okně** – tlačítko „Upgrades" otevře samostatné okno
  se všemi liniemi (budova + tracks). Platí pro všechny budovy.
- 🟢 Zamčené egg sloty: **jen ikona zámku** 🔒 (odemyká se v Upgrades menu).
- 🟢 Vejce: **skrýt druh, nechat čas** – ukazuje se jen „Egg" + postup/čas.

### Co jsme udělali
- `buildingView.js` přepsán: hlavní okno budovy = stav + akce (obchod / školka /
  breederi). Nová funkce `openUpgrades()` (společné okno upgradů).
- **Egg Breeders okno**: v Day Care jeden čudlík „🥚 Hatch an egg" otevře okno
  s mřížkou hatcherů (`.breeder-grid`, max = `eggSlots.maxLevel`). Odemčená
  prázdná hatchery = vlastní tlačítko „Hatch an egg" (výběr vejce), obsazená =
  🥚 + progress + čas + „Take out", zamčená = „Locked" 🔒.
- Druh vejce **skryt** v breederech i v pickeru – jen „Egg #N" + odhad `~X min`
  (čas dle rarity ponechán jako jediná nápověda).
- `css/main.css`: styly `.breeder-*` a `.upgrade-*` (staré `.egg-incubator*`
  nahrazeny).

---

## 2026-08-31 – Upgrady Školky: rychlost líhnutí + sloty (v0.16.0)

### Zpětná vazba uživatele
- „Ještě bych v rámci daycare chtěl vylepšení na rychlost líhnutí od 1 %–50 %
  a pak sloty hatchování 1–10 slotů pro vajíčka."
- Rozhodnutí přes výběr: **dvě oddělené upgrade linie** (každá s vlastní úrovní
  i cenou).
- Oprava: „A rychlost jsem chtěl na 50 lvl ne 10." → 🟢 Hatch speed má **50
  úrovní** (+1 %/lvl = +50 %), Egg slots zůstávají 10 úrovní (1→10 vajec).

### Co jsme udělali
- `data/buildings.js`: obecný `tracks` (typedef `TrackDef`) na Školce –
  `hatchSpeed` (Lv 1→50, baseCost 50, growth 1,12) a `eggSlots`
  (Lv 1→10, baseCost 300, growth 1,7).
- `buildingSystem.js`: obecné funkce linií (`getTrackLevel`, `trackUpgradeCost`,
  `upgradeTrack`, …) + `hatchSpeedPercent()` a `eggSlotCount()`. Úroveň žije v
  `city.buildings[id].tracks[key]`.
- `eggSystem.js`: inkubace přešla ze single slotu (`city.daycare.egg`) na **pole
  slotů** (`city.daycare.eggs`) s lazy migrací (bez bumpu save verze).
  `accrueIncubation`/`applyEggOffline` vrací **pole** vylíhnutých vajec;
  `speedMultiplier()` zrychluje dle `hatchSpeedPercent`.
- UI (`buildingView.js`): řádek pro každé inkubované vejce s vlastním „Take out",
  staty „⏩ Hatch speed / 🥚 Egg slots used/max", dvě upgrade tlačítka.
  `offlineView.js` + `main.js` zpracují pole vylíhnutých vajec.

### Poznámka
- Mechanismus `tracks` je obecný – použitelný pro budoucí upgrade linie jiných
  budov (data → logika → UI beze změny základní budovy).

---

## 2026-08-31 – Vajíčka a líhnutí (v0.15.0)

### Zpětná vazba uživatele
- „Tak pojďme na ta vajíčka." + připomněl vazbu na `acquirePokemon`.
- Rozhodnutí přes výběr: druh ve vejci = **náhodný druh z oblasti**; genetika
  (IV/shiny) se losuje **až při vylíhnutí**; doba líhnutí **podle rarity druhu**.

### Co jsme udělali
- `data/eggs.js` (nový): rarity → doba líhnutí (min), `EGG_DROP_CHANCE = 0,03`,
  rozsah levelu vylíhnutí 1–5.
- `data/areas.js`: přidán `species` pool oblasti (Route 1: pidgey/rattata).
  `battleSystem.spawnEnemy` losuje odtud (dřív natvrdo `ENEMY_POOL`).
- `src/systems/eggSystem.js` (nový): `rollEggDrop(area)` (drop po výhře),
  inventář `state.eggs`, inkubace ve druhém slotu Školky
  (`city.daycare.egg`), `accrueIncubation` (aktivní smyčka + offline dopočet,
  bez nerfu, strop `OFFLINE_CAP_HOURS`), po dosažení doby vylíhne přes
  `acquirePokemon()` (R-018) – genetika se rolluje teprve tady.
- `battleSystem.handleFaint`: po výhře losuje vejce + píše do logu.
- `buildingView`: Školka má sekci inkubace (progress bar) + výběr vejce
  (`openEggPicker`), tlačítka „Incubate an egg" / „Take egg out".
- `offlineView`: sekce „vejce se vylíhlo" v přehledu „Welcome back".
- `main.js`: `applyEggOffline`, `startEggLoop`, 🥚 počet vajec v liště,
  hláška při vylíhnutí za běhu (`EVENTS.EGG_HATCHED`).
- Save **v6 → v7** (`eggs: []`; slot inkubace lazy).

### Rozhodnutí
- **R-021 🟢 Vajíčka + líhnutí.** Drop po výhře (druh z oblasti), genetika až při
  vylíhnutí, doba líhnutí dle rarity, líhnutí přes `acquirePokemon`. (schváleno
  2026-08-31)

### K ověření uživatelem v prohlížeči (tvrdý refresh!)
- Vyhrávej souboje → občas „🥚 You found a … Egg!"; v liště roste 🥚.
- Školka → „Incubate an egg" → progress bar; po čase (i po návratu offline) se
  vylíhne a objeví v kolekci (nebo zlepší IV, když druh už máš).

### Otevřené / další v plánu
- ⚪ Breeding podle egg groups (staví na tomto systému).
- ⚪ Shiny-boost u vajec (Masuda), egg chance/doba per oblast.

### Pracujeme LOKÁLNĚ
- Nic nepushováno – commit/push jen na výslovný pokyn.

---

## 2026-08-31 – Unikátní druhy + výběr do školky jako boxy (v0.10.0)

### Zpětná vazba uživatele
- „Každého pokemona můžeš mít jenom 1." + „vybírání pokemonů v daycare bych rád měl jako boxes / bar… když má člověk 1100 pokemonů, tak tam nevybere ani prd."

### Co jsme udělali
- `team.js`: `ownsSpecies()` + `catchWild` chytá jen nevlastněné druhy; při vyčerpání nekonzumuje Poké Ball.
- `buildingView.js`: výběr do školky = tlačítko v detailu → samostatné okno `openDaycarePicker` s mřížkou dlaždic (`.daycare-grid`) + hledáním podle jména (`#daycare-search`, filtruje viditelnost dlaždic bez re-renderu). Klik na dlaždici uloží a zavře. Nahradilo `<select>`.
- CSS `.daycare-picker/.daycare-search/.daycare-grid/.daycare-tile`.

### Rozhodnutí
- **R-017 🟢 Každý druh Pokémona jen 1× (unikátní kolekce = de facto Pokédex).** (schváleno 2026-08-31)
- **R-018 🟢 Výběr Pokémona (školka) jako mřížka dlaždic s hledáním, ne rozbalovací seznam.** (škáluje na stovky+)

### Otevřené
- ⚪ Starší duplikáty v existujícím save se nemažou automaticky (nevratné) – pročistit jen na vyžádání.
- ⚪ Stejný „box" picker se hodí i jinam (např. správa týmu/kolekce), až bude druhů víc.

### Pracujeme LOKÁLNĚ
- Od v0.9.0 nic nepushováno na GitHub (viz zpětná vazba uživatele) – commit/push jen na výslovný pokyn.

---

## 2026-08-31 – Školka (Day Care) + vyvážení Centra (v0.9.0)

### Zpětná vazba uživatele
- „Udělejme daycare, jako školku." + „snížení healingu v rámci pokecenter na 1 % za level s max 50 %".

### Co jsme udělali
- **Školka** `data/buildings.js` (`day-care`, `daycare { xpPerMinute:3, perLevel:3 }`) + `src/systems/daycare.js`.
  - Slot svěřence v `city.daycare { uid, buffer }` (zlomkový XP buffer, nic se neztrácí).
  - Aktivní smyčka `startDaycareLoop` (tik 15 s, commit jen když padne aspoň 1 XP) + offline `applyDaycareOffline` (plná rychlost, strop 8 h – NENÍ nerfováno ×0,1 jako bojový idle, protože pasivní výcvik je smysl budovy).
  - Do školky lze dát jen Pokémona mimo tým (zabrání dvojímu XP a rozladění statů bojovníka).
  - `buildingView` rozšířen o sekci školky (výběr/vyzvednutí), `offlineView` je sekcový (souboj + školka).
- **Centrum vyváženo** dle přání: `heal { basePercent:1, perLevel:1, maxPercent:50 }`, `healPercent()` respektuje strop.
  - Aby šel strop 50 % reálně dosáhnout při 1 %/úroveň, Centrum má `maxLevel:50` a mírnější křivku `upgrade { baseCost:50, growth:1.12 }`. **K rozhodnutí:** jestli je 50 úrovní OK, nebo raději méně úrovní / jiná křivka.
- Bez změny verze save – slot školky se doplňuje lazy (jako budovy).

### Rozhodnutí
- **R-015 🟢 Třetí budova = Školka (pasivní idle XP, offline v plné rychlosti, strop 8 h).** (schváleno 2026-08-31)
- **R-016 🟢 Léčení Centra = 1 %/úroveň, strop 50 %.** (schváleno 2026-08-31; dosažitelnost stropu řešena zvýšením max. úrovně na 50 – k případnému doladění)

### K ověření uživatelem v prohlížeči (tvrdý refresh!)
- Ve městě přibyla Školka; klik → výběr Pokémona mimo tým → „Dát do školky"; svěřenec pomalu levuje (i po návratu se ukáže v přehledu „Vítej zpět").
- Centrum: doléčení po výhře je teď mnohem nižší (1 % na Lv 1).

### Otevřené / další v plánu
- ⚪ Doladit křivku/úrovně Centra podle pocitu z 1 %/úroveň.
- ⚪ Vlastní obrázkové sprity pro Školku.
- ⚪ Další budovy: 🏦 Banka (idle gold), 💻 PC/Box, 🏋️ Gym.

---

## 2026-08-31 – Druhá budova: Pokémon Centrum (v0.8.0)

### Zpětná vazba uživatele
- „Uděláme další budovy, chci mít město tak nějak hotové." Nabídl jsem přehled budov (Centrum, Školka, Banka, PC, Gym) s jejich herní funkcí a doporučil začít třemi idle pilíři; uživatel vybral **Pokémon Centrum**.

### Co jsme udělali
- `data/buildings.js`: nová budova `poke-center` s polem `heal { basePercent: 10, perLevel: 5 }`. `ball` je nyní volitelné pole.
- `buildingSystem.js`: `healPercent()` (10 % + 5 % za úroveň).
- `battleSystem.js`: po vítězství (mimo level-up, kde se HP plní na max) Centrum doléčí hráče o % max HP a zapíše to do logu. Import ze `buildingSystem`.
- `buildingView.js` přepsán na **datově obecný** detail: stat sekce i akce se skládají podle schopností budovy (`ball`/`heal`), upgrade společný.
- CSS `.iso-b-poke-center` fasáda (bílá klinika) jako fallback bez obrázku; `color` střechy `#e0524e`.
- Otestováno v local buildu.

### Rozhodnutí
- **R-014 🟢 Druhá budova = Pokémon Centrum; efekt „doléčení po vítězství" (% max HP, škáluje s upgradem).** (schváleno 2026-08-31)
  - Zvolen model „heal po výhře" místo plynulé regenerace: celá čísla HP, tematické, žádná změna save verze.

### K ověření uživatelem v prohlížeči (tvrdý refresh!)
- Ve městě přibyla budova Pokémon Centrum (fallback domeček s červenou střechou), klik otevře detail s doléčením a upgradem. V logu souboje se po výhře objeví „Centrum doléčilo …".

### Otevřené / další v plánu
- ⚪ Další budovy dle přehledu: 🐣 Školka (idle XP), 🏦 Banka (idle gold), 💻 PC/Box, 🏋️ Gym.
- ⚪ Vlastní obrázkové sprity pro nové budovy (zatím CSS fallback).

---

## 2026-08-31 – Obrázkový sprite budovy (v0.7.0)

### Zpětná vazba uživatele
- CSS budova vypadala jako modrá kostka; uživatel dodal vlastní pixel-art obrázek Poké Martu.

### Co jsme udělali
- Vytvořena složka `assets/buildings/`; uživatel nahrál `pokemart.png` (447×447, čelní pixel-art se světle modrým pozadím).
- Pillow skript odstranil pozadí (flood fill z rohů, thresh 40) a ořízl → `poke-mart.png` (271×263, průhledné).
- `data/buildings.js`: nové pole `sprite`; `cityView.js` zobrazí budovu jako `<img>` (CSS domeček zůstává fallback). `image-rendering: pixelated`.
- Klik na sprite dál otevírá detail budovy.
- Otestováno v local buildu (HTTP 200).

### Rozhodnutí
- **R-013 🟢 Budovy jako obrázkové sprity (lokální assety, bez závislostí), vzhled řízený daty.** (schváleno 2026-08-31)
  - Původní obrázek `pokemart.png` ponechán jako zdroj; hra používá zpracovaný `poke-mart.png`.

### K ověření uživatelem v prohlížeči (tvrdý refresh!)
- Záložka Město ukáže pixel-art Poké Mart (bez modrého čtverce kolem); klik otevře detail; volné parcely zůstávají.

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
