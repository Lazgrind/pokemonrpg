/**
 * state.js – jádro herního stavu (jeden zdroj pravdy).
 *
 * Stav je běžný JS objekt. Systémy ho čtou přes getState() a mění přes
 * commit()/setState(), což vyvolá událost STATE_CHANGED pro UI.
 *
 * @typedef {Object} MoveSlot
 * @property {string} id     id tahu (data/moves.js)
 * @property {number} pp     aktuální PP (počet zbývajících použití)
 * @property {number} maxPp  maximální PP tohoto slotu (základ z tahu; budoucí PP Up ho zvýší)
 *
 * @typedef {Object} StatSpread
 * @property {number} hp
 * @property {number} attack
 * @property {number} defense
 * @property {number} spAttack
 * @property {number} spDefense
 * @property {number} speed
 *
 * @typedef {Object} OwnedPokemon
 * @property {string} uid        unikátní id konkrétního jedince
 * @property {string} speciesId  odkaz do data/pokemon.js
 * @property {number} level
 * @property {number} xp
 * @property {number} hp         aktuální HP jedince (trvalé; 0 = vyřazený, léčí se v Poké Centru)
 * @property {MoveSlot[]} moves  naučené tahy (max 4), z learnsetu; PP se spotřebovává v boji
 * @property {StatSpread} ivs    Individual Values (0–31 na stat), pevné při vzniku
 * @property {StatSpread} evs    Effort Values (0–252 na stat, max 510), z tréninku
 * @property {boolean} shiny     vzácná barevná varianta (kosmetika)
 * @property {string|null} caughtBall  id Poké Ballu, ve kterém byl chycen
 *                                     (null = dar/vylíhnutý – žádný ball)
 * @property {"m"|"f"|"genderless"} gender  pohlaví jedince (dle genderRatio druhu)
 *
 * @typedef {Object} GameState
 * @property {number} saveVersion
 * @property {{ createdAt: number, lastSaved: number }} meta
 * @property {{ name: string }} player
 * @property {{ gold: number, balls: Record<string, number> }} resources  balls: id typu → počet
 * @property {OwnedPokemon[]} collection
 * @property {string[]} team         uid jedinců v týmu (max 6)
 * @property {Array<{ id: string, speciesId: string }>} eggs  nalezená vejce (líhnou se ve Školce)
 * @property {{ tier: number }} progress  postup světem (odemyká typy ballů apod.)
 * @property {Array<{ uid: string, moveId: string }>} moveLearnQueue  čekající nabídky naučení tahu
 *                                     (jedinec chce nový tah, ale má plné 4 sloty → hráč volí nahrazení)
 * @property {{ seen: string[] }} pokedex  druhy potkané v souboji (chycené se odvozují z kolekce)
 * @property {{ autoBattle: boolean, speed: number, autocatch: AutocatchSettings, selectedBall: string }} settings
 *
 * @typedef {Object} AutocatchSettings
 * @property {boolean} enabled      chytat automaticky během souboje
 * @property {"all"|"shiny"} mode   které chytat: všechny, nebo jen shiny
 * @property {{ buildings: Record<string, { level: number }>, daycare?: { uid: string|null, buffer: number, eggs?: Array<{ id: string, elapsedSec: number }>, breeding?: { a: string|null, b: string|null, buffer: number } } }} city  budovy města + sloty školky (výcvik + inkubace vajec + breeding)
 */

import { bus, EVENTS } from "./events.js";

/** Aktuální verze datového modelu save. Zvyšovat při změně struktury. */
export const CURRENT_SAVE_VERSION = 14;

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
    player: { name: "Trainer" },
    resources: { gold: 0, balls: { poke: 5 } },
    collection: [],
    team: [],
    eggs: [], // nalezená vejce; líhnou se ve Školce (viz eggSystem)
    progress: { tier: 1 },
    moveLearnQueue: [], // čekající nabídky naučení tahu při plných slotech (viz pokemonSystem)
    pokedex: { seen: [] }, // druhy potkané v souboji (viz pokedex.js)
    settings: {
      autoBattle: false, // výchozí je normální (manuální) souboj
      speed: 1, // herní rychlost (1/2/4) – globální, ovládá se v horní liště
      selectedBall: "poke",
      autocatch: { enabled: false, mode: "all" }, // mode: "all" | "shiny"
    },
    battle: null, // uložený běhový stav souboje (viz battleSystem.serialize)
    city: { buildings: {} }, // úrovně budov (viz buildingSystem)
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
