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
 * @typedef {"common"|"uncommon"|"rare"|"epic"|"legendary"} Rarity
 *
 * Poměr pohlaví: buď podíly samec/samice (součet 1), nebo "genderless" pro druhy
 * bez pohlaví (Ditto, legendární…). Používá se na kartě/Pokédexu a v budoucnu
 * pro pohlaví jedince při vzniku.
 * @typedef {{ m: number, f: number } | "genderless"} GenderRatio
 *
 * @typedef {Object} Species
 * @property {string} id            unikátní klíč (malými písmeny) = slug jména;
 *                                  určuje i složku spritů (assets/pokemon/<id>/)
 * @property {number} dexNo         číslo v Pokédexu
 * @property {string} name          zobrazované jméno
 * @property {number} gen           generace, ve které byl druh PŘEDSTAVEN
 *                                  (1 = Kanto) – jeho identita, vždy jedna
 *                                  hodnota. Slouží k organizaci a filtru map.
 *                                  Kde se druh dá chytit, řídí `area.species`
 *                                  (druh může být ve víc oblastech, pořád jeden
 *                                  záznam). NEovlivňuje cestu ke spritu.
 * @property {string[]} types       jeden nebo dva typy
 * @property {BaseStats} baseStats  základní staty druhu
 * @property {GenderRatio} genderRatio  poměr pohlaví (nebo "genderless")
 * @property {string[]} eggGroups   egg groups (kebab-case) pro breeding; sdílená
 *                                  skupina = kompatibilní pár. "no-eggs" = nelze.
 * @property {Rarity} rarity        vzácnost druhu; řídí šanci na drop vajíčka
 *                                  a dobu líhnutí (přes tabulku v systému).
 */

/** @type {Species[]} */
export const POKEMON_SPECIES = [
  {
    id: "bulbasaur",
    dexNo: 1,
    name: "Bulbasaur",
    gen: 1,
    types: ["Grass", "Poison"],
    baseStats: { hp: 45, attack: 49, defense: 49, spAttack: 65, spDefense: 65, speed: 45 },
    genderRatio: { m: 0.875, f: 0.125 },
    eggGroups: ["monster", "grass"],
    rarity: "uncommon",
  },
  {
    id: "charmander",
    dexNo: 4,
    name: "Charmander",
    gen: 1,
    types: ["Fire"],
    baseStats: { hp: 39, attack: 52, defense: 43, spAttack: 60, spDefense: 50, speed: 65 },
    genderRatio: { m: 0.875, f: 0.125 },
    eggGroups: ["monster", "dragon"],
    rarity: "uncommon",
  },
  {
    id: "squirtle",
    dexNo: 7,
    name: "Squirtle",
    gen: 1,
    types: ["Water"],
    baseStats: { hp: 44, attack: 48, defense: 65, spAttack: 50, spDefense: 64, speed: 43 },
    genderRatio: { m: 0.875, f: 0.125 },
    eggGroups: ["monster", "water-1"],
    rarity: "uncommon",
  },
  {
    id: "pidgey",
    dexNo: 16,
    name: "Pidgey",
    gen: 1,
    types: ["Normal", "Flying"],
    baseStats: { hp: 40, attack: 45, defense: 40, spAttack: 35, spDefense: 35, speed: 56 },
    genderRatio: { m: 0.5, f: 0.5 },
    eggGroups: ["flying"],
    rarity: "common",
  },
  {
    id: "rattata",
    dexNo: 19,
    name: "Rattata",
    gen: 1,
    types: ["Normal"],
    baseStats: { hp: 30, attack: 56, defense: 35, spAttack: 25, spDefense: 35, speed: 72 },
    genderRatio: { m: 0.5, f: 0.5 },
    eggGroups: ["field"],
    rarity: "common",
  },
  {
    // Žolík pro breeding (R-022): egg group "ditto" se páří s čímkoli, co může
    // mít vejce. Potomkem je vždy ten druhý rodič (Ditto sám se z vejce nelíhne).
    id: "ditto",
    dexNo: 132,
    name: "Ditto",
    gen: 1,
    types: ["Normal"],
    baseStats: { hp: 48, attack: 48, defense: 48, spAttack: 48, spDefense: 48, speed: 48 },
    genderRatio: "genderless",
    eggGroups: ["ditto"],
    rarity: "rare",
  },
];

/**
 * Startovní Pokémoni nabízení na výběrové obrazovce. Hráč je všechny reálně
 * „vidí", takže je Pokédex vede jako viděné (viz pokedex.ensureStartersSeen).
 * Ditto je tu dočasně jako žolík pro breeding – cílově zmizí (viz BACKLOG).
 * @type {string[]}
 */
export const STARTER_IDS = ["bulbasaur", "charmander", "squirtle", "ditto"];

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
