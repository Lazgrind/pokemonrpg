/**
 * DATA: vajíčka a líhnutí (R-021).
 *
 * Čistá data: podle rarity druhu se řídí doba líhnutí (vzácnější = déle) a
 * jak často vejce po výhře padne. Druh ve vejci se losuje z oblasti (viz
 * data/areas.js → species), genetika (IV/EV/shiny) se vylosuje až při vylíhnutí.
 * Logika žije v src/systems/eggSystem.js.
 */

/**
 * Doba líhnutí v minutách podle rarity druhu (inkubace ve Školce – počítá se
 * i offline). Hodnoty jsou laditelné.
 * @type {Record<string, { hatchMinutes: number }>}
 */
export const EGG_RARITY = {
  common: { hatchMinutes: 10 },
  uncommon: { hatchMinutes: 20 },
  rare: { hatchMinutes: 45 },
  epic: { hatchMinutes: 90 },
  legendary: { hatchMinutes: 180 },
};

/** Šance, že po vítězství v souboji najdeš vejce (0–1). Laditelné. */
export const EGG_DROP_CHANCE = 0.03;

/** Rozsah levelu vylíhnutého Pokémona (včetně). */
export const HATCH_LEVEL_MIN = 1;
export const HATCH_LEVEL_MAX = 5;

/**
 * Doba líhnutí (minuty) pro daný druh podle jeho rarity (fallback common).
 * @param {string} rarity
 * @returns {number}
 */
export function hatchMinutesFor(rarity) {
  return (EGG_RARITY[rarity] ?? EGG_RARITY.common).hatchMinutes;
}
