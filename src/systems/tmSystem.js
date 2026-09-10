/**
 * tmSystem.js – logika TM (Technical Machines): vlastnictví, kompatibilita,
 * naučení tahu a spotřeba. Data: data/tms.js (mapování) + data/tmCompat.js
 * (kánonická kompatibilita druhů). TM jsou uložené jako běžné itemy v
 * `state.resources.items` (id "tm01".."tm50" → počet).
 *
 * TM je jednorázový: po úspěšném naučení se 1 kus spotřebuje (jako v Gen 1).
 */

import { getState, commit } from "../core/state.js";
import { TMS, getTm, tmItemId } from "../../data/tms.js";
import { canSpeciesLearnTm } from "../../data/tmCompat.js";
import { getMove } from "../../data/moves.js";
import { MAX_MOVES } from "./pokemonSystem.js";

/** Kolik kusů daného TM hráč vlastní. */
export function tmCount(num) {
  return getState().resources?.items?.[tmItemId(num)] ?? 0;
}

/** Přidá hráči `qty` kusů daného TM (odměna od gym leadera / drop / prize). */
export function grantTm(num, qty = 1) {
  if (!getTm(num) || qty <= 0) return;
  const res = getState().resources;
  if (!res.items) res.items = {};
  const id = tmItemId(num);
  res.items[id] = (res.items[id] ?? 0) + qty;
}

/** Jedinec z kolekce podle uid (nebo null). */
function ownedByUid(uid) {
  return getState().collection.find((p) => p.uid === uid) ?? null;
}

/**
 * Smí se daný jedinec teď naučit tento TM?
 *  - hráč TM vlastní (aspoň 1 kus),
 *  - druh je kanonicky kompatibilní,
 *  - jedinec tah ještě neumí.
 * @returns {boolean}
 */
export function canTeachTm(uid, num) {
  const owned = ownedByUid(uid);
  if (!owned) return false;
  const tm = getTm(num);
  if (!tm) return false;
  if (tmCount(num) <= 0) return false;
  if (!canSpeciesLearnTm(owned.speciesId, num)) return false;
  if (Array.isArray(owned.moves) && owned.moves.some((m) => m.id === tm.move)) return false;
  return true;
}

/**
 * Seznam TM, které se daný jedinec teď MŮŽE naučit (vlastněné ∩ kompatibilní ∩
 * ještě neumí). Pro nabídku v UI (dropdown na kartě Pokémona).
 * @param {string} uid
 * @returns {Array<{ num: number, move: string, name: string, count: number }>}
 */
export function learnableTmsFor(uid) {
  const owned = ownedByUid(uid);
  if (!owned) return [];
  const known = new Set((owned.moves ?? []).map((m) => m.id));
  return TMS.filter(
    (tm) =>
      tmCount(tm.num) > 0 &&
      canSpeciesLearnTm(owned.speciesId, tm.num) &&
      !known.has(tm.move)
  ).map((tm) => ({ num: tm.num, move: tm.move, name: tm.name, count: tmCount(tm.num) }));
}

/**
 * Naučí jedince tah z TM a spotřebuje 1 kus. Když má volný slot (<4 tahy),
 * přidá; jinak je potřeba `replaceSlot` (index 0–3) k přepsání.
 * Commituje sám.
 * @param {string} uid
 * @param {number} num          číslo TM
 * @param {number|null} replaceSlot  index slotu k přepsání (0–3), nebo null
 * @returns {{ ok: boolean, replaced?: boolean, needsSlot?: boolean, reason?: string }}
 */
export function teachTm(uid, num, replaceSlot = null) {
  const owned = ownedByUid(uid);
  if (!owned) return { ok: false, reason: "no-pokemon" };
  const tm = getTm(num);
  if (!tm) return { ok: false, reason: "no-tm" };
  if (tmCount(num) <= 0) return { ok: false, reason: "not-owned" };
  if (!canSpeciesLearnTm(owned.speciesId, num)) return { ok: false, reason: "incompatible" };
  const mv = getMove(tm.move);
  if (!mv) return { ok: false, reason: "no-move" };
  if (!Array.isArray(owned.moves)) owned.moves = [];
  if (owned.moves.some((m) => m.id === tm.move)) return { ok: false, reason: "already-known" };

  // `taught: true` = tah naučený hráčem přes TM. Auto level-up ho nikdy nepřepíše.
  const slot = { id: tm.move, pp: mv.pp, maxPp: mv.pp, taught: true };
  let replaced = false;
  if (owned.moves.length < MAX_MOVES) {
    owned.moves.push(slot);
  } else if (replaceSlot != null && replaceSlot >= 0 && replaceSlot < owned.moves.length) {
    owned.moves[replaceSlot] = slot;
    replaced = true;
  } else {
    // Plno a bez zvoleného slotu → UI má nabídnout výběr tahu k přepsání.
    return { ok: false, needsSlot: true };
  }

  // Spotřeba 1 kusu TM.
  const res = getState().resources;
  const id = tmItemId(num);
  res.items[id] = Math.max(0, (res.items[id] ?? 0) - 1);
  if (res.items[id] === 0) delete res.items[id];
  commit();
  return { ok: true, replaced };
}
