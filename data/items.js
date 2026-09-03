/**
 * items.js – DATA vrstva léčivých předmětů (v0.45.0).
 *
 * Čistá data (žádná logika): definice itemů, ceny a jejich efekt. Herní logiku
 * (nákup, použití, ověření cíle) řeší src/systems/itemSystem.js; UI obchod je
 * v buildingView.js (openItemShop) a batoh v bagView.js / battleView.js.
 *
 * Efekt je datově řízený, aby přidání nového itemu bylo jen přidání záznamu:
 *   { kind: "heal",   amount: number | "full" }              – doplní HP
 *   { kind: "cure",   status: "poison"|"burn"|"paralysis"|"any" } – sundá stav
 *   { kind: "revive", healFrac: number | "full" }            – oživí vyřazeného
 *
 * @typedef {Object} ItemDef
 * @property {string} id
 * @property {string} name
 * @property {string} icon
 * @property {string} desc
 * @property {number} price          cena v goldu (nákup v Poké Martu)
 * @property {"hp"|"status"|"revive"|"held"} category  sekce v obchodě/batohu
 * @property {{ kind: "heal", amount: number|"full" }
 *          | { kind: "cure", status: "poison"|"burn"|"paralysis"|"any" }
 *          | { kind: "revive", healFrac: number|"full" }
 *          | undefined } effect
 * @property {{ kind: "endTurnHeal", fraction: number }
 *          | { kind: "lowHpHeal", threshold: number, amount: number }
 *          | undefined } held  efekt v boji (jen pro held itemy)
 */

/** @type {ItemDef[]} */
export const ITEMS = [
  // --- Potiony: doplnění HP (nefungují na vyřazeného – nejdřív Revive) ---
  { id: "potion", name: "Potion", icon: "🧴", desc: "Restores 20 HP.", price: 30, category: "hp", effect: { kind: "heal", amount: 20 } },
  { id: "super-potion", name: "Super Potion", icon: "🧪", desc: "Restores 60 HP.", price: 100, category: "hp", effect: { kind: "heal", amount: 60 } },
  { id: "hyper-potion", name: "Hyper Potion", icon: "⚗️", desc: "Restores 120 HP.", price: 250, category: "hp", effect: { kind: "heal", amount: 120 } },
  { id: "max-potion", name: "Max Potion", icon: "🍶", desc: "Fully restores HP.", price: 400, category: "hp", effect: { kind: "heal", amount: "full" } },

  // --- Léčení statusů ---
  { id: "antidote", name: "Antidote", icon: "💊", desc: "Cures poison.", price: 40, category: "status", effect: { kind: "cure", status: "poison" } },
  { id: "burn-heal", name: "Burn Heal", icon: "🧯", desc: "Cures a burn.", price: 40, category: "status", effect: { kind: "cure", status: "burn" } },
  { id: "paralyze-heal", name: "Paralyze Heal", icon: "⚡", desc: "Cures paralysis.", price: 40, category: "status", effect: { kind: "cure", status: "paralysis" } },
  { id: "full-heal", name: "Full Heal", icon: "🩹", desc: "Cures any status condition.", price: 80, category: "status", effect: { kind: "cure", status: "any" } },

  // --- Revive: oživení vyřazeného Pokémona ---
  { id: "revive", name: "Revive", icon: "✨", desc: "Revives a fainted Pokémon with half HP.", price: 200, category: "revive", effect: { kind: "revive", healFrac: 0.5 } },
  { id: "max-revive", name: "Max Revive", icon: "🌟", desc: "Revives a fainted Pokémon and fully restores HP.", price: 500, category: "revive", effect: { kind: "revive", healFrac: "full" } },

  // --- Evoluční kameny a Linking Cord ---
  { id: "fire-stone", name: "Fire Stone", icon: "🔥", desc: "Evolves certain Pokémon exposed to fire energy.", price: 1500, category: "evolution", evolution: true },
  { id: "water-stone", name: "Water Stone", icon: "💧", desc: "Evolves certain Water-loving Pokémon.", price: 1500, category: "evolution", evolution: true },
  { id: "thunder-stone", name: "Thunder Stone", icon: "⚡", desc: "Evolves certain Electric-type Pokémon.", price: 1500, category: "evolution", evolution: true },
  { id: "leaf-stone", name: "Leaf Stone", icon: "🍃", desc: "Evolves certain Grass-type Pokémon.", price: 1500, category: "evolution", evolution: true },
  { id: "moon-stone", name: "Moon Stone", icon: "🌙", desc: "Evolves certain Pokémon exposed to lunar energy.", price: 1500, category: "evolution", evolution: true },
  { id: "linking-cord", name: "Linking Cord", icon: "🔗", desc: "A device that evolves Pokémon which would normally evolve by trading.", price: 2000, category: "evolution", evolution: true },

  // --- Held items: drží se během souboje, poskytují efekty ---
  { id: "leftovers", name: "Leftovers", icon: "🍖", desc: "Restores a little HP each turn in battle.", price: 2000, category: "held", held: { kind: "endTurnHeal", fraction: 1/16 } },
  { id: "oran-berry", name: "Oran Berry", icon: "🍒", desc: "When HP drops below 50%, restores 10 HP. Consumed on use.", price: 100, category: "held", effect: { kind: "heal", amount: 10 }, held: { kind: "lowHpHeal", threshold: 0.5, amount: 10 } },
  { id: "everstone", name: "Everstone", icon: "🪨", desc: "A held Pokémon won't evolve. If it's a breeding parent, the baby inherits its Nature.", price: 300, category: "held" },
  { id: "destiny-knot", name: "Destiny Knot", icon: "🪢", desc: "If it's a breeding parent, the baby inherits 5 IVs instead of 3.", price: 2000, category: "held" },
];

/**
 * Definice itemu podle id (nebo null).
 * @param {string} id
 * @returns {ItemDef|null}
 */
export function getItem(id) {
  return ITEMS.find((i) => i.id === id) ?? null;
}

/** Sekce obchodu/batohu v pořadí zobrazení. */
export const ITEM_CATEGORIES = [
  { key: "hp", name: "Potions", icon: "🧴" },
  { key: "status", name: "Status Heals", icon: "💊" },
  { key: "revive", name: "Revives", icon: "✨" },
  { key: "evolution", name: "Evolution", icon: "🪨" },
  { key: "held", name: "Held Items", icon: "💎" },
];

/**
 * Je item drženého typu?
 * @param {string} id
 * @returns {boolean}
 */
export function isHeldItem(id) {
  return getItem(id)?.category === "held";
}
