/**
 * state.js – jádro herního stavu (jeden zdroj pravdy).
 *
 * Stav je běžný JS objekt. Systémy ho čtou přes getState() a mění přes
 * commit()/setState(), což vyvolá událost STATE_CHANGED pro UI.
 *
 * @typedef {Object} OwnedPokemon
 * @property {string} uid        unikátní id konkrétního jedince
 * @property {string} speciesId  odkaz do data/pokemon.js
 * @property {number} level
 * @property {number} xp
 *
 * @typedef {Object} GameState
 * @property {number} saveVersion
 * @property {{ createdAt: number, lastSaved: number }} meta
 * @property {{ name: string }} player
 * @property {{ gold: number, pokeballs: number }} resources
 * @property {OwnedPokemon[]} collection
 * @property {string[]} team         uid jedinců v týmu (max 6)
 * @property {{ autoBattle: boolean }} settings
 */

import { bus, EVENTS } from "./events.js";

/** Aktuální verze datového modelu save. Zvyšovat při změně struktury. */
export const CURRENT_SAVE_VERSION = 1;

/** Maximální velikost aktivního týmu (zadání, sekce 9). */
export const MAX_TEAM_SIZE = 6;

/** @type {GameState | null} */
let state = null;

/**
 * Vytvoří čerstvý stav nové hry.
 * @returns {GameState}
 */
export function createNewGame() {
  const now = Date.now();
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    meta: { createdAt: now, lastSaved: now },
    player: { name: "Trenér" },
    resources: { gold: 0, pokeballs: 5 },
    collection: [],
    team: [],
    settings: { autoBattle: true },
  };
}

/**
 * Vrátí aktuální stav.
 * @returns {GameState}
 */
export function getState() {
  if (!state) throw new Error("Stav není inicializovaný (zavolej setState nejdřív).");
  return state;
}

/**
 * Nahradí celý stav a oznámí změnu.
 * @param {GameState} next
 */
export function setState(next) {
  state = next;
  bus.emit(EVENTS.STATE_CHANGED, state);
}

/**
 * Oznámí, že se stav změnil (po přímé mutaci přes getState()).
 * Používat, když jsme upravili existující objekt bez setState().
 */
export function commit() {
  bus.emit(EVENTS.STATE_CHANGED, state);
}
