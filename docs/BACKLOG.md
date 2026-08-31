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
  na aktuálního nepřítele, šance dle jeho HP; autocatch přepínač s filtry
  (nové druhy / lepší IV / shiny) v `settings.autocatch`.
- ⚪ **Rarita druhu ovlivní catch rate** – teď šance závisí jen na HP nepřítele.
  Vzácnější druhy (`rarity`) by měly být těžší na chycení (nižší base šance).
- ✅ **Nepřátelé podle oblasti** – hotovo v 0.15.0: `ENEMY_POOL` přesunut do dat
  oblasti (`data/areas.js` → `species`), `spawnEnemy` losuje odtud. Zbývá přidat
  další oblasti a případně rarity/váhy výskytu per oblast.

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
- ⚪ **Rodič v breedingu vs. tým.** Picker breeding rodiče/výcvik se navzájem
  vylučují, ale `addToTeam` (teamView) zatím nekontroluje, že jedinec je ve
  Školce/breedingu. Sjednotit „jedinec může být jen na jednom místě" (týká se i
  stávajícího výcviku).

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
- ⚪ **Fast Ball práh** – teď base speed ≥ 100; naši startovní druhy tak rychlí
  nejsou, uplatní se až u rychlejších druhů (záměr, případně doladit).
- 🔵 **Bally jako loot (pozor).** Loot tabulka oblastí zůstává, ale ball dropy
  jsme zrušili (bally jen z obchodu, R-020). Kdyby se někdy měl ball dropovat,
  loot aplikace (`handleFaint`/`idle.js`) počítá `res[resource]` – ball id by
  muselo jít do `res.balls[id]`, ne přímo do `resources`.
- ⚪ **Klasické bally chybějící kvůli datům** – Love (pohlaví), Heavy (váha),
  Dusk (denní doba/jeskyně), Dive (podvodní oblasti), Dream (statusy/spánek),
  Moon/Lure (evoluce/rybaření), Beast/Safari/Sport/Cherish (eventy), Friend
  (friendship). Přidat, až budou příslušné mechaniky.

## Obchod (Market)

- 🔵 **Sekce Marketu.** Hotovo v 0.19.0: okno „🛒 Market" s obchodem po sekcích
  (`buildingView.js` → `openMarket`, `.market-section`). Zatím jen **Poké Balls**.
  Přidat další sekce: **items** (léčení/statusy), **evoluční kameny**, případně
  **hromadný nákup** (×5/×10/max). Data pro itemy zatím neexistují.

## Ladění / drobnosti

- ⚪ **Šance na shiny** – aktuálně `SHINY_CHANCE = 1/8192` (klasika). Laditelné
  jedním číslem v `pokemonSystem.js`.
