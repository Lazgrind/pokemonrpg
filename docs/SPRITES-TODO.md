# Sprity – TODO (živý seznam všeho, co CHYBÍ)

> **Pravidlo (přísné):** tenhle soubor je jediný zdroj pravdy o **chybějících**
> spritech. Platí:
> 1. Je tu **každý** sprite, který hra očekává a na disku není – s **přesnou cestou**.
> 2. Jakmile asset nahraješ na disk, jeho řádek odsud **smaž**.
> 3. Když přidáš fíčuru, která potřebuje grafiku, **hned** sem doplň řádek
>    (co + přesná cesta) a **vytvoř složku**, kam soubor patří (u per-subjekt
>    složek: `assets/pokemon/<id>/`, `assets/trainers/<class>/`, …).
>
> Kód nic neregistruje – cesta se odvozuje z ID, takže po nahrání se sprite
> objeví sám; dokud chybí, jede fallback (glyf / CSS ikona / gradient).

**Stav ověřen proti disku:** 2026-09-09 (v0.85.0).

---

## 🔴 Blokující / funkční díra

- [ ] **`assets/backgrounds/building-1.png`** — pozadí biome **`building`**
  (interiéry: Poké Mart / gymy / Silph / Rocket Hideout…). Biome `building` je
  použit v `data/areas.js` (aspoň 1 oblast), ale **není v `BACKGROUND_BIOMES`**
  (`data/backgrounds.js`) → souboj tam padá na fallback gradient. Po nahrání
  přidat `building: ["building-1.png", …]` do `BACKGROUND_BIOMES`.
  Poměr ~3:2 na šířku. Klidně víc variant (`building-2.png`…).

---

## ⚔️ Gym leadeři – Liga (Elite Four + Champion)

Trenéři z Indigo Plateaui (poslední Krok 10, endgame). Vzor = `.png` portrét v `assets/gym-leaders/<id>/front.png` (single sprite, jako ostatní gym leadeři; Liga používá stejný `trainerSpriteUrl` vzor):

- [ ] **`assets/gym-leaders/elite-four-lorelei/front.png`** — Elite Four Lorelei (vodní specialistka, Dewgong/Cloyster/Slowbro/Jynx/Lapras, Kanto L50+).
- [ ] **`assets/gym-leaders/elite-four-bruno/front.png`** — Elite Four Bruno (bojovník, Onix/Hitmonchan/Hitmonlee/Machamp, L50+).
- [ ] **`assets/gym-leaders/elite-four-agatha/front.png`** — Elite Four Agatha (duchařka, Gengar/Golbat/Haunter/Arbok, L50+).
- [ ] **`assets/gym-leaders/elite-four-lance/front.png`** — Elite Four Lance (dračí expert, Gyarados/Dragonair/Aerodactyl/Dragonite, L50+).
- [ ] **`assets/gym-leaders/champion-blue/front.png`** — Champion Blue (player's rival v Ligovém finále, mixed team + counterStarterFinal, L55).

---

## 🏙️ Pozadí měst (City view) — žádané uživatelem

Každé město má mít vlastní pozadí scény za budovami (`src/ui/cityView.js`,
CSS proměnná `--city-bg`). Konvence `assets/city/<areaId>.png` (viz
`assets/city/README.md`). Poměr ~3:2 na šířku, kreslí se `cover`. Fallback =
travnatý gradient, dokud obrázek chybí. Města = oblasti `type:"city"` v
`data/areas.js`:

- [ ] **`assets/city/pallet-town.png`** — Pallet Town.
- [ ] **`assets/city/viridian-city.png`** — Viridian City.
- [ ] **`assets/city/pewter-city.png`** — Pewter City.
- [ ] **`assets/city/cerulean-city.png`** — Cerulean City.
- [ ] **`assets/city/vermilion-city.png`** — Vermilion City.
- [ ] **`assets/city/lavender-town.png`** — Lavender Town.
- [ ] **`assets/city/saffron-city.png`** — Saffron City.
- [ ] **`assets/city/celadon-city.png`** — Celadon City.
- [ ] **`assets/city/fuchsia-city.png`** — Fuchsia City.
- [ ] **`assets/city/cinnabar-island.png`** — Cinnabar Island.
- [ ] **`assets/city/indigo-plateau.png`** — Indigo Plateau.

---

## ⬜ Volitelné (funguje fallback, „nice to have")

### Pozadí soubojů – víc variant biome
Soubory naplocho v `assets/backgrounds/` jako `<biome>-<n>.png` (poměr ~3:2).

- [ ] **`assets/backgrounds/mountain-2.png` … `mountain-4.png`** — biome `mountain`
  má zatím jen `mountain-1.png`; víc variant = pestřejší střídání na skalnatých
  routách. Po nahrání dopsat do `BACKGROUND_BIOMES.mountain`.
- [ ] **`assets/backgrounds/seafoam-islands.png`** — per-area pozadí oblasti
  **Seafoam Islands** (ledová jeskyně). Odkazuje ho `data/areas.js`
  (`seafoam-islands` → `background: "seafoam-islands.png"`), NE biome pool. Do
  nahrání běží fallback gradient. Poměr ~3:2. (Vzor per-area override pro
  speciální oblasti – klidně i další legendární doupata.)
- [ ] **`assets/backgrounds/victory-road.png`** — per-area pozadí oblasti
  **Victory Road** (jeskyně/průsmyk) – Krok 10. Odkaz v `data/areas.js`
  (`victory-road` → `background: "victory-road.png"`). Poměr ~3:2.
- [ ] **`assets/backgrounds/indigo-plateau.png`** — per-area pozadí oblasti
  **Indigo Plateau** (horská plošina, Liga) – Krok 10. Odkaz v `data/areas.js`
  (`indigo-plateau` → `background: "indigo-plateau.png"`). Poměr ~3:2.

### Příběhové budovy – sprite místo CSS ikony
Story budovy (`data/buildings.js` `STORY_BUILDINGS`) se renderují CSS domečkem
s emoji ikonou (záměr: radší prázdno než cizí placeholder). Sprite je kosmetika:
dej ho do `assets/buildings/<id>.png` a přidej `sprite:` do dané definice budovy.
Níže je **úplný** seznam všech 20 story budov seřazený podle postupu hrou (5 idle
budov – Poké Center/Mart, Day-Care, Training Grounds, Move Tutor – už sprity na
disku má, ty tu nejsou).

**Pallet Town**
- [ ] **`assets/buildings/oak-lab.png`** — Oak's Lab (ikona 🔬) – starter + Pokédex.
- [ ] **`assets/buildings/player-home.png`** — Tvůj domov (ikona 🏠) – dárek od mámy, léčení.
- [ ] **`assets/buildings/rival-home.png`** — Rivalův dům (ikona 🏡) – flavour.

**Viridian City**
- [ ] **`assets/buildings/viridian-trade-house.png`** — Viridian Trade House (ikona 🏠) – výměna Abra za Mr. Mime (automatický level).

**Pewter City**
- [ ] **`assets/buildings/pewter-museum.png`** — Museum of Science (ikona 🏛️) – oživení fosílií (Omanyte/Kabuto/Aerodactyl).

**Cerulean City**
- [ ] **`assets/buildings/cerulean-trade-house.png`** — Cerulean Trade House (ikona 🏠) – výměna Poliwhirl za Jynx (automatický level).

**Vermilion City**
- [ ] **`assets/buildings/ss-anne.png`** — loď S.S. Anne (ikona 🚢) – souboj s rivalem, HM01 Cut; skrytý „Mew pod náklaďákem" (po Surf+Strength).
- [ ] **`assets/buildings/vermilion-trade-house.png`** — Vermilion Trade House (ikona 🏠) – výměna Spearow za Farfetch'd (automatický level).

**Lavender Town**
- [ ] **`assets/buildings/pokemon-tower.png`** — Pokémon Tower (ikona 🗼) – Marowak/Mr. Fuji/Poké Flute.
- [ ] **`assets/buildings/mr-fuji-house.png`** — Mr. Fuji's House (ikona 🏡) – flavour.

**Celadon City**
- [ ] **`assets/buildings/dept-store.png`** — Celadon Dept. Store (ikona 🏬) – nákup Fresh Water.
- [ ] **`assets/buildings/game-corner.png`** — Rocket Game Corner (ikona 🎰) – vchod do Rocket Hideoutu; po vyčištění „Plná herna" (automat + coiny + prize corner → Porygon). Slot UI je jen emoji, sprite je kosmetika budovy.
- [ ] **`assets/buildings/celadon-mansion.png`** — Celadon Mansion (ikona 🏨) – dárková budova, Eevee (automatický level dle týmu).

**Saffron City**
- [ ] **`assets/buildings/silph-co.png`** — Silph Co. (ikona 🏢) – Rocket gauntlet, Master Ball, dárek Lapras.
- [ ] **`assets/buildings/fighting-dojo.png`** — Fighting Dojo (ikona 🥋) – dárková budova, Hitmonlee + Hitmonchan (automatický level dle týmu).

**Fuchsia City**
- [ ] **`assets/buildings/warden-house.png`** — Warden's House (ikona 🏡) – vrácení Gold Teeth za HM04 Strength.

**Cinnabar Island**
- [ ] **`assets/buildings/pokemon-mansion.png`** — Pokémon Mansion (ikona 🏚️) – spínačový labyrint + gauntlet, Secret Key.
- [ ] **`assets/buildings/pokemon-lab.png`** — Pokémon Lab (ikona 🧪) – flavour/lore.

---

## ✅ Kompletní na disku (netřeba nic dodávat)

Jen přehled pokrytí – **jediné, co reálně chybí, jsou řádky výše.**

- **Pokémon (151/151)** — `assets/pokemon/<id>/` s `front` / `back` / `shiny-front`
  / `shiny-back`, a to jak **`.png`, tak `.gif`** (všechny 4 pohledy × 151 hotové).
- **Trenérské třídy (33/33)** — `assets/trainers/<class>/<n>.png` (číslované varianty
  `1.png`, `2.png`…; počet čte `data/spriteVariants.js`, auto-gen skriptem
  `tools/gen_sprite_manifest.py`). Vč. `rocket-grunt` a `rival`.
- **Gym leadeři (8/8)** — `assets/gym-leaders/<id>/front.png`.
- **Odznaky (8/8)** — `assets/badges/<id>.png`.
- **Pozadí:** `grassland`, `cave`, `water`, `forest` (plné sady), `mountain` (1 varianta).
- **Mapa:** `assets/map/kanto.webp`.
- **NPC:** `assets/npc/oak.png` (jediný, co kód zmiňuje – introScene).
- **Bally:** `assets/pokeballs/<id>-ball.png` (13 aktivních + rezervy).
- **Title screen:** `assets/Title_screen.webp` (+ `.jpg` fallback).
