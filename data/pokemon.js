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
 *                                  určuje i složku spritů (assets/gen<gen>/pokemon/<id>/)
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
 * @property {string|null} evolvesTo   id druhu, na který se vyvine (null = nevyvíjí se)
 * @property {number|null} evolutionLevel   level, na kterém evoluce nastane (null = žádná)
 * @property {number} height        výška druhu v metrech (z PokeAPI; jen info,
 *                                  velikost spritu v Battle Area je jednotná).
 * @property {number} weight        hmotnost druhu v kilogramech (z PokeAPI)
 * @property {string} genus         angl. druhový popisek (např. "Seed Pokémon")
 * @property {string} dexEntry      angl. Pokédex flavor text (vyčištěný)
 *
 * Pole height/weight/genus/dexEntry doplňuje generačně nezávislý skript
 * tools/gen_pokedex_info.py z PokeAPI – neupravovat ručně, přegeneruje se.
 */

import { GENERATIONS } from "./generations.js";

/**
 * Všechny druhy dostupné v AKTUÁLNÍM běhu. Data jsou po generacích ve složkách
 * data/gen1/, data/gen2/…; registr generations.js je posbírá (gen 2 jen když je
 * povolená). Na produkci tak zůstává čistá gen 1 (dex 151) bez zásahu do systémů.
 * @type {Species[]}
 */
export const POKEMON_SPECIES = GENERATIONS.flatMap((g) => g.species);

/**
 * Startovní Pokémoni nabízení na výběrové obrazovce. Hráč je všechny reálně
 * „vidí", takže je Pokédex vede jako viděné (viz pokedex.ensureStartersSeen).
 * @type {string[]}
 */
export const STARTER_IDS = ["bulbasaur", "charmander", "squirtle"];

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

/**
 * Druhy dané generace (mezi aktuálně aktivními). Slouží k per-generation logice –
 * hlavně dokončení Pokédexu zvlášť za gen 1 (Kanto) a gen 2 (Johto).
 * @param {number} gen
 * @returns {Species[]}
 */
export function speciesByGen(gen) {
  return POKEMON_SPECIES.filter((s) => s.gen === gen);
}
