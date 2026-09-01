# Backlog – připraveno / rozhodnuto, ale nedoděláno

Seznam věcí, které jsme **záměrně připravili nebo se na nich domluvili**, ale
ještě nejsou hotové. Ať na ně nezapomeneme. Detaily rozhodnutí viz
[NOTES.md](NOTES.md), historie hotového viz [../CHANGELOG.md](../CHANGELOG.md).

Legenda stavu: 🟡 připraveno (seam/data hotová) · ⚪ jen rozhodnuto (nic v kódu) · 🔵 částečně · ✅ hotovo (ponecháno kvůli navazující práci)

---
## Hatching

Potřeba opravit čas hatchování, je tam třeba - 8% · 9 min 13.539999999999964 s

## Pokémoni – hodnoty jedince

- 🟡 **EV (Effort Values) – získávání.** Pole EV, příspěvek do statů i funkce
  `addEv(pokemon, stat, amount)` (se stropy 252/stat, 510 celkem) hotové v
  `pokemonSystem.js`. **Chybí zdroj EV = budova „Training Grounds"** (speciální
  trénink). EV se NEzískávají ze soubojů (R-017).
- ⚪ **Povahy (natures)** – zatím se ve vzorci statů nepočítají (schválně vynecháno).

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
- 🔵 **Redesign Catch tlačítka + celého interface okna souboje.** Uživatel:
  „tlačítko catch předěláme úplně s celým dalším krokem interface." Teď je Catch
  ponechán funkční beze změny. Přijde s dalším krokem přepracování okna (spolu s
  volbou ballu, layoutem menu à la klasická hra atd.). Souvisí s R-029.
- ⚪ **Rarita druhu ovlivní catch rate** – teď šance závisí jen na HP nepřítele.
  Vzácnější druhy (`rarity`) by měly být těžší na chycení (nižší base šance).
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
- ⚪ **Sprite vajíčka per druh (návrh).** Každý druh (resp. jeho vejce) by měl
  vlastní vzhled vajíčka (např. Rattata = bílé s červenými puntíky) – hráč pak
  časem pozná, co se může vylíhnout. **Můj názor:** nápad se mi líbí, ale
  „random generované každou novou hru" bych řešil opatrně: buď **deterministicky
  ze `species.id`** (stejný druh = stejné vejce napříč hrami → znalost přenosná,
  jednodušší save), nebo **seedované per-průchod** (`seed = runSeed + species.id`
  → v každé hře jiná mapa vzhledů, ale konzistentní během jednoho průchodu; do
  save stačí jedno číslo `runSeed`). Doporučuju procedurální SVG/canvas vzor
  (skořápka + barevná paleta + puntíky) generovaný z druhu, ne ruční obrázky pro
  každý druh. Drží R-021 (druh skrytý do vylíhnutí) – vejce prozrazuje jen
  „rodinu" vzhledu, ne konkrétní staty. K potvrzení: deterministicky vs.
  per-průchod.

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
- ⚪ **Destiny Knot (item).** Zvedne počet zděděných IV ze 3 na 5. Seam hotový:
  `INHERIT_IV_COUNT` v `data/breeding.js` + parametr `inherit` v breeding vejci;
  stačí item, který hodnotu při produkci vejce zvýší. Napojit na budoucí itemy.
- ⚪ **Rychlost breedingu jako upgrade linie Školky.** Teď fixní `BREED_MINUTES`.
  Přidat track (jako Hatch speed) zkracující dobu produkce vejce.
- ⚪ **Potomek = základní forma.** Až přibudou evoluce, měl by se z vejce líhnout
  základní stupeň (a dědit po „samičí"/ne-Ditto linii). Teď potomek = druh rodiče
  (`chooseChildSpeciesId` v `data/breeding.js`).
- ✅ **Rodič v breedingu vs. tým.** Hotovo v 0.20.1: `addToTeam` odmítne jedince
  ve Školce/breedingu (guard přes nový `pokemonEngagement(uid)` v
  `buildingSystem.js`) a Kolekce mu místo „Add to team" ukáže „in Day Care" /
  „in breeding". Pravidlo „jedinec jen na jednom místě" je tím uzavřené v obou
  směrech (pickery Školky/breedingu tým vylučovaly už dřív).

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
- ⚪ **Autocatch fallback na jiný ball.** Když vybraný typ dojde, autocatch se
  zastaví. Zvážit automatické přepnutí na nejlevnější dostupný typ.
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
- 🔵 **Rezervované bally (comingSoon).** 13 dalších ballů má už sprity
  (`assets/pokeballs/<id>-ball.png`) a je zapsaných v `data/pokeballs.js` s
  příznakem `comingSoon: true`, `tier:null`, `price:null` – tím se NEobjevují v
  obchodě ani v souboji, jen si drží id → napojený obrázek. Zapojení = doplnit
  ballu `tier`/`price`/`bonus` a mechaniku v `pokeballSystem.ballMultiplier`.
  Zamýšlené efekty (v `desc`): Love (bonus proti opačnému pohlaví vlastněného
  druhu – **data pohlaví už jsou od 0.25.0**), Heavy (hmotnost), Dusk (noc/
  jeskyně), Dive (pod vodou), Dream (spánek/status), Moon (Měsíční kámen), Lure
  (rybaření), Safari/Sport/Park/Cherish/Premier (eventy/kosmetika), Friend
  (friendship).
- ⚪ **Beast Ball (Ultra Beasts).** Jediný chybějící ball z celého kánonu – NEMÁ
  zatím ani sprite (`beast-ball.png`) ani datovou položku. Řešit **až** s Ultra
  Beasts; teď záměrně vynecháno.

## Obchod (Market)

- 🔵 **Sekce Marketu.** Hotovo v 0.19.0: okno „🛒 Market" s obchodem po sekcích
  (`buildingView.js` → `openMarket`, `.market-section`). Zatím jen **Poké Balls**.
  Přidat další sekce: **items** (léčení/statusy), **evoluční kameny**, případně
  **hromadný nákup** (×5/×10/max). Data pro itemy zatím neexistují.

## Sprity Pokémonů + struktura dat

- 🔵 **Sprity Pokémonů – konvence složek (R-024).** ✅ Zapojeno a živé ve hře
  (v0.27.0): Pokédex i Karta Pokémona kreslí reálný sprite z
  `assets/pokemon/<id>/<view>.png`, shiny přes `shiny-<view>`, samice přes
  volitelnou příponu `-f` s fallbackem na výchozí. Standard 256×256 / postava
  232 px (nástroj `tools/prep_sprite.py`). Hotové druhy: bulbasaur, charmander,
  squirtle, pidgey, rattata, ditto. **Zbývá:** dodat sprity dalším druhům (jen
  nahrát PNG → objeví se samy) a `back`/shiny-back využít v souboji (R-029).
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
- 🔵 **Rozšíření schématu druhu.** Hotovo v 0.21.0: do `data/pokemon.js` přidány
  **`gen`** (generace – řídí mapu, ne cestu ke spritu) a **`genderRatio`**
  (`{ m, f }` nebo `"genderless"`) u všech druhů + typedefy (`GenderRatio`).
  **Zbývá volitelně:** `height`/`weight`/`category`/`dexEntry` (dex popis) – až
  je bude Karta/Pokédex potřebovat. Sprite se do dat neukládá – odvozuje se z
  `id`. Pozn.: DATA zůstávají centrálně v `data/pokemon.js`; až druhů přibude,
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
- ⚪ **Hezčí vizualizace IV/EV (radar).** Teď jsou to jednoduché bary. Cíl:
  hexagonový radar statů. **Před stavbou grafu načíst skill `dataviz`**
  (konzistentní barvy/altitude). EV graf se stropy (252/stat, 510 celkem).

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
- ⚪ **Detail v Pokédexu = kde se druh vyskytuje.** Klik na kartu → info o druhu
  + seznam oblastí, kde ho lze potkat – **jen když už byl objeven** (drží R-023,
  skryté druhy na cestě). Vyskytovost se odvodí z `area.species`.
- ⚪ **Ikona Pokédexu v horní liště.** Nahradit horní ukazatel „počet chycených
  Pokémonů" ikonou Pokédexu (klik → otevře Pokédex). Malá UI změna v liště.

## Kolekce → Boxy (PC)

- ⚪ **Předělat Kolekci na Boxy (návrh, R-027).** Systém boxů jako PC ve
  franchise: box = **30 míst** (mřížka), více boxů, přepínání. Jedinci jako
  sprity na svých pozicích. **Drag & drop:** přesun jedince místo↔místo a
  box↔box. Datově: `state.boxes = [{ name, slots: Array(30) }]` (slot = uid
  jedince nebo null). Team zůstává oddělený (max 6). Řeší starou poznámku
  „stejný box picker se hodí i pro správu kolekce" (v0.10.0).
- ⚪ **Klik na jedince v Boxu** → Karta Pokémona (viz výše). Navázat na R-018
  (unikátní druhy) – v boxech bude reálně max 1 kus/druh.

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
    nové setkání, drží se v `battle.background`). **Zbývá:** útok-animace
    (posun/záblesk), faint animace, dodat další pozadí/biome + chybějící
    `back`/`front` sprity druhů.
  - **Fáze 2 – Auto / Manual:** ⚙ částečně (v0.28–0.29): **Auto battle**
    (`settings.autoBattle`) je samostatný přepínač MÓDU, oddělený od Pause/Resume
    (`running`). V auto módu běží automatická kola (`schedule()` je pustí jen když
    `running && autoBattle`); Pause jen pozastaví. **Zbývá** skutečný *Manual* mód:
    když je Auto battle vypnutý, souboj má čekat na hráče a ten spouští kolo
    tlačítkem (teď se prostě neposouvá) – bez Moves zatím jen „Attack".
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
  - **Fáze 4 (později):** statusy, criticals, víc oblastí; auto-battle politika
    (auto-AI výběr tahu, ⚪ zatím odloženo); Struggle recoil.
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
  tlačítko ⚙ v horní liště otevírá menu globálních voleb (`src/ui/settingsView.js`,
  kontejner `#settings-controls`); první volba je **Game speed** (přesunuta z okna
  souboje, `settings.speed`). **Zbývá doplnit volby:** **Nuzlocke** (např.
  permadeath, chytání jen prvního na oblasti), **Level cap** (podle levelu
  nejsilnějšího trenéra v gymu následujícího města – předpokládá gymy/trenéry,
  zatím neexistují), **No items**, **No potions** ap. Datově řízené přepínače
  `state.settings.*`, systémy je jen respektují. Level cap a nuzlocke jsou
  závislé na dalších mechanikách (gymy, permadeath) – seam je, plnit postupně.

## Responzivní layout

- ⚪ **Přizpůsobení rozlišení (návrh, R-031).** Layout tří panelů reagující na
  velikost obrazovky: zúžit levý bar, roztáhnout pravý apod. Při úzkém rozlišení
  Město skládat logicky (domek pod domkem místo vedle sebe). Řešit přes CSS
  (media queries / clamp / grid) v `css/main.css`, ideálně bez zásahu do logiky.

## Ladění / drobnosti

- ⚪ **Šance na shiny** – aktuálně `SHINY_CHANCE = 1/8192` (klasika). Laditelné
  jedním číslem v `pokemonSystem.js`.
