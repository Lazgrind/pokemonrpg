# assets/backgrounds

Pozadí (battlegrounds) pro **Battle Area** – scéna za bojujícími Pokémony.
Pozadí se **náhodně mění souboj od souboje** (po každé výhře / chycení se u
dalšího nepřítele vybere jiná varianta z prostředí dané oblasti).

## Klíčové rozhodnutí: pozadí jsou SDÍLENÁ, nezávislá na oblasti

Obrázky **nepatří konkrétní route**. Stejné travnaté pozadí může používat Route 1
i Route 3. Proto:

- Obrázky žijí **naplocho** v `assets/backgrounds/` s **popisnými názvy** podle
  obsahu, ne podle oblasti: `grass-forest.png`, `grass-path.png`, `grass-field.png`,
  později třeba `cave-1.png`, `water-beach.png` …
- Jsou seskupené do **prostředí (biome)** v `data/backgrounds.js`
  (`BACKGROUND_BIOMES`), např.:
  ```js
  export const BACKGROUND_BIOMES = {
    grassland: ["grass-forest.png", "grass-path.png", "grass-field.png"],
  };
  ```
- **Oblast se odkazuje na prostředí**, ne na obrázky: `data/areas.js` →
  `biome: "grassland"`. Víc oblastí stejného biome sdílí tentýž pool. (Kdyby oblast
  neměla biome / biome neměl obrázky, prosvítá fallback gradient.)

Statický web (GitHub Pages) neumí vylistovat složku, takže seznam obrázků musí být
v datech (`data/backgrounds.js`) – to je jediný zdroj pravdy.

## Formát a rozměry

- **PNG** (nebo JPG). Poměr **~3:2 na šířku** – scéna v okně má `aspect-ratio: 3/2`
  a obrázek ji vyplní celý přes `background-size: cover`, takže se **nic ošklivě
  neořezává**. Drž tedy 3:2 (např. **240×160**, **960×640**, **1200×800**).
- Malované i pixel-art. Renderuje se **hladce** (`image-rendering: auto`) – pozadí
  není pixel-art jako sprity postav.
- Bez textu / bez postav – jen prostředí (tráva, cesta, jeskyně, voda…).

## Jak to funguje (seam už je hotový ✅)

1. Nahraješ obrázek do `assets/backgrounds/` (popisný název) a přidáš ho do
   některého biome v `data/backgrounds.js`.
2. Oblast v `data/areas.js` má `biome: "<biome>"`.
3. `battleSystem.js` **náhodně vybere jedno pozadí** z biome (`pickBackground` →
   `biomeBackgrounds`) a uloží ho do stavu souboje (`battle.background`). Přehodí
   se při **každém novém setkání** (po výhře i po chycení); během jednoho střetu je
   stabilní (po refreshi se obnoví ze save).
4. `battleView.js` vykresluje vrstvu `.battle-field .bg` s vybraným pozadím.
5. **Když prostředí nemá obrázky**, nic se nerozbije – prosvítá **fallback gradient**.

## Aktuální stav (viz `data/backgrounds.js` / `data/areas.js`)

- Biome **`grassland`** → `grass-forest.png`, `grass-path.png`, `grass-field.png`
  (les / cesta / tráva s plotem; testovací sada rozřezaná z `battlegrounds.png`).
- Oblast **`route-01`** (Route 1, Kanto) má `biome: "grassland"`.

Souvisí s přepracováním souboje na spritový (BACKLOG: R-029) a s mapou světa
(R-028/R-032). Biome/pozadí se hodí i pro budoucí obrazovku mapy.
