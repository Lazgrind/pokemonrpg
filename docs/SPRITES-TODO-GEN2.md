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
> - Budova/dům: `assets/gen2/buildings/<id>.png` – vždy pixel art přes `tools/pixelize_buildings.py` (realistické měřítko, viz CLAUDE.md); u města s gymem i `gym.png`
> - NPC portrét: `assets/gen2/npc/<name>.png`
> - Třída trenéra: `assets/gen2/trainers/<class>/<n>.png` (číslované varianty 1,2,…)
> - Mapa regionu: `assets/gen2/map/<region>.webp`
>
> Globální (nezávislé na generaci, mimo gen složky): `assets/items/`, `assets/pokeballs/`,
> `assets/backgrounds/` (biomy), `assets/audio/sfx/`, `assets/audio/bgm/`, `assets/title/`.

---

## 1. Mapa regionu

Hotovo (v1.58.0): `assets/gen2/map/johto.webp`.

---

## 2. Pokémon, Unown, cries – HOTOVO (2026-10-19)

Všech 100 druhů #152–#251 má 4 pohledy (front, back, shiny-front, shiny-back) jako **png i gif**,
Unown má všech 26 forem (A–Z × 4 pohledy × png/gif) a každý druh má cry (`assets/gen2/cries/<id>.mp3`).
Nové druhy / formy se stahují automaticky: `dl_static.py`, `dl_gifs.py`, `fetch_cries.ps1`
(formy přes tabulku `FORMS`), pak `prep_sprite.py assets/gen2/pokemon`.

Red Gyarados (Lake of Rage) nepotřebuje nový soubor: gyarados je gen 1 druh, hra bere
`assets/gen1/pokemon/gyarados/shiny-front.png`.

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

> Složka = **id trenéra z dat** (`data/gen2/trainers.js`), tedy s prefixem `johto-` (hra hledá
> `assets/gen2/gym-leaders/<id>/front.png`).

- [ ] `johto-elite-four-will` — E4 #1 (Psychic) — NOVÝ
- [ ] `johto-elite-four-karen` — E4 #4 (Dark) — NOVÝ
- [x] `johto-champion-lance` — Champion (Dragon) — hotovo
- [x] `johto-elite-four-koga` — E4 #2 (Poison): reuse gen 1 — hotovo
- [x] `johto-elite-four-bruno` — E4 #3 (Fighting): reuse gen 1 — hotovo

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

## 7. Budovy – přesně to, co hra v Johtu volá (stav 2026-10-19)

> `assets/gen2/buildings/<soubor>.png`, vždy pixel art přes `tools/pixelize_buildings.py`
> (šířku přidat do tabulky `WIDTH`). Hotové: `poke-center`, `poke-mart`, `gym`, `league`,
> `league-plaza`, `day-care`, `move-tutor`, `dept-store`, `game-corner`.
> Název souboru určuje `sprite:` v `data/buildings.js`.

Chybí (podle měst z `CITY_BUILDINGS`):
- [ ] `elm-lab` — New Bark Town
- [ ] `sprout-tower` — Violet City
- [ ] `azalea-kiln`, `kurts-house` — Azalea Town
- [ ] `goldenrod-dept-store`, `goldenrod-game-corner` — Goldenrod (lze zkopírovat z `dept-store.png` / `game-corner.png`, pokud nechceš johtskou verzi)
- [ ] `goldenrod-flower-shop`, `goldenrod-underground`, `bills-house`, `radio-tower` — Goldenrod
- [ ] `boost-center` — Goldenrod (reuse z `assets/gen1/buildings/`)
- [ ] `ecruteak-house`, `dance-theater`, `bell-tower`, `burned-tower` — Ecruteak
- [ ] `olivine-lighthouse`, `olivine-house` — Olivine
- [ ] `cianwood-pharmacy`, `cianwood-house`, `chucks-house` — Cianwood
- [ ] `training-grounds` — Cianwood (reuse z `assets/gen1/buildings/`)
- [ ] `dragons-den`, `blackthorn-house` — Blackthorn

Mahogany Town a Indigo Plateau mají jen Poké Center + Mart (hotovo).
Ilex Forest, Ruins of Alph, National Park, Lake of Rage, Whirl Islands, Mahogany Shop,
Rocket Hideout a Bike Shop **nejsou ve městě umístěné** → sprite zatím nepotřebují.
Jeskyně a routy sprite budovy nepotřebují.
Johto města zatím nemají mapu shora (`data/gen2/cityMaps.js` neexistuje), ukazují staré
izometrické rozložení; po dodání budov se udělají jako Kanto.

---

## 8. NPC portréty

> `assets/gen2/npc/<name>.png` (gen-specifické; gen 1 má `assets/gen1/npc/oak.png`). Jen esenciální příběhoví NPC.

- [ ] `elm` — Prof. Elm
- [ ] `mr-pokemon` — Mr. Pokémon (event s vejcem/míčem)
- [ ] `silver` — rival (jméno zadává hráč, ale portrét třídy)
- [ ] `kurt` — výrobce Poké Ballů
- [ ] `eusine` — lovec Suicune
- [ ] `lance` — jako NPC (Rocket v Mahogany/Radio Tower) — může reuse leader sprite

---

## 9. Třídy trenérů (routové souboje)

> `assets/gen2/trainers/<class>/<n>.png` (číslované varianty). VELKÁ část tříd se REUSNE
> z gen 1 (kopie ze `assets/gen1/trainers/<class>/` do gen2; bird-keeper, bug-catcher, black-belt, hiker, fisherman, sailor, lass,
> youngster, beauty, gentleman, super-nerd, psychic, camper, picnicker, swimmer-f/m,
> pokemaniac, gambler, juggler, scientist, rocket-grunt, …).

> **Pozor na názvy složek** – hra hledá `assets/gen2/trainers/<class>/<n>.png` podle `class` v datech:
> - `rocket-executive` (Proton, Petrel, Ariana, Archer): složky jsou jen `-m` / `-f` → potřeba složka
>   `rocket-executive` (ideálně 4 obrázky; pak do dat doplním `spriteVariant`) nebo mi řekni a přepíšu třídy v datech.
> - `cooltrainer` (Dragon Clan v Dragon's Den) a `elder`: složky neexistují (`dragon-tamer` je v TODO, v datech ne).
> - Prázdné složky: `boarder`, `firebreather`, `guitarist`, `kimono-girl`, `medium`, `officer`,
>   `pokefan-f/m`, `sage`, `school-kid`, `skier`, `teacher`, `sudowoodo`.
> - Route trenéři berou sdílené třídy (youngster, lass, hiker…), ty jsou hotové.

### Nové Johto třídy (chybí v gen 1)
- [ ] `kimono-girl` — Ecruteak (dance theater)
- [ ] `sage` — Sprout Tower / Ecruteak
- [ ] `elder` — Elder (boss Sprout Tower „Elder Li" + Dragon Elder v Dragon's Den)
- [ ] `dragon-tamer` — Dragon's Den (Dragon Clan, Blackthorn)
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

### Fixní bossové (třída = druh, jako gen 1 `snorlax`/`ghost`)
- [ ] `sudowoodo` — boss „Sudowoodo" blokující Route 36 (`assets/gen2/trainers/sudowoodo/1.png`) — už zaneseno v datech (v1.40.0). Samotný Pokémon sprite v souboji řeší `assets/gen2/pokemon/sudowoodo/` (sekce 2).

---

## 10. Hudba (BGM) — volitelné (polish)

> Gen 1 používá univerzální BGM (`assets/audio/bgm/`: main/wild/trainer/gym/
> champion/rival) a reusuje se i pro Johto. Johto-specifická hudba je nice-to-have.

- [ ] (volitelné) `assets/audio/bgm/johto-main.mp3` a další Johto varianty, pokud
  bude chtít odlišit region hudebně. Bez nich jede gen 1 BGM.

---

## Pozn. k položkám „reuse"

Zaškrtnuté `[x]` = **není třeba nový soubor**, jen se v datech namapuje existující
gen 1 asset (Koga, Bruno; sdílené budovy; sdílené třídy trenérů). Uvedeny pro
úplnost, ať je jasné, že se na ně nezapomnělo.
