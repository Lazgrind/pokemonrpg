/**
 * DATA: oblasti světa. Zatím jen ukázková první oblast (Krok 0).
 * V dalších krocích sem přibudou další oblasti bez zásahu do logiky.
 *
 * @typedef {Object} Area
 * @property {string} id
 * @property {string} name
 * @property {string} region
 * @property {number} recommendedLevel
 * @property {string} description
 */

/** @type {Area[]} */
export const AREAS = [
  {
    id: "route-01",
    name: "Route 1",
    region: "Kanto",
    recommendedLevel: 1,
    description: "Klidná travnatá cesta hned za městem. Ideální pro první výpravu.",
  },
];
