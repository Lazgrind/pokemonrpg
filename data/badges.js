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

/**
 * Kolik odznaků REGIONU hráč má (odznaky se ukládají společně v progress.badges,
 * počítají se ale per region – kantské se v Johtu nepočítají a naopak).
 * @param {string[]} earned  id získaných odznaků (progress.badges)
 * @param {string} region  slug regionu ("kanto" | "johto")
 * @returns {{ earned: number, total: number }}
 */
export function regionBadgeCount(earned, region) {
  const gen = GENERATIONS.find((g) => g.region === region)?.gen ?? 1;
  const own = BADGES.filter((b) => (b.gen ?? 1) === gen);
  const ids = new Set(Array.isArray(earned) ? earned : []);
  return { earned: own.filter((b) => ids.has(b.id)).length, total: own.length };
}

/** Badge podle id, nebo null. */
export function getBadge(id) {
  return BADGES.find((b) => b.id === id) ?? null;
}
