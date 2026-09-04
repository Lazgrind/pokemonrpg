/**
 * DATA: oblasti světa (uzly klikací mapy).
 *
 * Mapa je klikací (viz src/ui/mapView.js): každý uzel má pozici `x`/`y` v %
 * na obrázku mapy (assets/map/kanto.webp) a hráč na něj klikne, čímž se
 * „přesune" – nastaví se aktivní oblast (state.progress.activeAreaId) a
 * souboje pak spawnují nepřátele odsud (viz battleSystem.getActiveArea).
 *
 * Postup je LINEÁRNÍ přes NÁVŠTĚVY (nintendo styl): uzel se odemkne, když hráč
 * navštívil (klikl na) předchozí uzel v řetězu – `unlock.visited = "<id>"`.
 * `unlock.start = true` = odemčeno od začátku. Navštívené uzly drží
 * state.progress.visited (plní se v battleSystem.setActiveArea).
 *
 * Řetěz MVP (po Pewter City = 1. gym):
 *   Pallet Town (start) → Route 1 (start) → [vstup na Route 1] → Viridian City
 *   → [vstup do Viridianu] → Route 2 + Route 22 → [vstup na Route 2] →
 *   Viridian Forest → [vstup do lesa] → Pewter City.
 * Route 22 je volitelná západní odbočka (odemkne se vstupem do Viridianu).
 * Gymy později připíšou odznak (state.progress.badges) – přidá se jako další
 * podmínka; návštěvní logika zůstane. (Diglett's Cave a Route 3 jsou až za
 * Pewter → přibudou později.)
 *
 * @typedef {Object} Drop
 * @property {string} resource  klíč do state.resources (např. "pokeballs")
 * @property {number} chance    pravděpodobnost dropu za jednoho poraženého (0–1)
 * @property {number} amount    kolik se přičte při dropu
 *
 * @typedef {Object} Area
 * @property {string} id
 * @property {string} name
 * @property {"route"|"city"} type  route = bojová cesta (má species); city = město
 *                               (zatím bez soubojů, později obchody/gym)
 * @property {string} region
 * @property {number} order      pořadí v příběhovém řetězu (jen pro přehled)
 * @property {number} x          pozice markeru na mapě, vodorovně v % (0–100)
 * @property {number} y          pozice markeru na mapě, svisle v % (0–100)
 * @property {{ start?: boolean, visited?: string, badge?: string }} unlock  podmínka odemčení:
 *   `start` = odemčeno od začátku; `visited` = odemkne se po návštěvě daného uzlu;
 *   `badge` = navíc vyžaduje daný odznak (id) z gymu (state.progress.badges).
 *   `visited` + `badge` platí zároveň (AND) – např. route za Pewter až po Brockovi.
 * @property {number} recommendedLevel
 * @property {string} description
 * @property {string[]} species  druhy Pokémonů v oblasti (nepřátelé i druh vajíčka);
 *                               u měst prázdné
 * @property {Drop[]} drops     loot tabulka oblasti (zadání, sekce 6)
 * @property {string} [biome]   prostředí oblasti → sdílený pool pozadí souboje
 *   (viz `data/backgrounds.js`, `BACKGROUND_BIOMES`). Víc oblastí stejného biome
 *   sdílí stejná pozadí. Při každém novém setkání se z poolu náhodně vybere jedno.
 *   Když biome chybí/nemá obrázky, prosvítá fallback gradient.
 */

/**
 * @type {Area[]}
 * ⚠️ Pozice x/y jsou odhad na art mapě Kanta – dolaď podle oka (stačí změnit čísla).
 */
export const AREAS = [
  {
    id: "pallet-town",
    name: "Pallet Town",
    type: "city",
    region: "Kanto",
    order: 0,
    x: 45,
    y: 76,
    unlock: { start: true },
    recommendedLevel: 1,
    description: "Your home town. Shops and services will open here later.",
    species: [],
    drops: [],
  },
  {
    id: "route-01",
    name: "Route 1",
    type: "route",
    region: "Kanto",
    order: 1,
    x: 46,
    y: 66,
    unlock: { start: true },
    recommendedLevel: 1,
    description: "A calm grassy path just outside town. Perfect for your first expedition.",
    species: ["pidgey", "rattata"],
    // Prostředí → sdílený pool pozadí (data/backgrounds.js). Route 1 je louka.
    biome: "grassland",
    drops: [],
  },
  {
    id: "viridian-city",
    name: "Viridian City",
    type: "city",
    region: "Kanto",
    order: 2,
    x: 43,
    y: 57,
    unlock: { visited: "route-01" },
    recommendedLevel: 3,
    description: "The first city on your journey. Its Gym is locked for now.",
    species: [],
    drops: [],
  },
  {
    id: "route-22",
    name: "Route 22",
    type: "route",
    region: "Kanto",
    order: 3,
    x: 33,
    y: 55,
    unlock: { visited: "viridian-city" },
    recommendedLevel: 3,
    description: "The road west toward Victory Road. Home to scrappy wild Pokémon.",
    species: ["rattata", "spearow", "nidoran-m", "nidoran-f", "mankey"],
    biome: "grassland",
    drops: [],
  },
  {
    id: "route-02",
    name: "Route 2",
    type: "route",
    region: "Kanto",
    order: 4,
    x: 44,
    y: 45,
    unlock: { visited: "viridian-city" },
    recommendedLevel: 4,
    description: "The path north of Viridian, leading toward Viridian Forest.",
    species: ["caterpie", "weedle", "pidgey", "rattata"],
    biome: "grassland",
    drops: [],
  },
  {
    id: "viridian-forest",
    name: "Viridian Forest",
    type: "route",
    region: "Kanto",
    order: 5,
    x: 40,
    y: 37,
    unlock: { visited: "route-02" },
    recommendedLevel: 5,
    description: "A maze-like forest of tall trees. Bug Pokémon everywhere — and a rare Pikachu.",
    species: ["caterpie", "metapod", "weedle", "kakuna", "pidgey", "pikachu"],
    // biome "forest" – vlastní pool pozadí zatím v data/backgrounds.js NENÍ,
    // takže se použije fallback gradient. Přidat forest obrázky později.
    biome: "forest",
    drops: [],
  },
  {
    id: "pewter-city",
    name: "Pewter City",
    type: "city",
    region: "Kanto",
    order: 6,
    x: 33,
    y: 30,
    unlock: { visited: "viridian-forest" },
    recommendedLevel: 8,
    description: "A city of stone. Home to the first Gym — Leader Brock — coming soon.",
    species: [],
    drops: [],
  },
];

/**
 * Najde oblast podle id.
 * @param {string} id
 * @returns {Area|null}
 */
export function getArea(id) {
  return AREAS.find((a) => a.id === id) ?? null;
}

/**
 * Je oblast odemčená? Odemčení řídí NÁVŠTĚVY (progress.visited): `start` uzel
 * je vždy dostupný, ostatní až po návštěvě uzlu v `unlock.visited`. Volitelně
 * `unlock.badge` navíc vyžaduje daný odznak (gym) – platí zároveň s `visited`.
 * @param {Area} area
 * @param {string[]} visited  id navštívených oblastí (state.progress.visited)
 * @param {string[]} badges   získané odznaky (state.progress.badges)
 * @returns {boolean}
 */
export function isAreaUnlocked(area, visited = [], badges = []) {
  if (!area) return false;
  const u = area.unlock ?? {};
  // Odznak (gym gating) musí sedět vždy, když je požadovaný.
  if (u.badge && !(badges ?? []).includes(u.badge)) return false;
  if (u.start) return true;
  if (u.visited) return (visited ?? []).includes(u.visited);
  return true; // bez podmínky = dostupné (jen odznak už prošel výše)
}
