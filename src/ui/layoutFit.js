/**
 * Přizpůsobení rozvržení velikosti okna (v1.71.2).
 *
 * PROČ: dřív rozhodovala jen šířka (pod 1000 px pod sebe). Na nízkém okně
 * (notebook se zvětšením 150 %, okno ~1270×660) se 2 sloupce nacpaly do výšky
 * okna, scéna souboje měla ~180 px a výherní okno se ořízlo – nešlo hrát.
 * Teď se 2 sloupce MĚŘÍ: vejdou-li se, zůstanou; jinak se zkusí zhuštěná
 * varianta; a když ani ta, panely se složí pod sebe (scroll je jen tam).
 *
 * Výsledek jde do atributů body (CSS je čte v css/main.css „Rozvržení“):
 *  - data-flow    "grid" (2 sloupce, bez scrollu stránky) | "stack" (pod sebe, scroll stránky)
 *  - data-density "normal" | "compact" (menší mezery, tým v jedné řadě)
 *  - data-split   "v" = scéna souboje nad logem (telefon / preset Mobile)
 *
 * Volby v nastavení (body[data-layout]):
 *  - auto    – grid → grid compact → stack (pod 1000 px šířky rovnou stack)
 *  - wide    – 2 sloupce, kdykoli se vejdou (i zhuštěné, i pod 1000 px); jinak stack –
 *              rozbité rozhraní (telefon, malé okno) nesmí být nikdy
 *  - stacked – vždy pod sebe
 *  - mobile  – pod sebe + svislé rozdělení souboje
 * Pod sebou se pod 700 px šířky scéna souboje vždy dá nad log (split).
 */

/** Pod touto šířkou je auto vždy pod sebou (tablet na výšku, telefon). */
const STACK_BELOW_W = 1000;
/** Pod touto šířkou se navíc scéna souboje dá NAD log (telefon). */
const SPLIT_BELOW_W = 700;
/** Minimální výška těla hlavního panelu (lišta souboje + scéna ≥ ~250 px). */
const MIN_MAIN_BODY = 340;
/** Minimální rozměry scény souboje (vedle logu; lišta nad ní se může zalomit). */
const MIN_FIELD_W = 300;
const MIN_FIELD_H = 220;
/** Boční panel s logem vedle scény (.battle-side 210 px + mezera). */
const SIDE_W = 220;

let lastKey = "";
let pending = false;

function setAttrs(flow, density, split) {
  const b = document.body.dataset;
  if (b.flow !== flow) b.flow = flow;
  if (b.density !== density) b.density = density;
  if (split) { if (b.split !== split) b.split = split; }
  else if (b.split) delete b.split;
}

/** Vejde se aktuální grid rozvržení bez ořezu? (čte jen rozměry, nic nemění) */
function gridFits() {
  const topbar = document.getElementById("topbar");
  if (topbar && topbar.scrollWidth > topbar.clientWidth + 1) return false;
  const body = document.querySelector("#main-panel .main-body");
  // Šířku scény odvodíme z panelu – ten je vidět i na jiné záložce a před startem souboje.
  if (body && (body.clientHeight < MIN_MAIN_BODY || body.clientWidth < MIN_FIELD_W + SIDE_W)) return false;
  const field = document.querySelector("#tab-battle.is-active .battle-field");
  if (field && field.clientHeight < MIN_FIELD_H) return false;
  for (const slot of document.querySelectorAll("#team-panel .team-slot")) {
    if (slot.scrollHeight > slot.clientHeight + 1) return false;
  }
  const team = document.getElementById("team-panel");
  if (team && team.scrollHeight > team.clientHeight + 1) return false;
  return true;
}

/** Plné vyhodnocení: zkusí varianty od nejlepší a nechá první, která se vejde. */
function evaluate() {
  const layout = document.body.dataset.layout || "auto";
  const w = window.innerWidth;
  const split = w < SPLIT_BELOW_W ? "v" : null;
  if (layout === "stacked") return setAttrs("stack", "normal", split);
  if (layout === "mobile") return setAttrs("stack", "normal", "v");
  if (layout === "auto" && w < STACK_BELOW_W) return setAttrs("stack", "normal", split);

  const y = window.scrollY;
  setAttrs("grid", "normal", null);
  if (!gridFits()) {
    setAttrs("grid", "compact", null);
    if (!gridFits()) setAttrs("stack", "normal", split);
  }
  if (window.scrollY !== y) window.scrollTo(0, y);
}

/**
 * Promítne rozvržení. Volá se po každém překreslení (STATE_CHANGED) – proto
 * levně: plné vyhodnocení jen při změně velikosti okna / volby v nastavení,
 * jinak jen kontrola, že se grid pořád vejde (např. přibyl Pokémon do týmu).
 * @param {boolean} [force] vynutit plné vyhodnocení
 */
export function fitLayout(force = false) {
  const key = `${document.body.dataset.layout}|${window.innerWidth}x${window.innerHeight}`;
  if (force || key !== lastKey) {
    lastKey = key;
    evaluate();
  } else if (document.body.dataset.flow === "grid" && !gridFits()) {
    evaluate();
  }
}

/** Naplánuje fitLayout na další snímek (sloučí víc volání do jednoho). */
export function requestFit(force = false) {
  if (force) lastKey = "";
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    fitLayout();
  });
}

/** Napojí přizpůsobení na změnu velikosti okna / otočení zařízení. */
export function initLayoutFit() {
  window.addEventListener("resize", () => requestFit());
  window.addEventListener("orientationchange", () => requestFit(true));
  // Fonty a obrázky mohou po načtení změnit rozměry (lišta, karty týmu).
  window.addEventListener("load", () => requestFit(true));
  fitLayout(true);
}
