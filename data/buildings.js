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
    description: "Pokémon now earn Effort Values (EV) from every battle, just like in the games. Here you can buy EVs directly as a costly shortcut, or reset them — the whole spread or a single stat — for gold. Upgrades raise the EV bought per session. Caps: 252 per stat, 510 total.",
    startLevel: 1,
    maxLevel: 10,
    upgrade: { baseCost: 150, growth: 1.5 },
    // baseEv + (level-1)*perLevel EV za jednu lekci; každá lekce stojí goldCost.
    // Koupě je záměrně DRAHÝ luxus (grind ze soubojů je „zadarmo") – viz EV revamp.
    training: { baseEv: 4, perLevel: 4, goldCost: 800 },
    // Reset EV za gold: celý rozptyl (costAll) nebo jeden stat (costStat).
    // Reset je dostupný úklid náhodně nabraných EV (QoL), ne trest.
    reset: { costAll: 3000, costStat: 800 },
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
    sprite: "assets/buildings/oak-lab.png",
    name: "Oak's Lab",
    icon: "🔬",
    color: "#c9a24b",
    description: "Professor Oak's laboratory. Here you chose your starter and received your Pokédex.",
    story: "oak-lab",
  },
  {
    id: "player-home",
    sprite: "assets/buildings/player-home.png",
    name: "Your Home",
    icon: "🏠",
    color: "#6fae54",
    description: "Your house in Pallet Town. Mom is waiting inside.",
    story: "player-home",
  },
  {
    id: "rival-home",
    sprite: "assets/buildings/rival-home.png",
    name: "Rival's Home",
    icon: "🏡",
    color: "#b06a4b",
    description: "Your rival's house, right next door.",
    story: "rival-home",
  },
  {
    id: "pewter-museum",
    sprite: "assets/buildings/pewter-museum.png",
    name: "Museum of Science",
    icon: "🏛️",
    color: "#7c8aa0",
    description: "Pewter's famous Museum of Science — fossils on display, a moon stone, and a space exhibit.",
    story: "pewter-museum",
  },
  {
    id: "ss-anne",
    sprite: "assets/buildings/ss-anne.png",
    name: "S.S. Anne",
    icon: "🚢",
    color: "#4a7bb5",
    description: "A luxury liner docked at Vermilion City. Board it with the S.S. Anne Ticket.",
    story: "ss-anne",
  },
  {
    // Gen 2 (Johto): laboratoř Prof. Elma v New Bark Townu – tady si hráč vybere
    // Johto startéra (Chikorita / Cyndaquil / Totodile). Viz storyBuildingView „elm-lab".
    id: "elm-lab",
    sprite: "assets/buildings/elm-lab.png",
    name: "Prof. Elm's Lab",
    icon: "🔬",
    color: "#6aa84f",
    description: "Professor Elm's research lab in New Bark Town — where Johto trainers receive their first partner.",
    story: "elm-lab",
  },
  {
    id: "pokemon-tower",
    sprite: "assets/buildings/pokemon-tower.png",
    name: "Pokémon Tower",
    icon: "🗼",
    color: "#6b5b8a",
    description: "A tall tower in Lavender Town where departed Pokémon are laid to rest. Restless spirits haunt its upper floors.",
    story: "pokemon-tower",
  },
  {
    id: "mr-fuji-house",
    sprite: "assets/buildings/mr-fuji-house.png",
    name: "Mr. Fuji's House",
    icon: "🏡",
    color: "#a06a4b",
    description: "The home of Mr. Fuji, the kind old man who cares for orphaned Pokémon in Lavender Town.",
    story: "mr-fuji-house",
  },
  {
    id: "dept-store",
    sprite: "assets/buildings/dept-store.png",
    name: "Celadon Dept. Store",
    icon: "🏬",
    color: "#5a8bbf",
    description: "Kanto's biggest department store. Floors of items, TMs, and vending machines on the roof.",
    story: "dept-store",
  },
  {
    id: "game-corner",
    sprite: "assets/buildings/game-corner.png",
    name: "Rocket Game Corner",
    icon: "🎰",
    color: "#c25b7a",
    description: "A flashy slots parlor in Celadon. Rumor says Team Rocket runs it — and hides something beneath it.",
    story: "game-corner",
  },
  {
    id: "warden-house",
    sprite: "assets/buildings/warden-house.png",
    name: "Warden's House",
    icon: "🏡",
    color: "#a06a4b",
    description: "The home of the Safari Zone Warden. He cares deeply for the Pokemon in his reserve.",
    story: "warden-house",
  },
  {
    id: "pokemon-mansion",
    sprite: "assets/buildings/pokemon-mansion.png",
    name: "Pokémon Mansion",
    icon: "🏚️",
    color: "#8a5a3c",
    description: "A burnt-out mansion on Cinnabar Island. Old research journals — and a Secret Key — lie somewhere in its charred ruins.",
    story: "pokemon-mansion",
  },
  {
    id: "pokemon-lab",
    sprite: "assets/buildings/pokemon-lab.png",
    name: "Pokémon Lab",
    icon: "🧪",
    color: "#5a9bb5",
    description: "Cinnabar Island's research laboratory. Scientists here revive fossils into living Pokémon and study rare specimens.",
    story: "pokemon-lab",
  },
  {
    id: "silph-co",
    sprite: "assets/buildings/silph-co.png",
    name: "Silph Co.",
    icon: "🏢",
    color: "#5566aa",
    description: "Saffron's proud technology giant — maker of the Master Ball. Team Rocket has seized its tower floor by floor.",
    story: "silph-co",
  },
  {
    id: "celadon-mansion",
    sprite: "assets/buildings/celadon-mansion.png",
    name: "Celadon Mansion",
    icon: "🏨",
    color: "#8a6ab0",
    description: "A quiet apartment block in Celadon City. A game-loving kid on the top floor is looking for a home for one of his Pokémon.",
    story: "celadon-mansion",
  },
  {
    id: "fighting-dojo",
    sprite: "assets/buildings/fighting-dojo.png",
    name: "Fighting Dojo",
    icon: "🥋",
    color: "#b5623c",
    description: "Saffron's Fighting Dojo, once a rival to the city Gym. Defeat its master and he'll let you take one of his prized Fighting Pokémon — here, both are yours.",
    story: "fighting-dojo",
  },
  {
    id: "viridian-trade-house",
    sprite: "assets/buildings/viridian-trade-house.png",
    name: "Trade House",
    icon: "🏠",
    color: "#8fae6a",
    description: "A cramped house in Viridian City. A collector inside is looking to trade a Pokémon.",
    story: "viridian-trade-house",
  },
  {
    id: "cerulean-trade-house",
    sprite: "assets/buildings/cerulean-trade-house.png",
    name: "Trade House",
    icon: "🏠",
    color: "#6a9fae",
    description: "A tidy home in Cerulean City. The owner wants to trade one of her Pokémon.",
    story: "cerulean-trade-house",
  },
  {
    id: "vermilion-trade-house",
    sprite: "assets/buildings/vermilion-trade-house.png",
    name: "Trade House",
    icon: "🏠",
    color: "#c9a24b",
    description: "A sailor's house in Vermilion City. He's itching to trade a rare Pokémon.",
    story: "vermilion-trade-house",
  },
  {
    id: "vermilion-fishing-hut",
    sprite: "assets/buildings/vermilion-fishing-hut.png",
    name: "Fishing Hut",
    icon: "🎣",
    color: "#6a9fae",
    description: "A humble fishing hut by the waters of Vermilion City. An old fisherman teaches trainers the art of fishing.",
    story: "vermilion-fishing-hut",
  },
  {
    id: "fuchsia-fishing-house",
    sprite: "assets/buildings/fuchsia-fishing-house.png",
    name: "Fishing House",
    icon: "🎣",
    color: "#a87c5c",
    description: "A cozy house near the Safari Zone in Fuchsia City. A master fisherman lives here with knowledge of rare fishing techniques.",
    story: "fuchsia-fishing-house",
  },
  {
    // Idle-boost budova v Celadonu (vedle Game Corner). Tři nezávislé, TRVALÉ
    // upgrade linie (tracks) s tvrdým stropem 50 a exponenciální cenou, aby se
    // nedaly rychle vyfarmit: ⭐ XP (+1 %/lvl → ×1,5), 💰 Yield gold (+1 %/lvl →
    // ×1,5), ✨ Fortune shiny (+0,4 %/lvl → ×1,2; záměrně mrňavé, ať se to
    // nesčítá s Shiny Charmem do OP hodnot). Efekty čte buildingSystem.boostMult.
    id: "boost-center",
    sprite: "assets/buildings/boost-center.png",
    name: "Trainer Boost Center",
    icon: "💪",
    color: "#d98c2b",
    description:
      "A members-only training facility in bustling Celadon. Invest gold into three lifelong perks — faster XP gain, better fortune, and richer battle payouts.",
    story: "boost-center",
    tracks: {
      xp: { name: "XP Boost", icon: "⭐", startLevel: 0, maxLevel: 50, baseCost: 1500, growth: 1.15, perLevel: 0.01 },
      yield: { name: "Yield", icon: "💰", startLevel: 0, maxLevel: 50, baseCost: 1500, growth: 1.15, perLevel: 0.01 },
      fortune: { name: "Fortune", icon: "✨", startLevel: 0, maxLevel: 50, baseCost: 1500, growth: 1.15, perLevel: 0.004 },
    },
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
  "viridian-city": ["poke-center", "poke-mart", "viridian-trade-house"],
  // Pewter City: služby + příběhové Museum of Science. Gym (Brock) má vlastní tab.
  "pewter-city": ["poke-center", "poke-mart", "pewter-museum"],
  // Cerulean City: služby (Center + Mart). Gym (Misty) má vlastní tab.
  "cerulean-city": ["poke-center", "poke-mart", "cerulean-trade-house"],
  // Vermilion City: služby + příběhová S.S. Anne (loď). Gym (Lt. Surge) má vlastní
  // tab, ale je zamčený stromem dokud hráč nemá HM Cut (viz gyms.js requiresStory).
  "vermilion-city": ["poke-center", "poke-mart", "ss-anne", "vermilion-trade-house", "vermilion-fishing-hut"],
  // Celadon City: služby + Dept Store + Game Corner (s skrytou Rocket základnou).
  // Gym (Erika) má vlastní tab.
  "celadon-city": ["poke-center", "poke-mart", "dept-store", "game-corner", "boost-center", "celadon-mansion"],
  // Lavender Town: služby + Pokémon Tower (zamčená duchem – potřebuje Silph Scope
  // z pozdějšího kroku) + dům Mr. Fujiho. Lavender nemá gym.
  "lavender-town": ["poke-center", "poke-mart", "pokemon-tower", "mr-fuji-house"],
  // Saffron City: služby + Silph Co (Team Rocket, gauntlet → Master Ball). Gym
  // (Sabrina) má vlastní tab, zamčený dokud neosvobodíš Silph Co (viz gyms.js).
  "saffron-city": ["poke-center", "poke-mart", "silph-co", "fighting-dojo"],
  // Fuchsia City: služby + Warden's House (kde hráč vrací Gold Teeth a dostane HM04 Strength).
  // Gym (Koga) má vlastní tab.
  "fuchsia-city": ["poke-center", "poke-mart", "warden-house", "fuchsia-fishing-house"],
  // Cinnabar Island: služby + Pokémon Lab (flavour) + vyhořelý Pokémon Mansion
  // (kde hráč najde Secret Key). Gym (Blaine) má vlastní tab, zamčený dokud
  // hráč nemá Secret Key (viz gyms.js requiresStory).
  "cinnabar-island": ["poke-center", "poke-mart", "pokemon-lab", "pokemon-mansion"],
  // Indigo Plateau (Pokémon League): Center + Mart. Dřív tu kvůli chybějícímu
  // rosteru padal fallback na PLNOU idle pětici (viz buildingsForCity) → Day Care,
  // Training Grounds i Move Tutor se objevovaly „až v lize", což je nekanonické.
  // Day Care se přesunul na vlastní tab na Route 5 (viz daycareView), Move Tutor
  // na vlastní tab na Route 8 (viz moveTutorView). Training Grounds (EV trénink +
  // reset) se přestěhoval do Fighting Dojo v Saffronu (sekce „EV Training" ve
  // storyBuildingView.js, klíčováno na id "training-grounds"). Indigo Plateau má
  // teď jen kanonickou dvojici Poké Center + Poké Mart.
  "indigo-plateau": ["poke-center", "poke-mart"],
  // --- Gen 2 (Johto) ---
  // New Bark Town: placeholder start Johta. Prof. Elm's Lab (výběr startéra) +
  // základní služby, ať se dá tým doléčit a nakoupit. Další Johto města přibudou.
  "new-bark-town": ["elm-lab", "poke-center", "poke-mart"],
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
