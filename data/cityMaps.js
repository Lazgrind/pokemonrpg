/**
 * cityMaps.js – mapy měst shora pro panel Města (souhrn per-gen souborů data/gen<N>/cityMaps.js).
 * Město bez mapy (zatím Johto) ukáže panel Města v původním rozložení.
 */

import { CITY_MAPS_GEN1 } from "./gen1/cityMaps.js";

/** @type {Record<string, object>} */
export const CITY_MAPS = { ...CITY_MAPS_GEN1 };

/** Mapa města shora, nebo null (město ji zatím nemá). */
export function getCityMap(cityId) {
  return CITY_MAPS[cityId] ?? null;
}
