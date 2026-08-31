/**
 * DATA: oblasti světa. Zatím jen ukázková první oblast (Krok 0).
 * V dalších krocích sem přibudou další oblasti bez zásahu do logiky.
 *
 * @typedef {Object} Drop
 * @property {string} resource  klíč do state.resources (např. "pokeballs")
 * @property {number} chance    pravděpodobnost dropu za jednoho poraženého (0–1)
 * @property {number} amount    kolik se přičte při dropu
 *
 * @typedef {Object} Area
 * @property {string} id
 * @property {string} name
 * @property {string} region
 * @property {number} recommendedLevel
 * @property {string} description
 * @property {Drop[]} drops     loot tabulka oblasti (zadání, sekce 6)
 */

/** @type {Area[]} */
export const AREAS = [
  {
    id: "route-01",
    name: "Route 1",
    region: "Kanto",
    recommendedLevel: 1,
    description: "Klidná travnatá cesta hned za městem. Ideální pro první výpravu.",
    drops: [{ resource: "pokeballs", chance: 0.12, amount: 1 }],
  },
];
