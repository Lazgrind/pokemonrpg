/**
 * Generace 1 – Kanto. Samostatný modul: spojuje všechna data gen 1 do jednoho
 * popisovače (descriptor), který čte registr ../generations.js.
 *
 * Vše, co gen 1 „obsahuje" (druhy, learnsets, EV, oblasti/mapa, legendární),
 * je tady pohromadě. Přidání gen 3+ = zkopírovat tuto složku a upravit data.
 */

import { SPECIES_GEN1 } from "./pokemon.js";
import { LEARNSETS_GEN1 } from "./learnsets.js";
import { TYPES_GEN1 } from "./types.js";
import { EV_YIELDS_GEN1 } from "./evYields.js";
import { AREAS_GEN1 } from "./areas.js";
import { LEGENDARY_GEN1 } from "./legendaries.js";
import { BADGES_GEN1 } from "./badges.js";
import { GYMS_GEN1 } from "./gyms.js";
import {
  FIXED_TRAINERS_GEN1,
  ROUTE_TRAINER_PLAN_GEN1,
  LEAGUE_GEN1,
  ROCKET_GAUNTLETS_GEN1,
  RIVAL_GATES_GEN1,
} from "./trainers.js";

/** @type {import("../generations.js").Generation} */
export const GEN1 = {
  gen: 1,
  region: "kanto",
  regionName: "Kanto",
  mapImage: "assets/gen1/map/kanto.webp",
  startAreaId: "pallet-town",
  species: SPECIES_GEN1,
  learnsets: LEARNSETS_GEN1,
  types: TYPES_GEN1, // typy a tabulka účinnosti této generace (viz ../types.js)
  evYields: EV_YIELDS_GEN1,
  areas: AREAS_GEN1,
  legendaries: LEGENDARY_GEN1,
  badges: BADGES_GEN1,
  gyms: GYMS_GEN1,
  trainers: FIXED_TRAINERS_GEN1,
  routeTrainerPlan: ROUTE_TRAINER_PLAN_GEN1,
  league: LEAGUE_GEN1,
  rocketGauntlets: ROCKET_GAUNTLETS_GEN1,
  rivalGates: RIVAL_GATES_GEN1,
};
