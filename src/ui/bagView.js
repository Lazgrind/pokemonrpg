/**
 * bagView.js – batoh mimo souboj (v0.45.0).
 *
 * Modal se seznamem vlastněných léčivých předmětů (potiony, léčení statusů,
 * revivy). Klik na item přepne na výběr cíle z kolekce (jen platné cíle dle
 * canUseItem) a použije ho. Živě se aktualizuje přes STATE_CHANGED.
 */

import { bus, EVENTS } from "../core/events.js";
import { getState } from "../core/state.js";
import { ITEMS, ITEM_CATEGORIES, getItem } from "../../data/items.js";
import { itemCount, canUseItem, useItem } from "../systems/itemSystem.js";
import { computeStats } from "../systems/pokemonSystem.js";
import { getSpecies } from "../../data/pokemon.js";
import { statusBadge } from "./statusBadge.js";

/**
 * Otevře batoh. `onStatus` slouží k hlášení výsledku akce (např. do lišty týmu).
 * @param {(msg: string) => void} [onStatus]
 */
export function openBag(onStatus = () => {}) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  // Když je vybraný item, ukazujeme výběr cíle; jinak seznam itemů.
  let selectedItemId = null;

  const unsub = bus.on(EVENTS.STATE_CHANGED, render);

  function close() {
    unsub();
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  }
  function onKey(e) {
    if (e.key === "Escape") {
      if (selectedItemId) {
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

  /** Seznam vlastněných itemů seskupený po kategoriích. */
  function itemListHtml() {
    const groups = ITEM_CATEGORIES.map((cat) => {
      const rows = ITEMS.filter((it) => it.category === cat.key && itemCount(it.id) > 0)
        .map(
          (it) => `<button class="bag-item-row" data-pick-item="${it.id}" title="${it.desc}">
            <span>${it.icon} <strong>${it.name}</strong> <span class="placeholder">— ${it.desc}</span></span>
            <span class="bag-count">×${itemCount(it.id)}</span>
          </button>`
        )
        .join("");
      return rows ? `<h3 class="shop-cat">${cat.icon} ${cat.name}</h3>${rows}` : "";
    }).join("");

    const body = groups || `<p class="placeholder">Your bag is empty. Buy items at the Poké Mart.</p>`;
    return `
      <h2 class="panel-title">🎒 Bag</h2>
      <div class="bag-list">${body}</div>
      <button class="btn btn-close" data-act="close">Close</button>`;
  }

  /** Výběr cíle pro vybraný item (jen platné cíle z kolekce). */
  function targetListHtml() {
    const def = getItem(selectedItemId);
    const collection = getState().collection ?? [];
    const targets = collection.filter((p) => canUseItem(selectedItemId, p).ok);

    const tiles = targets
      .map((p) => {
        const sp = getSpecies(p.speciesId);
        const max = computeStats(p).maxHp;
        const hp = Math.max(0, Math.min(max, p.hp ?? max));
        const pct = Math.round((hp / max) * 100);
        const low = hp <= 0 ? " fainted" : pct <= 25 ? " low" : "";
        return `<button class="btn switch-tile" data-use-on="${p.uid}">
          <span class="sw-name">${p.shiny ? "✨ " : ""}${sp?.name ?? p.speciesId} <span class="placeholder">Lv ${p.level}</span>${statusBadge(p.status)}</span>
          <span class="hpbar"><span class="hpfill${low}" style="width:${pct}%"></span></span>
          <span class="sw-hp">${hp}/${max} HP</span>
        </button>`;
      })
      .join("");

    const body = tiles || `<p class="placeholder">No Pokémon can use ${def?.name ?? "this item"} right now.</p>`;
    return `
      <h2 class="panel-title">${def?.icon ?? ""} Use ${def?.name ?? "item"} <span class="placeholder">×${itemCount(selectedItemId)}</span></h2>
      <p class="placeholder">${def?.desc ?? ""} — pick a Pokémon.</p>
      <div class="switch-list">${body}</div>
      <button class="btn btn-sm menu-back" data-act="back">← Back</button>`;
  }

  function render() {
    // Když nám vybraný item dojde, spadneme zpět na seznam.
    if (selectedItemId && itemCount(selectedItemId) <= 0) selectedItemId = null;

    overlay.innerHTML = `<div class="modal building-modal">${
      selectedItemId ? targetListHtml() : itemListHtml()
    }</div>`;

    overlay.querySelectorAll("[data-pick-item]").forEach((btn) =>
      btn.addEventListener("click", () => {
        selectedItemId = btn.dataset.pickItem;
        render();
      })
    );
    overlay.querySelectorAll("[data-use-on]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const r = useItem(btn.dataset.useOn, selectedItemId);
        onStatus(r.ok ? `${getItem(selectedItemId)?.name}: ${r.msg}` : r.reason);
        // render() se stejně spustí přes STATE_CHANGED z useItem; necháme ho
        // doběhnout (aktualizuje počty i seznam cílů, případně spadne na seznam).
      })
    );

    const back = overlay.querySelector('[data-act="back"]');
    if (back)
      back.addEventListener("click", () => {
        selectedItemId = null;
        render();
      });

    const closeBtn = overlay.querySelector('[data-act="close"]');
    if (closeBtn) closeBtn.addEventListener("click", close);
  }

  render();
}
