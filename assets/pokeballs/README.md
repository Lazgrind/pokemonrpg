# assets/pokeballs

Ikonky Poké Ballů (a v budoucnu dalších druhů míčků).

Zatím hra používá jeden generický zdroj `pokeballs` (viz zdrojová lišta a Poké Mart).
Tahle složka je **příprava na budoucí rozšíření** na víc druhů míčků, každý s vlastní
ikonou, cenou, šancí na chycení a případnými mechanikami. Rozšíření se pak udělá
**datově** (přidání záznamu + ikony), bez zásahu do systémů.

## Konvence pojmenování

- Jeden soubor = jeden druh míčku, `kebab-case`, přípona `.png`:
  - `poke-ball.png`
  - `great-ball.png`
  - `ultra-ball.png`
  - `master-ball.png`
  - (dál libovolně: `premier-ball.png`, `quick-ball.png`, …)
- Jméno souboru = `id` míčku v datech (až vznikne `data/pokeballs.js`).
- Ideálně čtvercové, pixel-art. Průhledné pozadí není nutné – když bude mít
  ikona plné pozadí, odstraníme ho stejně jako u budov (Pillow: flood fill /
  klíčování barvy) a ostrost zajistí `image-rendering: pixelated`.

## Jak to napojíme (až přijde čas)

1. Nahraješ ikonky sem podle konvence výše.
2. Vznikne `data/pokeballs.js` – seznam druhů (`id`, `name`, `icon`,
   `catchRate`, `price`, …) + `getPokeball(id)`.
3. Systém chytání/nákupu se rozšíří o typ míčku; UI ukáže ikonu z této složky.

Souvisí s postupem u budov/Pokémonů (viz `assets/buildings/`).
