/**
 * DATA: druhy Pokémonů generace 2 (Johto, Pokédex 152–251).
 *
 * Sem přibývají VŠECHNY nové druhy gen 2 – gen 1 (./gen1.js) se přitom NIKDY
 * needituje. Formát záznamu a popis polí viz aggregator ../pokemon.js (Species).
 *
 * Postup přidání druhu:
 *   1) sem objekt s `gen: 2` a `dexNo` 152–251 (nebo hromadně přes tools/),
 *   2) learnset do data/learnsets.js, EV yield do data/evYields.js,
 *   3) sprity do assets/gen2/pokemon/<id>/ (+ zapsat do docs/SPRITES-TODO.md),
 *   4) zařadit `id` do některé Johto oblasti v data/areas.js.
 *
 * Gating: tyto druhy jsou aktivní jen když GEN2_ENABLED (data/gameConfig.js) –
 * na produkci jsou zatím skryté, takže je hráči nevidí.
 */

/** @type {import("../pokemon.js").Species[]} */
export const SPECIES_GEN2 = [
  // Johto startéři (základní formy) – rozdává je Prof. Elm v New Bark Townu
  // (viz storyBuildingView „elm-lab"). evolvesTo je zatím `null`: evoluce
  // (Bayleef/Meganium…) přibudou později i se sprity – do té doby by evoluce
  // do neexistujícího druhu spadla, tak ji vypínáme.
  {
    id: "chikorita",
    dexNo: 152,
    name: "Chikorita",
    gen: 2,
    types: ["Grass"],
    baseStats: { hp: 45, attack: 49, defense: 65, spAttack: 49, spDefense: 65, speed: 45 },
    genderRatio: { m: 0.875, f: 0.125 },
    eggGroups: ["monster", "grass"],
    rarity: "rare",
    evolvesTo: null,
    evolutionLevel: null,
    height: 0.9,
    weight: 6.4,
    genus: "Leaf Pokémon",
    dexEntry: "A sweet aroma gently wafts from the leaf on its head. It is docile and loves to soak up sun rays.",
  },
  {
    id: "cyndaquil",
    dexNo: 155,
    name: "Cyndaquil",
    gen: 2,
    types: ["Fire"],
    baseStats: { hp: 39, attack: 52, defense: 43, spAttack: 60, spDefense: 50, speed: 65 },
    genderRatio: { m: 0.875, f: 0.125 },
    eggGroups: ["field"],
    rarity: "rare",
    evolvesTo: null,
    evolutionLevel: null,
    height: 0.5,
    weight: 7.9,
    genus: "Fire Mouse Pokémon",
    dexEntry: "It is timid, and always curls itself up in a ball. If attacked, it flares up its back for protection.",
  },
  {
    id: "totodile",
    dexNo: 158,
    name: "Totodile",
    gen: 2,
    types: ["Water"],
    baseStats: { hp: 50, attack: 65, defense: 64, spAttack: 44, spDefense: 48, speed: 43 },
    genderRatio: { m: 0.875, f: 0.125 },
    eggGroups: ["monster", "water1"],
    rarity: "rare",
    evolvesTo: null,
    evolutionLevel: null,
    height: 0.6,
    weight: 9.5,
    genus: "Big Jaw Pokémon",
    dexEntry: "Its well-developed jaws are powerful and capable of crushing anything. Even its trainer must be careful.",
  },
];
