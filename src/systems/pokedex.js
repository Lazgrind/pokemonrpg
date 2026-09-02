/**
 * pokedex.js – stav a dotazy Pokédexu.
 *
 * Model (viz BACKLOG R-026):
 *  - „caught" (chyceno) se ODVOZUJE z kolekce (vlastníš druh → chyceno). Díky
 *    R-018 (1 kus/druh) je kolekce de facto Pokédex chycených.
 *  - „seen" (viděno) je nové perzistentní pole `state.pokedex.seen` – druhy
 *    potkané v souboji, které ještě nemáš.
 *  - „unseen" = ani viděno, ani chyceno.
 */

import { getState, commit } from "../core/state.js";
import { POKEMON_SPECIES, STARTER_IDS, getSpecies } from "../../data/pokemon.js";
import { AREAS } from "../../data/areas.js";

/** Pokédex stav se seznamem viděných druhů (lazy default). */
export function getPokedex() {
  const s = getState();
  if (!s.pokedex || typeof s.pokedex !== "object") s.pokedex = { seen: [] };
  if (!Array.isArray(s.pokedex.seen)) s.pokedex.seen = [];
  return s.pokedex;
}

/**
 * Označí druh jako viděný (potkán v souboji). Chycené druhy se neřeší tady –
 * ty se poznají z kolekce. Vrátí true, když šlo o nově viděný druh.
 * @param {string} speciesId
 */
export function markSeen(speciesId) {
  if (!speciesId) return false;
  const dex = getPokedex();
  if (dex.seen.includes(speciesId)) return false;
  dex.seen.push(speciesId);
  commit();
  return true;
}

/**
 * Zajistí, že všichni startéři jsou v Pokédexu vedení jako „viděno" – hráč je
 * reálně vidí na výběrové obrazovce. Commit jen když se něco změnilo. Vrací true,
 * pokud přibyl aspoň jeden.
 */
export function ensureStartersSeen() {
  const dex = getPokedex();
  let changed = false;
  for (const id of STARTER_IDS) {
    // Guard: přeskočit id, pro která neexistuje druh
    if (!getSpecies(id)) continue;
    if (!dex.seen.includes(id)) {
      dex.seen.push(id);
      changed = true;
    }
  }
  if (changed) commit();
  return changed;
}

/** Máš daný druh chycený? (odvozeno z kolekce) */
export function isCaught(speciesId) {
  return getState().collection.some((p) => p.speciesId === speciesId);
}

/**
 * Stav druhu v Pokédexu.
 * @param {string} speciesId
 * @returns {"caught"|"seen"|"unseen"}
 */
export function dexStatus(speciesId) {
  if (isCaught(speciesId)) return "caught";
  if (getPokedex().seen.includes(speciesId)) return "seen";
  return "unseen";
}

/**
 * Počty pro ukazatel „chyceno X / z Y". Y = počet druhů ve hře v daný okamžik.
 * @returns {{ caught: number, total: number }}
 */
export function dexCounts() {
  const caught = new Set(getState().collection.map((p) => p.speciesId)).size;
  return { caught, total: POKEMON_SPECIES.length };
}

/**
 * Oblasti, kde se druh vyskytuje (podle area.species). Slouží detailu druhu
 * v kartě/Pokédexu – „kde ho chytit" (ukázat jen když už je objeven).
 * @param {string} speciesId
 * @returns {import("../../data/areas.js").Area[]}
 */
export function areasForSpecies(speciesId) {
  return AREAS.filter((a) => (a.species ?? []).includes(speciesId));
}
