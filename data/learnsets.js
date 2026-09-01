/**
 * DATA: learnsety – které tahy se který druh učí a na jakém levelu.
 * Čistá data (jako data/moves.js / data/pokemon.js), žádná logika.
 *
 * Model (schváleno 2026-09-01): **level-up learnset**.
 *  - Každý druh má seřazený seznam `{ level, move }` (level = kdy se tah naučí).
 *  - Jedinec „zná" tahy, které by se do svého levelu naučil – bereme
 *    **poslední ≤4** (nejnovější). Přiřazení řeší createPokemon (krok 3).
 *  - `move` je id z data/moves.js (viz getMove()).
 *
 * Nový druh / tah = jen doplnit sem. Ditto má zatím jen bojovou zálohu
 * (Tackle); Transform se bude řešit samostatně jindy.
 *
 * @typedef {Object} LearnsetEntry
 * @property {number} level  level, na kterém se tah naučí
 * @property {string} move   id tahu (data/moves.js)
 */

/** @type {Record<string, LearnsetEntry[]>} */
export const LEARNSETS = {
  bulbasaur: [
    { level: 1, move: "tackle" },
    { level: 3, move: "vine-whip" },
    { level: 6, move: "poison-sting" },
  ],
  charmander: [
    { level: 1, move: "scratch" },
    { level: 4, move: "ember" },
  ],
  squirtle: [
    { level: 1, move: "tackle" },
    { level: 3, move: "water-gun" },
  ],
  pidgey: [
    { level: 1, move: "tackle" },
    { level: 5, move: "gust" },
    { level: 8, move: "quick-attack" },
    { level: 11, move: "body-slam" },
  ],
  rattata: [
    { level: 1, move: "tackle" },
    { level: 4, move: "quick-attack" },
    { level: 7, move: "scratch" },
    { level: 9, move: "body-slam" },
  ],
  ditto: [
    { level: 1, move: "tackle" },
  ],
};

/**
 * Vrátí learnset druhu (nebo prázdné pole).
 * @param {string} speciesId
 * @returns {LearnsetEntry[]}
 */
export function getLearnset(speciesId) {
  return LEARNSETS[speciesId] ?? [];
}

/**
 * Tahy, které jedinec daného druhu zná na daném levelu.
 * Vezme všechny naučené (level ≤ daný level) a vrátí **poslední ≤4** id tahů
 * (nejnovější naučené), bez duplikátů, v pořadí učení.
 * @param {string} speciesId
 * @param {number} level
 * @returns {string[]} pole move id (0–4)
 */
export function movesAtLevel(speciesId, level) {
  const learned = getLearnset(speciesId)
    .filter((e) => e.level <= level)
    .sort((a, b) => a.level - b.level)
    .map((e) => e.move);
  // bez duplikátů, zachovat pořadí
  const unique = [...new Set(learned)];
  return unique.slice(-4);
}
