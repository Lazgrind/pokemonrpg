/**
 * gyms.js – definice gymů (aggregator přes generace + generická logika).
 *
 * Gym = sekvence trenérů, kterou hráč prochází z „Gym" tabu na battle areně (jen
 * když je ve městě s gymem). Postup je striktně po pořadí: odemčený je vždy jen
 * další neporažený trenér; poražením posledního (leadera) hráč získá odznak.
 *
 * Zdroj trenérů je registr v data/trainers.js – tady na ně odkazujeme jen přes id.
 * `trainerOrder` = pořadí gym trenérů + NAKONEC leader. Odznak drží leader
 * (trainer.badge) i tady (gym.badge) pro pohodlí UI.
 *
 * Data jsou po generacích ve složkách data/genN/gyms.js; tady se jen sloučí
 * (v pořadí generací) a přidá logika. Gymy jsou keyed přes cityId (uzel v
 * data/areas.js), takže město určuje generaci automaticky (region-aware zdarma).
 *
 * @typedef {Object} Gym
 * @property {string} id            id gymu
 * @property {string} cityId        id města (uzel v data/areas.js), kde gym stojí
 * @property {string} name          zobrazované jméno gymu
 * @property {string} type          typ gymu (téma)
 * @property {string} badge         id odznaku, který se získá poražením leadera
 * @property {string} leaderId      id trenéra-leadera (v data/trainers.js)
 * @property {string[]} trainerOrder  id trenérů v pořadí (poslední = leader)
 * @property {string} [requiresStory]  story-flag nutný pro otevření gymu
 * @property {number} [requiresBadges] počet jiných odznaků nutný pro otevření
 */

import { GENERATIONS } from "./generations.js";
import { getTrainer } from "./trainers.js";

/** @type {Gym[]} Gymy všech aktivních generací (v pořadí generací). */
export const GYMS = GENERATIONS.flatMap((g) => g.gyms ?? []);

const GYM_BY_ID = new Map(GYMS.map((g) => [g.id, g]));
const GYM_BY_CITY = new Map(GYMS.map((g) => [g.cityId, g]));

/** Gym podle id, nebo null. */
export function getGym(id) {
  return GYM_BY_ID.get(id) ?? null;
}

/** Gym ve městě (podle cityId oblasti), nebo null. */
export function getGymForCity(cityId) {
  return GYM_BY_CITY.get(cityId) ?? null;
}

/**
 * Je gym otevřený? Většina gymů je vždy dostupná; některé (Viridian) vyžadují
 * napřed jiné odznaky (`requiresBadges`). Vlastní odznak gymu se do počtu nepočítá.
 * @param {Gym} gym
 * @param {string[]} badges  získané odznaky (state.progress.badges)
 * @returns {boolean}
 */
export function isGymOpen(gym, badges = []) {
  if (!gym) return false;
  const need = gym.requiresBadges ?? 0;
  if (need <= 0) return true;
  const owned = (badges ?? []).filter((b) => b !== gym.badge).length;
  return owned >= need;
}

/** Trenéři gymu jako objekty v pořadí (poslední = leader). */
export function gymTrainers(gym) {
  if (!gym) return [];
  return gym.trainerOrder.map((id) => getTrainer(id)).filter(Boolean);
}
