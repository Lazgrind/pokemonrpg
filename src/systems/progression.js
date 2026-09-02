/**
 * progression.js – XP a levelování (zadání sekce 6: Progression system).
 */

import { learnLevelUpMoves } from "./pokemonSystem.js";

/** Nejvyšší dosažitelný level jedince. Evoluce je dobrovolná (viz
 *  evolutionSystem) – i nevyvinutý druh může dorůst až sem. */
export const MAX_LEVEL = 100;

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
 * se z learnsetu naučí nové tahy (viz learnLevelUpMoves). Mutuje předaného jedince.
 *
 * `auto` řídí chování při PLNÝCH 4 slotech: v automatickém režimu (auto battle,
 * offline idle, Školka) se nový tah rovnou naučí přepsáním nejslabšího tahu; v
 * manuálním souboji (auto=false) se místo toho zařadí do fronty a hráč se dozeptá
 * přes vyskakovací okno (moveLearnView).
 * @param {import("../core/state.js").OwnedPokemon} pokemon
 * @param {number} amount
 * @param {{ auto?: boolean }} [opts]
 * @returns {boolean} true, pokud došlo aspoň k jednomu level-upu
 */
export function grantXp(pokemon, amount, { auto = false } = {}) {
  const prevLevel = pokemon.level;
  pokemon.xp += amount;
  let leveledUp = false;
  while (pokemon.level < MAX_LEVEL && pokemon.xp >= xpForNextLevel(pokemon.level)) {
    pokemon.xp -= xpForNextLevel(pokemon.level);
    pokemon.level += 1;
    leveledUp = true;
  }
  if (pokemon.level >= MAX_LEVEL) pokemon.xp = 0; // na max levelu už XP nesbírá
  if (leveledUp) learnLevelUpMoves(pokemon, prevLevel, { auto });
  return leveledUp;
}
