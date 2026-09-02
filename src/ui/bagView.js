/**
 * bagView.js – batoh mimo souboj (v0.45.0).
 *
 * Modal se seznamem vlastněných léčivých předmětů (potiony, léčení statusů,
 * revivy). Klik na item přepne na výběr cíle z kolekce (jen platné cíle dle
 * canUseItem) a použije ho. Živě se aktualizuje přes STATE_CHANGED.
 */

import { bus, EVENTS } from "../core/events.js";
import { getState } from "../core/state.js";
import { ITEMS, ITEM_CATEGORIES, getItem, isHeldItem } from "../../data/items.js";
import { itemCount, canUseItem, useItem, equipHeldItem, unequipHeldItem } from "../systems/itemSystem.js";
import { computeStats } from "../systems/pokemonSystem.js";
import { getSpecies } from "../../data/pokemon.js";
import { statusBadge } from "./statusBadge.js";
import { saveScroll, restoreScroll } from "./scrollPreserve.js";

/**
 * Otevře batoh. `onStatus` slouží k hlášení výsledku akce (např. do lišty týmu).
 * @param {(msg: string) => void} [onStatus]
 */
export function openBag(onStatus = () => {}) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  // Stavy: null=seznam, "use"=use cíl, "held"=equip cíl
  let selectedItemId = null;
  let selectedAction = null;

  const unsub = bus.on(EVENTS.STATE_CHANGED, render);

  function close() {
    unsub();
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  }
  function onKey(e) {
    if (e.key === "Escape") {
      if (selectedAction) {
        selectedAction = null;
        render();
      } else if (selectedItemId) {
        selectedItemId = null;
        render();
      } else {
        close();
      }
    }
  }
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  /** Seznam vlastněných consumable itemů (bez held itemů). */
  function consumablesListHtml() {
    const rows = ITEMS.filter((it) => !isHeldItem(it.id) && itemCount(it.id) > 0)
      .map(
        (it) => `<button class="bag-item-row" data-pick-item="${it.id}" title="${it.desc}">
          <span>${it.icon} <strong>${it.name}</strong> <span class="placeholder">— ${it.desc}</span></span>
          <span class="bag-count">×${itemCount(it.id)}</span>
        </button>`
      )
      .join("");
    return rows ? rows : `<p class="placeholder">No consumables.</p>`;
  }

  /** Seznam vlastněných held itemů. */
  function heldItemsListHtml() {
    const rows = ITEMS.filter((it) => isHeldItem(it.id) && itemCount(it.id) > 0)
      .map(
        (it) => `<button class="bag-item-row" data-pick-held="${it.id}" title="${it.desc}">
          <span>${it.icon} <strong>${it.name}</strong> <span class="placeholder">— ${it.desc}</span></span>
          <span class="bag-count">×${itemCount(it.id)}</span>
        </button>`
      )
      .join("");
    return rows ? rows : `<p class="placeholder">No held items.</p>`;
  }

  /** Seznam Pokémonů, kteří aktuálně drží nějaký held item. */
  function currentlyHeldHtml() {
    const collection = getState().collection ?? [];
    const holding = collection.filter((p) => p && p.heldItem);

    if (holding.length === 0) {
      return `<p class="placeholder">No Pokémon is holding an item.</p>`;
    }

    const rows = holding
      .map((p) => {
        const sp = getSpecies(p.speciesId);
        const itemDef = getItem(p.heldItem);
        return `<div class="bag-held-pokemon">
          <span class="held-poke-info">${p.shiny ? "✨ " : ""}${sp?.name ?? p.speciesId} <span class="placeholder">Lv ${p.level}</span></span>
          <span class="held-item-badge">${itemDef?.icon ?? "?"} ${itemDef?.name ?? p.heldItem}</span>
          <button class="btn btn-sm btn-remove" data-unequip="${p.uid}">Remove</button>
        </div>`;
      })
      .join("");
    return rows;
  }

  /** Hlavní seznam itemů – consumables a held items v sekcích. */
  function itemListHtml() {
    const body = `
      <h3 class="shop-cat">🧴 Consumables</h3>
      ${consumablesListHtml()}
      <h3 class="shop-cat">💎 Held Items</h3>
      ${heldItemsListHtml()}
      <h3 class="shop-cat">📌 Currently held</h3>
      ${currentlyHeldHtml()}
    `;

    return `
      <h2 class="panel-title">🎒 Bag</h2>
      <div class="bag-list">${body}</div>
      <button class="btn btn-close" data-act="close">Close</button>`;
  }

  /** Výběr akce (Use / Held) pro held item. */
  function actionChoiceHtml() {
    const def = getItem(selectedItemId);
    const hasEffect = def?.effect != null;
    const useBtn = hasEffect ? `<button class="btn btn-wide" data-action="use">Use</button>` : "";
    return `
      <h2 class="panel-title">${def?.icon ?? ""} ${def?.name ?? "item"}</h2>
      <p class="placeholder">${def?.desc ?? ""}</p>
      <div class="action-buttons">
        ${useBtn}
        <button class="btn btn-wide" data-action="held">Equip as Held Item</button>
      </div>
      <button class="btn btn-sm menu-back" data-act="back">← Back</button>`;
  }

  /** Výběr cíle pro Use nebo Held action. */
  function targetListHtml() {
    const def = getItem(selectedItemId);
    const collection = getState().collection ?? [];
    let targets = [];
    let title = "";
    let desc = "";

    if (selectedAction === "use") {
      targets = collection.filter((p) => canUseItem(selectedItemId, p).ok);
      title = `Use ${def?.name ?? "item"}`;
      desc = `${def?.desc ?? ""} — pick a Pokémon.`;
    } else if (selectedAction === "held") {
      targets = collection.filter((p) => p && p.hp > 0); // živí pokémoni
      title = `Equip on Pokémon`;
      desc = `Choose which Pokémon will hold ${def?.name ?? "this item"}.`;
    }

    const tiles = targets
      .map((p) => {
        const sp = getSpecies(p.speciesId);
        const max = computeStats(p).maxHp;
        const hp = Math.max(0, Math.min(max, p.hp ?? max));
        const pct = Math.round((hp / max) * 100);
        const low = hp <= 0 ? " fainted" : pct <= 25 ? " low" : "";
        const dataAttr = selectedAction === "use" ? `data-use-on="${p.uid}"` : `data-equip-on="${p.uid}"`;
        return `<button class="btn switch-tile" ${dataAttr}>
          <span class="sw-name">${p.shiny ? "✨ " : ""}${sp?.name ?? p.speciesId} <span class="placeholder">Lv ${p.level}</span>${statusBadge(p.status)}</span>
          <span class="hpbar"><span class="hpfill${low}" style="width:${pct}%"></span></span>
          <span class="sw-hp">${hp}/${max} HP</span>
        </button>`;
      })
      .join("");

    const noTargetMsg = selectedAction === "use"
      ? `No Pokémon can use ${def?.name ?? "this item"} right now.`
      : `No Pokémon available.`;
    const body = tiles || `<p class="placeholder">${noTargetMsg}</p>`;
    return `
      <h2 class="panel-title">${def?.icon ?? ""} ${title} <span class="placeholder">×${itemCount(selectedItemId)}</span></h2>
      <p class="placeholder">${desc}</p>
      <div class="switch-list">${body}</div>
      <button class="btn btn-sm menu-back" data-act="back">← Back</button>`;
  }

  function render() {
    // Když nám vybraný item dojde, spadneme zpět na seznam.
    if (selectedItemId && itemCount(selectedItemId) <= 0) {
      selectedItemId = null;
      selectedAction = null;
    }

    let html = "";
    if (selectedAction) {
      // Use nebo Held – výběr cíle
      html = targetListHtml();
    } else if (selectedItemId) {
      // Vybraný held item – volba akce (Use / Held)
      html = actionChoiceHtml();
    } else {
      // Hlavní seznam
      html = itemListHtml();
    }

    const _savedScroll = saveScroll(overlay);
    overlay.innerHTML = `<div class="modal building-modal">${html}</div>`;
    restoreScroll(overlay, _savedScroll);

    // Consumable itemy – rovnou do Use flow
    overlay.querySelectorAll("[data-pick-item]").forEach((btn) =>
      btn.addEventListener("click", () => {
        selectedItemId = btn.dataset.pickItem;
        selectedAction = "use";
        render();
      })
    );

    // Held itemy – do action choice
    overlay.querySelectorAll("[data-pick-held]").forEach((btn) =>
      btn.addEventListener("click", () => {
        selectedItemId = btn.dataset.pickHeld;
        selectedAction = null;
        render();
      })
    );

    // Tlačítka akcí (Use / Held)
    overlay.querySelectorAll("[data-action]").forEach((btn) =>
      btn.addEventListener("click", () => {
        selectedAction = btn.dataset.action;
        render();
      })
    );

    // Use on target
    overlay.querySelectorAll("[data-use-on]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const r = useItem(btn.dataset.useOn, selectedItemId);
        onStatus(r.ok ? `${getItem(selectedItemId)?.name}: ${r.msg}` : r.reason);
      })
    );

    // Equip on target
    overlay.querySelectorAll("[data-equip-on]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const r = equipHeldItem(btn.dataset.equipOn, selectedItemId);
        if (r.ok) {
          onStatus(`${getItem(selectedItemId)?.name} equipped.`);
          selectedItemId = null;
          selectedAction = null;
          render();
        } else {
          onStatus(r.reason);
        }
      })
    );

    // Unequip held item
    overlay.querySelectorAll("[data-unequip]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const uid = btn.dataset.unequip;
        const owned = getState().collection.find((p) => p.uid === uid);
        const itemDef = getItem(owned?.heldItem);
        const r = unequipHeldItem(uid);
        if (r.ok) {
          onStatus(`${itemDef?.name ?? "Item"} removed.`);
        } else {
          onStatus(r.reason);
        }
      })
    );

    const back = overlay.querySelector('[data-act="back"]');
    if (back)
      back.addEventListener("click", () => {
        if (selectedAction) {
          selectedAction = null;
        } else {
          selectedItemId = null;
        }
        render();
      });

    const closeBtn = overlay.querySelector('[data-act="close"]');
    if (closeBtn) closeBtn.addEventListener("click", close);
  }

  render();
}
