/**
 * team.js – správa kolekce a aktivního týmu (max 6, zadání sekce 9).
 *
 * Kolekce = všichni vlastnění Pokémoni. Tým = pole uid odkazujících do kolekce.
 * Každá změna volá commit(), aby se aktualizovalo UI.
 */

import { getState, commit, MAX_TEAM_SIZE } from "../core/state.js";
import { createPokemon } from "./pokemonSystem.js";

/** Druhy, které lze potkat "ve volné přírodě" (Krok 2, ukázka získávání). */
const WILD_POOL = ["pidgey", "rattata"];

/**
 * Výběr startovního Pokémona – jen dokud je kolekce prázdná.
 * @param {string} speciesId
 * @returns {boolean}
 */
export function chooseStarter(speciesId) {
  const s = getState();
  if (s.collection.length > 0) return false;
  const p = createPokemon(speciesId, 5);
  s.collection.push(p);
  s.team.push(p.uid);
  commit();
  return true;
}

/**
 * Chytí náhodného divokého Pokémona za 1 Poké Ball.
 * @returns {{ ok: boolean, reason?: string, pokemon?: import("../core/state.js").OwnedPokemon }}
 */
export function catchWild() {
  const s = getState();
  if (s.resources.pokeballs <= 0) return { ok: false, reason: "Došly Poké Balls" };
  s.resources.pokeballs--;
  const speciesId = WILD_POOL[Math.floor(Math.random() * WILD_POOL.length)];
  const level = 2 + Math.floor(Math.random() * 3); // 2–4
  const pokemon = createPokemon(speciesId, level);
  s.collection.push(pokemon);
  commit();
  return { ok: true, pokemon };
}

/**
 * Přidá jedince z kolekce do týmu.
 * @param {string} uid
 * @returns {boolean}
 */
export function addToTeam(uid) {
  const s = getState();
  if (s.team.includes(uid)) return false;
  if (s.team.length >= MAX_TEAM_SIZE) return false;
  if (!s.collection.some((p) => p.uid === uid)) return false;
  s.team.push(uid);
  commit();
  return true;
}

/**
 * Odebere jedince z týmu (zůstává v kolekci).
 * @param {string} uid
 * @returns {boolean}
 */
export function removeFromTeam(uid) {
  const s = getState();
  const i = s.team.indexOf(uid);
  if (i === -1) return false;
  s.team.splice(i, 1);
  commit();
  return true;
}

/**
 * Posune jedince v týmu doleva (-1) nebo doprava (+1).
 * @param {string} uid
 * @param {number} dir
 * @returns {boolean}
 */
export function moveInTeam(uid, dir) {
  const s = getState();
  const i = s.team.indexOf(uid);
  if (i === -1) return false;
  const j = i + dir;
  if (j < 0 || j >= s.team.length) return false;
  [s.team[i], s.team[j]] = [s.team[j], s.team[i]];
  commit();
  return true;
}

/**
 * Vrátí jedince aktivního týmu ve správném pořadí.
 * @returns {import("../core/state.js").OwnedPokemon[]}
 */
export function getTeamPokemon() {
  const s = getState();
  return s.team
    .map((uid) => s.collection.find((p) => p.uid === uid))
    .filter(Boolean);
}

/** Je daný jedinec v týmu? */
export function isInTeam(uid) {
  return getState().team.includes(uid);
}
