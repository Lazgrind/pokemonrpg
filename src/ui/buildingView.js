/**
 * UI: detail budovy – otevře se po kliknutí na budovu ve městě.
 * Zobrazí možnosti dané budovy (u Poké Martu nákup Poké Ballů a vylepšení).
 * Čísla se živě aktualizují přes STATE_CHANGED, dokud je detail otevřený.
 */

import { getBuilding } from "../../data/buildings.js";
import {
  getLevel,
  isMaxed,
  upgradeCost,
  upgradeBuilding,
  ballPrice,
  buyPokeballs,
} from "../systems/buildingSystem.js";
import { getState } from "../core/state.js";
import { bus, EVENTS } from "../core/events.js";

/**
 * Otevře detail budovy jako modal.
 * @param {string} id
 * @param {(msg: string) => void} [onStatus]
 */
export function openBuilding(id, onStatus = () => {}) {
  const def = getBuilding(id);
  if (!def) return;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  // Živá aktualizace obsahu při změně stavu (po nákupu/vylepšení).
  const unsub = bus.on(EVENTS.STATE_CHANGED, render);

  function close() {
    unsub();
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  }
  function onKey(e) {
    if (e.key === "Escape") close();
  }
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  function render() {
    const gold = getState().resources.gold;
    const level = getLevel(id);
    const maxed = isMaxed(id);
    const upCost = upgradeCost(id);
    const canUpgrade = !maxed && gold >= upCost;
    const price = ballPrice(id);
    const canBuy = gold >= price;

    overlay.innerHTML = `
      <div class="modal building-modal">
        <div class="building-modal-head">
          <span class="b-icon">${def.icon}</span>
          <div>
            <h2 class="panel-title" style="border:0;margin:0;padding:0">${def.name}</h2>
            <div class="building-desc">${def.description}</div>
          </div>
          <span class="lvl">Lv ${level}${maxed ? " (max)" : ""}</span>
        </div>

        <div class="building-stats">
          <span>💰 Tvůj gold: <strong>${gold}</strong></span>
          <span>🔴 Cena Poké Ballu: <strong>${price}</strong></span>
        </div>

        <div class="building-actions">
          <button class="btn" data-act="buy" ${canBuy ? "" : "disabled"}>
            Koupit Poké Ball · ${price} 💰
          </button>
          <button class="btn" data-act="upgrade" ${canUpgrade ? "" : "disabled"}>
            ${maxed ? "Budova na maximu" : `Vylepšit budovu · ${upCost} 💰`}
          </button>
        </div>
        ${
          maxed
            ? ""
            : `<p class="placeholder" style="margin-top:8px">Vylepšení sníží cenu Poké Ballu.</p>`
        }

        <button class="btn btn-close" data-act="close">Zavřít</button>
      </div>
    `;

    const buy = overlay.querySelector('[data-act="buy"]');
    if (buy)
      buy.addEventListener("click", () => {
        const r = buyPokeballs(1, id);
        onStatus(r.ok ? "Koupil jsi Poké Ball ✓" : r.reason);
      });

    const up = overlay.querySelector('[data-act="upgrade"]');
    if (up)
      up.addEventListener("click", () => {
        const r = upgradeBuilding(id);
        onStatus(r.ok ? "Budova vylepšena ✓" : r.reason);
      });

    overlay.querySelector('[data-act="close"]').addEventListener("click", close);
  }

  render();
}
