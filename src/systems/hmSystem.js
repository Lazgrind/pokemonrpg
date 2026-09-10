/**
 * hmSystem.js – logika HM (Hidden Machines): vlastnictví, kompatibilita a
 * naučení tahu. Data: data/hms.js (mapování HM→tah+item) + data/hmCompat.js
 * (kánonická kompatibilita druhů). HM jsou uložené jako běžné itemy v
 * `state.resources.items` (id "hm01-cut", "hm02-fly", … → počet ≥ 1).
 *
 * NA ROZDÍL OD TM je HM znovupoužitelný: po naučení se NEspotřebuje a smí se
 * naučit neomezeně mnoha kompatibilním Pokémonům (jako v kánonu). Odemykání HM
 * řeší příběh (story flagy / eventy) – ten tenhle modul nesahá, jen čte, zda
 * hráč daný HM item vlastní.
 *
 * Pozn.: Fly je čistě bojový tah (dvoutahový Flying útok), NE cestování.
 */

import { getState, commit } from "../core/state.js";
import { HMS, getHm } from "../../data/hms.js";
import { canSpeciesLearnHm } from "../../data/hmCompat.js";
import { getMove } from "../../data/moves.js";
import { MAX_MOVES } from "./pokemonSystem.js";

/** Vlastní hráč daný HM? (HM se nespotřebovává, stačí ≥ 1 kus.) */
export function hmCount(num) {
  const hm = getHm(num);
  if (!hm) return 0;
  return getState().resources?.items?.[hm.itemId] ?? 0;
}

/** Vlastní hráč daný HM item? */
export function hasHm(num) {
  return hmCount(num) > 0;
}

/**
 * Přidá hráči HM item (z příběhového eventu / dev nástroje). HM se nikdy
 * nespotřebovává, takže víc než 1 kus nemá smysl – držíme count na 1.
 */
export function grantHm(num, qty = 1) {
  const hm = getHm(num);
  if (!hm || qty <= 0) return;
  const res = getState().resources;
  if (!res.items) res.items = {};
  if ((res.items[hm.itemId] ?? 0) < 1) res.items[hm.itemId] = 1;
}

/** Jedinec z kolekce podle uid (nebo null). */
function ownedByUid(uid) {
  return getState().collection.find((p) => p.uid === uid) ?? null;
}

/**
 * Smí se daný jedinec teď naučit tento HM?
 *  - hráč HM vlastní,
 *  - druh je kanonicky kompatibilní,
 *  - jedinec tah ještě neumí.
 * @returns {boolean}
 */
export function canTeachHm(uid, num) {
  const owned = ownedByUid(uid);
  if (!owned) return false;
  const hm = getHm(num);
  if (!hm) return false;
  if (!hasHm(num)) return false;
  if (!canSpeciesLearnHm(owned.speciesId, num)) return false;
  if (Array.isArray(owned.moves) && owned.moves.some((m) => m.id === hm.move)) return false;
  return true;
}

/**
 * Seznam HM, které se daný jedinec teď MŮŽE naučit (vlastněné ∩ kompatibilní ∩
 * ještě neumí). Pro nabídku v UI (dropdown na kartě Pokémona).
 * @param {string} uid
 * @returns {Array<{ num: number, move: string, name: string }>}
 */
export function learnableHmsFor(uid) {
  const owned = ownedByUid(uid);
  if (!owned) return [];
  const known = new Set((owned.moves ?? []).map((m) => m.id));
  return HMS.filter(
    (hm) =>
      hasHm(hm.num) &&
      canSpeciesLearnHm(owned.speciesId, hm.num) &&
      !known.has(hm.move)
  ).map((hm) => ({ num: hm.num, move: hm.move, name: hm.name }));
}

/**
 * Naučí jedince tah z HM. HM se NEspotřebuje (lze učit opakovaně). Když má volný
 * slot (<4 tahy), přidá; jinak je potřeba `replaceSlot` (index 0–3) k přepsání.
 * Commituje sám.
 * @param {string} uid
 * @param {number} num          číslo HM
 * @param {number|null} replaceSlot  index slotu k přepsání (0–3), nebo null
 * @returns {{ ok: boolean, replaced?: boolean, needsSlot?: boolean, reason?: string }}
 */
export function teachHm(uid, num, replaceSlot = null) {
  const owned = ownedByUid(uid);
  if (!owned) return { ok: false, reason: "no-pokemon" };
  const hm = getHm(num);
  if (!hm) return { ok: false, reason: "no-hm" };
  if (!hasHm(num)) return { ok: false, reason: "not-owned" };
  if (!canSpeciesLearnHm(owned.speciesId, num)) return { ok: false, reason: "incompatible" };
  const mv = getMove(hm.move);
  if (!mv) return { ok: false, reason: "no-move" };
  if (!Array.isArray(owned.moves)) owned.moves = [];
  if (owned.moves.some((m) => m.id === hm.move)) return { ok: false, reason: "already-known" };

  // `taught: true` = tah naučený hráčem přes HM. Auto level-up ho nikdy nepřepíše.
  const slot = { id: hm.move, pp: mv.pp, maxPp: mv.pp, taught: true };
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

  // HM se NEspotřebovává – jen commit změny tahů.
  commit();
  return { ok: true, replaced };
}
