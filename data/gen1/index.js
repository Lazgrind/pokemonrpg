/**
 * Generace 1 – Kanto. Samostatný modul: spojuje všechna data gen 1 do jednoho
 * popisovače (descriptor), který čte registr ../generations.js.
 *
 * Vše, co gen 1 „obsahuje" (druhy, learnsets, EV, oblasti/mapa, legendární),
 * je tady pohromadě. Přidání gen 3+ = zkopírovat tuto složku a upravit data.
 */

import { SPECIES_GEN1 } from "./pokemon.js";
import { LEARNSETS_GEN1 } from "./learnsets.js";
import { EV_YIELDS_GEN1 } from "./evYields.js";
import { AREAS_GEN1 } from "./areas.js";
import { LEGENDARY_GEN1 } from "./legendaries.js";

/** @type {import("../generations.js").Generation} */
export const GEN1 = {
  gen: 1,
  region: "kanto",
  regionName: "Kanto",
  mapImage: "assets/gen1/map/kanto.webp",
  startAreaId: "pallet-town",
  species: SPECIES_GEN1,
  learnsets: LEARNSETS_GEN1,
  evYields: EV_YIELDS_GEN1,
  areas: AREAS_GEN1,
  legendaries: LEGENDARY_GEN1,
};
