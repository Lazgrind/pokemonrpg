/**
 * ballIcon.js – vykreslení ikony Poké Ballu z assetu (s fallbackem na emoji).
 *
 * Ikony leží v `assets/pokeballs/<id>-ball.png` (viz assets/pokeballs/README.md:
 * poke-ball.png, great-ball.png, …). Výchozí a hlavní zobrazení je VŽDY obrázek
 * z assetu; emoji z dat (`ball.icon`) je jen záložka pro případ, že sprite chybí
 * (např. Beast Ball) – zobrazí se teprve při chybě načtení, ne dřív.
 */

import { getPokeball } from "../../data/pokeballs.js";

/**
 * URL ikony ballu podle id (konvence <id>-ball.png).
 * @param {string} ballId
 * @returns {string}
 */
export function ballSpriteUrl(ballId) {
  return `assets/pokeballs/${ballId}-ball.png`;
}

/**
 * HTML ikony ballu jako <img> s emoji fallbackem.
 * @param {string} ballId
 * @param {object} [opts]
 * @param {number} [opts.size]   velikost v px (výška i šířka)
 * @param {string} [opts.title]  tooltip (výchozí = název ballu)
 * @returns {string}
 */
export function ballIconHtml(ballId, { size = 20, title } = {}) {
  const ball = getPokeball(ballId);
  const emoji = ball?.icon ?? "🔴";
  const name = title ?? ball?.name ?? ballId;
  const url = ballSpriteUrl(ballId);
  // Obrázek je hlavní; emoji záložka je skrytá a ukáže se jen při chybě načtení.
  return `<span class="ball-icon" style="--ball-size:${size}px" title="${name}">
    <img src="${url}" alt="${name}" loading="lazy"
      onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'">
    <span class="ph" style="display:none">${emoji}</span>
  </span>`;
}
