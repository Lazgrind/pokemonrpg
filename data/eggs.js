/**
 * DATA: vajíčka a líhnutí (R-021).
 *
 * Čistá data: podle rarity druhu se řídí doba líhnutí (vzácnější = déle) a
 * jak často vejce po výhře padne. Druh ve vejci se losuje z oblasti (viz
 * data/areas.js → species), genetika (IV/EV/shiny) se vylosuje až při vylíhnutí.
 * Logika žije v src/systems/eggSystem.js.
 */

/**
 * Doba líhnutí v REÁLNÝCH (wall-clock) minutách podle rarity druhu. Inkubace
 * běží na skutečném čase – tiká při běžící hře i offline (plný dopočet po
 * návratu, BEZ stropu), takže 2 h = 2 h IRL. Hodnoty jsou laditelné.
 * @type {Record<string, { hatchMinutes: number }>}
 */
export const EGG_RARITY = {
  common: { hatchMinutes: 30 }, // 30 min
  uncommon: { hatchMinutes: 60 }, // 1 h
  rare: { hatchMinutes: 120 }, // 2 h
  epic: { hatchMinutes: 240 }, // 4 h
  legendary: { hatchMinutes: 480 }, // 8 h (přes noc)
};

/** Šance, že po vítězství v souboji najdeš vejce (0–1). Laditelné. */
export const EGG_DROP_CHANCE = 0.03;

/** Rozsah levelu vylíhnutého Pokémona (včetně). Klasická podmínka: vždy Lv 1
 *  (min == max == 1), takže se každý vylíhnutý Pokémon líhne na levelu 1. */
export const HATCH_LEVEL_MIN = 1;
export const HATCH_LEVEL_MAX = 1;

/**
 * Doba líhnutí (minuty) pro daný druh podle jeho rarity (fallback common).
 * @param {string} rarity
 * @returns {number}
 */
export function hatchMinutesFor(rarity) {
  return (EGG_RARITY[rarity] ?? EGG_RARITY.common).hatchMinutes;
}
