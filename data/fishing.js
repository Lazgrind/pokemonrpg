/**
 * fishing.js – DATA: rybaření poolů podle prutu A podle rybářského biomu oblasti.
 *
 * Každý prut (Old/Good/Super) má pool druhů vody s váhami a rozsah levelů.
 * Struktura poolu: { levels: [min, max], pool: [{ id, weight }, ...] }.
 *
 * Per-oblast variabilita (kánon: jiné ryby v jiné vodě) je řešená přes "rybářské
 * biomy". Výchozí biom je SLADKOVODNÍ (řeky/jezera/rybníky vnitrozemí) = ROD_POOLS.
 * Pobřežní a mořské oblasti používají OCEÁNSKÝ pool (FISHING_POOLS.ocean). Mapa
 * AREA_FISHING přiřazuje konkrétním oblastem jiný biom než výchozí sladkovodní.
 * Když oblast v mapě není, jede se výchozí ROD_POOLS.
 */

/**
 * SLADKOVODNÍ pooly (výchozí) – vnitrozemské řeky, jezera a rybníky.
 * Žabí (Poliwag) a sladkovodní ryby (Goldeen), okrajově Psyduck/Slowpoke/Krabby.
 * @type {Object<string, { levels: number[], pool: Array<{id: string, weight: number}> }>}
 */
export const ROD_POOLS = {
  "old-rod": {
    levels: [5, 15],
    pool: [
      { id: "magikarp", weight: 70 },
      { id: "poliwag", weight: 30 },
    ],
  },
  "good-rod": {
    levels: [10, 25],
    pool: [
      { id: "magikarp", weight: 22 },
      { id: "poliwag", weight: 24 },
      { id: "goldeen", weight: 22 },
      { id: "psyduck", weight: 12 },
      { id: "krabby", weight: 12 },
      { id: "slowpoke", weight: 8 },
    ],
  },
  "super-rod": {
    levels: [20, 40],
    pool: [
      { id: "poliwag", weight: 14 },
      { id: "poliwhirl", weight: 8 },
      { id: "goldeen", weight: 14 },
      { id: "seaking", weight: 6 },
      { id: "psyduck", weight: 10 },
      { id: "golduck", weight: 4 },
      { id: "slowpoke", weight: 10 },
      { id: "krabby", weight: 10 },
      { id: "kingler", weight: 4 },
      { id: "magikarp", weight: 14 },
      { id: "gyarados", weight: 2 },
    ],
  },
};

/**
 * Rybářské pooly pro NEVÝCHOZÍ biomy. Klíč = biom (viz AREA_FISHING).
 * Zatím jen "ocean" (pobřeží a mořské cesty): medúzy (Tentacool), mořští koníci
 * (Horsea), škeble (Shellder) a hvězdice (Staryu).
 * @type {Object<string, Object<string, { levels: number[], pool: Array<{id: string, weight: number}> }>>}
 */
export const FISHING_POOLS = {
  ocean: {
    "old-rod": {
      levels: [5, 15],
      pool: [
        { id: "magikarp", weight: 60 },
        { id: "tentacool", weight: 40 },
      ],
    },
    "good-rod": {
      levels: [10, 25],
      pool: [
        { id: "tentacool", weight: 24 },
        { id: "horsea", weight: 16 },
        { id: "shellder", weight: 14 },
        { id: "staryu", weight: 12 },
        { id: "krabby", weight: 12 },
        { id: "goldeen", weight: 10 },
        { id: "magikarp", weight: 12 },
      ],
    },
    "super-rod": {
      levels: [20, 40],
      pool: [
        { id: "tentacool", weight: 12 },
        { id: "tentacruel", weight: 4 },
        { id: "horsea", weight: 10 },
        { id: "seadra", weight: 5 },
        { id: "shellder", weight: 10 },
        { id: "staryu", weight: 10 },
        { id: "krabby", weight: 8 },
        { id: "kingler", weight: 4 },
        { id: "goldeen", weight: 8 },
        { id: "seaking", weight: 4 },
        { id: "magikarp", weight: 12 },
        { id: "gyarados", weight: 2 },
      ],
    },
  },
};

/**
 * Přiřazení oblasti → rybářský biom (jen tam, kde NENÍ výchozí sladkovodní).
 * Pobřežní města a mořské cesty jižního/východního Kanta = "ocean".
 * @type {Object<string, string>}
 */
export const AREA_FISHING = {
  "vermilion-city": "ocean",
  "route-11": "ocean",
  "route-12": "ocean",
  "route-13": "ocean",
  "route-18": "ocean",
  "fuchsia-city": "ocean",
  "route-19": "ocean",
  "route-20": "ocean",
  "route-21": "ocean",
  "cinnabar-island": "ocean",
};

/** Pořadí prutů od nejlepšího k nejhoršímu (pro výběr nejlepšího vlastněného). */
export const ROD_ORDER = ["super-rod", "good-rod", "old-rod"];
