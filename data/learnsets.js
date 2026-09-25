/**
 * DATA: learnsety – které tahy se který druh učí a na jakém levelu.
 * Čistá data (jako data/moves.js / data/pokemon.js), žádná logika.
 * Druhy řadit podle Dex ID (logicky za sebou).
 *
 * Model: **level-up learnset**. Každý druh má seřazený seznam `{ level, move }`.
 * Jedinec „zná" tahy, které by se do svého levelu naučil – bereme **poslední ≤4**
 * (nejnovější). `move` je id z data/moves.js (viz getMove()).
 *
 * ⚠️ Learnsety jsou KOMPLETNÍ (level-up movepool druhu) včetně tahů, jejichž efekt
 * engine zatím neumí – jsou „připravené". Ditto má Transform (zatím bez efektu) +
 * Tackle jako bojovou zálohu.
 *
 * @typedef {Object} LearnsetEntry
 * @property {number} level  level, na kterém se tah naučí
 * @property {string} move   id tahu (data/moves.js)
 */

import { GENERATIONS } from "./generations.js";

/**
 * Level-up learnsety všech aktivních generací (mapa speciesId → tahy). Data jsou
 * po generacích ve složkách data/genN/learnsets.js; tady se jen sloučí.
 * @type {Record<string, LearnsetEntry[]>}
 */
export const LEARNSETS = Object.assign({}, ...GENERATIONS.map((g) => g.learnsets));


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

/**
 * VŠECHNY tahy, které se druh do daného levelu učí level-upem (ne jen poslední 4).
 * Slouží Move Tutoru: hráč si z tohoto seznamu smí libovolně poskládat aktivní
 * sadu (i přeučit tahy „zapomenuté" při level-upu, i doučit tahy nové formy po
 * evoluci – evolvovaný druh má v learnsetu i své nízkoúrovňové tahy).
 * @param {string} speciesId
 * @param {number} level
 * @returns {Array<{ id: string, level: number }>}  seřazené dle levelu, bez duplikátů
 */
export function learnableMovesAtLevel(speciesId, level) {
  const seen = new Set();
  const out = [];
  for (const e of getLearnset(speciesId).filter((x) => x.level <= level).sort((a, b) => a.level - b.level)) {
    if (seen.has(e.move)) continue;
    seen.add(e.move);
    out.push({ id: e.move, level: e.level });
  }
  return out;
}
