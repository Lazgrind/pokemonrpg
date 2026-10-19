/**
 * badges.js – kanonická definice gym odznaků (aggregator přes generace).
 *
 * Zdroj pravdy pro odznaky: pořadí (kánon), jméno, vůdce, město a typ gymu.
 * Data jsou po generacích ve složkách data/genN/badges.js; tady se jen sloučí
 * (v pořadí generací) a přidají helpery. Používá to Profile tab (badge case) a
 * gym systém (výhra nad leaderem přidá `id` do `state.progress.badges`;
 * `unlock.badge` gatuje oblasti).
 *
 * `id` = zároveň jméno souboru ikony → `assets/gen<gen>/badges/<id>.png`.
 * `cityId` odkazuje na uzel města v data/areas.js. `gen` = generace odznaku
 * (odznaky se ukládají per region; ikona žije v gen složce dané generace).
 *
 * @typedef {Object} Badge
 * @property {string} id      id odznaku (= jméno souboru ikony)
 * @property {string} name    zobrazované jméno
 * @property {string} leader  jméno gym leadera
 * @property {string} cityId  id města (uzel v data/areas.js), kde se odznak získá
 * @property {string} type    typ gymu (téma týmu leadera)
 * @property {number} gen     generace odznaku (1 = Kanto, 2 = Johto) → gen složka ikony
 */

import { GENERATIONS } from "./generations.js";

/** @type {Badge[]} Odznaky všech aktivních generací (v pořadí generací). */
export const BADGES = GENERATIONS.flatMap((g) => g.badges ?? []);

/** Badge podle id, nebo null. */
export function getBadge(id) {
  return BADGES.find((b) => b.id === id) ?? null;
}
