/**
 * DATA: budovy ve městě (zadání – koncept City → Building).
 *
 * Čistě data: parametry cenových křivek a efektů. Výpočty a aplikace efektů
 * žijí v `src/systems/buildingSystem.js`. Přidání další budovy = jen data zde.
 *
 * @typedef {Object} BuildingDef
 * @property {string} id
 * @property {string} name
 * @property {string} icon
 * @property {string} color        barva střechy (fallback, když není sprite)
 * @property {string} [sprite]     cesta k obrázku budovy (má přednost před CSS)
 * @property {string} description
 * @property {number} startLevel        počáteční úroveň (budova existuje od začátku)
 * @property {number} maxLevel
 * @property {{ baseCost: number, growth: number }} upgrade  cena vylepšení budovy (gold)
 * @property {{ basePrice: number, discountPerLevel: number, minPrice: number }} [ball]  cena Poké Ballu (Poké Mart)
 * @property {{ basePercent: number, perLevel: number }} [heal]  doléčení po vítězství v % max HP (Pokémon Centrum)
 */

/** @type {BuildingDef[]} */
export const BUILDINGS = [
  {
    id: "poke-mart",
    name: "Poké Mart",
    icon: "🏪",
    color: "#3f6bff",
    sprite: "assets/buildings/poke-mart.png",
    description: "Prodává Poké Bally za gold. Každé vylepšení sníží jejich cenu.",
    startLevel: 1,
    maxLevel: 10,
    upgrade: { baseCost: 60, growth: 1.6 },
    ball: { basePrice: 30, discountPerLevel: 3, minPrice: 6 },
  },
  {
    id: "poke-center",
    name: "Pokémon Centrum",
    icon: "🏥",
    color: "#e0524e",
    sprite: "assets/buildings/poke-center.png",
    description: "Po každém vítězství doléčí aktivnímu Pokémonovi část max HP. Vylepšení doléčí víc.",
    startLevel: 1,
    maxLevel: 10,
    upgrade: { baseCost: 80, growth: 1.55 },
    heal: { basePercent: 10, perLevel: 5 },
  },
];

/**
 * Najde definici budovy podle id.
 * @param {string} id
 * @returns {BuildingDef | undefined}
 */
export function getBuilding(id) {
  return BUILDINGS.find((b) => b.id === id);
}
