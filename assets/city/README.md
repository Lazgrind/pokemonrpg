# Pozadí měst (`assets/city/`)

Obrázek scény pozadí pro každé město – vykresluje se v City panelu za budovami.

- **Konvence:** `assets/city/<areaId>.png` (areaId = `id` oblasti z `data/areas.js`,
  např. `pallet-town.png`, `viridian-city.png`).
- **Cesta se odvozuje z ID** – kód nic neregistruje (`src/ui/cityView.js` nastaví
  CSS proměnnou `--city-bg`). Dokud obrázek chybí, prosvítá fallback travnatý
  gradient (vrstvené pozadí v `.iso-city`), takže nic nespadne.
- **Poměr:** scéna je široká (panel), ideálně na šířku ~3:2; kreslí se `cover`
  (vyplní panel, ořízne přebytek), zarovnané na střed.
- Seznam chybějících pozadí je v `docs/SPRITES-TODO.md`.
