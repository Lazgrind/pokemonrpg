/**
 * hms.js – DATA vrstva Hidden Machines (HM), Gen 1.
 *
 * Čistá data: kanonické mapování HM01–HM05 → tah (id z data/moves.js) + odpovídající
 * klíčový item (data/items.js) + story flag, kterým hráč HM získá. Herní logiku
 * (naučení tahu, kompatibilita, dostupnost) řeší src/systems/hmSystem.js,
 * kompatibilitu druhů data/hmCompat.js.
 *
 * NA ROZDÍL OD TM je HM znovupoužitelný: NEspotřebuje se a smí se naučit
 * neomezeně mnoha kompatibilním Pokémonům (jako v kánonu). Odemykání HM zůstává
 * gate přes příběhové flagy (S.S. Anne / Safari / Warden / Route 9) – to neměníme.
 *
 * Pozn.: Fly je čistě bojový tah (dvoutahový Flying útok), NE cestování – mapa je
 * klikací. Dive není Gen 1 HM, zůstává běžným tahem (jen data/moves.js).
 *
 * @typedef {Object} HmDef
 * @property {number} num     číslo HM (1–5)
 * @property {string} move    id tahu (data/moves.js)
 * @property {string} name    zobrazované jméno tahu (bez „HMxx")
 * @property {string} itemId  id klíčového itemu (data/items.js)
 * @property {string} flag    název story flagu (state.story), kterým hráč HM získá
 */

/** @type {HmDef[]} */
export const HMS = [
  { num: 1, move: "cut",      name: "Cut",      itemId: "hm01-cut",      flag: "hasCut" },
  { num: 2, move: "fly",      name: "Fly",      itemId: "hm02-fly",      flag: "hasFly" },
  { num: 3, move: "surf",     name: "Surf",     itemId: "hm03-surf",     flag: "hasSurf" },
  { num: 4, move: "strength", name: "Strength", itemId: "hm04-strength", flag: "hasStrength" },
  { num: 5, move: "flash",    name: "Flash",    itemId: "hm05-flash",    flag: "hasFlash" },
];

/** Zobrazované jméno HM itemu, např. „HM03 Surf". */
export function hmDisplayName(hm) {
  return `HM${String(hm.num).padStart(2, "0")} ${hm.name}`;
}

/** HmDef podle čísla (nebo null). */
export function getHm(num) {
  return HMS.find((h) => h.num === num) ?? null;
}

/** HmDef podle item id („hm03-surf") (nebo null). */
export function getHmByItemId(id) {
  return HMS.find((h) => h.itemId === id) ?? null;
}

/** Je toto item id HM? */
export function isHmItemId(id) {
  return HMS.some((h) => h.itemId === id);
}

/** HmDef podle id tahu („surf") (nebo null). */
export function getHmByMove(moveId) {
  return HMS.find((h) => h.move === moveId) ?? null;
}
