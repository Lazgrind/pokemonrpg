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
 * @property {import("./badges.js").Badge[]} [badges]  odznaky regionu (kánon pořadí)
 * @property {import("./gyms.js").Gym[]} [gyms]  gymy regionu (keyed přes cityId)
 * @property {import("./trainers.js").Trainer[]} [trainers]  FIXNÍ trenéři regionu
 *   (rival + gym trenéři/leadeři + Liga). Route trenéři se generují z routeTrainerPlan.
 * @property {Object<string, {level:[number,number], count:number, size:[number,number]}>} [routeTrainerPlan]
 *   plán procedurálních route trenérů regionu (areaId → level band / počet / velikost týmu)
 * @property {Object} [league]        Pokémon League regionu (Elite Four + Champion)
 * @property {Object} [rocketGauntlets]  povinné gauntlety regionu (areaId → gauntlet)
 * @property {Object<string,string>} [rivalGates]  rival gate regionu (areaId → id rivala)
 * @property {Object<string, {toId:string, method:string, item?:string}[]>} [evolutionPatches]
 *   cross-gen evoluce: id rodiče (z NIŽŠÍ generace) → další evoluční hrany, které
 *   tato generace přidává. Aggregator (pokemon.js) je přimerguje do rodičova
 *   evolutions[] jen když je generace aktivní. Např. gen 2: golbat → crobat.
 * @property {string[]} [dexImports]  id druhů z NIŽŠÍ generace, které patří do
 *   regionálního dexu tohoto regionu a jsou tu znovu chytatelné (kánon – např.
 *   Johto dex obsahuje Zubata, Onixe…). Identita/staty/sprite zůstávají jediným
 *   zdrojem v původní generaci; tady je jen výčet (regionální pohledy dexu,
 *   validace). Evoluce na novou formu řeší evolutionPatches. Viz region-model.
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
