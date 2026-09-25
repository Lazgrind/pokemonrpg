# Sprity – TODO (živý seznam všeho, co CHYBÍ)

> **Pravidlo (přísné):** tenhle soubor je jediný zdroj pravdy o **chybějících**
> spritech. Platí:
> 1. Je tu **každý** sprite, který hra očekává a na disku není – s **přesnou cestou**.
> 2. Jakmile asset nahraješ na disk, jeho řádek odsud **smaž**.
> 3. Když přidáš fíčuru, která potřebuje grafiku, **hned** sem doplň řádek
>    (co + přesná cesta) a **vytvoř složku**, kam soubor patří.
>
> Kód nic neregistruje – cesta se odvozuje z ID, takže po nahrání se sprite
> objeví sám; dokud chybí, jede fallback (glyf / CSS ikona / gradient).
>
> **Hotové věci se sem NEPÍŠÍ.** Kompletní pokrytí (Pokémon 151, budovy, města,
> leadeři, Liga, odznaky, bally, pozadí biome, cries, BGM, …) je doložené v
> `CHANGELOG.md`; tady zůstává jen to, co reálně chybí nebo je otevřené.

**Stav ověřen proti disku:** 2026-09-14 (v0.111.0, plný audit napříč celou hrou).

---

## 🟥 Blokující / funkční díra

- **Žádná.** Všechny assety, které hra aktivně používá, jsou na disku a mají
  fallback. Nic povinného nechybí.

---

## ⬜ Otevřené (nepovinné – funguje fallback / jen polish)

### 1. Pozadí soubojů – víc variant biome (pestřejší střídání)
Soubory naplocho v `assets/backgrounds/` jako `<biome>-<n>.png` (poměr ~3:2).
Po nahrání dopsat do příslušného pole v `BACKGROUND_BIOMES` (`data/backgrounds.js`).

- [ ] `assets/backgrounds/mountain-3.png`, `mountain-4.png` — biome `mountain` má
  teď `mountain-1.png` + `mountain-2.png`; víc variant = pestřejší skalnaté routy.

---

### 2. Mapa regionu Johto (gen 2)
Descriptor `data/gen2/index.js` má `mapImage: null` (schválně). Johto už má první
oblast (New Bark Town), ale dokud je `mapImage` null, mapView vykresluje uzly nad
barevným plátnem „ve výstavbě" (`.map-placeholder-bg`) – takže **nic nechybí
funkčně**, uzly jdou klikat. Jakmile vznikne art mapy, nahraj soubor a v
`gen2/index.js` nastav `mapImage: "assets/gen2/map/johto.webp"`; placeholder se pak
sám přestane používat.

- [ ] `assets/gen2/map/johto.webp` — art mapy Johto (stejný formát jako `gen1/map/kanto.webp`).

---

### 3. Johto startéři (gen 2) – sprity Pokémonů
Prof. Elm dává v New Bark Town na výběr 3 startéry. Cesta se odvozuje z ID
(`assets/gen2/pokemon/<id>/<view>.png`), složky už existují, dokud sprity chybí jede
glyf fallback. Formát jako gen 1 (front/back + shiny, `.png`; `.gif` volitelně).

- [ ] `assets/gen2/pokemon/chikorita/front.png`, `back.png`, `shiny-front.png`, `shiny-back.png`
- [ ] `assets/gen2/pokemon/cyndaquil/front.png`, `back.png`, `shiny-front.png`, `shiny-back.png`
- [ ] `assets/gen2/pokemon/totodile/front.png`, `back.png`, `shiny-front.png`, `shiny-back.png`

---

### 4. Prof. Elm's Lab (budova New Bark Town)
Story-budova `elm-lab` (`data/buildings.js`) míří na `assets/gen2/buildings/elm-lab.png`.
Dokud chybí, jede fallback (ikona 🔬 / barva). Formát jako ostatní budovy.

- [ ] `assets/gen2/buildings/elm-lab.png` — pixel-art laboratoře prof. Elma.

---

## 🔮 Odloženo (fíčura, ne chybějící soubor)

- **Náhodné varianty spritů trenérů v souboji** — složky `assets/gen<N>/trainers/<class>/`
  už drží víc číslovaných variant, ale hra zatím losuje/nelosuje dle
  `data/spriteVariants.js`; plná náhodná volba per-souboj je odložená (viz paměť
  „sprite-workflow"). Není to chybějící grafika, jen nevyužitý potenciál.
