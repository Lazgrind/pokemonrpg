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
 * @property {"hp"|"status"|"revive"} category  sekce v obchodě/batohu
 * @property {{ kind: "heal", amount: number|"full" }
 *          | { kind: "cure", status: "poison"|"burn"|"paralysis"|"any" }
 *          | { kind: "revive", healFrac: number|"full" }} effect
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
];
