/**
 * daycare.js – Školka (Day Care): pasivní výcvik Pokémona.
 *
 * Pokémon vložený do Školky získává XP i bez soubojů – při běžící hře (tikání)
 * i offline (dopočet po návratu). Na rozdíl od bojového idle NENÍ školka
 * násobena OFFLINE_EFFICIENCY: pasivní výcvik je celý smysl budovy, jen je
 * pomalý a týká se jednoho Pokémona bez goldu/lootu. Offline strop = jako u
 * soubojů (OFFLINE_CAP_HOURS).
 *
 * Zlomkové XP držíme v `city.daycare.buffer`, aby se nic neztrácelo.
 */

import { commit } from "../core/state.js";
import { grantXp } from "./progression.js";
import { getSpecies } from "../../data/pokemon.js";
import {
  getDaycareSlot,
  getDaycareOccupant,
  daycareXpPerMinute,
} from "./buildingSystem.js";
import { OFFLINE_CAP_HOURS } from "./idle.js";

/** Jak často aktivní smyčka připisuje XP (s). */
const DAYCARE_TICK_SEC = 15;

let timer = null;

/**
 * Připíše svěřenci XP za daný počet sekund výcviku. Mutuje stav (bez commitu).
 * @param {number} seconds
 * @returns {{ xp: number, name?: string, fromLevel?: number, toLevel?: number }}
 */
function accrue(seconds) {
  const slot = getDaycareSlot();
  if (!slot.uid) return { xp: 0 };
  const owned = getDaycareOccupant();
  if (!owned) {
    // Svěřenec už v kolekci není (nemělo by nastat) – uvolni slot.
    slot.uid = null;
    slot.buffer = 0;
    return { xp: 0 };
  }

  const perSec = daycareXpPerMinute() / 60;
  slot.buffer = (slot.buffer ?? 0) + perSec * seconds;
  const whole = Math.floor(slot.buffer);
  if (whole <= 0) return { xp: 0 };

  slot.buffer -= whole;
  const fromLevel = owned.level;
  grantXp(owned, whole);
  return {
    xp: whole,
    name: getSpecies(owned.speciesId)?.name ?? owned.speciesId,
    fromLevel,
    toLevel: owned.level,
  };
}

/** Spustí aktivní smyčku školky (idempotentní). */
export function startDaycareLoop() {
  stopDaycareLoop();
  timer = setInterval(() => {
    const r = accrue(DAYCARE_TICK_SEC);
    if (r.xp > 0) commit();
  }, DAYCARE_TICK_SEC * 1000);
}

/** Zastaví aktivní smyčku školky. */
export function stopDaycareLoop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

/**
 * Dopočítá offline výcvik po návratu. Vrací přehled, nebo null (nic).
 * @param {number} elapsedMs
 * @returns {null | { xp: number, name: string, fromLevel: number, toLevel: number }}
 */
export function applyDaycareOffline(elapsedMs) {
  const slot = getDaycareSlot();
  if (!slot.uid || !getDaycareOccupant()) return null;

  const usableSec = Math.min(Math.floor(elapsedMs / 1000), OFFLINE_CAP_HOURS * 3600);
  if (usableSec <= 0) return null;

  const r = accrue(usableSec);
  if (r.xp <= 0) return null;
  commit();
  return /** @type {any} */ (r);
}
