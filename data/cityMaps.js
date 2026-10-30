/**
 * cityMaps.js – mapy měst shora pro panel Města (souhrn per-gen souborů data/gen<N>/cityMaps.js).
 * Město bez mapy ukáže panel Města v původním rozložení.
 */

import { CITY_MAPS_GEN1 } from "./gen1/cityMaps.js";
import { CITY_MAPS_GEN2 } from "./gen2/cityMaps.js";

/** @type {Record<string, object>} */
export const CITY_MAPS = { ...CITY_MAPS_GEN1, ...CITY_MAPS_GEN2 };

/** Mapa města shora, nebo null (město ji zatím nemá). */
export function getCityMap(cityId) {
  return CITY_MAPS[cityId] ?? null;
}

/**
 * Náhradní budovy na mapě, dokud budova nemá sprite: [šířka, výška, tvar] v pixelech mapy
 * (stejné měřítko jako pixel art budov). Tvar: house | pagoda | lighthouse | radio | ship |
 * cave | stairs. Kreslí je src/ui/cityMap.js barvou budovy; po dodání spritu se použije sprite.
 */
export const BUILDING_PLACEHOLDERS = {
  "elm-lab": [56, 45, "house"],
  "sprout-tower": [30, 64, "pagoda"],
  "azalea-kiln": [40, 30, "house"],
  "kurts-house": [36, 32, "house"],
  "goldenrod-dept-store": [54, 62, "house"],
  "goldenrod-game-corner": [54, 46, "house"],
  "goldenrod-flower-shop": [34, 28, "house"],
  "goldenrod-underground": [30, 20, "stairs"],
  "bills-house": [36, 32, "house"],
  "radio-tower": [40, 76, "radio"],
  "ecruteak-house": [36, 32, "house"],
  "dance-theater": [56, 42, "house"],
  "bell-tower": [34, 70, "pagoda"],
  "burned-tower": [40, 50, "pagoda"],
  "olivine-lighthouse": [30, 72, "lighthouse"],
  "olivine-house": [36, 32, "house"],
  "ss-aqua": [86, 36, "ship"],
  "cianwood-pharmacy": [38, 32, "house"],
  "dragons-den": [44, 34, "cave"],
  "blackthorn-house": [36, 32, "house"],
};

/** Náhradní budova pro id (neznámá → obyčejný dům 36×32). */
export function buildingPlaceholder(id) {
  const [w, h, shape] = BUILDING_PLACEHOLDERS[id] ?? [36, 32, "house"];
  return { w, h, shape };
}
