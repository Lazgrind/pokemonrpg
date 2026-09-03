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
 * @param {string} [ext]  přípona souboru (bez tečky), výchozí "png"; "gif" pro animaci
 * @returns {string}
 */
export function spriteUrl(speciesId, view = "front", ext = "png") {
  return `assets/pokemon/${speciesId}/${view}.${ext}`;
}

/**
 * Poměrová velikost spritu odvozená z výšky druhu (v metrech) – aby Pidgey
 * nebyl ve scéně stejně velký jako Charizard. Reálné výšky mají obrovský rozptyl
 * (Diglett 0,2 m … Onix 8,8 m), takže je KOMPRIMUJEME mocninou < 1 a ořízneme
 * do rozumného pásma, ať se malí neztratí a velcí nezaberou celou scénu.
 *
 * Kotva: 1 m ≈ scale 1,0 (výchozí velikost `--sprite`).
 * @param {number} [heightMeters]  výška druhu; chybí → 1 (neutrální scale)
 * @returns {number} násobitel velikosti spritu v pásmu [0.55, 1.5]
 */
export function spriteScaleForHeight(heightMeters) {
  const h = typeof heightMeters === "number" && heightMeters > 0 ? heightMeters : 1;
  const scale = Math.pow(h, 0.35); // komprese širokého rozptylu výšek
  return Math.min(1.5, Math.max(0.55, Math.round(scale * 100) / 100));
}

/**
 * HTML jednoho spritu jako <img> s fallbackem. Dokud se obrázek nenačte, je
 * vidět zástupný glyph; po načtení se glyph skryje, při chybě se skryje <img>.
 *
 * Pohlaví: samice (`gender === "f"`) zkusí nejdřív variantu s příponou `-f`
 * (`front-f.png`, `shiny-back-f.png`, …). Většina druhů gender rozdíl NEMÁ, takže
 * `-f` soubor typicky chybí – pak se přes onerror automaticky spadne na výchozí
 * (samčí/bezpohlavní) sprite a teprve když chybí i ten, ukáže se glyph.
 *
 * Animace: `animated: true` zkusí nejdřív `.gif` (animovaný sprite) a při chybějícím
 * gifu spadne na statické `.png`. Používá se v manuálním souboji; auto/idle jede
 * statické png. Fallback je řetězený: [gif] → [png] → glyph „?".
 * @param {string} speciesId
 * @param {object} [opts]
 * @param {"front"|"back"} [opts.view]
 * @param {boolean} [opts.shiny]  zkusí variantu `shiny-<view>`
 * @param {"m"|"f"|"genderless"|null} [opts.gender]  u samice zkusí `-f` variantu
 * @param {boolean} [opts.animated]  zkusí nejdřív `.gif` s fallbackem na `.png`
 * @param {string} [opts.alt]
 * @param {string} [opts.extraClass]
 * @param {number} [opts.scale]  poměrová velikost (CSS proměnná --mon-scale);
 *                               výchozí 1 = beze změny (viz spriteScaleForHeight)
 * @returns {string}
 */
export function spriteImg(speciesId, { view = "front", shiny = false, gender = null, animated = false, alt = "", extraClass = "", scale = 1 } = {}) {
  const base = shiny ? `shiny-${view}` : view;
  // Seřazené kandidátní jména: u samice nejdřív `-f`, pak výchozí.
  const names = gender === "f" ? [`${base}-f`, base] : [base];
  // Seřazené přípony: animovaně nejdřív gif, pak statické png; jinak jen png.
  const exts = animated ? ["gif", "png"] : ["png"];
  const urls = [];
  for (const n of names) for (const e of exts) urls.push(spriteUrl(speciesId, n, e));
  const primary = urls[0];
  const rest = urls.slice(1);
  // Zbylé kandidáty předáme onerror handleru jako JSON frontu (postupné zkoušení).
  const fbAttr = rest.length ? ` data-fb='${JSON.stringify(rest)}'` : "";
  // --mon-scale nastavíme jen když se liší od 1 (jinak dědí výchozí z CSS).
  const scaleStyle = scale && scale !== 1 ? ` style="--mon-scale:${scale}"` : "";
  return `<span class="mon-sprite ${extraClass}"${scaleStyle}>
    <span class="ph">?</span>
    <img src="${primary}" alt="${alt}" loading="lazy"${fbAttr}
      onload="this.previousElementSibling.style.display='none'"
      onerror="var f=this.getAttribute('data-fb'); if(f){var a=JSON.parse(f);this.src=a.shift();if(a.length){this.setAttribute('data-fb',JSON.stringify(a));}else{this.removeAttribute('data-fb');}} else {this.style.display='none';}">
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
