/**
 * DATA: povahy (Natures) – klasická mechanika z Pokémon her (Gen 3+).
 *
 * Každý jedinec má jednu z 25 povah. Povaha zvedne jeden stat o +10 % a jiný
 * sníží o −10 %. HP není povahou NIKDY ovlivněno. Pět „neutrálních" povah zvedá
 * i snižuje týž stat → čistý efekt je 0 (jen kosmetika/vzácnost).
 *
 * Čistě data: samotné násobení statů žije v `computeStats` (pokemonSystem.js),
 * konstanty a helpery níže. Přidání povahy = jen záznam zde.
 *
 * @typedef {Object} NatureDef
 * @property {string} id
 * @property {string} name
 * @property {(keyof import("../src/core/state.js").StatSpread)|null} up    stat +10 % (null = neutrální)
 * @property {(keyof import("../src/core/state.js").StatSpread)|null} down  stat −10 % (null = neutrální)
 */

/** Násobitel zvýšeného statu. */
export const NATURE_UP_MULT = 1.1;
/** Násobitel sníženého statu. */
export const NATURE_DOWN_MULT = 0.9;

/** @type {NatureDef[]} */
export const NATURES = [
  // Neutrální (up === down → bez efektu)
  { id: "hardy", name: "Hardy", up: null, down: null },
  { id: "docile", name: "Docile", up: null, down: null },
  { id: "serious", name: "Serious", up: null, down: null },
  { id: "bashful", name: "Bashful", up: null, down: null },
  { id: "quirky", name: "Quirky", up: null, down: null },
  // +Attack
  { id: "lonely", name: "Lonely", up: "attack", down: "defense" },
  { id: "brave", name: "Brave", up: "attack", down: "speed" },
  { id: "adamant", name: "Adamant", up: "attack", down: "spAttack" },
  { id: "naughty", name: "Naughty", up: "attack", down: "spDefense" },
  // +Defense
  { id: "bold", name: "Bold", up: "defense", down: "attack" },
  { id: "relaxed", name: "Relaxed", up: "defense", down: "speed" },
  { id: "impish", name: "Impish", up: "defense", down: "spAttack" },
  { id: "lax", name: "Lax", up: "defense", down: "spDefense" },
  // +Speed
  { id: "timid", name: "Timid", up: "speed", down: "attack" },
  { id: "hasty", name: "Hasty", up: "speed", down: "defense" },
  { id: "jolly", name: "Jolly", up: "speed", down: "spAttack" },
  { id: "naive", name: "Naive", up: "speed", down: "spDefense" },
  // +Sp. Attack
  { id: "modest", name: "Modest", up: "spAttack", down: "attack" },
  { id: "mild", name: "Mild", up: "spAttack", down: "defense" },
  { id: "quiet", name: "Quiet", up: "spAttack", down: "speed" },
  { id: "rash", name: "Rash", up: "spAttack", down: "spDefense" },
  // +Sp. Defense
  { id: "calm", name: "Calm", up: "spDefense", down: "attack" },
  { id: "gentle", name: "Gentle", up: "spDefense", down: "defense" },
  { id: "sassy", name: "Sassy", up: "spDefense", down: "speed" },
  { id: "careful", name: "Careful", up: "spDefense", down: "spAttack" },
];

/**
 * Najde definici povahy podle id (fallback na první „Hardy", ať UI nikdy nespadne).
 * @param {string} id
 * @returns {NatureDef}
 */
export function getNature(id) {
  return NATURES.find((n) => n.id === id) ?? NATURES[0];
}

/** Je povaha neutrální (bez efektu na staty)? */
export function isNeutralNature(id) {
  const n = getNature(id);
  return !n.up || !n.down;
}
