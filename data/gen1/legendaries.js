/**
 * DATA: legendární setkání generace 1 (mapa areaId → setkání). Čistá data.
 * Helper legendaryForArea + sloučení generací viz ../legendaries.js.
 */

export const LEGENDARY_GEN1 = {
  "seafoam-islands": {
    id: "articuno-seafoam",
    areaId: "seafoam-islands",
    speciesId: "articuno",
    level: 50,
    tabLabel: "Articuno",
    tabIcon: "❄️",
    // Kanon: k Articunovi se dostaneš, až umíš odstrkávat balvany (Strength).
    requiresStory: "hasStrength",
    title: "Articuno — the Freeze Pokémon",
    intro:
      "Deep in the frozen heart of the Seafoam caves, past boulders you can only shift with Strength, a legendary bird roosts on a shelf of blue ice.",
    lore:
      "Articuno is a legendary bird said to appear to those lost in icy wastes. Its beautiful blue wings are made of ice. It won't come quietly — weaken it and be ready to spend your best Poké Balls. Make it faint and it will simply retreat deeper into the ice, to be faced again another day.",
    button: "Face Articuno",
  },

  "power-plant": {
    id: "zapdos-power-plant",
    areaId: "power-plant",
    speciesId: "zapdos",
    level: 50,
    tabLabel: "Zapdos",
    tabIcon: "⚡",
    // Kanon: k Power Plantu (a k Zapdosovi hluboko uvnitř) se dostaneš přes vodu – Surf.
    requiresStory: "hasSurf",
    title: "Zapdos — the Electric Pokémon",
    intro:
      "Deep inside the abandoned Power Plant, where dead machinery still crackles with stray current, a legendary bird of lightning perches amid the sparks.",
    lore:
      "Zapdos is a legendary bird said to appear from clouds while dropping enormous lightning bolts. Its body arcs with electricity — approach it and the very air hums. Wear it down and spend your best Poké Balls; make it faint and it will vanish in a flash of light, to gather its power and return another day.",
    button: "Face Zapdos",
  },

  "victory-road": {
    id: "moltres-victory-road",
    areaId: "victory-road",
    speciesId: "moltres",
    level: 50,
    tabLabel: "Moltres",
    tabIcon: "🔥",
    // Kanon: Moltres hnízdí hluboko ve Victory Road, za balvany – potřebuješ Strength.
    requiresStory: "hasStrength",
    title: "Moltres — the Flame Pokémon",
    intro:
      "In the deepest chamber of Victory Road, past boulders you shove aside with Strength, the rock walls glow orange — and a legendary bird wreathed in living flame spreads its burning wings.",
    lore:
      "Moltres is a legendary bird said to bring an early spring wherever it flies. Its wings shimmer with fire and its every beat scatters embers. It will not yield easily — weaken it and be ready with your best Poké Balls. Make it faint and its flames will simply carry it away, to be faced again another day.",
    button: "Face Moltres",
  },

  "cerulean-cave": {
    id: "mewtwo-cerulean-cave",
    areaId: "cerulean-cave",
    speciesId: "mewtwo",
    level: 70,
    tabLabel: "Mewtwo",
    tabIcon: "🧬",
    // Kanon: Cerulean Cave (Unknown Dungeon) se otevře až Championovi – flag `isChampion`
    // nastaví Krok 10 po poražení Elite Four + Championa.
    requiresStory: "isChampion",
    title: "Mewtwo — the Genetic Pokémon",
    intro:
      "At the heart of the Cerulean Cave, in a silent cavern that only a Champion may reach, a being of impossible power waits in the dark. Its cold eyes lock onto yours.",
    lore:
      "Mewtwo is a Pokémon created by recombining Mew's genes — engineered to be the most savagely powerful Pokémon in the world. It has a vicious, brutal heart. This is the ultimate test: bring your strongest team, wear it down without letting it tear through you, and spend your very best Poké Balls. Make it faint and it will withdraw into the depths, to be faced again another day.",
    button: "Face Mewtwo",
  },
};
