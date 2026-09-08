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
 * @property {boolean} [moveTutor]  Move Tutor: budova umožní přeskládat aktivní tahy z celého level-up movepoolu (bez efektu na cenu/level)
 * @property {Record<string, TrackDef>} [tracks]  samostatné upgrade linie budovy (vlastní úroveň i cena)
 * @property {string} [story]  klíč story-handleru (interakční budova BEZ upgradu/levelu; viz src/ui/storyBuildingView.js).
 *   Story budovy se nezobrazují s „Lv X" a klik je nevede do buildingView, ale do příběhové interakce.
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
    sprite: "assets/buildings/training-grounds.png",
    description: "Pay gold to train a Pokémon's Effort Values (EV) in a stat of your choice. Upgrades raise the EV gained per session. Caps: 252 per stat, 510 total.",
    startLevel: 1,
    maxLevel: 10,
    upgrade: { baseCost: 150, growth: 1.5 },
    // baseEv + (level-1)*perLevel EV za jednu lekci; každá lekce stojí goldCost.
    training: { baseEv: 4, perLevel: 4, goldCost: 50 },
  },
  {
    id: "move-tutor",
    name: "Move Tutor",
    icon: "📖",
    color: "#8e5bd0",
    sprite: "assets/buildings/move-tutor.png",
    description: "Freely rearrange a Pokémon's four active moves from everything it can learn by level-up — reteach forgotten moves, and pick up an evolved form's new moves.",
    startLevel: 1,
    maxLevel: 1, // budova buď stojí, nebo ne; přeučení tahů je zdarma a bez levelů
    upgrade: { baseCost: 200, growth: 1 },
    moveTutor: true,
  },
];

/**
 * Story/interakční budovy (věrné Kanto). Nemají upgrade ani level – klik otevře
 * příběhovou interakci (viz src/ui/storyBuildingView.js). Pole `story` = klíč handleru.
 * Sprity zatím nejsou (necháme CSS domeček s ikonou; radši prázdno než cizí obrázek).
 * @type {BuildingDef[]}
 */
export const STORY_BUILDINGS = [
  {
    id: "oak-lab",
    name: "Oak's Lab",
    icon: "🔬",
    color: "#c9a24b",
    description: "Professor Oak's laboratory. Here you chose your starter and received your Pokédex.",
    story: "oak-lab",
  },
  {
    id: "player-home",
    name: "Your Home",
    icon: "🏠",
    color: "#6fae54",
    description: "Your house in Pallet Town. Mom is waiting inside.",
    story: "player-home",
  },
  {
    id: "rival-home",
    name: "Rival's Home",
    icon: "🏡",
    color: "#b06a4b",
    description: "Your rival's house, right next door.",
    story: "rival-home",
  },
  {
    id: "pewter-museum",
    name: "Museum of Science",
    icon: "🏛️",
    color: "#7c8aa0",
    description: "Pewter's famous Museum of Science — fossils, a moon stone, and a space exhibit. Bring a fossil here to have it revived.",
    story: "pewter-museum",
  },
  {
    id: "ss-anne",
    name: "S.S. Anne",
    icon: "🚢",
    color: "#4a7bb5",
    description: "A luxury liner docked at Vermilion City. Board it with the S.S. Anne Ticket.",
    story: "ss-anne",
  },
];

/**
 * Roster budov pro konkrétní město (areaId → seznam id budov v pořadí). Města,
 * která tu NEJSOU uvedená, dostanou výchozí idle pětici (BUILDINGS). Věrnost
 * Kanto: Pallet Town nemá Poké Center ani Mart – jen laboratoř a domy.
 * @type {Record<string, string[]>}
 */
export const CITY_BUILDINGS = {
  "pallet-town": ["oak-lab", "player-home", "rival-home"],
  // Viridian City: první skutečné služby (Center + Mart). Gym má vlastní tab
  // (zatím zavřený, viz gymView isGymOpen) – ne jako budova v City rosteru.
  "viridian-city": ["poke-center", "poke-mart"],
  // Pewter City: služby + příběhové Museum of Science. Gym (Brock) má vlastní tab.
  "pewter-city": ["poke-center", "poke-mart", "pewter-museum"],
  // Cerulean City: služby (Center + Mart). Gym (Misty) má vlastní tab.
  "cerulean-city": ["poke-center", "poke-mart"],
  // Vermilion City: služby + příběhová S.S. Anne (loď). Gym (Lt. Surge) má vlastní
  // tab, ale je zamčený stromem dokud hráč nemá HM Cut (viz gyms.js requiresStory).
  "vermilion-city": ["poke-center", "poke-mart", "ss-anne"],
};

/** Všechny známé budovy (idle + story) pro vyhledávání podle id. */
const ALL_BUILDINGS = [...BUILDINGS, ...STORY_BUILDINGS];

/**
 * Budovy zobrazené v daném městě. Neznámé/neuvedené město → výchozí idle pětice.
 * @param {string} [cityId]
 * @returns {BuildingDef[]}
 */
export function buildingsForCity(cityId) {
  const ids = CITY_BUILDINGS[cityId];
  if (!ids) return BUILDINGS;
  return ids.map((id) => ALL_BUILDINGS.find((b) => b.id === id)).filter(Boolean);
}

/**
 * Najde definici budovy podle id (idle i story).
 * @param {string} id
 * @returns {BuildingDef | undefined}
 */
export function getBuilding(id) {
  return ALL_BUILDINGS.find((b) => b.id === id);
}
