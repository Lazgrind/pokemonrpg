/**
 * REGISTR GENERACÍ – jediné místo, které říká, které generace jsou ve hře.
 *
 * Každá generace je samostatný modul (data/gen1/index.js, data/gen2/index.js…)
 * s vlastní složkou obsahu. Tady se jen posbírají do pole GENERATIONS, ze kterého
 * kořenové aggregatory (data/pokemon.js, learnsets.js, areas.js…) skládají data.
 *
 * Přidání gen 3+:
 *   1) zkopíruj složku data/gen2/ na data/gen3/, uprav data,
 *   2) přidej import { GEN3 } a zařaď do GENERATIONS.
 *
 * Gating: gen 2 se zařadí jen když GEN2_ENABLED (data/gameConfig.js) – na
 * produkci tak zůstává jen gen 1, dokud gen 2 nevydáme.
 *
 * @typedef {Object} Generation
 * @property {number} gen              číslo generace (1 = Kanto, 2 = Johto…)
 * @property {string} region          slug regionu ("kanto", "johto") = klíč v save stavu
 * @property {string} regionName      zobrazované jméno regionu
 * @property {string} mapImage        cesta k obrázku mapy regionu
 * @property {string|null} startAreaId  vstupní uzel regionu (null = prázdná mapa)
 * @property {import("./pokemon.js").Species[]} species
 * @property {Object} learnsets       mapa speciesId → learnset
 * @property {Object} evYields        mapa speciesId → EV yield
 * @property {import("./areas.js").Area[]} areas
 * @property {Object} legendaries     mapa areaId → legendární setkání
 */

import { GEN1 } from "./gen1/index.js";
import { GEN2 } from "./gen2/index.js";
import { GEN2_ENABLED } from "./gameConfig.js";

/**
 * Aktivní generace v tomto běhu (v pořadí Pokédexu). Gen 2 jen když je povolená.
 * @type {Generation[]}
 */
export const GENERATIONS = [GEN1, ...(GEN2_ENABLED ? [GEN2] : [])];

/**
 * Generace podle čísla (nebo null).
 * @param {number} gen
 * @returns {Generation|null}
 */
export function generationByGen(gen) {
  return GENERATIONS.find((g) => g.gen === gen) ?? null;
}

/**
 * Generace podle slugu regionu (nebo null). Slouží přechodu mezi regiony
 * (S.S. Anne → Johto) a výběru mapy.
 * @param {string} region
 * @returns {Generation|null}
 */
export function generationByRegion(region) {
  return GENERATIONS.find((g) => g.region === region) ?? null;
}
