/**
 * achievements.js – registr všech in-game úspěchů (v0.105.0).
 *
 * Každý achievement je: { id, name, desc, icon, category, check, reward }
 *  - check(d) je funkce vracející boolean; d je odvozené stats (dexCount, shinyCount atd.)
 *  - reward je { gold?, coins?, items?: { itemId: qty } }
 *  - Odemčení je perzistentní (state.achievements.unlocked[id] = timestamp)
 *  - Odměna se přidělí JEN JEDNOU (při prvním odemčení)
 */

export const ACHIEVEMENTS = [
  // --- Collection (Pokédex, shiny) ---
  {
    id: "first-catch",
    name: "First Catch",
    desc: "Catch your first Pokémon.",
    icon: "🎯",
    category: "collection",
    check: (d) => d.catches >= 1,
    reward: { gold: 200 },
  },
  {
    id: "dex-10",
    name: "Novice Collector",
    desc: "Register 10 species.",
    icon: "📘",
    category: "collection",
    check: (d) => d.dexCount >= 10,
    reward: { gold: 500 },
  },
  {
    id: "dex-50",
    name: "Seasoned Collector",
    desc: "Register 50 species.",
    icon: "📗",
    category: "collection",
    check: (d) => d.dexCount >= 50,
    reward: { gold: 1000, items: { "rare-candy": 1 } },
  },
  {
    id: "dex-100",
    name: "Master Collector",
    desc: "Register 100 species.",
    icon: "📙",
    category: "collection",
    check: (d) => d.dexCount >= 100,
    reward: { coins: 20, items: { "rare-candy": 3 } },
  },
  {
    id: "dex-151",
    name: "Kanto Completed",
    desc: "Register all 151 Kanto species.",
    icon: "🏆",
    category: "collection",
    check: (d) => d.dexCount >= 151,
    reward: { gold: 5000, coins: 50 },
  },
  {
    id: "first-shiny",
    name: "Shiny Hunter",
    desc: "Encounter and catch a Shiny Pokémon.",
    icon: "✨",
    category: "collection",
    check: (d) => d.shinyCount >= 1,
    reward: { coins: 30 },
  },

  // --- Battle (leveling) ---
  {
    id: "level-100",
    name: "Peak Power",
    desc: "Raise a Pokémon to Level 100.",
    icon: "💪",
    category: "battle",
    check: (d) => d.maxLevel >= 100,
    reward: { gold: 3000 },
  },

  // --- Story (gyms, league) ---
  {
    id: "first-badge",
    name: "Rookie Trainer",
    desc: "Earn your first Gym Badge.",
    icon: "🥉",
    category: "story",
    check: (d) => d.badges >= 1,
    reward: { gold: 500 },
  },
  {
    id: "all-badges",
    name: "Kanto Conqueror",
    desc: "Earn all 8 Gym Badges.",
    icon: "🎖️",
    category: "story",
    check: (d) => d.badges >= 8,
    reward: { gold: 5000 },
  },
  {
    id: "champion",
    name: "Champion!",
    desc: "Become the Pokémon League Champion.",
    icon: "👑",
    category: "story",
    check: (d) => d.isChampion,
    reward: { gold: 10000, coins: 50 },
  },

  // --- Breeding (eggs, evolution) ---
  {
    id: "first-hatch",
    name: "New Life",
    desc: "Hatch your first Egg.",
    icon: "🥚",
    category: "breeding",
    check: (d) => d.hatches >= 1,
    reward: { items: { "rare-candy": 1 } },
  },
  {
    id: "hatch-10",
    name: "Breeder",
    desc: "Hatch 10 Eggs.",
    icon: "🐣",
    category: "breeding",
    check: (d) => d.hatches >= 10,
    reward: { coins: 20 },
  },
  {
    id: "first-evolve",
    name: "Metamorphosis",
    desc: "Evolve a Pokémon for the first time.",
    icon: "🔄",
    category: "breeding",
    check: (d) => d.evolves >= 1,
    reward: { gold: 300 },
  },
  {
    id: "evolve-20",
    name: "Evolution Master",
    desc: "Evolve 20 Pokémon.",
    icon: "🧬",
    category: "breeding",
    check: (d) => d.evolves >= 20,
    reward: { items: { "rare-candy": 2 } },
  },

  // --- Economy (gold holding) ---
  {
    id: "gold-100k",
    name: "Loaded",
    desc: "Hold 100,000 Gold at once.",
    icon: "💰",
    category: "economy",
    check: (d) => d.gold >= 100000,
    reward: { coins: 30 },
  },
  {
    id: "rich-1m",
    name: "Millionaire",
    desc: "Hold 1,000,000 Gold at once.",
    icon: "🤑",
    category: "economy",
    check: (d) => d.gold >= 1000000,
    reward: { coins: 100 },
  },
];
