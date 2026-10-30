/**
 * DATA: learnsety – které tahy se který druh učí a na jakém levelu.
 * Čistá data (jako data/moves.js / data/pokemon.js), žádná logika.
 * Druhy řadit podle Dex ID (logicky za sebou).
 *
 * Model: **level-up learnset**. Každý druh má seřazený seznam `{ level, move }`.
 * Jedinec „zná" tahy, které by se do svého levelu naučil – bereme **poslední ≤4**
 * (nejnovější). `move` je id z data/moves.js (viz getMove()).
 *
 * Learnsety jsou PO REGIONECH podle původních her (rozhodnutí autora 2026-10-20):
 * Kanto = Yellow (jen útoky z Gen 1), Johto = Crystal (Gen 1 + Gen 2, pro všech 251
 * druhů). Který learnset jedinec používá, řídí region, kde byl chycen (`region`
 * parametr helperů níž). Data generuje tools/convert_classic_learnsets.py.
 *
 * @typedef {Object} LearnsetEntry
 * @property {number} level  level, na kterém se tah naučí
 * @property {string} move   id tahu (data/moves.js)
 */

import { GENERATIONS } from "./generations.js";

/**
 * Level-up learnsety po regionech (slug regionu → mapa speciesId → tahy). Data jsou
 * po generacích ve složkách data/genN/learnsets.js.
 * @type {Record<string, Record<string, LearnsetEntry[]>>}
 */
export const LEARNSETS_BY_REGION = Object.fromEntries(GENERATIONS.map((g) => [g.region, g.learnsets]));


/**
 * Vrátí learnset druhu pro region chycení (nebo prázdné pole). Když region druh
 * nemá (nebo region není zadaný / aktivní), vezme se první generace, která ho má
 * (Gen 1 druh → Kanto, Gen 2 druh → Johto).
 * @param {string} speciesId
 * @param {string} [region]  slug regionu chycení ("kanto" | "johto")
 * @returns {LearnsetEntry[]}
 */
export function getLearnset(speciesId, region) {
  const own = region ? LEARNSETS_BY_REGION[region]?.[speciesId] : null;
  if (own) return own;
  for (const g of GENERATIONS) if (g.learnsets?.[speciesId]) return g.learnsets[speciesId];
  return [];
}

/**
 * Tahy, které jedinec daného druhu zná na daném levelu.
 * Vezme všechny naučené (level ≤ daný level) a vrátí **poslední ≤4** id tahů
 * (nejnovější naučené), bez duplikátů, v pořadí učení.
 * @param {string} speciesId
 * @param {number} level
 * @param {string} [region]  region chycení (viz getLearnset)
 * @returns {string[]} pole move id (0–4)
 */
export function movesAtLevel(speciesId, level, region) {
  return levelUpOrder(speciesId, level, region).slice(-4);
}

/**
 * Tahy, které se druh do daného levelu naučí, v POŘADÍ UČENÍ (nejnovější na konci),
 * bez duplikátů. Z toho se skládá výchozí sada jedince (poslední tahy = nejnovější).
 *  - Evoluční tah (level 0 = „při evoluci") se řadí až za tahy z Lv 1 – jinak by ho
 *    Lv 1 tahy hned vytlačily (Butterfree by místo Gust znal Bug Bite).
 *  - Duplikát (tah z Lv 1 učený znovu na Lv 9) se řadí podle POSLEDNÍHO výskytu.
 * Move Tutor a vejce používají learnableMovesAtLevel (tam rozhoduje první výskyt).
 * @param {string} speciesId
 * @param {number} level
 * @param {string} [region]  region chycení (viz getLearnset)
 * @returns {string[]} move id
 */
export function levelUpOrder(speciesId, level, region) {
  const order = (e) => (e.level === 0 ? 1.5 : e.level);
  const learned = getLearnset(speciesId, region)
    .filter((e) => e.level <= level)
    .map((e, i) => ({ move: e.move, key: order(e), i }))
    .sort((a, b) => a.key - b.key || a.i - b.i);
  const unique = [];
  for (let i = learned.length - 1; i >= 0; i--) {
    if (!unique.includes(learned[i].move)) unique.unshift(learned[i].move);
  }
  return unique;
}

/**
 * VŠECHNY tahy, které se druh do daného levelu učí level-upem (ne jen poslední 4).
 * Slouží Move Tutoru: hráč si z tohoto seznamu smí libovolně poskládat aktivní
 * sadu (i přeučit tahy „zapomenuté" při level-upu, i doučit tahy nové formy po
 * evoluci – evolvovaný druh má v learnsetu i své nízkoúrovňové tahy).
 * @param {string} speciesId
 * @param {number} level
 * @param {string} [region]  region chycení (viz getLearnset)
 * @returns {Array<{ id: string, level: number }>}  seřazené dle levelu, bez duplikátů
 */
export function learnableMovesAtLevel(speciesId, level, region) {
  const seen = new Set();
  const out = [];
  for (const e of getLearnset(speciesId, region).filter((x) => x.level <= level).sort((a, b) => a.level - b.level)) {
    if (seen.has(e.move)) continue;
    seen.add(e.move);
    out.push({ id: e.move, level: e.level });
  }
  return out;
}
