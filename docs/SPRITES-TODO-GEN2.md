# Sprity Gen 2 (Johto) – TODO (kompletní forward-seznam)

> **Co to je:** úplný seznam VŠECH grafických/zvukových assetů, které bude Johto
> (gen 2) potřebovat – zrcadlí pokrytí gen 1. Gen 2 je zatím kostra (jen New Bark
> Town + 3 startéři v datech), takže tady je prakticky celý region dopředu.
>
> **Split:** hlavní `SPRITES-TODO.md` drží „co reálně chybí v odeslaném (gen 1)
> obsahu"; tenhle soubor je forward-inventář gen 2 (dev, na produkci skryté za
> `GEN2_ENABLED`). Odkaz z hlavního souboru míří sem.
>
> **Pravidla (stejná jako hlavní soubor):**
> 1. Cesta se odvozuje z ID – po nahrání assetu **smaž jeho řádek**.
> 2. **Složku vytvoř až s fíčurou** (přidání druhu/trenéra do dat), ne dopředu –
>    prázdné složky git stejně necommitne; do té doby jede fallback (glyf/ikona).
> 3. Když přidáš gen 2 fíčuru vyžadující grafiku, **hned sem dopiš** řádek.
>
> **Konvence cest (s gen2 splittem – gen-specifické uvnitř `assets/gen<N>/`, globální mimo):**
> Gen-specifické (obsah vázaný na generaci; vracející se entity se fyzicky duplikují do každé gen složky):
> - Pokémon: `assets/gen2/pokemon/<id>/{front,back,shiny-front,shiny-back}.png` (+ volitelně `.gif`)
> - Cry: `assets/gen2/cries/<id>.mp3`
> - Gym leader / Elite Four / Champion: `assets/gen2/gym-leaders/<id>/front.png`
> - Odznak: `assets/gen2/badges/<badge>.png`
> - Město: `assets/gen2/city/<city>.png`
> - Budova/dům: `assets/gen2/buildings/<id>.png`
> - NPC portrét: `assets/gen2/npc/<name>.png`
> - Třída trenéra: `assets/gen2/trainers/<class>/<n>.png` (číslované varianty 1,2,…)
> - Mapa regionu: `assets/gen2/map/<region>.webp`
>
> Globální (nezávislé na generaci, mimo gen složky): `assets/items/`, `assets/pokeballs/`,
> `assets/backgrounds/` (biomy), `assets/audio/sfx/`, `assets/audio/bgm/`, `assets/title/`.

---

## 1. Mapa regionu

- [ ] `assets/gen2/map/johto.webp` — art mapy Johto (formát jako `gen1/map/kanto.webp`). Dokud
  chybí, `gen2/index.js` má `mapImage: null` a mapView kreslí placeholder plátno.

---

## 2. Pokémon (#152–#251, 100 druhů)

> Každý řádek = složka `assets/gen2/pokemon/<id>/` se 4 PNG (`front`, `back`,
> `shiny-front`, `shiny-back`); `.gif` varianty volitelně (jako gen 1). Startéři
> `chikorita`/`cyndaquil`/`totodile` už mají složku vytvořenou (prázdnou).

### Startéři + evoluce
- [ ] `chikorita` (#152) — startér (složka existuje)
- [ ] `bayleef` (#153)
- [ ] `meganium` (#154)
- [ ] `cyndaquil` (#155) — startér (složka existuje)
- [ ] `quilava` (#156)
- [ ] `typhlosion` (#157)
- [ ] `totodile` (#158) — startér (složka existuje)
- [ ] `croconaw` (#159)
- [ ] `feraligatr` (#160)

### Běžní Johto Pokémoni
- [ ] `sentret` (#161)
- [ ] `furret` (#162)
- [ ] `hoothoot` (#163)
- [ ] `noctowl` (#164)
- [ ] `ledyba` (#165)
- [ ] `ledian` (#166)
- [ ] `spinarak` (#167)
- [ ] `ariados` (#168)
- [ ] `crobat` (#169)
- [ ] `chinchou` (#170)
- [ ] `lanturn` (#171)
- [ ] `pichu` (#172)
- [ ] `cleffa` (#173)
- [ ] `igglybuff` (#174)
- [ ] `togepi` (#175)
- [ ] `togetic` (#176)
- [ ] `natu` (#177)
- [ ] `xatu` (#178)
- [ ] `mareep` (#179)
- [ ] `flaaffy` (#180)
- [ ] `ampharos` (#181)
- [ ] `bellossom` (#182)
- [ ] `marill` (#183)
- [ ] `azumarill` (#184)
- [ ] `sudowoodo` (#185)
- [ ] `politoed` (#186)
- [ ] `hoppip` (#187)
- [ ] `skiploom` (#188)
- [ ] `jumpluff` (#189)
- [ ] `aipom` (#190)
- [ ] `sunkern` (#191)
- [ ] `sunflora` (#192)
- [ ] `yanma` (#193)
- [ ] `wooper` (#194)
- [ ] `quagsire` (#195)
- [ ] `espeon` (#196)
- [ ] `umbreon` (#197)
- [ ] `murkrow` (#198)
- [ ] `slowking` (#199)
- [ ] `misdreavus` (#200)
- [ ] `unown` (#201) — pozn.: kanonicky 26+ tvarů; pro hru stačí 1 sprite (nebo dořešit formy)
- [ ] `wobbuffet` (#202)
- [ ] `girafarig` (#203)
- [ ] `pineco` (#204)
- [ ] `forretress` (#205)
- [ ] `dunsparce` (#206)
- [ ] `gligar` (#207)
- [ ] `steelix` (#208)
- [ ] `snubbull` (#209)
- [ ] `granbull` (#210)
- [ ] `qwilfish` (#211)
- [ ] `scizor` (#212)
- [ ] `shuckle` (#213)
- [ ] `heracross` (#214)
- [ ] `sneasel` (#215)
- [ ] `teddiursa` (#216)
- [ ] `ursaring` (#217)
- [ ] `slugma` (#218)
- [ ] `magcargo` (#219)
- [ ] `swinub` (#220)
- [ ] `piloswine` (#221)
- [ ] `corsola` (#222)
- [ ] `remoraid` (#223)
- [ ] `octillery` (#224)
- [ ] `delibird` (#225)
- [ ] `mantine` (#226)
- [ ] `skarmory` (#227)
- [ ] `houndour` (#228)
- [ ] `houndoom` (#229)
- [ ] `kingdra` (#230)
- [ ] `phanpy` (#231)
- [ ] `donphan` (#232)
- [ ] `porygon2` (#233)
- [ ] `stantler` (#234)
- [ ] `smeargle` (#235)
- [ ] `tyrogue` (#236)
- [ ] `hitmontop` (#237)
- [ ] `smoochum` (#238)
- [ ] `elekid` (#239)
- [ ] `magby` (#240)
- [ ] `miltank` (#241)
- [ ] `blissey` (#242)
- [ ] `larvitar` (#246)
- [ ] `pupitar` (#247)
- [ ] `tyranitar` (#248)

### Legendární / mýtičtí (sprite jako běžný Pokémon + cry)
- [ ] `raikou` (#243)
- [ ] `entei` (#244)
- [ ] `suicune` (#245)
- [ ] `lugia` (#249)
- [ ] `ho-oh` (#250)
- [ ] `celebi` (#251)

---

## 3. Cries (zvuky Pokémonů)

> Jeden `.mp3` na druh (jako gen 1: `assets/gen1/cries/<id>.mp3`, 151 souborů).
> Potřeba pro všech 100 nových druhů #152–#251 – tj. stejný seznam ID jako sekce 2.

- [ ] `assets/gen2/cries/<id>.mp3` pro každý druh #152–#251 (100 souborů;
  ID = slugy ze sekce 2, včetně legendárních).

---

## 4. Gym Leadeři (8 Johto arén)

> `assets/gen2/gym-leaders/<id>/front.png` (folder-per-leader, jako gen 1).

- [ ] `falkner` — Violet City (Zephyr Badge, Flying)
- [ ] `bugsy` — Azalea Town (Hive Badge, Bug)
- [ ] `whitney` — Goldenrod City (Plain Badge, Normal)
- [ ] `morty` — Ecruteak City (Fog Badge, Ghost)
- [ ] `chuck` — Cianwood City (Storm Badge, Fighting)
- [ ] `jasmine` — Olivine City (Mineral Badge, Steel)
- [ ] `pryce` — Mahogany Town (Glacier Badge, Ice)
- [ ] `clair` — Blackthorn City (Rising Badge, Dragon)

---

## 5. Elite Four + Champion (Indigo Plateau, Johto challenge)

> Někteří se vrací z gen 1 – u nich lze REUSNOUT existující sprite (kopie z `assets/gen1/gym-leaders/`
> do `assets/gen2/gym-leaders/`), jen se v datech namapuje jiné ID/role.

- [ ] `elite-four-will` — E4 #1 (Psychic) — NOVÝ
- [ ] `elite-four-karen` — E4 #4 (Dark) — NOVÝ
- [ ] `champion-lance` — Champion (Dragon) — buď nový, nebo reuse `elite-four-lance` (gen 1)
- [x] Koga — E4 #2 (Poison): reuse gen 1 (kopie z `assets/gen1/gym-leaders/koga/` do gen2)
- [x] Bruno — E4 #3 (Fighting): reuse gen 1 (kopie z `assets/gen1/gym-leaders/elite-four-bruno/` do gen2)

---

## 6. Odznaky (8 Johto badge)

> `assets/gen2/badges/<badge>.png`.

- [ ] `zephyr-badge` (Falkner)
- [ ] `hive-badge` (Bugsy)
- [ ] `plain-badge` (Whitney)
- [ ] `fog-badge` (Morty)
- [ ] `storm-badge` (Chuck)
- [ ] `mineral-badge` (Jasmine)
- [ ] `glacier-badge` (Pryce)
- [ ] `rising-badge` (Clair)

---

## 7. Města / obce (10 Johto)

> `assets/gen2/city/<city>.png`. New Bark Town už je v datech (bez artu → fallback).

- [ ] `new-bark-town`
- [ ] `cherrygrove-city`
- [ ] `violet-city`
- [ ] `azalea-town`
- [ ] `goldenrod-city`
- [ ] `ecruteak-city`
- [ ] `olivine-city`
- [ ] `cianwood-city`
- [ ] `mahogany-town`
- [ ] `blackthorn-city`

---

## 8. Budovy / domy / story-lokace

> `assets/gen2/buildings/<id>.png`. Sdílené budovy (`poke-center`, `poke-mart`,
> `dept-store`, `game-corner`, `day-care`, `move-tutor`) jsou **fyzicky duplikované**
> z gen 1 do `assets/gen2/buildings/` (žádný cross-gen fallback – cesta je vždy `assets/gen<N>/…`).

- [ ] `elm-lab` — Prof. Elm's Lab (New Bark Town) — už zaneseno v datech
- [ ] `sprout-tower` — Violet City (sages)
- [ ] `kurts-house` — Azalea Town (výroba Poké Ballů)
- [ ] `slowpoke-well` — Azalea Town (Rocket)
- [ ] `ilex-forest` — les se svatyní (HM Cut event)
- [ ] `ruins-of-alph` — Unown ruiny
- [ ] `radio-tower` — Goldenrod City (Rocket takeover)
- [ ] `bike-shop` — Goldenrod City
- [ ] `national-park` — Bug-Catching Contest
- [ ] `burned-tower` — Ecruteak City (legendární psi)
- [ ] `bell-tower` — Ecruteak City (Ho-Oh) — (též „Tin Tower")
- [ ] `dance-theater` — Ecruteak City (Kimono Girls)
- [ ] `glitter-lighthouse` — Olivine City (Jasmine's Ampharos)
- [ ] `mahogany-shop` — Mahogany Town (Rage Candy Bar / Rocket vstup)
- [ ] `rocket-hideout-mahogany` — Rocket základna pod Mahogany
- [ ] `lake-of-rage` — Red Gyarados (shiny event)
- [ ] `dragons-den` — Blackthorn City (Clair / Dragon mistrovství)
- [ ] `whirl-islands` — Lugia (legendary)

> Jeskyně/routy (Union Cave, Dark Cave, Mt. Mortar, Ice Path, Tohjo Falls) jsou
> spíš oblasti na mapě než budovy – sprite budovy nepotřebují (řeší pozadí biomu).

---

## 9. NPC portréty

> `assets/gen2/npc/<name>.png` (gen-specifické; gen 1 má `assets/gen1/npc/oak.png`). Jen esenciální příběhoví NPC.

- [ ] `elm` — Prof. Elm
- [ ] `mr-pokemon` — Mr. Pokémon (event s vejcem/míčem)
- [ ] `silver` — rival (jméno zadává hráč, ale portrét třídy)
- [ ] `kurt` — výrobce Poké Ballů
- [ ] `eusine` — lovec Suicune
- [ ] `lance` — jako NPC (Rocket v Mahogany/Radio Tower) — může reuse leader sprite

---

## 10. Třídy trenérů (routové souboje)

> `assets/gen2/trainers/<class>/<n>.png` (číslované varianty). VELKÁ část tříd se REUSNE
> z gen 1 (kopie ze `assets/gen1/trainers/<class>/` do gen2; bird-keeper, bug-catcher, black-belt, hiker, fisherman, sailor, lass,
> youngster, beauty, gentleman, super-nerd, psychic, camper, picnicker, swimmer-f/m,
> pokemaniac, gambler, juggler, scientist, rocket-grunt, …).

### Nové Johto třídy (chybí v gen 1)
- [ ] `kimono-girl` — Ecruteak (dance theater)
- [ ] `sage` — Sprout Tower / Ecruteak
- [ ] `medium` — média/ženská obdoba sage
- [ ] `firebreather` — dýchač ohně
- [ ] `guitarist` — kytarista (obdoba rockera)
- [ ] `teacher` — učitelka
- [ ] `school-kid` — školák/školačka
- [ ] `officer` — policista (Growlithe)
- [ ] `pokefan-m` — Poké Fan (muž)
- [ ] `pokefan-f` — Poké Fan (žena)
- [ ] `skier` — lyžař (Ice Path / Mahogany)
- [ ] `boarder` — snowboardista
- [ ] `rocket-executive-m` — Team Rocket exekutiva (Archer/Petrel/Proton)
- [ ] `rocket-executive-f` — Team Rocket exekutiva (Ariana)

---

## 11. Hudba (BGM) — volitelné (polish)

> Gen 1 používá univerzální BGM (`assets/audio/bgm/`: main/wild/trainer/gym/
> champion/rival) a reusuje se i pro Johto. Johto-specifická hudba je nice-to-have.

- [ ] (volitelné) `assets/audio/bgm/johto-main.mp3` a další Johto varianty, pokud
  bude chtít odlišit region hudebně. Bez nich jede gen 1 BGM.

---

## Pozn. k položkám „reuse"

Zaškrtnuté `[x]` = **není třeba nový soubor**, jen se v datech namapuje existující
gen 1 asset (Koga, Bruno; sdílené budovy; sdílené třídy trenérů). Uvedeny pro
úplnost, ať je jasné, že se na ně nezapomnělo.
