/**
 * buildingSystem.js – logika budov ve městě (zadání – City → Building).
 *
 * Úroveň budov žije v `state.city.buildings[id].level`. Ceny a efekty se
 * počítají z datové definice (`data/buildings.js`). První budova je Poké Mart:
 * prodává Poké Bally, upgrade budovy jejich cenu snižuje.
 */

import { getState, commit } from "../core/state.js";
import { getBuilding } from "../../data/buildings.js";
import { getPokeball } from "../../data/pokeballs.js";

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
  if (!def) return { ok: false, reason: "Unknown building." };
  if (isMaxed(id)) return { ok: false, reason: "Building is at max level." };

  const cost = upgradeCost(id);
  const res = getState().resources;
  if (res.gold < cost) return { ok: false, reason: `You need ${cost} gold.` };

  res.gold -= cost;
  ensureBuilding(id).level = getLevel(id) + 1;
  commit();
  return { ok: true };
}

/**
 * Cena daného typu ballu se slevou dle úrovně Poké Martu. Neprodejné (bez ceny,
 * např. Master Ball) vrací Infinity.
 * @param {string} ballId
 * @param {string} [id]  budova (Poké Mart)
 */
export function ballPrice(ballId, id = "poke-mart") {
  const ball = getPokeball(ballId);
  if (!ball || ball.price == null) return Infinity;
  const def = getBuilding(id);
  const level = getLevel(id);
  const discount = Math.min(
    def?.ball?.maxDiscount ?? 0,
    (level - 1) * (def?.ball?.discountPerLevel ?? 0)
  );
  return Math.max(1, Math.ceil(ball.price * (1 - discount / 100)));
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

/* ---------- Samostatné upgrade linie budovy (tracks) ---------- */

/** Definice upgrade linie (nebo undefined). */
function getTrackDef(id, key) {
  return getBuilding(id)?.tracks?.[key];
}

/** Aktuální úroveň dané linie (výchozí = startLevel z definice). */
export function getTrackLevel(id, key) {
  const def = getTrackDef(id, key);
  if (!def) return 0;
  return getState().city?.buildings?.[id]?.tracks?.[key] ?? def.startLevel;
}

/** Je daná linie na maximu? */
export function isTrackMaxed(id, key) {
  const def = getTrackDef(id, key);
  return !!def && getTrackLevel(id, key) >= def.maxLevel;
}

/** Cena vylepšení linie na další úroveň (gold); Infinity když maxed/neexistuje. */
export function trackUpgradeCost(id, key) {
  const def = getTrackDef(id, key);
  if (!def || isTrackMaxed(id, key)) return Infinity;
  const level = getTrackLevel(id, key);
  return Math.floor(def.baseCost * Math.pow(def.growth, level - def.startLevel));
}

/**
 * Vylepší danou linii budovy, pokud je dost goldu a není na maximu.
 * @returns {{ ok: boolean, reason?: string }}
 */
export function upgradeTrack(id, key) {
  const def = getTrackDef(id, key);
  if (!def) return { ok: false, reason: "Unknown upgrade." };
  if (isTrackMaxed(id, key)) return { ok: false, reason: "Already at max." };
  const cost = trackUpgradeCost(id, key);
  const res = getState().resources;
  if (res.gold < cost) return { ok: false, reason: `You need ${cost} gold.` };
  res.gold -= cost;
  const b = ensureBuilding(id);
  if (!b.tracks) b.tracks = {};
  b.tracks[key] = getTrackLevel(id, key) + 1;
  commit();
  return { ok: true };
}

/** Bonus rychlosti líhnutí v % (0–50) podle linie „hatchSpeed" Školky. */
export function hatchSpeedPercent(id = "day-care") {
  const def = getTrackDef(id, "hatchSpeed");
  if (!def) return 0;
  return Math.min(def.maxLevel, getTrackLevel(id, "hatchSpeed"));
}

/** Počet slotů na inkubaci vajec podle linie „eggSlots" Školky. */
export function eggSlotCount(id = "day-care") {
  const def = getTrackDef(id, "eggSlots");
  if (!def) return 1;
  return getTrackLevel(id, "eggSlots");
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
  if (!owned) return { ok: false, reason: "Unknown Pokémon." };
  const br = getBreedingSlot();
  if (uid === br.a || uid === br.b) {
    return { ok: false, reason: "That Pokémon is set up for breeding." };
  }
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

/* ---------- Breeding sloty ve Školce (rodiče A/B) ---------- */

/**
 * Breeding slot ve stavu: dva rodiče (uid) + `buffer` = nasbírané sekundy směrem
 * k dalšímu vejci. Lazy default (žije uvnitř city.daycare vedle výcviku a
 * inkubace vajec). Logika kompatibility a produkce viz breedingSystem.js.
 */
export function getBreedingSlot() {
  const dc = getDaycareSlot();
  if (!dc.breeding) dc.breeding = { a: null, b: null, buffer: 0 };
  return dc.breeding;
}

/** Rodiče v breeding slotech jako jedinci (nebo null). */
export function getBreedingParents() {
  const slot = getBreedingSlot();
  const col = getState().collection;
  return {
    a: slot.a ? col.find((p) => p.uid === slot.a) ?? null : null,
    b: slot.b ? col.find((p) => p.uid === slot.b) ?? null : null,
  };
}

/**
 * Vloží rodiče do breeding slotu „a"/„b". Odmítne duplicitu (druhý slot),
 * svěřence ve výcviku i neznámé uid. Změna složení resetuje průběh.
 * @param {"a"|"b"} which
 * @param {string} uid
 * @returns {{ ok: boolean, reason?: string }}
 */
export function setBreedingParent(which, uid) {
  if (which !== "a" && which !== "b") return { ok: false, reason: "Unknown slot." };
  const owned = getState().collection.find((p) => p.uid === uid);
  if (!owned) return { ok: false, reason: "Unknown Pokémon." };
  const slot = getBreedingSlot();
  const other = which === "a" ? slot.b : slot.a;
  if (uid === other) return { ok: false, reason: "That Pokémon is already the other parent." };
  if (uid === getDaycareSlot().uid) {
    return { ok: false, reason: "That Pokémon is training in the Day Care." };
  }
  slot[which] = uid;
  slot.buffer = 0; // změna páru = nový odpočet
  commit();
  return { ok: true };
}

/** Vyndá rodiče z breeding slotu a resetuje průběh. */
export function clearBreedingParent(which) {
  const slot = getBreedingSlot();
  if (which !== "a" && which !== "b") return { ok: false, reason: "Unknown slot." };
  slot[which] = null;
  slot.buffer = 0;
  commit();
  return { ok: true };
}

/**
 * Koupí daný typ ballu za gold (přičte do resources.balls).
 * @param {string} ballId
 * @param {number} qty
 * @param {string} id  budova (Poké Mart)
 * @returns {{ ok: boolean, reason?: string }}
 */
export function buyBall(ballId, qty = 1, id = "poke-mart") {
  const ball = getPokeball(ballId);
  if (!ball || ball.price == null) return { ok: false, reason: "This ball is not for sale." };
  const price = ballPrice(ballId, id);
  const cost = price * qty;
  const res = getState().resources;
  if (res.gold < cost) return { ok: false, reason: `You need ${cost} gold.` };

  res.gold -= cost;
  if (!res.balls) res.balls = {};
  res.balls[ballId] = (res.balls[ballId] ?? 0) + qty;
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
