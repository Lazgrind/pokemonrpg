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
  // ─── Johto: per-oblast pooly podle HeartGold/SoulSilver (gen2-locked; úrovně podle prutu jako v HGSS) ───
  // Klíč "johto-ocean-…" = moře (štítek Ocean v minihře), "johto-…" = sladká voda.
  // route-30: HGSS (PokeAPI), jen Gen 2 + dexImports
  "johto-route-30": {
    "old-rod": { levels: [10, 12], pool: [{ id: "poliwag", weight: 310 }] },
    "good-rod": { levels: [20, 22], pool: [{ id: "poliwag", weight: 310 }] },
    "super-rod": { levels: [40, 42], pool: [{ id: "poliwag", weight: 310 }] },
  },
  // route-31: HGSS (PokeAPI), jen Gen 2 + dexImports
  "johto-route-31": {
    "old-rod": { levels: [10, 12], pool: [{ id: "poliwag", weight: 310 }] },
    "good-rod": { levels: [20, 22], pool: [{ id: "poliwag", weight: 310 }] },
    "super-rod": { levels: [40, 42], pool: [{ id: "poliwag", weight: 310 }] },
  },
  // route-32: HGSS (PokeAPI), jen Gen 2 + dexImports
  "johto-route-32": {
    "old-rod": { levels: [10, 12], pool: [{ id: "qwilfish", weight: 370 }] },
    "good-rod": { levels: [20, 22], pool: [{ id: "qwilfish", weight: 370 }] },
    "super-rod": { levels: [40, 42], pool: [{ id: "qwilfish", weight: 370 }] },
  },
  // union-cave: HGSS (PokeAPI), jen Gen 2 + dexImports
  "johto-ocean-union-cave": {
    "old-rod": { levels: [10, 12], pool: [{ id: "corsola", weight: 160 }] }, // v HGSS tímhle prutem nic Gen 2 – stejný pool jako lepší prut
    "good-rod": { levels: [20, 22], pool: [{ id: "corsola", weight: 160 }] },
    "super-rod": { levels: [40, 42], pool: [{ id: "corsola", weight: 160 }] },
  },
  // ilex-forest: HGSS (PokeAPI), jen Gen 2 + dexImports
  "johto-ilex-forest": {
    "old-rod": { levels: [10, 12], pool: [{ id: "poliwag", weight: 310 }] },
    "good-rod": { levels: [20, 22], pool: [{ id: "poliwag", weight: 310 }] },
    "super-rod": { levels: [40, 42], pool: [{ id: "poliwag", weight: 310 }] },
  },
  // route-34: HGSS (PokeAPI), jen Gen 2 + dexImports
  "johto-ocean-route-34": {
    "old-rod": { levels: [10, 12], pool: [{ id: "corsola", weight: 160 }] }, // v HGSS tímhle prutem nic Gen 2 – stejný pool jako lepší prut
    "good-rod": { levels: [20, 22], pool: [{ id: "corsola", weight: 160 }] },
    "super-rod": { levels: [40, 42], pool: [{ id: "corsola", weight: 160 }] },
  },
  // route-35: HGSS (PokeAPI), jen Gen 2 + dexImports
  "johto-route-35": {
    "old-rod": { levels: [10, 12], pool: [{ id: "poliwag", weight: 310 }] },
    "good-rod": { levels: [20, 22], pool: [{ id: "poliwag", weight: 310 }] },
    "super-rod": { levels: [40, 42], pool: [{ id: "poliwag", weight: 310 }] },
  },
  // route-40: HGSS (PokeAPI), jen Gen 2 + dexImports
  "johto-ocean-route-40": {
    "old-rod": { levels: [10, 12], pool: [{ id: "corsola", weight: 160 }] }, // v HGSS tímhle prutem nic Gen 2 – stejný pool jako lepší prut
    "good-rod": { levels: [20, 22], pool: [{ id: "corsola", weight: 160 }] },
    "super-rod": { levels: [40, 42], pool: [{ id: "corsola", weight: 160 }] },
  },
  // route-41: HGSS (PokeAPI), jen Gen 2 + dexImports
  "johto-ocean-route-41": {
    "old-rod": { levels: [10, 12], pool: [{ id: "chinchou", weight: 120 }] }, // v HGSS tímhle prutem nic Gen 2 – stejný pool jako lepší prut
    "good-rod": { levels: [20, 22], pool: [{ id: "chinchou", weight: 120 }] },
    "super-rod": { levels: [40, 42], pool: [{ id: "chinchou", weight: 120 }, { id: "lanturn", weight: 20 }] },
  },
  // whirl-islands: HGSS (PokeAPI), jen Gen 2 + dexImports
  "johto-ocean-whirl-islands": {
    "old-rod": { levels: [10, 12], pool: [{ id: "horsea", weight: 160 }] }, // v HGSS tímhle prutem nic Gen 2 – stejný pool jako lepší prut
    "good-rod": { levels: [20, 22], pool: [{ id: "horsea", weight: 160 }] },
    "super-rod": { levels: [40, 42], pool: [{ id: "horsea", weight: 160 }, { id: "seadra", weight: 40 }] },
  },
  // route-43: HGSS (PokeAPI), jen Gen 2 + dexImports
  "johto-route-43": {
    "old-rod": { levels: [10, 12], pool: [{ id: "poliwag", weight: 310 }] },
    "good-rod": { levels: [20, 22], pool: [{ id: "poliwag", weight: 310 }] },
    "super-rod": { levels: [40, 42], pool: [{ id: "poliwag", weight: 310 }] },
  },
  // route-44: HGSS (PokeAPI), jen Gen 2 + dexImports
  "johto-route-44": {
    "old-rod": { levels: [10, 12], pool: [{ id: "remoraid", weight: 370 }, { id: "poliwag", weight: 280 }] },
    "good-rod": { levels: [20, 22], pool: [{ id: "remoraid", weight: 370 }, { id: "poliwag", weight: 280 }] },
    "super-rod": { levels: [40, 42], pool: [{ id: "remoraid", weight: 370 }, { id: "poliwag", weight: 280 }] },
  },
  // route-45: HGSS (PokeAPI), jen Gen 2 + dexImports
  "johto-route-45": {
    "old-rod": { levels: [10, 12], pool: [{ id: "poliwag", weight: 310 }] },
    "good-rod": { levels: [20, 22], pool: [{ id: "poliwag", weight: 310 }] },
    "super-rod": { levels: [40, 42], pool: [{ id: "poliwag", weight: 310 }] },
  },
  // ruins-of-alph: HGSS (PokeAPI), jen Gen 2 + dexImports
  "johto-ruins-of-alph": {
    "old-rod": { levels: [10, 12], pool: [{ id: "poliwag", weight: 310 }] },
    "good-rod": { levels: [20, 22], pool: [{ id: "poliwag", weight: 310 }] },
    "super-rod": { levels: [40, 42], pool: [{ id: "poliwag", weight: 310 }] },
  },
  // route-27: HGSS (PokeAPI), jen Gen 2 + dexImports
  "johto-ocean-route-27": {
    "old-rod": { levels: [10, 12], pool: [{ id: "chinchou", weight: 120 }] }, // v HGSS tímhle prutem nic Gen 2 – stejný pool jako lepší prut
    "good-rod": { levels: [20, 22], pool: [{ id: "chinchou", weight: 120 }] },
    "super-rod": { levels: [40, 42], pool: [{ id: "chinchou", weight: 120 }, { id: "lanturn", weight: 20 }] },
  },
  // route-26: HGSS (PokeAPI), jen Gen 2 + dexImports
  "johto-ocean-route-26": {
    "old-rod": { levels: [10, 12], pool: [{ id: "chinchou", weight: 120 }] }, // v HGSS tímhle prutem nic Gen 2 – stejný pool jako lepší prut
    "good-rod": { levels: [20, 22], pool: [{ id: "chinchou", weight: 120 }] },
    "super-rod": { levels: [40, 42], pool: [{ id: "chinchou", weight: 120 }, { id: "lanturn", weight: 20 }] },
  },
  // route-47: HGSS (PokeAPI), jen Gen 2 + dexImports
  "johto-ocean-route-47": {
    "old-rod": { levels: [10, 12], pool: [{ id: "chinchou", weight: 120 }, { id: "poliwag", weight: 110 }] }, // v HGSS tímhle prutem nic Gen 2 – stejný pool jako lepší prut
    "good-rod": { levels: [20, 22], pool: [{ id: "chinchou", weight: 120 }, { id: "poliwag", weight: 110 }] },
    "super-rod": { levels: [40, 42], pool: [{ id: "chinchou", weight: 120 }, { id: "poliwag", weight: 110 }, { id: "lanturn", weight: 20 }] },
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
  // Johto (gen2-locked): každá oblast má vlastní pool (výše). Johtská oblast BEZ záznamu
  // tady rybařit nejde (fishingSystem.areaHasWater) – výchozí ROD_POOLS jsou kantské Gen 1.
  "route-30": "johto-route-30",
  "route-31": "johto-route-31",
  "route-32": "johto-route-32",
  "union-cave": "johto-ocean-union-cave",
  "ilex-forest": "johto-ilex-forest",
  "route-34": "johto-ocean-route-34",
  "route-35": "johto-route-35",
  "route-40": "johto-ocean-route-40",
  "route-41": "johto-ocean-route-41",
  "whirl-islands": "johto-ocean-whirl-islands",
  "route-43": "johto-route-43",
  "route-44": "johto-route-44",
  "route-45": "johto-route-45",
  "ruins-of-alph": "johto-ruins-of-alph",
  "route-27": "johto-ocean-route-27",
  "route-26": "johto-ocean-route-26",
  "route-47": "johto-ocean-route-47",
};

/** Pořadí prutů od nejlepšího k nejhoršímu (pro výběr nejlepšího vlastněného). */
export const ROD_ORDER = ["super-rod", "good-rod", "old-rod"];
