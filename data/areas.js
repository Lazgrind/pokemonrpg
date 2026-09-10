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
 * @property {(string|{id:string, rarity:"uncommon"|"rare"|"veryrare"})[]} species
 *   druhy Pokémonů v oblasti (nepřátelé i druh vajíčka); u měst prázdné. Položka je
 *   buď prostý string (tier "common"), nebo objekt `{ id, rarity }` s vyšší vzácností
 *   (viz RARITY_WEIGHTS + areaEncounters – vážený náhodný výběr ve spawnEnemy).
 * @property {Drop[]} drops     loot tabulka oblasti (zadání, sekce 6)
 * @property {string} [biome]   prostředí oblasti → sdílený pool pozadí souboje
 *   (viz `data/backgrounds.js`, `BACKGROUND_BIOMES`). Víc oblastí stejného biome
 *   sdílí stejná pozadí. Při každém novém setkání se z poolu náhodně vybere jedno.
 *   Když biome chybí/nemá obrázky, prosvítá fallback gradient.
 */

/**
 * @type {Area[]}
 * Pozice x/y naklikány uživatelem v placement módu mapy (2026-09-07, celé Kanto).
 */
export const AREAS = [
  {
    id: "pallet-town",
    name: "Pallet Town",
    type: "city",
    region: "Kanto",
    order: 0,
    x: 24,
    y: 64.7,
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
    x: 24,
    y: 56.5,
    // Nejdřív povinný souboj s rivalem v Pallet Town (stačí ho odehrát – viz
    // gateOnFight u rival-pallet); teprve pak se Route 1 otevře.
    unlock: { start: true, trainer: "rival-pallet" },
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
    x: 24.1,
    y: 46.8,
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
    x: 15.1,
    y: 46.1,
    unlock: { visited: "viridian-city" },
    recommendedLevel: 3,
    description: "The road west toward Victory Road. Home to scrappy wild Pokémon.",
    species: ["rattata", "spearow", "nidoran-m", "nidoran-f", "mankey", "poliwag"],
    biome: "grassland",
    drops: [],
  },
  {
    id: "route-02",
    name: "Route 2",
    type: "route",
    region: "Kanto",
    order: 4,
    x: 24.3,
    y: 39.3,
    // Sever z Viridianu je zavřený, dokud nedoručíš Oak's Parcel (věrné kánonu –
    // spící stařík tě jinak nepustí). Story-flag nastaví Oak's Lab po doručení.
    unlock: { visited: "viridian-city", story: "oakParcelDelivered" },
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
    x: 23.2,
    y: 31.8,
    unlock: { visited: "route-02" },
    recommendedLevel: 5,
    description: "A maze-like forest of tall trees. Bug Pokémon everywhere — and a rare Pikachu.",
    species: ["caterpie", "metapod", "weedle", "kakuna", "pidgey", { id: "pikachu", rarity: "rare" }],
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
    x: 25.4,
    y: 20.5,
    unlock: { visited: "viridian-forest" },
    recommendedLevel: 8,
    description: "A city of stone. Home to the first Gym — challenge Leader Brock for the Boulder Badge.",
    species: [],
    drops: [],
  },
  {
    id: "route-03",
    name: "Route 3",
    type: "route",
    region: "Kanto",
    order: 7,
    x: 37.1,
    y: 19.9,
    // Badge-gate: dál za Pewter City až po poražení Brocka (Boulder Badge).
    // Toto je hlavní odměna gym systému – Route 3 (a celý zbytek Kanta na ni
    // navázaný) se odemkne teprve po zisku odznaku. isAreaUnlocked vyžaduje
    // OBOJÍ: navštívené Pewter City + odznak.
    unlock: { visited: "pewter-city", badge: "boulder-badge" },
    recommendedLevel: 9,
    description: "A rocky path leading northeast from Pewter City toward Mt. Moon.",
    species: ["spearow", "rattata", "pidgey", { id: "jigglypuff", rarity: "rare" }, "mankey", "ekans", { id: "sandshrew", rarity: "uncommon" }],
    biome: "grassland",
    drops: [],
  },
  {
    id: "mt-moon",
    name: "Mt. Moon",
    type: "route",
    region: "Kanto",
    order: 8,
    x: 42.4,
    y: 14.3,
    unlock: { visited: "route-03" },
    recommendedLevel: 10,
    description: "A mysterious mountain cave. Fossils and ancient Pokémon dwell here.",
    species: ["zubat", "geodude", "paras", { id: "clefairy", rarity: "rare" }, { id: "sandshrew", rarity: "uncommon" }],
    biome: "cave",
    drops: [],
  },
  {
    id: "route-04",
    name: "Route 4",
    type: "route",
    region: "Kanto",
    order: 9,
    x: 54.3,
    y: 17.7,
    unlock: { visited: "mt-moon", story: "mtMoonRocketsCleared" },
    recommendedLevel: 11,
    description: "A desert-like passage on the far side of Mt. Moon.",
    species: ["rattata", "spearow", "ekans", { id: "sandshrew", rarity: "uncommon" }, "mankey"],
    biome: "grassland",
    drops: [],
  },
  {
    id: "cerulean-city",
    name: "Cerulean City",
    type: "city",
    region: "Kanto",
    order: 10,
    x: 64.9,
    y: 18.3,
    unlock: { visited: "route-04" },
    recommendedLevel: 12,
    description: "A city of waterfalls and bridges. The Cerulean Gym leader awaits.",
    species: [],
    drops: [],
  },
  {
    id: "route-24",
    name: "Route 24",
    type: "route",
    region: "Kanto",
    order: 11,
    x: 64.4,
    y: 11,
    unlock: { visited: "cerulean-city" },
    recommendedLevel: 12,
    description: "A coastal path north of Cerulean City, blooming with flowers.",
    species: ["oddish", "bellsprout", "pidgey", "caterpie", "weedle", { id: "abra", rarity: "rare" }, "poliwag"],
    biome: "grassland",
    drops: [],
  },
  {
    id: "route-25",
    name: "Route 25",
    type: "route",
    region: "Kanto",
    order: 12,
    x: 69.3,
    y: 6.4,
    unlock: { visited: "route-24" },
    recommendedLevel: 13,
    description: "An eastern route beyond Route 24. Home to rare botanical Pokémon.",
    species: ["oddish", "bellsprout", "pidgey", "caterpie", "weedle", { id: "abra", rarity: "rare" }, "kakuna", "metapod", "poliwag"],
    biome: "grassland",
    drops: [],
  },
  {
    id: "route-05",
    name: "Route 5",
    type: "route",
    region: "Kanto",
    order: 13,
    x: 64.6,
    y: 25.2,
    unlock: { visited: "cerulean-city" },
    recommendedLevel: 13,
    description: "A quiet path south of Cerulean City, filled with tall grass.",
    species: ["oddish", "bellsprout", "pidgey", "meowth", "mankey", { id: "abra", rarity: "rare" }],
    biome: "grassland",
    drops: [],
  },
  {
    id: "route-06",
    name: "Route 6",
    type: "route",
    region: "Kanto",
    order: 14,
    x: 64.7,
    y: 45,
    unlock: { visited: "route-05" },
    recommendedLevel: 13,
    description: "A path leading to the coast, where the roar of waves echoes.",
    species: ["oddish", "bellsprout", "pidgey", "meowth", "mankey", { id: "abra", rarity: "rare" }, "poliwag"],
    biome: "grassland",
    drops: [],
  },
  {
    id: "vermilion-city",
    name: "Vermilion City",
    type: "city",
    region: "Kanto",
    order: 15,
    x: 63.3,
    y: 55.6,
    unlock: { visited: "route-06" },
    recommendedLevel: 15,
    description: "A bustling port city. The Vermilion Gym leader, Lieutenant Surge, resides here.",
    species: [],
    drops: [],
  },
  {
    id: "route-11",
    name: "Route 11",
    type: "route",
    region: "Kanto",
    order: 16,
    x: 77.9,
    y: 56.3,
    unlock: { visited: "vermilion-city" },
    recommendedLevel: 14,
    description: "An eastern route from Vermilion City, home to wild Pokémon and trainers.",
    species: ["spearow", "ekans", { id: "sandshrew", rarity: "uncommon" }, "drowzee", "rattata", { id: "lickitung", rarity: "veryrare" }],
    biome: "grassland",
    drops: [],
  },
  {
    id: "digletts-cave",
    name: "Diglett's Cave",
    type: "route",
    region: "Kanto",
    order: 17,
    x: 71.5,
    y: 52.3,
    unlock: { visited: "route-11" },
    recommendedLevel: 18,
    description: "A narrow cave home to Diglett and Dugtrio. Watch your step!",
    species: ["diglett", { id: "dugtrio", rarity: "uncommon" }],
    biome: "cave",
    drops: [],
  },
  {
    id: "route-09",
    name: "Route 9",
    type: "route",
    region: "Kanto",
    order: 18,
    x: 76.3,
    y: 17.2,
    unlock: { visited: "cerulean-city" },
    recommendedLevel: 14,
    description: "A scenic mountain path connecting Cerulean City to Rock Tunnel.",
    species: ["rattata", "spearow", "ekans", { id: "sandshrew", rarity: "uncommon" }],
    biome: "grassland",
    drops: [],
  },
  {
    id: "rock-tunnel",
    name: "Rock Tunnel",
    type: "route",
    region: "Kanto",
    order: 19,
    x: 86.1,
    y: 20.7,
    // Věrný Kanto (Krok 6): temná jeskyně – potřebuješ HM05 Flash (dostaneš ho
    // na Route 9). Bez něj se dovnitř nedostaneš (story.hasFlash, viz areas gating).
    unlock: { visited: "route-09", story: "hasFlash" },
    recommendedLevel: 16,
    description: "A dark cavern filled with dangerous rock formations and wild Pokémon.",
    species: ["zubat", "geodude", { id: "machop", rarity: "uncommon" }, "onix", { id: "cubone", rarity: "rare" }],
    biome: "cave",
    drops: [],
  },
  {
    id: "route-10",
    name: "Route 10",
    type: "route",
    region: "Kanto",
    order: 20,
    x: 87.7,
    y: 28,
    unlock: { visited: "rock-tunnel" },
    recommendedLevel: 16,
    description: "A mountain path on the eastern slope, leading to Lavender Town.",
    species: ["rattata", "spearow", "ekans", { id: "sandshrew", rarity: "uncommon" }, "voltorb", { id: "machop", rarity: "uncommon" }],
    biome: "grassland",
    drops: [],
  },
  {
    id: "power-plant",
    name: "Power Plant",
    type: "route",
    region: "Kanto",
    order: 21,
    x: 86.6,
    y: 24.5,
    unlock: { visited: "route-10" },
    recommendedLevel: 22,
    description: "An industrial facility overflowing with Electric-type Pokémon.",
    species: ["voltorb", "magnemite", { id: "pikachu", rarity: "rare" }, { id: "electabuzz", rarity: "rare" }, "grimer", { id: "magneton", rarity: "uncommon" }, { id: "magmar", rarity: "rare" }],
    biome: "building",
    drops: [],
  },
  {
    id: "lavender-town",
    name: "Lavender Town",
    type: "city",
    region: "Kanto",
    order: 22,
    x: 89.1,
    y: 37.1,
    unlock: { visited: "route-10" },
    recommendedLevel: 18,
    description: "A quiet town known for its Pokémon Tower and Ghost-type mysteries.",
    species: [],
    drops: [],
  },
  {
    id: "route-08",
    name: "Route 8",
    type: "route",
    region: "Kanto",
    order: 23,
    x: 75.4,
    y: 36,
    unlock: { visited: "lavender-town" },
    recommendedLevel: 16,
    description: "A path west of Lavender Town toward Saffron City.",
    species: ["pidgey", "ekans", { id: "sandshrew", rarity: "uncommon" }, "meowth", { id: "growlithe", rarity: "rare" }, { id: "vulpix", rarity: "rare" }, { id: "abra", rarity: "rare" }, "drowzee", "gastly", { id: "haunter", rarity: "uncommon" }],
    biome: "grassland",
    drops: [],
  },
  {
    id: "saffron-city",
    name: "Saffron City",
    type: "city",
    region: "Kanto",
    order: 24,
    x: 64.6,
    y: 32.2,
    unlock: { visited: "route-08" },
    recommendedLevel: 20,
    description: "The grand metropolis of Kanto. Sabrina's Psychic Gym dominates the skyline.",
    species: [],
    drops: [],
  },
  {
    id: "route-07",
    name: "Route 7",
    type: "route",
    region: "Kanto",
    order: 25,
    x: 56.3,
    y: 37.3,
    unlock: { visited: "saffron-city" },
    recommendedLevel: 16,
    description: "A scenic route connecting Saffron City and Celadon City to the west.",
    species: ["pidgey", "oddish", "bellsprout", "meowth", { id: "growlithe", rarity: "rare" }, { id: "vulpix", rarity: "rare" }, { id: "abra", rarity: "rare" }],
    biome: "grassland",
    drops: [],
  },
  {
    id: "celadon-city",
    name: "Celadon City",
    type: "city",
    region: "Kanto",
    order: 26,
    x: 47.7,
    y: 32.4,
    unlock: { visited: "route-07" },
    recommendedLevel: 20,
    description: "The largest city in Kanto. Erika's Grass Gym is renowned throughout the land.",
    species: [],
    drops: [],
  },
  {
    id: "route-16",
    name: "Route 16",
    type: "route",
    region: "Kanto",
    order: 27,
    x: 38.2,
    y: 34.9,
    unlock: { visited: "celadon-city" },
    recommendedLevel: 18,
    description: "A path south of Celadon City, leading toward the seaside.",
    species: ["spearow", "doduo", "rattata", { id: "raticate", rarity: "uncommon" }, "grimer", "koffing"],
    biome: "grassland",
    drops: [],
  },
  {
    id: "route-17",
    name: "Route 17 (Cycling Road)",
    type: "route",
    region: "Kanto",
    order: 28,
    x: 36,
    y: 51.2,
    unlock: { visited: "route-16" },
    recommendedLevel: 22,
    description: "A thrilling downhill cycling road with fast-moving trainers and wild Pokémon.",
    species: ["spearow", "doduo", { id: "ponyta", rarity: "rare" }, "grimer", { id: "raticate", rarity: "uncommon" }, "koffing", { id: "weezing", rarity: "uncommon" }],
    biome: "grassland",
    drops: [],
  },
  {
    id: "route-18",
    name: "Route 18",
    type: "route",
    region: "Kanto",
    order: 29,
    x: 40.4,
    y: 74.8,
    unlock: { visited: "route-17" },
    recommendedLevel: 24,
    description: "A coastal route where the wind blows strong and wild Pokémon roam freely.",
    species: ["spearow", "doduo", { id: "raticate", rarity: "uncommon" }, "grimer", "koffing", { id: "weezing", rarity: "uncommon" }],
    biome: "grassland",
    drops: [],
  },
  {
    id: "fuchsia-city",
    name: "Fuchsia City",
    type: "city",
    region: "Kanto",
    order: 30,
    x: 50.2,
    y: 70.4,
    // Věrný Kanto (Krok 8): hlavní cesta do Fuchsia vede z jihu (Route 15). Cycling Road (route-18) zůstává boční slepá větev z Celadonu.
    unlock: { visited: "route-15" },
    recommendedLevel: 25,
    description: "An isolated city to the south. Janine's Poison Gym is hidden deep within.",
    species: [],
    drops: [],
  },
  {
    id: "safari-zone",
    name: "Safari Zone",
    type: "route",
    region: "Kanto",
    order: 31,
    x: 49.8,
    y: 62.2,
    unlock: { visited: "fuchsia-city" },
    recommendedLevel: 25,
    description: "A vast wildlife reserve teeming with rare and exotic Pokémon species.",
    species: ["nidoran-m", "nidoran-f", { id: "nidorina", rarity: "uncommon" }, { id: "nidorino", rarity: "uncommon" }, "paras", { id: "parasect", rarity: "uncommon" }, "venonat", "exeggcute", "rhyhorn", { id: "chansey", rarity: "veryrare" }, { id: "kangaskhan", rarity: "veryrare" }, { id: "scyther", rarity: "veryrare" }, { id: "pinsir", rarity: "veryrare" }, { id: "tauros", rarity: "veryrare" }, "doduo", { id: "tangela", rarity: "rare" }, { id: "dratini", rarity: "veryrare" }, { id: "dragonair", rarity: "veryrare" }],
    biome: "grassland",
    drops: [],
  },
  {
    id: "route-15",
    name: "Route 15",
    type: "route",
    region: "Kanto",
    order: 32,
    x: 64.3,
    y: 77.9,
    // Věrný Kanto (Krok 7): jižní osa Lavender→Fuchsia vede shora dolů
    // (Lavender → Route 12 → 13 → 14 → 15). Fuchsia je dostupná i přes Cycling Road.
    unlock: { visited: "route-14" },
    recommendedLevel: 23,
    description: "A path between Fuchsia City and the Safari Zone entrance.",
    species: ["oddish", "bellsprout", "venonat", "doduo", "spearow", { id: "ditto", rarity: "rare" }],
    biome: "grassland",
    drops: [],
  },
  {
    id: "route-14",
    name: "Route 14",
    type: "route",
    region: "Kanto",
    order: 33,
    x: 72.1,
    y: 72.8,
    unlock: { visited: "route-13" },
    recommendedLevel: 23,
    description: "A winding route connecting the inland areas toward the western side.",
    species: ["oddish", "bellsprout", "venonat", "doduo", "spearow", { id: "ditto", rarity: "rare" }],
    biome: "grassland",
    drops: [],
  },
  {
    id: "route-13",
    name: "Route 13",
    type: "route",
    region: "Kanto",
    order: 34,
    x: 79.1,
    y: 69.7,
    // Věrný Kanto (Krok 7): za Route 12 chrápe obří Snorlax a blokuje cestu dál na
    // jih. Probudíš ho Poké Flute (z Pokémon Tower) a porazíš → story.snorlaxCleared.
    unlock: { visited: "route-12", story: "snorlaxCleared" },
    recommendedLevel: 23,
    description: "A grassy route where trainers test their skills against wild creatures.",
    species: ["oddish", "bellsprout", "venonat", "doduo", "spearow", { id: "ditto", rarity: "rare" }, { id: "goldeen", rarity: "uncommon" }, { id: "seaking", rarity: "uncommon" }],
    biome: "grassland",
    drops: [],
  },
  {
    id: "route-12",
    name: "Route 12",
    type: "route",
    region: "Kanto",
    order: 35,
    x: 89.1,
    y: 62.9,
    // Věrný Kanto (Krok 7): Route 12 je jižní výstup z Lavenderu – tady spí Snorlax.
    unlock: { visited: "lavender-town" },
    recommendedLevel: 23,
    description: "A scenic waterfront route with both land and aquatic Pokémon.",
    species: ["oddish", "bellsprout", "venonat", "pidgey", { id: "ditto", rarity: "rare" }, "gastly", { id: "goldeen", rarity: "uncommon" }],
    biome: "grassland",
    drops: [],
  },
  {
    id: "route-19",
    name: "Route 19",
    type: "route",
    region: "Kanto",
    order: 36,
    x: 49.6,
    y: 87.8,
    // Věrný Kanto (Krok 8): moře na jih od Fuchsia – potřebuješ HM03 Surf (z Safari Zone).
    unlock: { visited: "fuchsia-city", story: "hasSurf" },
    recommendedLevel: 30,
    description: "A vast ocean expanse. Surfing Pokémon and Water-types patrol the waves.",
    species: ["tentacool", { id: "tentacruel", rarity: "uncommon" }],
    biome: "water",
    drops: [],
  },
  {
    id: "route-20",
    name: "Route 20",
    type: "route",
    region: "Kanto",
    order: 38,
    x: 32.4,
    y: 90,
    // Cesta k Cinnabaru: Route 19 → Seafoam Islands → Route 20 → Cinnabar Island.
    unlock: { visited: "seafoam-islands" },
    recommendedLevel: 30,
    description: "A narrow channel with swirling currents, running west from the Seafoam Islands to Cinnabar Island.",
    species: ["tentacool", { id: "tentacruel", rarity: "uncommon" }],
    biome: "water",
    drops: [],
  },
  {
    id: "seafoam-islands",
    name: "Seafoam Islands",
    type: "route",
    region: "Kanto",
    order: 37,
    x: 38.5,
    y: 93.3,
    // Kanonické pořadí: leží mezi Route 19 a Route 20 (nikoli až za 20).
    unlock: { visited: "route-19" },
    recommendedLevel: 30,
    description: "A chain of icy islands shrouded in mist. Ice and Water Pokémon thrive here.",
    species: ["zubat", { id: "golbat", rarity: "uncommon" }, { id: "seel", rarity: "rare" }, { id: "dewgong", rarity: "uncommon" }, "slowpoke", "psyduck", "krabby", { id: "horsea", rarity: "rare" }, { id: "shellder", rarity: "rare" }, { id: "staryu", rarity: "rare" }, "poliwag", { id: "poliwhirl", rarity: "uncommon" }],
    biome: "cave",
    // Speciální oblast – vlastní pozadí (per-area override v battleSystem.pickBackground)
    // místo sdíleného „cave" poolu. Ledová jeskyně Seafoam Islands.
    background: "seafoam-islands.png",
    drops: [],
  },
  {
    id: "route-21",
    name: "Route 21",
    type: "route",
    region: "Kanto",
    order: 40,
    x: 23.7,
    y: 79.9,
    // Kanonicky až ZA Cinnabarem: mořská cesta na sever zpět k Pallet Town.
    unlock: { visited: "cinnabar-island" },
    recommendedLevel: 30,
    description: "A long seaway north of Cinnabar Island, winding back toward Pallet Town.",
    species: ["tentacool", { id: "tentacruel", rarity: "uncommon" }, "pidgey", "rattata", "magikarp"],
    biome: "water",
    drops: [],
  },
  {
    id: "cinnabar-island",
    name: "Cinnabar Island",
    type: "city",
    region: "Kanto",
    order: 39,
    x: 23.8,
    y: 93.3,
    unlock: { visited: "route-20" },
    recommendedLevel: 30,
    description: "A volcanic island where Fire-type Pokémon roam. Blaine's Gym awaits here.",
    species: [],
    drops: [],
  },
  {
    id: "route-23",
    name: "Route 23",
    type: "route",
    region: "Kanto",
    order: 41,
    x: 12.6,
    y: 36.2,
    // Kanonická „badge check": vstup na Route 23 / k Victory Road vyžaduje poslední
    // odznak (Earth Badge od Giovanniho ve Viridian Gymu). Hráč se sem dostane přes
    // Cinnabar, ale bez Earth Badge musí zpět do Viridianu porazit Giovanniho.
    unlock: { visited: "cinnabar-island", badge: "earth-badge" },
    recommendedLevel: 32,
    description: "A mountain passage leading north toward the ultimate challenge of Victory Road.",
    species: ["spearow", { id: "fearow", rarity: "uncommon" }, "ekans", { id: "arbok", rarity: "uncommon" }, { id: "sandshrew", rarity: "uncommon" }, { id: "sandslash", rarity: "uncommon" }, "mankey", { id: "primeape", rarity: "uncommon" }, { id: "ponyta", rarity: "rare" }, { id: "ditto", rarity: "rare" }],
    biome: "mountain",
    drops: [],
  },
  {
    id: "victory-road",
    name: "Victory Road",
    type: "route",
    region: "Kanto",
    order: 42,
    x: 12,
    y: 26.7,
    // Věrný Kanto (Krok 8): Victory Road blokují balvany – potřebuješ HM04 Strength (od Wardena ve Fuchsia).
    unlock: { visited: "route-23", story: "hasStrength" },
    recommendedLevel: 34,
    description: "The final gauntlet before the Pokémon League. Powerful trainers and Pokémon await.",
    species: ["zubat", { id: "golbat", rarity: "uncommon" }, "geodude", { id: "graveler", rarity: "uncommon" }, "onix", { id: "machop", rarity: "uncommon" }, { id: "machoke", rarity: "uncommon" }, { id: "marowak", rarity: "uncommon" }],
    biome: "cave",
    drops: [],
  },
  {
    id: "indigo-plateau",
    name: "Indigo Plateau",
    type: "city",
    region: "Kanto",
    order: 43,
    x: 13.1,
    y: 5.1,
    unlock: { visited: "victory-road" },
    recommendedLevel: 40,
    description: "The legendary headquarters of the Pokémon League. The Elite Four reside here.",
    species: [],
    drops: [],
  },
  {
    id: "cerulean-cave",
    name: "Cerulean Cave",
    type: "route",
    region: "Kanto",
    order: 44,
    x: 57.6,
    y: 14.8,
    // Kanon: Cerulean Cave (Unknown Dungeon) se otevře až po zisku titulu Championa
    // (story.isChampion nastaví poražení celé Ligy) – uvnitř čeká Mewtwo.
    unlock: { visited: "indigo-plateau", story: "isChampion" },
    recommendedLevel: 50,
    description: "A mysterious cave harboring legendary and powerful Pokémon of unknown strength.",
    species: [{ id: "golbat", rarity: "uncommon" }, { id: "magneton", rarity: "uncommon" }, { id: "machoke", rarity: "uncommon" }, { id: "kadabra", rarity: "rare" }, { id: "ditto", rarity: "rare" }, { id: "chansey", rarity: "veryrare" }, { id: "rhydon", rarity: "uncommon" }, { id: "electrode", rarity: "uncommon" }, { id: "parasect", rarity: "uncommon" }],
    biome: "cave",
    drops: [],
  },
];

/**
 * Váhy raritních tierů pro vážený výběr divokého druhu v oblasti. Vyšší váha =
 * častější výskyt. Záznam v `area.species` může být buď prostý string (= tier
 * "common"), nebo objekt `{ id, rarity }` s jedním z tierů níže. Kánon Gen 1:
 * běžní ptáci/hlodavci jsou "common", speciality (Pikachu, Chansey, Dratini,
 * Kangaskhan, Scyther, Pinsir…) "rare"/"veryrare".
 * @type {Record<string, number>}
 */
export const RARITY_WEIGHTS = {
  common: 40,
  uncommon: 15,
  rare: 5,
  veryrare: 1,
};

/**
 * Znormalizuje `area.species` (mix stringů a objektů `{ id, rarity }`) na jednotný
 * seznam `{ id, weight }` pro vážený náhodný výběr. Neznámý/chybějící tier =
 * "common". Prázdné/neplatné položky se vyfiltrují.
 * @param {Area} area
 * @returns {{ id: string, weight: number }[]}
 */
export function areaEncounters(area) {
  const list = Array.isArray(area?.species) ? area.species : [];
  return list
    .map((e) => {
      if (typeof e === "string") return { id: e, weight: RARITY_WEIGHTS.common };
      const weight = RARITY_WEIGHTS[e?.rarity] ?? RARITY_WEIGHTS.common;
      return { id: e?.id, weight };
    })
    .filter((e) => e.id);
}

/**
 * Level ranges `[min, max]` (INKLUZIVNĚ) divokých Pokémonů per oblast. Rozšiřuje
 * dřívější chování (jen `recommendedLevel`..`+1` pro celou oblast) na kanonické
 * pásmo, aby souboje napříč Kantem líp odrážely postup příběhem. Klíč = `area.id`;
 * chybí-li oblast tady, `areaLevelRange` spadne na `[recommendedLevel,
 * recommendedLevel+1]` (zpětně kompatibilní). Města (bez `species`) neuvádíme.
 * Hodnoty jsou 1 tabulka k snadnému doladění (jako RARITY_WEIGHTS).
 * @type {Record<string, [number, number]>}
 */
export const AREA_LEVELS = {
  "route-01": [2, 4],
  "route-22": [2, 5],
  "route-02": [3, 5],
  "viridian-forest": [3, 6],
  "route-03": [7, 11],
  "mt-moon": [8, 12],
  "route-04": [8, 12],
  "route-24": [10, 14],
  "route-25": [11, 15],
  "route-05": [10, 14],
  "route-06": [11, 15],
  "route-11": [12, 16],
  "digletts-cave": [16, 22],
  "route-09": [11, 15],
  "rock-tunnel": [13, 18],
  "route-10": [14, 18],
  "power-plant": [20, 26],
  "route-08": [14, 19],
  "route-07": [14, 19],
  "route-16": [17, 22],
  "route-17": [20, 25],
  "route-18": [22, 26],
  "safari-zone": [22, 28],
  "route-15": [21, 26],
  "route-14": [21, 26],
  "route-13": [22, 27],
  "route-12": [22, 27],
  "route-19": [28, 33],
  "route-20": [28, 33],
  "seafoam-islands": [28, 35],
  "route-21": [28, 34],
  "route-23": [34, 40],
  "victory-road": [36, 44],
  "cerulean-cave": [46, 60],
};

/**
 * Vrátí `[min, max]` level divokého Pokémona pro oblast (inkluzivně, min ≥ 1,
 * max ≥ min). Explicitní pásmo z `AREA_LEVELS`, jinak fallback na staré chování
 * (`recommendedLevel`..`recommendedLevel+1`).
 * @param {Area} area
 * @returns {[number, number]}
 */
export function areaLevelRange(area) {
  const explicit = AREA_LEVELS[area?.id];
  if (Array.isArray(explicit) && explicit.length === 2) {
    const min = Math.max(1, Math.floor(explicit[0]));
    const max = Math.max(min, Math.floor(explicit[1]));
    return [min, max];
  }
  const rec = Math.max(1, Math.floor(area?.recommendedLevel ?? 1));
  return [rec, rec + 1];
}

/**
 * Náhodný level v pásmu oblasti (rovnoměrně, inkluzivně obě meze).
 * @param {Area} area
 * @returns {number}
 */
export function rollAreaLevel(area) {
  const [min, max] = areaLevelRange(area);
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Vytáhne čisté id druhu z jedné položky `species` (string nebo `{ id, rarity }`).
 * @param {string|{id:string}} entry
 * @returns {string|undefined}
 */
export function speciesEntryId(entry) {
  return typeof entry === "string" ? entry : entry?.id;
}

/**
 * Seznam id druhů oblasti BEZ rarity (ploché stringy). Pro místa, která pracují
 * jen s druhy (pooly route trenérů, líhnutí vajec, „kde chytit" v Pokédexu),
 * a NEzajímá je váha. Vyfiltruje prázdné položky.
 * @param {Area} area
 * @returns {string[]}
 */
export function areaSpeciesIds(area) {
  const list = Array.isArray(area?.species) ? area.species : [];
  return list.map(speciesEntryId).filter(Boolean);
}

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
 * `unlock.badge` navíc vyžaduje daný odznak (gym) a `unlock.trainer` navíc
 * vyžaduje poraženého trenéra/rivala (gate mini-boss) – obojí platí zároveň
 * s `visited` (AND).
 * @param {Area} area
 * @param {string[]} visited  id navštívených oblastí (state.progress.visited)
 * @param {string[]} badges   získané odznaky (state.progress.badges)
 * @param {string[]} defeatedTrainers  poražení trenéři (state.progress.defeatedTrainers)
 * @param {Record<string, boolean>} story  příběhové flagy (state.story) – pro `unlock.story`
 * @returns {boolean}
 */
export function isAreaUnlocked(area, visited = [], badges = [], defeatedTrainers = [], story = {}) {
  if (!area) return false;
  const u = area.unlock ?? {};
  // Odznak (gym gating) musí sedět vždy, když je požadovaný.
  if (u.badge && !(badges ?? []).includes(u.badge)) return false;
  // Gate mini-boss (rival/trenér) musí být poražen, když je požadovaný.
  if (u.trainer && !(defeatedTrainers ?? []).includes(u.trainer)) return false;
  // Příběhová podmínka (jednorázový event, např. doručení Oak's Parcel).
  if (u.story && !(story ?? {})[u.story]) return false;
  if (u.start) return true;
  if (u.visited) return (visited ?? []).includes(u.visited);
  return true; // bez podmínky = dostupné (jen odznak/trenér/story už prošli výše)
}
