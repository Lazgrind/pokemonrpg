/**
 * buildingSystem.js – logika budov ve městě (zadání – City → Building).
 *
 * Úroveň budov žije v `state.city.buildings[id].level`. Ceny a efekty se
 * počítají z datové definice (`data/buildings.js`). První budova je Poké Mart:
 * prodává Poké Bally, upgrade budovy jejich cenu snižuje.
 */

import { getState, commit } from "../core/state.js";
import { getBuilding } from "../../data/buildings.js";

/** Aktuální úroveň budovy (výchozí = startLevel z definice). */
export function getLevel(id) {
  const def = getBuilding(id);
  if (!def) return 0;
  return getState().city?.buildings?.[id]?.level ?? def.startLevel;
}

/** Cena vylepšení budovy na další úroveň (gold). */
export function upgradeCost(id) {
  const def = getBuilding(id);
  if (!def) return Infinity;
  const level = getLevel(id);
  return Math.floor(def.upgrade.baseCost * Math.pow(def.upgrade.growth, level - 1));
}

/** Je budova na maximu? */
export function isMaxed(id) {
  const def = getBuilding(id);
  return !!def && getLevel(id) >= def.maxLevel;
}

/**
 * Vylepší budovu, pokud je dost goldu a není na maximu.
 * @returns {{ ok: boolean, reason?: string }}
 */
export function upgradeBuilding(id) {
  const def = getBuilding(id);
  if (!def) return { ok: false, reason: "Neznámá budova." };
  if (isMaxed(id)) return { ok: false, reason: "Budova je na maximální úrovni." };

  const cost = upgradeCost(id);
  const res = getState().resources;
  if (res.gold < cost) return { ok: false, reason: `Potřebuješ ${cost} gold.` };

  res.gold -= cost;
  ensureBuilding(id).level = getLevel(id) + 1;
  commit();
  return { ok: true };
}

/** Cena jednoho Poké Ballu podle úrovně Poké Martu. */
export function ballPrice(id = "poke-mart") {
  const def = getBuilding(id);
  if (!def) return Infinity;
  const level = getLevel(id);
  return Math.max(def.ball.minPrice, def.ball.basePrice - (level - 1) * def.ball.discountPerLevel);
}

/**
 * Kolik % max HP doléčí Pokémon Centrum po každém vítězství (0 = žádné léčení).
 * @param {string} id
 * @returns {number}
 */
export function healPercent(id = "poke-center") {
  const def = getBuilding(id);
  if (!def || !def.heal) return 0;
  const level = getLevel(id);
  const pct = def.heal.basePercent + (level - 1) * def.heal.perLevel;
  const cap = def.heal.maxPercent ?? Infinity;
  return Math.min(cap, pct);
}

/** Kolik XP za minutu dává Školka na aktuální úrovni (0 = není školka). */
export function daycareXpPerMinute(id = "day-care") {
  const def = getBuilding(id);
  if (!def || !def.daycare) return 0;
  const level = getLevel(id);
  return def.daycare.xpPerMinute + (level - 1) * def.daycare.perLevel;
}

/** Slot Školky ve stavu (uid svěřence + zbytkový XP buffer) – lazy default. */
export function getDaycareSlot() {
  const state = getState();
  if (!state.city) state.city = { buildings: {} };
  if (!state.city.daycare) state.city.daycare = { uid: null, buffer: 0 };
  return state.city.daycare;
}

/** Pokémon aktuálně ve Školce (nebo null). */
export function getDaycareOccupant() {
  const uid = getDaycareSlot().uid;
  if (!uid) return null;
  return getState().collection.find((p) => p.uid === uid) ?? null;
}

/** Dá Pokémona do Školky (podle uid). */
export function setDaycareOccupant(uid) {
  const owned = getState().collection.find((p) => p.uid === uid);
  if (!owned) return { ok: false, reason: "Neznámý Pokémon." };
  const slot = getDaycareSlot();
  slot.uid = uid;
  slot.buffer = 0;
  commit();
  return { ok: true };
}

/** Vyzvedne Pokémona ze Školky. */
export function clearDaycareOccupant() {
  const slot = getDaycareSlot();
  slot.uid = null;
  slot.buffer = 0;
  commit();
  return { ok: true };
}

/**
 * Koupí Poké Bally za gold.
 * @param {number} qty
 * @param {string} id
 * @returns {{ ok: boolean, reason?: string }}
 */
export function buyPokeballs(qty = 1, id = "poke-mart") {
  const price = ballPrice(id);
  const cost = price * qty;
  const res = getState().resources;
  if (res.gold < cost) return { ok: false, reason: `Potřebuješ ${cost} gold.` };

  res.gold -= cost;
  res.pokeballs = (res.pokeballs ?? 0) + qty;
  commit();
  return { ok: true };
}

/** Zajistí existenci záznamu budovy ve stavu a vrátí ho. */
function ensureBuilding(id) {
  const state = getState();
  if (!state.city) state.city = { buildings: {} };
  if (!state.city.buildings) state.city.buildings = {};
  if (!state.city.buildings[id]) {
    state.city.buildings[id] = { level: getBuilding(id)?.startLevel ?? 1 };
  }
  return state.city.buildings[id];
}
