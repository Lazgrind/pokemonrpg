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

## 🔮 Odloženo (fíčura, ne chybějící soubor)

- **Náhodné varianty spritů trenérů v souboji** — složky `assets/trainers/<class>/`
  už drží víc číslovaných variant, ale hra zatím losuje/nelosuje dle
  `data/spriteVariants.js`; plná náhodná volba per-souboj je odložená (viz paměť
  „sprite-workflow"). Není to chybějící grafika, jen nevyužitý potenciál.
