/**
 * Generace 2 – Johto. Samostatný modul (descriptor), který čte registr
 * ../generations.js. Zatím KOSTRA: prázdná mapa, žádné druhy – sem se postupně
 * „vyšívá" celý Johto obsah, aniž by se sáhlo na gen 1.
 *
 * Přechod do Johto: hráč připluje ze S.S. Anne (Kanto) až po zisku titulu
 * Champion. Vstupní uzel `startAreaId` se doplní, až vznikne první Johto oblast
 * (viz areas.js zde). Mapa `mapImage` (assets/gen2/map/johto.webp) zatím nemusí
 * existovat – dokud je AREAS_GEN2 prázdné, mapa je prázdná.
 */

import { SPECIES_GEN2 } from "./pokemon.js";
import { LEARNSETS_GEN2 } from "./learnsets.js";
import { EV_YIELDS_GEN2 } from "./evYields.js";
import { AREAS_GEN2 } from "./areas.js";
import { LEGENDARY_GEN2 } from "./legendaries.js";

/** @type {import("../generations.js").Generation} */
export const GEN2 = {
  gen: 2,
  region: "johto",
  regionName: "Johto",
  // mapImage zatím null: assets/gen2/map/johto.webp ještě neexistuje. Dokud je null,
  // mapView vykreslí uzly nad „placeholder" plátnem (viz mapView). Až vznikne
  // art mapy Johta, nastav sem cestu a placeholder se sám přestane používat.
  mapImage: null,
  startAreaId: "new-bark-town", // vstupní uzel Johta (placeholder město)
  species: SPECIES_GEN2,
  learnsets: LEARNSETS_GEN2,
  evYields: EV_YIELDS_GEN2,
  areas: AREAS_GEN2,
  legendaries: LEGENDARY_GEN2,
};
