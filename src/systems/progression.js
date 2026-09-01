/**
 * progression.js – XP a levelování (zadání sekce 6: Progression system).
 */

import { learnLevelUpMoves } from "./pokemonSystem.js";

/**
 * Kolik XP je potřeba k postupu z daného levelu na další.
 * @param {number} level
 * @returns {number}
 */
export function xpForNextLevel(level) {
  return level * level * 10;
}

/**
 * Přidá jedinci XP a případně ho zleveluje (i vícekrát najednou). Při level-upu
 * se z learnsetu automaticky naučí nové tahy do volných slotů (viz
 * learnLevelUpMoves). Mutuje předaného jedince.
 * @param {import("../core/state.js").OwnedPokemon} pokemon
 * @param {number} amount
 * @returns {boolean} true, pokud došlo aspoň k jednomu level-upu
 */
export function grantXp(pokemon, amount) {
  const prevLevel = pokemon.level;
  pokemon.xp += amount;
  let leveledUp = false;
  while (pokemon.xp >= xpForNextLevel(pokemon.level)) {
    pokemon.xp -= xpForNextLevel(pokemon.level);
    pokemon.level += 1;
    leveledUp = true;
  }
  if (leveledUp) learnLevelUpMoves(pokemon, prevLevel);
  return leveledUp;
}
