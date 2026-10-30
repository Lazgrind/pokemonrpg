/**
 * DATA: tabulka typové efektivity.
 * Plná kanonická 18-typová tabulka (moderní generace, Gen 6+) – výchozí/záložní.
 * HRA bojuje podle tabulky REGIONU (rozhodnutí autora 2026-10-20: typy přesně
 * v generaci): Kanto = Gen 1, Johto = Gen 2 – data/genN/types.js, helpery níž.
 * Klíč = útočící typ, hodnota = násobitel proti bránícímu typu.
 * Uvádějí se jen odchylky od 1 (2 = super efektivní, 0.5 = slabé, 0 = žádný účinek).
 * Chybějící kombinace = násobitel 1 (řeší typeMultiplier).
 */
import { GENERATIONS } from "./generations.js";

export const TYPE_CHART = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5 },
  Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
  Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
  Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5, Fairy: 0.5 },
  Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
  Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
  Fairy: { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 },
};

/**
 * Celkový násobitel útoku daného typu proti (jednomu či dvěma) typům obránce.
 * @param {string} attackType
 * @param {string[]} defenderTypes
 * @returns {number}
 */
export function typeMultiplier(attackType, defenderTypes, region) {
  const row = chartFor(region)[attackType] ?? {};
  return defenderTypes.reduce((mult, t) => mult * (row[t] ?? 1), 1);
}

/** Typová data generace regionu ({ chart, species, moves }) nebo null. */
function regionTypes(region) {
  return region ? (GENERATIONS.find((g) => g.region === region)?.types ?? null) : null;
}

/** Tabulka účinnosti regionu (Kanto = Gen 1, Johto = Gen 2); bez regionu moderní. */
export function chartFor(region) {
  return regionTypes(region)?.chart ?? TYPE_CHART;
}

/** Typy, které v regionu existují (Kanto bez Dark/Steel/Fairy, Johto bez Fairy). */
export function typesInRegion(region) {
  return Object.keys(chartFor(region));
}

/**
 * Typy druhu v regionu: Clefairy je v Kantu i Johtu Normal, Magnemite v Kantu jen
 * Electric… (odchylky v data/genN/types.js), jinak typy ze species. Bez regionu =
 * domovský region druhu (Gen 1 druh → Kanto, Gen 2 → Johto) – pro Pokédex.
 * @param {{ id: string, gen?: number, types: string[] }} species
 * @param {string} [region]  region chycení / souboje
 */
export function speciesTypes(species, region) {
  const r = region ?? GENERATIONS.find((g) => g.gen === (species?.gen ?? 1))?.region;
  return regionTypes(r)?.species?.[species?.id] ?? species?.types ?? [];
}

/**
 * Typ útoku v regionu (Bite, Gust, Karate Chop… byly v Gen 1 Normal). null = bez typu.
 * @param {{ id: string, type?: string }} move
 * @param {string} [region]
 */
export function moveType(move, region) {
  const over = regionTypes(region)?.moves;
  if (over && move?.id in over) return over[move.id];
  return move?.type ?? null;
}
