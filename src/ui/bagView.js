/**
 * bagView.js – batoh mimo souboj (v0.45.0).
 *
 * Modal se seznamem vlastněných léčivých předmětů (potiony, léčení statusů,
 * revivy), evolučních kamenů a held itemů. Klik na consumable item přepne na
 * výběr cíle z kolekce (jen platné cíle dle canUseItem) a použije ho.
 * Evoluční itemy nabízí výběr vhodného cíle k evoluci. Tlačítka „Sell" umožňují
 * prodej itemů. Živě se aktualizuje přes STATE_CHANGED.
 */

import { bus, EVENTS } from "../core/events.js";
import { getState } from "../core/state.js";
import { ITEMS, ITEM_CATEGORIES, getItem, isHeldItem } from "../../data/items.js";
import { itemCount, canUseItem, useItem, equipHeldItem, unequipHeldItem, sellItem } from "../systems/itemSystem.js";
import { evolveWithItem, evolveByTrade, itemEvolutionTargets, tradeEvolutionTarget } from "../systems/evolutionSystem.js";
import { computeStats } from "../systems/pokemonSystem.js";
import { getSpecies } from "../../data/pokemon.js";
import { statusBadge } from "./statusBadge.js";
import { saveScroll, restoreScroll, scrollAware } from "./scrollPreserve.js";

/**
 * Otevře batoh. `onStatus` slouží k hlášení výsledku akce (např. do lišty týmu).
 * @param {(msg: string) => void} [onStatus]
 */
export function openBag(onStatus = () => {}) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  // Stavy: null=seznam, "use"=use cíl, "held"=equip cíl, "evolve"=evolve cíl
  let selectedItemId = null;
  let selectedAction = null;
  let selectedUseQty = 1; // počet kusů pro batch use

  // Během aktivního scrollování překreslení odložíme (viz scrollAware).
  const unsub = bus.on(EVENTS.STATE_CHANGED, scrollAware(render));

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

  /** Seznam vlastněných consumable itemů (bez held itemů, bez evolučních). */
  function consumablesListHtml() {
    const items = ITEMS
      .filter((it) => !isHeldItem(it.id) && it.category !== "evolution" && itemCount(it.id) > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    const rows = items
      .map(
        (it) => `<div class="bag-item-row-wrapper">
          <button class="bag-item-row" data-pick-item="${it.id}" title="${it.desc}">
            <span>${it.icon} <strong>${it.name}</strong> <span class="placeholder">— ${it.desc}</span></span>
            <span class="bag-count">×${itemCount(it.id)}</span>
          </button>
          <div class="bag-item-actions">
            <button class="btn btn-sm btn-sell" data-sell-one="${it.id}">Sell 1</button>
            <button class="btn btn-sm btn-sell" data-sell-all="${it.id}">Sell all</button>
          </div>
        </div>`
      )
      .join("");
    return rows ? rows : `<p class="placeholder">No consumables.</p>`;
  }

  /** Seznam evolučních kamenů a Linking Cord. */
  function evolutionItemsListHtml() {
    const items = ITEMS
      .filter((it) => it.category === "evolution" && itemCount(it.id) > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    const rows = items
      .map(
        (it) => {
          const canEvolve = getState().collection.some((p) => {
            if (it.id === "linking-cord") return tradeEvolutionTarget(p.speciesId) != null;
            return itemEvolutionTargets(p.speciesId, it.id).length > 0;
          });
          const disabled = !canEvolve ? 'disabled' : '';
          return `<button class="bag-item-row bag-evolution-row" data-evolve-item="${it.id}" ${disabled} title="${it.desc}">
            <span>${it.icon} <strong>${it.name}</strong> <span class="placeholder">— ${it.desc}</span></span>
            <span class="bag-count">×${itemCount(it.id)}</span>
          </button>`;
        }
      )
      .join("");
    return rows ? rows : `<p class="placeholder">No evolution items.</p>`;
  }

  /** Seznam vlastněných held itemů. */
  function heldItemsListHtml() {
    const items = ITEMS
      .filter((it) => isHeldItem(it.id) && itemCount(it.id) > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    const rows = items
      .map(
        (it) => `<div class="bag-item-row-wrapper">
          <button class="bag-item-row" data-pick-held="${it.id}" title="${it.desc}">
            <span>${it.icon} <strong>${it.name}</strong> <span class="placeholder">— ${it.desc}</span></span>
            <span class="bag-count">×${itemCount(it.id)}</span>
          </button>
          <div class="bag-item-actions">
            <button class="btn btn-sm btn-sell" data-sell-one="${it.id}">Sell 1</button>
            <button class="btn btn-sm btn-sell" data-sell-all="${it.id}">Sell all</button>
          </div>
        </div>`
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

  /** Hlavní seznam itemů – consumables, evoluční itemy a held items v sekcích. */
  function itemListHtml() {
    const body = `
      <h3 class="shop-cat">🧴 Consumables</h3>
      ${consumablesListHtml()}
      <h3 class="shop-cat">🪨 Evolution Items</h3>
      ${evolutionItemsListHtml()}
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
    const sellBtns = `
      <button class="btn btn-sm btn-sell" data-sell-one-action="${selectedItemId}">Sell 1</button>
      <button class="btn btn-sm btn-sell" data-sell-all-action="${selectedItemId}">Sell All</button>
    `;
    return `
      <h2 class="panel-title">${def?.icon ?? ""} ${def?.name ?? "item"}</h2>
      <p class="placeholder">${def?.desc ?? ""}</p>
      <div class="action-buttons">
        ${useBtn}
        <button class="btn btn-wide" data-action="held">Equip as Held Item</button>
      </div>
      <div class="action-buttons">${sellBtns}</div>
      <button class="btn btn-sm menu-back" data-act="back">← Back</button>`;
  }

  /** Výběr cíle pro Use, Held nebo Evolve action. */
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
    } else if (selectedAction === "evolve") {
      // Filtruj pokémony, co se mohou vyvinout tímto itemem
      if (selectedItemId === "linking-cord") {
        targets = collection.filter((p) => tradeEvolutionTarget(p.speciesId) != null);
      } else {
        targets = collection.filter((p) => itemEvolutionTargets(p.speciesId, selectedItemId).length > 0);
      }
      title = `Evolve with ${def?.name ?? "item"}`;
      desc = `Choose which Pokémon to evolve.`;
    }

    const tiles = targets
      .map((p) => {
        const sp = getSpecies(p.speciesId);
        const max = computeStats(p).maxHp;
        const hp = Math.max(0, Math.min(max, p.hp ?? max));
        const pct = Math.round((hp / max) * 100);
        const low = hp <= 0 ? " fainted" : pct <= 25 ? " low" : "";
        let dataAttr = "";
        if (selectedAction === "use") dataAttr = `data-use-on="${p.uid}"`;
        else if (selectedAction === "held") dataAttr = `data-equip-on="${p.uid}"`;
        else if (selectedAction === "evolve") dataAttr = `data-evolve-with="${p.uid}"`;

        return `<button class="btn switch-tile" ${dataAttr}>
          <span class="sw-name">${p.shiny ? "✨ " : ""}${sp?.name ?? p.speciesId} <span class="placeholder">Lv ${p.level}</span>${statusBadge(p.status)}</span>
          <span class="hpbar"><span class="hpfill${low}" style="width:${pct}%"></span></span>
          <span class="sw-hp">${hp}/${max} HP</span>
        </button>`;
      })
      .join("");

    let noTargetMsg = "No valid targets.";
    if (selectedAction === "use") noTargetMsg = `No Pokémon can use ${def?.name ?? "this item"} right now.`;
    else if (selectedAction === "held") noTargetMsg = `No Pokémon available.`;
    else if (selectedAction === "evolve") noTargetMsg = `No Pokémon can evolve with ${def?.name ?? "this item"}.`;

    const body = tiles || `<p class="placeholder">${noTargetMsg}</p>`;

    // Pro use action přidej number input pro batch use
    let batchUseSection = "";
    if (selectedAction === "use" && tiles) {
      const maxQty = itemCount(selectedItemId);
      batchUseSection = `
        <div class="batch-use-section">
          <label for="batch-qty-input">Use quantity:</label>
          <input type="number" id="batch-qty-input" min="1" max="${maxQty}" value="${selectedUseQty}" class="batch-qty-input" />
          <span class="placeholder">/ ${maxQty}</span>
        </div>`;
    }

    return `
      <h2 class="panel-title">${def?.icon ?? ""} ${title} <span class="placeholder">×${itemCount(selectedItemId)}</span></h2>
      <p class="placeholder">${desc}</p>
      ${batchUseSection}
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
      // Use, Held nebo Evolve – výběr cíle
      html = targetListHtml();
    } else if (selectedItemId) {
      // Vybraný held item – volba akce (Use / Held / Sell)
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

    // Evoluční itemy – do evolve flow
    overlay.querySelectorAll("[data-evolve-item]").forEach((btn) => {
      if (!btn.disabled) {
        btn.addEventListener("click", () => {
          selectedItemId = btn.dataset.evolveItem;
          selectedAction = "evolve";
          render();
        });
      }
    });

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

    // Batch qty input
    const batchQtyInput = overlay.querySelector("#batch-qty-input");
    if (batchQtyInput) {
      batchQtyInput.addEventListener("change", (e) => {
        const val = parseInt(e.target.value, 10);
        const maxQty = itemCount(selectedItemId);
        selectedUseQty = Math.max(1, Math.min(val, maxQty));
        e.target.value = selectedUseQty;
      });
    }

    // Use on target – batch use podle selectedUseQty
    overlay.querySelectorAll("[data-use-on]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const uid = btn.dataset.useOn;
        let usedCount = 0;
        let lastResult = { ok: false, reason: "Unknown error" };

        // Cyklus: použij item selectedUseQty-krát, nebo dokud se neselže
        for (let i = 0; i < selectedUseQty; i++) {
          const r = useItem(uid, selectedItemId);
          if (r.ok) {
            usedCount++;
            lastResult = r;
          } else {
            // Zastavit cyklus při neúspěchu (dojdou kusy, Pokémon se plně vyléčil apod.)
            lastResult = r;
            break;
          }
        }

        // Status message: kolik kusů bylo úspěšně použito
        if (usedCount > 0) {
          const itemName = getItem(selectedItemId)?.name ?? "item";
          if (usedCount === 1) {
            onStatus(`${itemName}: ${lastResult.msg}`);
          } else {
            onStatus(`${itemName} ×${usedCount}: ${lastResult.msg}`);
          }
        } else {
          onStatus(lastResult.reason);
        }
      })
    );

    // Evolve with target
    overlay.querySelectorAll("[data-evolve-with]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const uid = btn.dataset.evolveWith;
        let r;
        if (selectedItemId === "linking-cord") {
          r = evolveByTrade(uid, selectedItemId);
        } else {
          r = evolveWithItem(uid, selectedItemId);
        }
        if (r.ok) {
          onStatus(`${r.fromName} evolved into ${r.toName}!`);
          selectedItemId = null;
          selectedAction = null;
          render();
        } else {
          onStatus(r.reason);
        }
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

    // Sell 1 (z main listu)
    overlay.querySelectorAll("[data-sell-one]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const r = sellItem(btn.dataset.sellOne, 1);
        if (r.ok) onStatus(`Sold for ${r.gold} gold.`);
        else onStatus(r.reason);
      })
    );

    // Sell all (z main listu)
    overlay.querySelectorAll("[data-sell-all]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const itemId = btn.dataset.sellAll;
        const cnt = itemCount(itemId);
        const r = sellItem(itemId, cnt);
        if (r.ok) onStatus(`Sold ${cnt} for ${r.gold} gold.`);
        else onStatus(r.reason);
      })
    );

    // Sell 1 (z action choice)
    overlay.querySelectorAll("[data-sell-one-action]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const r = sellItem(btn.dataset.sellOneAction, 1);
        if (r.ok) {
          onStatus(`Sold for ${r.gold} gold.`);
          selectedItemId = null;
          selectedAction = null;
          render();
        } else {
          onStatus(r.reason);
        }
      })
    );

    // Sell all (z action choice)
    overlay.querySelectorAll("[data-sell-all-action]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const itemId = btn.dataset.sellAllAction;
        const cnt = itemCount(itemId);
        const r = sellItem(itemId, cnt);
        if (r.ok) {
          onStatus(`Sold ${cnt} for ${r.gold} gold.`);
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
