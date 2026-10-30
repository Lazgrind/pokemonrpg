# Generace 2 (Johto) – architektura, vývoj a vydání

Jak přidávat generaci 2 (a další) **bez ovlivnění generace 1**, jak ji **testovat na
localhostu**, jak zůstává **skrytá na produkci** a jak ji **vydat přehozením jediné
konstanty**.

> **Princip:** engine, UI i logika jsou SDÍLENÉ a generačně nezávislé. Mezi generacemi
> se liší jen **DATA** (mapa, oblasti, trenéři/gate, pokémoni). Gen 2 = stejná hra, jiný
> obsah. Proto se nový obsah přidává do složky generace a systémů se to nedotkne.

> **VYDÁNO ve verzi 2.0.0 (2026-10-29)** – `GEN2_RELEASED = true`, Johto je živé pro všechny hráče.
>
> **Stav (2026-10-20, v1.65.x):** Johto je **datově kompletní** – 100 druhů, mapa, 8 gymů,
> Liga, legendy, Safari, Contest, Unown, loď S.S. Aqua zpět do Kanta, region-lock, learnsety
> z Crystalu. Chybí jen grafika (`docs/SPRITES-TODO-GEN2.md`). Na produkci je Johto záměrně
> skryté (`GEN2_RELEASED = false`) – zapne se s verzí **2.0.0** (viz CLAUDE.md). Sekce 7–8 níž
> jsou historické záznamy postupu.

---

## 1. Struktura složek

Každá generace má **vlastní složku** s kompletním obsahem. V kořeni `data/` zůstávají
jen **aggregatory (hlavní vstupní body)** a **sdílená data**.

```
data/
  gameConfig.js        ← FEATURE FLAG (GEN2_ENABLED / GEN2_RELEASED)
  generations.js       ← REGISTR generací (které jsou aktivní) + typedef Generation

  gen1/                ← veškerý obsah Kanto (gen 1)
    index.js           ← descriptor GEN1 (region, mapa, startAreaId + data níže)
    pokemon.js         ← SPECIES_GEN1 (151 druhů)
    learnsets.js       ← LEARNSETS_GEN1
    evYields.js        ← EV_YIELDS_GEN1
    areas.js           ← AREAS_GEN1 (uzly Kanto mapy)
    legendaries.js     ← LEGENDARY_GEN1

  gen2/                ← veškerý obsah Johto (gen 2) – kompletní data
    index.js           ← descriptor GEN2 (mapa johto.webp, startAreaId new-bark-town)
    pokemon.js         ← SPECIES_GEN2 (100 druhů, #152–251)
    learnsets.js       ← LEARNSETS_GEN2 (Crystal, všech 251 druhů – i Gen 1 chycení v Johtu)
    evYields.js        ← EV_YIELDS_GEN2
    areas.js           ← AREAS_GEN2 (Johto mapa)
    legendaries.js     ← LEGENDARY_GEN2 (+ trainers, gyms, badges, safari, unown, evolutions)

  pokemon.js           ← AGGREGATOR: POKEMON_SPECIES, getSpecies, STARTER_IDS, speciesByGen
  learnsets.js         ← AGGREGATOR: LEARNSETS_BY_REGION + helpery (getLearnset(id, region)…)
  evYields.js          ← AGGREGATOR: EV_YIELDS
  areas.js             ← AGGREGATOR: AREAS + helpery (getArea, areaEncounters…) + config
  legendaries.js       ← AGGREGATOR: LEGENDARY_ENCOUNTERS + legendaryForArea

  moves.js, types.js, natures.js, items.js, tms.js, hms.js, …  ← SDÍLENÁ data (napříč gen)
```

**Jak to teče:** `genN/index.js` složí data generace do descriptoru → `generations.js`
posbírá aktivní generace do pole `GENERATIONS` → kořenové aggregatory z něj poskládají
finální `POKEMON_SPECIES`, `AREAS`, `LEARNSETS`… Systémy a UI čtou pořád stejné kořenové
exporty jako dřív → **žádný systém se kvůli generacím nemění**.

---

## 2. Feature flag – `data/gameConfig.js`

```js
const GEN2_RELEASED = false;               // vydat gen 2 i na produkci?
export const GEN2_ENABLED = GEN2_RELEASED || isLocalEnv();  // localhost → vždy true
```

| Prostředí | `GEN2_RELEASED` | Výsledek |
|---|---|---|
| localhost (vývoj) | cokoli | **gen 2 ZAPNUTÁ** (testuješ) |
| produkce | `false` | gen 2 skrytá (dex 151, žádné Johto) |
| produkce | `true` | **gen 2 živá pro všechny** |

Registr `generations.js` zařadí gen 2 jen když `GEN2_ENABLED`. Když je vypnutá, `GENERATIONS`
= jen gen 1 → `POKEMON_SPECIES` má 151, `AREAS` jen Kanto. Nic dalšího se neřeší.

---

## 3. Testování na localhostu

```bash
cd C:/GitLab__Pages_Zalohy/sad/pokemonrpg
python -m http.server 8000
# http://localhost:8000  → gen 2 je vidět; na produkci ne
```

---

## 4. Vydání gen 2 na produkci

V `data/gameConfig.js` přehoď jediný řádek a nasaď:

```diff
- const GEN2_RELEASED = false;
+ const GEN2_RELEASED = true;
```

---

## 5. Přidání gen 3, 4, … (recept)

1. Zkopíruj složku `data/gen2/` na `data/gen3/`.
2. Uprav `gen3/index.js` (`gen: 3`, `region`, `regionName`, `mapImage`, `startAreaId`).
3. Naplň data (`pokemon.js`, `areas.js`, `learnsets.js`, `evYields.js`, `legendaries.js`).
4. V `data/generations.js` přidej `import { GEN3 }` a zařaď do `GENERATIONS`
   (případně za vlastní flag, jako má gen 2).

Aggregatory ani systémy se nemění.

---

## 6. Přidání druhu / obsahu do generace

Vše jde do složky té generace (např. `data/gen2/`):
1. **Druh** → `SPECIES_GEN2` v `gen2/pokemon.js` (`gen: 2`, `dexNo` 152–251).
2. **Learnset** → `gen2/learnsets.js`, **EV yield** → `gen2/evYields.js`.
3. **Sprity** → `assets/gen2/pokemon/<id>/` + zápis do `docs/SPRITES-TODO-GEN2.md`.
4. **Oblast/mapa** → `gen2/areas.js` (`region: "johto"`), zařadit `id` do `area.species`.
5. **Typy** už jsou kompletní (18-typová tabulka v `data/types.js`) – neřeší se.

> **Generátory v `tools/`:** druhy, Pokédex info a EV yieldy generuje `gen_species.py`
> přímo do `data/genN/…`; learnsety `fetch_classic_learnsets.py` + `convert_classic_learnsets.py`.
> Staré `gen_pokedex_info.py`, `gen_movepools.py` a `fetch_ev_yields.ps1` zapisovaly do
> kořenových aggregatorů – od 2026-10-20 se bez přepínače odmítnou spustit.

---

## 7. Přechod Kanto → Johto přes S.S. Anne  ✅ HOTOVO

**Zadání:** hráč se do Johto dostane připlutím ze **S.S. Anne**, ale volba se objeví
**až po zisku titulu Champion**. Johto má zatím **prázdnou mapu** (kostra k vyšívání).

> **Stav:** implementováno (2026-09-24). Co je hotové:
> - `state.progress.region` (default `"kanto"`) + migrace save v49 → **v50** (`save.js`).
> - `travelToRegion(region)` v `battleSystem.js`: přepne region + aktivní oblast na
>   `startAreaId` cílové generace (když existuje), ukončí běžící souboj.
> - `mapView.js` je region-aware: bere mapu i uzly z `generationByRegion(region).areas`
>   (ne z textového `area.region` – to má u gen 1 „Kanto" s velkým K). Prázdný region
>   = plátno „ve výstavbě" (žádný broken `johto.webp`). Přepnutí regionu = plná
>   re-render (přes `root.dataset.region` v `STATE_CHANGED`).
> - Tlačítko „⛴️ Set sail for Johto" v `ssAnneView` (`storyBuildingView.js`),
>   gated `GEN2_ENABLED && story.isChampion && region==="kanto"`. Návrat „⚓ Zpět do
>   Kanto" je zatím tlačítko nad mapou (Johto nemá vlastní přístavní budovu).
> - `assets/gen2/map/johto.webp` zatím NEexistuje (gen-specifické) – nevadí, dokud je Johto prázdné
>   (viz `docs/SPRITES-TODO.md`). Nutné až s první Johto oblastí.

### Reálné háky, které už ve hře jsou
- **Champion:** `state.story.isChampion === true` (nastaví se po poražení Elite Four +
  Championa; viz `achievementSystem.js`, dev `champion`).
- **S.S. Anne:** příběhová budova v `data/buildings.js` (`id: "ss-anne"`, `story: "ss-anne"`,
  ve Vermilion City) – její obrazovku vykresluje `src/ui/storyBuildingView.js`.
- **Descriptor generace:** `GEN2` (`data/gen2/index.js`) nese `region: "johto"`,
  `mapImage`, `startAreaId` (zatím `null` = prázdná mapa).
- **Registr:** `generationByRegion("johto")` v `data/generations.js`.

### Co dodělat
1. **Stav regionu:** přidat `state.progress.region` (`"kanto"` | `"johto"`, default
   `"kanto"`) do `src/core/state.js` + migrace v `src/systems/save.js`.
2. **Přechodová funkce** (systém, např. `travelToRegion(region)`): nastaví
   `state.progress.region`, přepne `activeAreaId` na `startAreaId` cílové generace,
   překreslí mapu. Návrat do Kanto stejnou cestou (S.S. Anne v Johto přístavu).
3. **Mapa podle regionu:** `src/ui/mapView.js` vybere `mapImage` aktivní generace a
   zobrazí jen uzly s odpovídajícím `region` (`AREAS.filter(a => a.region === …)`).
4. **Volba na S.S. Anne:** v `storyBuildingView.js` (story `ss-anne`) přidat tlačítko
   „Vyplout do Johto", zobrazené jen když `GEN2_ENABLED && state.story.isChampion`.
   (A „Zpět do Kanto", je-li hráč v Johto.)
5. Johto zatím prázdné → po připlutí hráč vidí prázdnou mapu = plátno pro další obsah.

---

## 8. Dokončení Pokédexu per generaci  ✅ HOTOVO

> **Stav:** per-region diplomy (Kanto u Oaka, Johto u Elma), regionální Shiny Charm,
> achievement `dex-251` a regionální počty (`dexCountsByGen`) jsou ve hře. Původní zadání:

Dnes je „dokončení dexu" (diplom u Oaka + Shiny Charm) vázané na **151**. Až přibudou
gen-2 druhy, přejít na **per-generation diplomy** (zvlášť Kanto, zvlášť Johto). Pomocník
`speciesByGen(gen)` je v `data/pokemon.js`.

Místa s napevno `151` k revizi: `src/systems/team.js` (`grantDexDiploma`),
`src/systems/save.js` (migrace v40→v41, gate `caught >= 151`), `src/systems/pokedex.js`
(`dexCounts` – zvážit per-region), `data/achievements.js`, `src/dev/devPanel.js`,
`src/dev/devTools.js`.

---

## 9. Git workflow

- **Trunk-based:** vyvíjet přímo v `main`/release větvi za vypnutým `GEN2_RELEASED`.
- Gen 2 = commity do `data/gen2/…`, `assets/gen2/…`. Gen 1 opravy = do
  `data/gen1/…` a systémů. Nulový překryv → žádné merge konflikty mezi generacemi.
- Vydání: jeden commit `GEN2_RELEASED = true`.
