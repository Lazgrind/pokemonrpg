/**
 * DATA: definice tahů (moves). Čistá data, žádná logika – jako data/pokemon.js.
 * Nový tah = jen přidat objekt; systémy (damage, PP, UI) čtou přes getMove().
 *
 * Model (schváleno 2026-09-01):
 *  - kategorie **physical / special** (physical počítá z Attack/Defense, special
 *    ze Sp.Atk/Sp.Def; **status** = bez damage, přidáme později),
 *  - **accuracy** v % → tah může minout,
 *  - **PP** = počet použití (spotřebovává se; obnova např. v Centru přijde později).
 *
 * Rozšíření (necháváme místo, zatím NEpoužito): `priority` (Quick Attack chodí
 * dřív), `effect` (jed, změny statů, apod.).
 *
 * @typedef {"physical"|"special"|"status"} MoveCategory
 *
 * @typedef {Object} Move
 * @property {string} id          unikátní klíč (kebab-case)
 * @property {string} name        zobrazované jméno
 * @property {string} type        typ tahu (viz data/types.js)
 * @property {MoveCategory} category
 * @property {number} power       síla tahu (0 = žádný přímý damage / status)
 * @property {number} accuracy    šance na zásah v % (100 = skoro jistota; 101+/null = vždy)
 * @property {number} pp          maximální PP (počet použití)
 * @property {number} [priority]  vyšší jde dřív (výchozí 0) – zatím nevyužito
 * @property {"poison"|"burn"|"paralysis"} [ailment]  status, který tah může způsobit
 *                                     (poison/burn = poškození za kolo; paralysis =
 *                                     šance přeskočit tah + poloviční Speed)
 * @property {number} [ailmentChance]     šance (%) na způsobení statusu (výchozí 100)
 */

/** @type {Move[]} */
export const MOVES = [
  // --- Normal ---
  { id: "tackle", name: "Tackle", type: "Normal", category: "physical", power: 40, accuracy: 100, pp: 35 },
  { id: "scratch", name: "Scratch", type: "Normal", category: "physical", power: 40, accuracy: 100, pp: 35 },
  // Quick Attack má v hrách prioritu (+1) – pole `priority` doplníme, až zapneme
  // pořadí podle priority; zatím se chová jako běžný tah.
  { id: "quick-attack", name: "Quick Attack", type: "Normal", category: "physical", power: 40, accuracy: 100, pp: 30, priority: 1 },
  // Body Slam: silnější Normal útok se šancí na paralýzu (klasický zdroj PAR).
  { id: "body-slam", name: "Body Slam", type: "Normal", category: "physical", power: 60, accuracy: 100, pp: 15, ailment: "paralysis", ailmentChance: 30 },

  // --- Fire ---
  { id: "ember", name: "Ember", type: "Fire", category: "special", power: 40, accuracy: 100, pp: 25, ailment: "burn", ailmentChance: 10 },

  // --- Water ---
  { id: "water-gun", name: "Water Gun", type: "Water", category: "special", power: 40, accuracy: 100, pp: 25 },

  // --- Grass ---
  { id: "vine-whip", name: "Vine Whip", type: "Grass", category: "physical", power: 45, accuracy: 100, pp: 25 },

  // --- Flying ---
  { id: "gust", name: "Gust", type: "Flying", category: "special", power: 40, accuracy: 100, pp: 35 },

  // --- Poison ---
  { id: "poison-sting", name: "Poison Sting", type: "Poison", category: "physical", power: 15, accuracy: 100, pp: 35, ailment: "poison", ailmentChance: 30 },
];

/** Rychlé vyhledání tahu podle id. */
const MOVES_BY_ID = new Map(MOVES.map((m) => [m.id, m]));

/**
 * Vrátí definici tahu podle id (nebo undefined).
 * @param {string} id
 * @returns {Move | undefined}
 */
export function getMove(id) {
  return MOVES_BY_ID.get(id);
}
