/**
 * itemSystem.js – logika léčivých předmětů (v0.45.0).
 *
 * Nákup do inventáře (resources.items) a použití itemu na konkrétního jedince
 * (léčení HP / sundání statusu / oživení). Data itemů jsou v data/items.js;
 * UI je v obchodě (buildingView.openItemShop), v batohu (bagView.openBag) a
 * v souboji (battleView bag menu → battleSystem.playerUseItem).
 *
 * Jednosměrná závislost: importujeme jen computeStats z pokemonSystem (kvůli
 * max HP), takže nevzniká cyklus s battleSystem, který importuje odsud.
 */

import { getState, commit } from "../core/state.js";
import { bus, EVENTS } from "../core/events.js";
import { getItem, isHeldItem } from "../../data/items.js";
import { getMove } from "../../data/moves.js";
import { computeStats } from "./pokemonSystem.js";
import { MAX_LEVEL, currentLevelCap, rareCandyLevelUp } from "./progression.js";

/* ---------- PP itemy (PP Up / PP Max) – pomocné výpočty na slotu tahu ----------
 * Základní max PP tahu je z data/moves.js (pole `pp`). PP Up přidá +1 stupeň =
 * +20 % základu (min 1), max 3 stupně (= +60 %). PP Max doplní rovnou na strop. */

/** Základní max PP tahu (z definice tahu). */
function ppBase(slot) {
  return getMove(slot?.id)?.pp ?? slot?.maxPp ?? 0;
}
/** Přírůstek jednoho PP Up stupně (20 % základu, min 1). */
function ppIncrement(slot) {
  return Math.max(1, Math.floor(ppBase(slot) / 5));
}
/** Strop max PP po 3 stupních PP Up. */
function ppCap(slot) {
  return ppBase(slot) + 3 * ppIncrement(slot);
}
/** Kolik ještě lze do tahu přidat max PP (0 = na stropu). */
function ppRoom(slot) {
  return Math.max(0, ppCap(slot) - (slot?.maxPp ?? ppBase(slot)));
}

/** Kolik kusů daného itemu hráč má. */
export function itemCount(itemId) {
  return getState().resources.items?.[itemId] ?? 0;
}

/**
 * Koupí `qty` kusů itemu (Poké Mart). Vrací {ok, reason?}.
 * @param {string} itemId
 * @param {number} [qty]
 */
export function buyItem(itemId, qty = 1) {
  const def = getItem(itemId);
  if (!def || def.price == null) return { ok: false, reason: "That item isn't for sale." };
  const res = getState().resources;
  const cost = def.price * qty;
  if ((res.gold ?? 0) < cost) return { ok: false, reason: `You need ${cost} gold.` };
  if (!res.items) res.items = {};
  res.gold -= cost;
  res.items[itemId] = (res.items[itemId] ?? 0) + qty;
  commit();
  return { ok: true };
}

/**
 * Lze item teď použít na daného jedince? (bez spotřeby) – rozhoduje UI, které
 * cíle nabídnout a proč. Nekontroluje, jestli item vlastníme (to řeší useItem).
 * Held item bez `effect` není použitelný (jen equippable).
 * @param {string} itemId
 * @param {import("../core/state.js").OwnedPokemon} owned
 * @returns {{ ok: boolean, reason?: string }}
 */
export function canUseItem(itemId, owned) {
  const def = getItem(itemId);
  if (!def) return { ok: false, reason: "Unknown item." };
  if (!def.effect) return { ok: false, reason: "This item can't be used." };
  if (!owned) return { ok: false, reason: "No target." };
  const max = computeStats(owned).maxHp;
  const hp = owned.hp ?? max;
  const fainted = hp <= 0;
  switch (def.effect.kind) {
    case "heal":
      if (fainted) return { ok: false, reason: "It has fainted — use a Revive first." };
      if (hp >= max) return { ok: false, reason: "Its HP is already full." };
      return { ok: true };
    case "cure": {
      if (fainted) return { ok: false, reason: "It has fainted." };
      const s = owned.status?.kind;
      if (!s) return { ok: false, reason: "It has no status condition." };
      if (def.effect.status !== "any" && def.effect.status !== s) {
        return { ok: false, reason: `That won't cure ${s}.` };
      }
      return { ok: true };
    }
    case "revive":
      if (!fainted) return { ok: false, reason: "It hasn't fainted." };
      return { ok: true };
    case "level": {
      const cap = Math.max(1, Math.min(MAX_LEVEL, currentLevelCap()));
      if (owned.level >= cap) {
        return currentLevelCap() < MAX_LEVEL
          ? { ok: false, reason: `Level cap reached (Lv ${cap}) — earn the next Badge to raise it.` }
          : { ok: false, reason: "It's already at Lv 100." };
      }
      return { ok: true };
    }
    case "ppUp":
    case "ppMax": {
      const anyRoom = (owned.moves ?? []).some((m) => ppRoom(m) > 0);
      if (!anyRoom) return { ok: false, reason: "All of its moves are already at max PP." };
      return { ok: true };
    }
    default:
      return { ok: false, reason: "This item can't be used." };
  }
}

/**
 * Použije item na jedince (podle uid). Spotřebuje 1 kus při úspěchu. Vrací
 * {ok, reason?, msg?} – `msg` je krátký popis efektu pro log/status.
 * @param {string} uid
 * @param {string} itemId
 */
export function useItem(uid, itemId) {
  const def = getItem(itemId);
  if (!def) return { ok: false, reason: "Unknown item." };
  if (itemCount(itemId) <= 0) return { ok: false, reason: `No ${def.name} left.` };
  const owned = getState().collection.find((p) => p.uid === uid);
  if (!owned) return { ok: false, reason: "Unknown Pokémon." };

  const check = canUseItem(itemId, owned);
  if (!check.ok) return check;

  const max = computeStats(owned).maxHp;
  let msg = "";
  switch (def.effect.kind) {
    case "heal": {
      const before = owned.hp ?? max;
      const amount = def.effect.amount === "full" ? max : def.effect.amount;
      owned.hp = Math.min(max, before + amount);
      msg = `Restored ${owned.hp - before} HP`;
      break;
    }
    case "cure": {
      const cured = owned.status?.kind ?? "status";
      owned.status = null;
      msg = `Cured ${cured}`;
      break;
    }
    case "revive": {
      owned.status = null; // oživení sundá i stavový efekt
      owned.hp = def.effect.healFrac === "full" ? max : Math.max(1, Math.floor(max * def.effect.healFrac));
      msg = `Revived (${owned.hp}/${max} HP)`;
      break;
    }
    case "level": {
      if (!rareCandyLevelUp(owned)) {
        return { ok: false, reason: "It can't level up any further right now." };
      }
      msg = `Grew to Lv ${owned.level}!`;
      break;
    }
    default:
      // PP Up / PP Max se aplikují přes usePpItem (míří na konkrétní tah), ne tudy.
      return { ok: false, reason: "This item can't be used." };
  }

  const res = getState().resources;
  if (!res.items) res.items = {};
  res.items[itemId] = Math.max(0, (res.items[itemId] ?? 0) - 1);
  commit();
  bus.emit(EVENTS.BATTLE_UPDATE); // cíl může být právě nasazený bojovník
  return { ok: true, msg };
}

/**
 * Kolik lze do daného tahu jedince ještě přidat max PP (0 = na stropu). Pro UI,
 * ať batoh ví, které tahy nabídnout a které zašednout.
 * @param {import("../core/state.js").OwnedPokemon} owned
 * @param {number} slotIndex
 * @returns {number}
 */
export function ppRoomFor(owned, slotIndex) {
  const slot = owned?.moves?.[slotIndex];
  return slot ? ppRoom(slot) : 0;
}

/** Je item PP Up / PP Max (míří na konkrétní tah, ne přes běžné useItem)? */
export function isPpItem(itemId) {
  const k = getItem(itemId)?.effect?.kind;
  return k === "ppUp" || k === "ppMax";
}

/**
 * Použije PP Up / PP Max na KONKRÉTNÍ tah jedince (slotIndex). Spotřebuje 1 kus
 * při úspěchu. PP Up přidá +1 stupeň (20 % základu, min 1) do stropu (3 stupně),
 * PP Max doplní rovnou na strop. Zvýší i aktuální PP o stejný přírůstek.
 * @param {string} uid
 * @param {string} itemId
 * @param {number} slotIndex
 * @returns {{ ok: boolean, reason?: string, msg?: string }}
 */
export function usePpItem(uid, itemId, slotIndex) {
  const def = getItem(itemId);
  if (!def || !isPpItem(itemId)) return { ok: false, reason: "That's not a PP item." };
  if (itemCount(itemId) <= 0) return { ok: false, reason: `No ${def.name} left.` };
  const owned = getState().collection.find((p) => p.uid === uid);
  if (!owned) return { ok: false, reason: "Unknown Pokémon." };
  const slot = owned.moves?.[slotIndex];
  if (!slot) return { ok: false, reason: "No such move." };

  const room = ppRoom(slot);
  if (room <= 0) return { ok: false, reason: "That move is already at max PP." };

  const add = def.effect.kind === "ppMax" ? room : Math.min(ppIncrement(slot), room);
  slot.maxPp = (slot.maxPp ?? ppBase(slot)) + add;
  slot.pp = (slot.pp ?? 0) + add;

  const res = getState().resources;
  if (!res.items) res.items = {};
  res.items[itemId] = Math.max(0, (res.items[itemId] ?? 0) - 1);
  commit();
  bus.emit(EVENTS.BATTLE_UPDATE);
  const mvName = getMove(slot.id)?.name ?? "Move";
  return { ok: true, msg: `${mvName} max PP +${add} (now ${slot.maxPp})` };
}

/**
 * Vrátí aktuálně drženou položku pokémona, nebo null.
 * @param {import("../core/state.js").OwnedPokemon} owned
 * @returns {any|null}
 */
export function heldItemOf(owned) {
  return owned?.heldItem ? getItem(owned.heldItem) : null;
}

/**
 * Vybavení drženého itemu pokémonovi. Ověří, že je to held item, hráč má
 * aspoň 1 kus v inventáři a pokémon existuje. Pokud pokémon už drží jiný item,
 * ten se vrátí do batohu. Vrací {ok, reason?}.
 * @param {string} uid
 * @param {string} itemId
 */
export function equipHeldItem(uid, itemId) {
  const def = getItem(itemId);
  if (!def || !isHeldItem(itemId)) return { ok: false, reason: "That's not a held item." };
  if (itemCount(itemId) <= 0) return { ok: false, reason: `No ${def.name} left.` };
  const owned = getState().collection.find((p) => p.uid === uid);
  if (!owned) return { ok: false, reason: "Unknown Pokémon." };

  const res = getState().resources;
  if (!res.items) res.items = {};

  // Vrátit starý held item do batohu, pokud existuje.
  if (owned.heldItem) {
    res.items[owned.heldItem] = (res.items[owned.heldItem] ?? 0) + 1;
  }

  // Odečíst nový item z batohu a vybavit.
  res.items[itemId] = (res.items[itemId] ?? 0) - 1;
  owned.heldItem = itemId;

  commit();
  return { ok: true };
}

/**
 * Odvybavení drženého itemu. Pokud pokémon drží nějaký item, ten se vrátí
 * do batohu a heldItem se nastaví na null. Vrací {ok, reason?}.
 * @param {string} uid
 */
export function unequipHeldItem(uid) {
  const owned = getState().collection.find((p) => p.uid === uid);
  if (!owned) return { ok: false, reason: "Unknown Pokémon." };

  const res = getState().resources;
  if (!res.items) res.items = {};

  if (owned.heldItem) {
    res.items[owned.heldItem] = (res.items[owned.heldItem] ?? 0) + 1;
    owned.heldItem = null;
  }

  commit();
  return { ok: true };
}

/**
 * Prodej itemu. Vrací utržený gold a odečte qty z inventáře.
 * @param {string} itemId
 * @param {number} [qty=1]
 * @returns {{ ok: boolean, reason?: string, gold?: number }}
 */
export function sellItem(itemId, qty = 1) {
  const def = getItem(itemId);
  if (!def) return { ok: false, reason: "Unknown item." };

  const owned = itemCount(itemId);
  const actualQty = Math.max(0, Math.min(qty, owned));
  if (actualQty <= 0) return { ok: false, reason: "You don't have that item." };

  const res = getState().resources;
  if (!res.items) res.items = {};

  // Cena za kus je 50% z nákupní ceny.
  const goldPerItem = Math.floor((def.price ?? 0) * 0.5);
  const totalGold = goldPerItem * actualQty;

  res.gold = (res.gold ?? 0) + totalGold;
  res.items[itemId] = Math.max(0, (res.items[itemId] ?? 0) - actualQty);

  commit();
  return { ok: true, gold: totalGold };
}
