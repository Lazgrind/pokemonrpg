/**
 * DATA: bojová pravidla podle generace – souboj v Kantu hraje podle Gen 1
 * (Red/Blue/Yellow), v Johtu podle Gen 2 (Gold/Silver/Crystal). Generaci určuje
 * region souboje (viz battleSystem `rules()`).
 *
 * Jen čísla a přepínače, které se mezi generacemi liší; všechno ostatní je
 * společné. Nová generace = nový záznam (chybějící číslo → poslední známá).
 *
 * @typedef {Object} BattleRules
 * @property {"speed"|"stages"} crit  "speed" = šance z base Speed (Gen 1),
 *           "stages" = tabulka podle crit stupně
 * @property {number[]} [critTable]      šance podle crit stupně (0, 1, 2…)
 * @property {number} [highCritStages]   o kolik stupňů zvedne tah s vysokou šancí na krit
 * @property {number} [focusEnergyStages] o kolik stupňů zvedne Focus Energy
 * @property {number|"level"} critMult   násobek kritu; "level" = (2L+5)/(L+5) jako v Gen 1
 * @property {[number, number]} sleepTurns  rozsah kol spánku (bez kola probuzení)
 * @property {boolean} sleepWakeTurnLost  v kole probuzení ještě nejedná
 * @property {number} burnFrac     poškození popáleninou za kolo (zlomek max HP)
 * @property {number} poisonFrac   poškození jedem za kolo (Toxic roste po 1/16 zvlášť)
 * @property {boolean} trapImmobilizes  Wrap/Bind… soupeř se nemůže hýbat (Gen 1),
 *           jinak jen poškozuje každé kolo
 * @property {number} trapFrac     poškození svíráním za kolo (když neimobilizuje)
 * @property {number[]} multiHitOdds  šance na 2, 3, 4, 5 zásahů (Fury Attack…; i délka Wrap)
 * @property {boolean} multiHitSameDamage  všechny zásahy stejně silné (Gen 1)
 * @property {boolean} hyperBeamKoNoRecharge  Hyper Beam po vyřazení soupeře nedobíjí
 * @property {string[]|null} counterTypes  Counter vrací jen tyto typy útoků (null = fyzické)
 * @property {number} spikesMaxLayers
 * @property {string[]} metronomeExcludes  útoky, které Metronome nikdy nevybere
 */

/** @type {Record<number, BattleRules>} */
export const BATTLE_RULES = {
  1: {
    crit: "speed",
    critMult: "level",
    sleepTurns: [1, 7],
    sleepWakeTurnLost: true,
    burnFrac: 1 / 16,
    poisonFrac: 1 / 16,
    trapImmobilizes: true,
    trapFrac: 0,
    multiHitOdds: [3 / 8, 3 / 8, 1 / 8, 1 / 8],
    multiHitSameDamage: true,
    hyperBeamKoNoRecharge: true,
    counterTypes: ["Normal", "Fighting"],
    spikesMaxLayers: 1,
    metronomeExcludes: ["metronome", "struggle"],
  },
  2: {
    crit: "stages",
    critTable: [17 / 256, 32 / 256, 64 / 256, 85 / 256, 128 / 256],
    highCritStages: 2,
    focusEnergyStages: 1,
    critMult: 2,
    sleepTurns: [1, 6],
    sleepWakeTurnLost: false,
    burnFrac: 1 / 8,
    poisonFrac: 1 / 8,
    trapImmobilizes: false,
    trapFrac: 1 / 16,
    multiHitOdds: [3 / 8, 3 / 8, 1 / 8, 1 / 8],
    multiHitSameDamage: false,
    hyperBeamKoNoRecharge: false,
    counterTypes: null,
    spikesMaxLayers: 1,
    metronomeExcludes: [
      "counter", "destiny-bond", "detect", "endure", "metronome", "mimic",
      "mirror-coat", "protect", "sketch", "sleep-talk", "struggle", "thief",
    ],
  },
};

/** Pravidla generace `gen` (neznámá → poslední definovaná). */
export function battleRulesFor(gen) {
  if (BATTLE_RULES[gen]) return BATTLE_RULES[gen];
  const known = Object.keys(BATTLE_RULES).map(Number).sort((a, b) => a - b);
  return BATTLE_RULES[known[known.length - 1]];
}
