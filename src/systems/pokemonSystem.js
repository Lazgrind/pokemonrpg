/**
 * pokemonSystem.js – vytváření konkrétních jedinců Pokémonů (instancí).
 *
 * Druhy (species) jsou data (data/pokemon.js). Zde z nich vyrábíme
 * konkrétní jedince s vlastním uid, levelem a XP.
 */

import { getSpecies } from "../../data/pokemon.js";

let counter = 0;

/** Vygeneruje rozumně unikátní uid pro jedince. */
function makeUid(speciesId) {
  return `${speciesId}-${Date.now().toString(36)}-${(counter++).toString(36)}`;
}

/**
 * Vytvoří nového jedince daného druhu.
 * @param {string} speciesId
 * @param {number} [level=5]
 * @returns {import("../core/state.js").OwnedPokemon}
 */
export function createPokemon(speciesId, level = 5) {
  const species = getSpecies(speciesId);
  if (!species) throw new Error(`Neznámý druh Pokémona: ${speciesId}`);
  return {
    uid: makeUid(speciesId),
    speciesId,
    level,
    xp: 0,
  };
}
