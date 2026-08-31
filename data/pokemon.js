/**
 * DATA: definice druhů Pokémonů (species). Čistá data, žádná logika.
 * Nové druhy = jen přidat další objekt, bez zásahu do systémů.
 *
 * @typedef {Object} BaseStats
 * @property {number} hp
 * @property {number} attack
 * @property {number} defense
 * @property {number} spAttack
 * @property {number} spDefense
 * @property {number} speed
 *
 * @typedef {Object} Species
 * @property {string} id            unikátní klíč (malými písmeny)
 * @property {number} dexNo         číslo v Pokédexu
 * @property {string} name          zobrazované jméno
 * @property {string[]} types       jeden nebo dva typy
 * @property {BaseStats} baseStats  základní staty druhu
 */

/** @type {Species[]} */
export const POKEMON_SPECIES = [
  {
    id: "bulbasaur",
    dexNo: 1,
    name: "Bulbasaur",
    types: ["Grass", "Poison"],
    baseStats: { hp: 45, attack: 49, defense: 49, spAttack: 65, spDefense: 65, speed: 45 },
  },
  {
    id: "charmander",
    dexNo: 4,
    name: "Charmander",
    types: ["Fire"],
    baseStats: { hp: 39, attack: 52, defense: 43, spAttack: 60, spDefense: 50, speed: 65 },
  },
  {
    id: "squirtle",
    dexNo: 7,
    name: "Squirtle",
    types: ["Water"],
    baseStats: { hp: 44, attack: 48, defense: 65, spAttack: 50, spDefense: 64, speed: 43 },
  },
  {
    id: "pidgey",
    dexNo: 16,
    name: "Pidgey",
    types: ["Normal", "Flying"],
    baseStats: { hp: 40, attack: 45, defense: 40, spAttack: 35, spDefense: 35, speed: 56 },
  },
  {
    id: "rattata",
    dexNo: 19,
    name: "Rattata",
    types: ["Normal"],
    baseStats: { hp: 30, attack: 56, defense: 35, spAttack: 25, spDefense: 35, speed: 72 },
  },
];

/** Rychlé vyhledání druhu podle id. */
const SPECIES_BY_ID = new Map(POKEMON_SPECIES.map((s) => [s.id, s]));

/**
 * Vrátí definici druhu podle id (nebo undefined).
 * @param {string} id
 * @returns {Species | undefined}
 */
export function getSpecies(id) {
  return SPECIES_BY_ID.get(id);
}
