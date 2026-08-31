/**
 * DATA: tabulka typové efektivity (jen typy, které zatím používáme).
 * Klíč = útočící typ, hodnota = násobitel proti bránícímu typu.
 * Chybějící kombinace = násobitel 1. Nové typy = jen doplnit data.
 */
export const TYPE_CHART = {
  Normal: {},
  Fire: { Grass: 2, Water: 0.5, Fire: 0.5 },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5 },
  Grass: { Water: 2, Fire: 0.5, Grass: 0.5, Poison: 0.5, Flying: 0.5 },
  Poison: { Grass: 2, Poison: 0.5 },
  Flying: { Grass: 2 },
};

/**
 * Celkový násobitel útoku daného typu proti (jednomu či dvěma) typům obránce.
 * @param {string} attackType
 * @param {string[]} defenderTypes
 * @returns {number}
 */
export function typeMultiplier(attackType, defenderTypes) {
  const row = TYPE_CHART[attackType] ?? {};
  return defenderTypes.reduce((mult, t) => mult * (row[t] ?? 1), 1);
}
