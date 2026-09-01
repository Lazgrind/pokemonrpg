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
 * @property {{ discountPerLevel: number, maxDiscount: number }} [ball]  sleva na Poké Bally v % (Poké Mart); ceny jsou v data/pokeballs.js
 * @property {{ basePercent: number, perLevel: number, maxPercent: number }} [heal]  doléčení po vítězství v % max HP (Pokémon Centrum)
 * @property {{ xpPerMinute: number, perLevel: number }} [daycare]  pasivní XP za minutu (Školka)
 * @property {{ baseEv: number, perLevel: number, goldCost: number }} [training]  trénink EV (Training Grounds): kolik EV za jednu placenou lekci (+perLevel za úroveň) a cena lekce v goldu
 * @property {Record<string, TrackDef>} [tracks]  samostatné upgrade linie budovy (vlastní úroveň i cena)
 *
 * @typedef {Object} TrackDef
 * @property {string} name          zobrazovaný název linie
 * @property {string} icon
 * @property {number} startLevel     počáteční úroveň linie
 * @property {number} maxLevel
 * @property {number} baseCost       cena prvního vylepšení (gold)
 * @property {number} growth         násobitel ceny za úroveň
 * @property {number} [perLevel]     efekt na úroveň v % (linie počítané procenty, např. PP regen)
 */

/** @type {BuildingDef[]} */
export const BUILDINGS = [
  {
    id: "poke-mart",
    name: "Poké Mart",
    icon: "🏪",
    color: "#3f6bff",
    sprite: "assets/buildings/poke-mart.png",
    description: "Sells Poké Balls for gold. Each upgrade lowers their prices. New ball types unlock as you explore.",
    startLevel: 1,
    maxLevel: 10,
    upgrade: { baseCost: 60, growth: 1.6 },
    ball: { discountPerLevel: 3, maxDiscount: 40 },
  },
  {
    id: "poke-center",
    name: "Pokémon Center",
    icon: "🏥",
    color: "#e0524e",
    sprite: "assets/buildings/poke-center.png",
    description: "After each victory, heals part of the active Pokémon's max HP. Upgrades heal more. A separate PP Regen line also tops up move PP after wins.",
    startLevel: 1,
    maxLevel: 50,
    upgrade: { baseCost: 50, growth: 1.12 },
    heal: { basePercent: 1, perLevel: 1, maxPercent: 50 },
    // Samostatná linie: doplnění PP tahů po výhře (auto battle). Level 0 = žádné
    // (výchozí), každá úroveň +perLevel %, cap 100 % na maxLevel. Efekt v
    // buildingSystem.ppRegenPercent(), aplikace v battleSystem po výhře.
    tracks: {
      ppRegen: { name: "PP regen", icon: "💧", startLevel: 0, maxLevel: 100, baseCost: 120, growth: 1.1, perLevel: 1 },
    },
  },
  {
    id: "day-care",
    name: "Day Care",
    icon: "🐣",
    color: "#7fc97f",
    sprite: "assets/buildings/day-care.png",
    description: "Leave a Pokémon here (outside your team) and it passively gains XP — even while you're away. Also incubates eggs.",
    startLevel: 1,
    maxLevel: 10,
    upgrade: { baseCost: 100, growth: 1.6 },
    daycare: { xpPerMinute: 3, perLevel: 3 },
    // Samostatné upgrade linie: rychlost líhnutí (1 %→50 % za 50 úrovní) a počet
    // slotů na inkubaci vajec (1→10). Efekty se počítají v buildingSystem.js.
    tracks: {
      hatchSpeed: { name: "Hatch speed", icon: "⏩", startLevel: 1, maxLevel: 50, baseCost: 50, growth: 1.12 },
      eggSlots: { name: "Egg slots", icon: "🥚", startLevel: 1, maxLevel: 10, baseCost: 300, growth: 1.7 },
    },
  },
  {
    id: "training-grounds",
    name: "Training Grounds",
    icon: "🏋️",
    color: "#c0713b",
    // sprite zatím není – použije se CSS domeček (fallback). Až přidáš
    // assets/buildings/training-grounds.png, doplň sem `sprite:` jako u ostatních.
    description: "Pay gold to train a Pokémon's Effort Values (EV) in a stat of your choice. Upgrades raise the EV gained per session. Caps: 252 per stat, 510 total.",
    startLevel: 1,
    maxLevel: 10,
    upgrade: { baseCost: 150, growth: 1.5 },
    // baseEv + (level-1)*perLevel EV za jednu lekci; každá lekce stojí goldCost.
    training: { baseEv: 4, perLevel: 4, goldCost: 50 },
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
