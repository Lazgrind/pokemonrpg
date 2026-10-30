# Sprity Gen 2 (Johto) – TODO (kompletní forward-seznam)

> **Co to je:** úplný seznam VŠECH grafických/zvukových assetů, které bude Johto
> (gen 2) potřebovat. Data Johta jsou kompletní (2026-10-20); chybí jen grafika níž.
> Odkazy na obrázky se vyplňují v `docs/gen2_odkazy.txt` (vygeneruje `tools/gen_odkazy.py`,
> stáhne `tools/dl_web.py docs/gen2_odkazy.txt`).
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

## 4. Gym Leadeři, Elite Four, Champion – HOTOVO (2026-10-26)

Všech 8 leaderů, Elite Four (Will, Koga, Bruno, Karen) i Champion Lance mají
`assets/gen2/gym-leaders/<id>/front.png` (Koga a Bruno jsou kopie z gen 1).

---

## 6. Odznaky – HOTOVO (2026-10-26)

Všech 8 johtských odznaků: `assets/gen2/badges/<id>-badge.png`.

---

## 7. Budovy – HOTOVO (2026-10-29)

> `assets/gen2/buildings/<soubor>.png`, vždy pixel art přes `tools/pixelize_buildings.py`
> (šířku přidat do tabulky `WIDTH`). Hotové: `poke-center`, `poke-mart`, `gym`, `league`,
> `league-plaza`, `day-care`, `move-tutor`, `boost-center`,
> `training-grounds`, `goldenrod-dept-store`, `goldenrod-game-corner` (sdílené budovy jsou kopie z `assets/gen1/buildings/`), `elm-lab`, `sprout-tower`, `azalea-kiln`, `kurts-house`, `radio-tower`, `bills-house`, `goldenrod-flower-shop`, `goldenrod-underground`, `bell-tower`, `burned-tower`, `dance-theater`, `ecruteak-house`, `olivine-house`, `olivine-lighthouse`, `ss-aqua`, `cianwood-pharmacy`, `blackthorn-house`, `dragons-den`.
> Název souboru určuje `sprite:` v `data/buildings.js`.

Chybí (podle měst z `CITY_BUILDINGS`): **nic – všechny budovy Johta mají sprite (2026-10-29).**
Chuckův dům v originále není (Fly dá žena po výhře nad Chuckem).

Mahogany Town a Indigo Plateau mají jen Poké Center + Mart (hotovo).
Ilex Forest, Ruins of Alph, National Park, Lake of Rage, Whirl Islands, Mahogany Shop,
Rocket Hideout a Bike Shop **nejsou ve městě umístěné** → sprite zatím nepotřebují.
Jeskyně a routy sprite budovy nepotřebují.
Johto města mají mapu shora (`data/gen2/cityMaps.js`, v1.70.0); chybějící budovy se zatím kreslí
jako náhradní. Nový sprite stačí uložit pod názvem ze seznamu – mapa ho použije sama. Rozměr spritu
by měl zhruba odpovídat náhradní budově (`BUILDING_PLACEHOLDERS` v `data/cityMaps.js`), pak
`python tools/citymapcheck.py` (překryvy).

---

## 8. NPC portréty

> `assets/gen2/npc/<name>.png` (gen-specifické; gen 1 má `assets/gen1/npc/oak.png`). Jen esenciální příběhoví NPC.

Hotovo: `elm` (Prof. Elm, johtský diplom – oficiální artwork v plné kvalitě bez pozadí jako `oak.png`, 2026-10-29).

Zatím je hra nevolá (příběh běží bez portrétů): `mr-pokemon`, `silver`, `kurt`, `eusine`,
`lance` (jako NPC; může reuse leader sprite).

---

## 9. Třídy trenérů (routové souboje) – HOTOVO (2026-10-29)

> `assets/gen2/trainers/<class>/<n>.png` (číslované varianty 1, 2, …; po přidání spusť
> `python tools/gen_sprite_manifest.py`). Hra hledá složku podle `class` trenéra
> v `data/gen2/trainers.js`. Sdílené třídy (youngster, lass, hiker, beauty…) jsou hotové.

### Hotovo – všechny třídy, které hra volá, mají sprite (2026-10-29)
Jmenované postavy ve sdílené třídě mají v datech `spriteVariant` (pevný `<n>.png`):
`elder` 1 = Elder Li, 2 = Dragon Elder; `rocket-executive` 1 = Proton, 2 = Petrel, 3 = Ariana, 4 = Archer.
Dragon Clan v Dragon's Den používá `cooltrainer-m` / `cooltrainer-f`; `sudowoodo/1.png` = sprite Pokémona.

### V datech zatím nejsou (sprite netřeba, dokud je nikdo nepoužije)
`dragon-tamer`, `firebreather`, `guitarist`, `teacher`, `school-kid`, `officer`, `pokefan-m`,
`pokefan-f`, `rocket-executive-m`, `rocket-executive-f` (některé mají prázdnou složku).

---

## 10. Hudba (BGM) — volitelné (polish)

> Gen 1 používá univerzální BGM (`assets/audio/bgm/`: main/wild/trainer/gym/
> champion/rival) a reusuje se i pro Johto. Johto-specifická hudba je nice-to-have.

- [ ] (volitelné) `assets/audio/bgm/johto-main.mp3` a další Johto varianty, pokud
  bude chtít odlišit region hudebně. Bez nich jede gen 1 BGM.

---

## Pozn. k položkám „reuse"

Sdílené entity (Koga, Bruno, sdílené budovy a třídy trenérů) se do gen 2 fyzicky
kopírují z gen 1 – hra hledá soubory jen ve složce generace.
