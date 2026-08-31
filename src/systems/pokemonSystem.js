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

/**
 * Spočítá aktuální bojové staty jedince z base statů druhu a levelu.
 * (Zjednodušený vzorec inspirovaný Pokémon hrami.)
 * @param {import("../core/state.js").OwnedPokemon} pokemon
 * @returns {{ maxHp:number, attack:number, defense:number, spAttack:number, spDefense:number, speed:number }}
 */
export function computeStats(pokemon) {
  const species = getSpecies(pokemon.speciesId);
  if (!species) throw new Error(`Neznámý druh Pokémona: ${pokemon.speciesId}`);
  const b = species.baseStats;
  const lvl = pokemon.level;
  const stat = (base) => Math.floor((2 * base * lvl) / 100) + 5;
  return {
    maxHp: Math.floor((2 * b.hp * lvl) / 100) + lvl + 10,
    attack: stat(b.attack),
    defense: stat(b.defense),
    spAttack: stat(b.spAttack),
    spDefense: stat(b.spDefense),
    speed: stat(b.speed),
  };
}
