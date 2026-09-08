# Sprity – TODO (živý seznam)

> **Pravidlo údržby:** tenhle soubor drží **jen to, co ještě CHYBÍ**. Jakmile asset
> nahraješ na disk, jeho řádek odsud **smažu**. Když přidám novou fíčuru, která
> potřebuje grafiku, **doplním sem** nový řádek (co + přesná cesta, kam soubor patří).
> Kód nic neregistruje – cesta se odvozuje z ID, takže po nahrání se sprite objeví sám;
> dokud chybí, jede fallback.

Stav ověřen proti disku: **2026-09-08 (v0.72.0).**

---

## ⬜ Příběhové budovy – volitelné sprity (jede CSS ikona)

Story budovy (`data/buildings.js` STORY_BUILDINGS) záměrně **nemají** sprite – renderují se
CSS domečkem s emoji ikonou (viz [[prefer-empty-over-wrong-placeholder]]). Sprite je jen
kosmetické „nice to have"; kdybys chtěl, dej ho do `assets/buildings/<id>.png` a přidej
`sprite:` do dané definice budovy.

- [ ] *(volitelně)* **`assets/buildings/ss-anne.png`** — loď S.S. Anne (Vermilion, Krok 5).
- [ ] *(volitelně)* **`assets/buildings/pewter-museum.png`** — Museum of Science (Pewter).

---

## ⬜ Pozadí soubojů – chybějící biome

Soubory patří naplocho do `assets/backgrounds/` jako `<biome>-<n>.png` (poměr ~3:2 na
šířku). Po nahrání zapíšu biome + soubory do `data/backgrounds.js` (`BACKGROUND_BIOMES`).

- [ ] **`building`** — interiéry (Poké Mart/gymy/Silph/Rocket Hideout…). Zatím ho v
  `data/areas.js` používá 1 oblast a padá na fallback gradient. Např. `building-1.png`.
- [ ] *(volitelně)* **`mountain`** — má jen `mountain-1.png`; lze doplnit `mountain-2..4.png`
  pro pestřejší střídání (skalnaté routy). Není blokující.

---

## ✅ Hotové (na disku, netřeba dodávat)

Nechávám jen jako přehled, ať víme, co je pokryté (řádky nahoře jsou to jediné, co chybí):

- **Pokémon (151/151)** — `assets/pokemon/<id>/` s `front/back/shiny-front/shiny-back` (png+gif).
- **Trenérské třídy (33/33)** — `assets/trainers/<class>/<n>.png` (číslované varianty
  `1.png`, `2.png`… – NE `front.png`; počet variant čte `data/spriteVariants.js`).
  Vč. `rocket-grunt` (Mt. Moon Team Rocket gauntlet) a `rival`.
- **Gym leadeři (8/8)** — `assets/gym-leaders/<id>/front.png`.
- **Odznaky (8/8)** — `assets/badges/<id>.png`.
- **Pozadí:** `grassland`, `cave`, `water`, `forest`, `mountain` (zapojené v `data/backgrounds.js`).
