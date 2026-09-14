/**
 * loot.js – losování odměn z poražených nepřátel (zadání, sekce 6).
 *
 * Loot je datově řízený: každá oblast má v `data/areas.js` pole `drops`
 * s pravděpodobnostmi. Přidání nového dropu = úprava dat, ne logiky.
 */

import { getPokeball } from "../../data/pokeballs.js";

/**
 * Přičte jeden vylosovaný loot do resources. Zdroj se směruje podle typu:
 * "gold" → ploché `res.gold`; id Poké Ballu → vnořená mapa `res.balls[id]`
 * (bally se drží po typech, viz pokeballSystem); cokoli jiného → obecný
 * top-level klíč. Sdílené aktivním soubojem i offline výpočtem.
 * @param {*} res       state.resources
 * @param {string} resource
 * @param {number} amount
 */
export function applyLoot(res, resource, amount) {
  if (resource === "gold") {
    res.gold = (res.gold ?? 0) + amount;
    return;
  }
  if (getPokeball(resource)) {
    if (!res.balls) res.balls = {};
    res.balls[resource] = (res.balls[resource] ?? 0) + amount;
    return;
  }
  res[resource] = (res[resource] ?? 0) + amount;
}

/**
 * Vylosuje loot za jednoho poraženého nepřítele.
 * @param {import("../../data/areas.js").Area} area
 * @returns {Array<{ resource: string, amount: number }>} co padlo (může být prázdné)
 */
export function rollLoot(area) {
  const drops = area?.drops ?? [];
  const out = [];
  for (const d of drops) {
    if (Math.random() < d.chance) {
      out.push({ resource: d.resource, amount: d.amount });
    }
  }
  return out;
}

/**
 * Očekávaný (průměrný) loot za N poražených – pro offline výpočet,
 * kde nemá smysl losovat tisíckrát. Vrací mapu resource → celkové množství.
 * @param {import("../../data/areas.js").Area} area
 * @param {number} kills
 * @returns {Record<string, number>}
 */
export function expectedLoot(area, kills) {
  const drops = area?.drops ?? [];
  /** @type {Record<string, number>} */
  const out = {};
  for (const d of drops) {
    const total = Math.floor(kills * d.chance * d.amount);
    if (total > 0) out[d.resource] = (out[d.resource] ?? 0) + total;
  }
  return out;
}
