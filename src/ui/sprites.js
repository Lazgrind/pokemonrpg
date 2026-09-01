/**
 * sprites.js – cesty a vykreslení spritů Pokémonů.
 *
 * Sprity žijí naplocho v `assets/pokemon/<id>/<view>.png` (viz
 * assets/pokemon/README.md). Cesta se odvozuje z `id` druhu (= slug jména),
 * nic se neregistruje per druh. Když sprite ještě není nahraný, zobrazí se
 * zástupný glyph „?" (fallback), takže hra funguje i bez obrázků.
 */

/**
 * URL spritu daného druhu a pohledu.
 * @param {string} speciesId
 * @param {string} [view]  "front" | "back" | "shiny-front" | "shiny-back"
 * @returns {string}
 */
export function spriteUrl(speciesId, view = "front") {
  return `assets/pokemon/${speciesId}/${view}.png`;
}

/**
 * HTML jednoho spritu jako <img> s fallbackem. Dokud se obrázek nenačte, je
 * vidět zástupný glyph; po načtení se glyph skryje, při chybě se skryje <img>.
 *
 * Pohlaví: samice (`gender === "f"`) zkusí nejdřív variantu s příponou `-f`
 * (`front-f.png`, `shiny-back-f.png`, …). Většina druhů gender rozdíl NEMÁ, takže
 * `-f` soubor typicky chybí – pak se přes onerror automaticky spadne na výchozí
 * (samčí/bezpohlavní) sprite a teprve když chybí i ten, ukáže se glyph.
 * @param {string} speciesId
 * @param {object} [opts]
 * @param {"front"|"back"} [opts.view]
 * @param {boolean} [opts.shiny]  zkusí variantu `shiny-<view>`
 * @param {"m"|"f"|"genderless"|null} [opts.gender]  u samice zkusí `-f` variantu
 * @param {string} [opts.alt]
 * @param {string} [opts.extraClass]
 * @returns {string}
 */
export function spriteImg(speciesId, { view = "front", shiny = false, gender = null, alt = "", extraClass = "" } = {}) {
  const base = shiny ? `shiny-${view}` : view;
  const def = spriteUrl(speciesId, base);
  // U samice zkus nejdřív `-f`, s fallbackem na výchozí sprite (data-fb).
  const useFemale = gender === "f";
  const primary = useFemale ? spriteUrl(speciesId, `${base}-f`) : def;
  const fbAttr = useFemale ? ` data-fb="${def}"` : "";
  return `<span class="mon-sprite ${extraClass}">
    <span class="ph">?</span>
    <img src="${primary}" alt="${alt}" loading="lazy"${fbAttr}
      onload="this.previousElementSibling.style.display='none'"
      onerror="var f=this.getAttribute('data-fb'); if(f){this.removeAttribute('data-fb');this.src=f;} else {this.style.display='none';}">
  </span>`;
}

/**
 * Silueta pro neviditelný/neznámý druh – žádný obrázek, jen tmavý glyph.
 * @param {string} [extraClass]
 * @returns {string}
 */
export function silhouetteHtml(extraClass = "") {
  return `<span class="mon-sprite silhouette ${extraClass}"><span class="ph">?</span></span>`;
}
