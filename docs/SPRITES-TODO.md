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
> **Hotové věci se sem NEPÍŠÍ.** Kompletní pokrytí (Pokémon 151, budovy,
> leadeři, Liga, odznaky, bally, pozadí biome, cries, BGM, …) je doložené v
> `CHANGELOG.md`; tady zůstává jen to, co reálně chybí nebo je otevřené.

**Stav ověřen proti disku:** 2026-10-20 (v1.65.x, audit Gen 1 + Gen 2 – chybí jen
2 neblokující boss-portréty; SFX generuje tools/gen_sfx.py; Johto viz SPRITES-TODO-GEN2.md). Předtím 2026-10-01 (v1.52.0). Předtím 2026-09-14
(v0.111.0, plný audit napříč celou hrou).

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

### 2. Johto (gen 2)
Vše chybějící pro Johto vede `docs/SPRITES-TODO-GEN2.md` (odkazy k vyplnění: `docs/gen2_odkazy.txt`).

---

### 3. GEN1 boss-portréty (2× chybějící třída)
Bossové typu `kind: "boss"` jdou cestou `assets/gen1/trainers/<class>/<n>.png` (ne
`gym-leaders/`). Dvě boss třídy nemají složku – portrét se používá jen v tab-listu
(rocketView) a na výsledkové obrazovce; při chybě se `<img>` přes `onerror` skryje,
takže **nic nespadne, jen chybí obrázek**. Původní obsah (ne z nové vlny v1.45–v1.52).

- [ ] `assets/gen1/trainers/giovanni/1.png` — boss portrét Giovanniho (`giovanni-hideout`
  v Rocket Hideout + `giovanni-silph` v Silph Co.). Pozn.: gym-leader Giovanni má
  vlastní `assets/gen1/gym-leaders/giovanni/front.png` (ten je OK) – tohle je boss varianta.
- [ ] `assets/gen1/trainers/ghost/1.png` — boss portrét ducha Marowak (`lavender-marowak`,
  Pokémon Tower).

---
