/**
 * eggSprite.js – procedurální vykreslování vejce jako SVG.
 *
 * Funkce `eggSpriteHtml` generuje deterministicky stylizované vejce založené na
 * speciesId. Stejný druh = vždy stejné vejce (hash speciesId → barva/design).
 * Vejce vizuálně naznačuje „rodinu" druhu (hráč se učí rozpoznávat typické barvy).
 * SVG je inline a lze jej využít v HTML (např. ve Školce k zobrazení inkubujících vejec).
 *
 * Vzhled:
 *   - Skořápka: svislá elipsa/ovál (užší nahoře, širší dole)
 *   - Barva: deterministicky z hash speciesId (odstín, sytost, jas)
 *   - Puntíky/páska: 3–6 barevných prvků (odsazené od barvy skořápky)
 *   - Obrys: tenký tmavý obrys pro čitelnost na tmavém pozadí
 */

/**
 * Jednoduchý hash řetězce na číslo (0–1) pro deterministické barvy.
 * @param {string} str
 * @returns {number} 0–1
 */
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h = ((h << 5) - h) + c;
    h = h & h; // 32-bit integer
  }
  return Math.abs(h) / 2147483647; // 0–1
}

/**
 * Generuje barvu HSL na základě řetězce (deterministic color).
 * @param {string} seed  řetězec k hashu (např. speciesId)
 * @param {number} [saturation=70]  sytost (0–100)
 * @param {number} [lightness=60]  jas (0–100)
 * @returns {string} CSS barva (hsl(...))
 */
function colorFromSeed(seed, saturation = 70, lightness = 60) {
  const hue = Math.floor(simpleHash(seed) * 360);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Generuje sekundární barvu (puntíků) z podobného seeda, ale posunuté.
 * @param {string} seed
 * @returns {string} CSS barva
 */
function accentColorFromSeed(seed) {
  // Posuň seed pro rozdílnou barvu (např. přidej sufiks)
  const accentSeed = seed + "-accent";
  // Nižší jas, vyšší sytost (více výrazné)
  return colorFromSeed(accentSeed, 85, 50);
}

/**
 * Vrátí SVG řetězec vejce s deterministic designem.
 * @param {string} speciesId  druh Pokémona (seed pro deterministic design)
 * @param {{ size?: number }} [opts]  volitelné možnosti
 *        size: pixel rozměr SVG (default 48)
 * @returns {string} inline SVG řetězec (<svg>...</svg>)
 */
export function eggSpriteHtml(speciesId, opts = {}) {
  const size = opts.size ?? 48;
  const cx = size / 2;  // střed X
  const cy = size / 2;  // střed Y

  // Rozměry vejce (elipsa: užší nahoře, širší dole)
  const rx = size * 0.3;   // poloosy X (šířka)
  const ry = size * 0.42;  // poloosy Y (výška)

  // Barvy
  const shellColor = colorFromSeed(speciesId, 75, 65);
  const accentColor = accentColorFromSeed(speciesId);

  // Počet puntíků/prvků (deterministic z seed)
  const spotCount = 3 + Math.floor(simpleHash(speciesId + "-spots") * 4); // 3–6

  // Seed pro umístění puntíků
  let spotSeed = speciesId + "-spot";
  const spots = [];
  for (let i = 0; i < spotCount; i++) {
    // Pseudo-náhodná poloha v rámci vejce
    const angle = simpleHash(spotSeed + i) * Math.PI * 2;
    const rad = (0.2 + simpleHash(spotSeed + "-r" + i) * 0.35) * Math.min(rx, ry);
    const x = cx + Math.cos(angle) * rad;
    const y = cy + Math.sin(angle) * rad;
    const spotRadius = (0.08 + simpleHash(spotSeed + "-s" + i) * 0.06) * size;
    spots.push({ x, y, r: spotRadius });
  }

  // Vygeneruj SVG
  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;">`;

  // Skořápka vejce (elipsa s obrysem)
  svg += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${shellColor}" stroke="#333" stroke-width="${Math.max(0.5, size / 96)}" />`;

  // Puntíky (barva akcent)
  for (const spot of spots) {
    svg += `<circle cx="${spot.x}" cy="${spot.y}" r="${spot.r}" fill="${accentColor}" opacity="0.8" />`;
  }

  // (Volitelně: tenký highlight v horní části vejce = lesklý efekt)
  const highlightRx = rx * 0.5;
  const highlightRy = ry * 0.25;
  svg += `<ellipse cx="${cx}" cy="${cy - ry * 0.3}" rx="${highlightRx}" ry="${highlightRy}" fill="white" opacity="0.3" />`;

  svg += `</svg>`;
  return svg;
}
