/**
 * UI: panel Města – funkční budovy (Krok 5).
 * Zatím jedna budova: Poké Mart (nákup Poké Ballů, vylepšení snižuje cenu).
 * Po akci se stav změní (commit) → levý panel se překreslí sám.
 */

import { BUILDINGS } from "../../data/buildings.js";
import {
  getLevel,
  isMaxed,
  upgradeCost,
  upgradeBuilding,
  ballPrice,
  buyPokeballs,
} from "../systems/buildingSystem.js";
import { getState } from "../core/state.js";

/**
 * Vykreslí panel města do zadaného elementu.
 * @param {HTMLElement} root
 * @param {(msg: string) => void} [onStatus]
 */
export function renderCity(root, onStatus = () => {}) {
  const gold = getState().resources.gold;

  root.innerHTML = `
    <h2 class="panel-title">Město</h2>
    <p class="placeholder">Tvé zázemí. Za nasbíraný gold ho můžeš vylepšovat.</p>
    ${BUILDINGS.map((b) => buildingCard(b, gold)).join("")}
  `;

  wire(root, onStatus);
}

/** HTML karty jedné budovy. */
function buildingCard(def, gold) {
  const level = getLevel(def.id);
  const maxed = isMaxed(def.id);
  const upCost = upgradeCost(def.id);
  const canUpgrade = !maxed && gold >= upCost;

  // Zatím máme jen Poké Mart – nákup Poké Ballů.
  const price = ballPrice(def.id);
  const canBuy = gold >= price;

  return `
    <div class="card building">
      <div class="building-head">
        <strong>${def.icon} ${def.name}</strong>
        <span class="lvl">Lv ${level}${maxed ? " (max)" : ""}</span>
      </div>
      <div class="building-desc">${def.description}</div>
      <div class="row-actions">
        <button class="btn" data-act="buy" data-id="${def.id}" ${canBuy ? "" : "disabled"}>
          Koupit Poké Ball · ${price} 💰
        </button>
        <button class="btn" data-act="upgrade" data-id="${def.id}" ${canUpgrade ? "" : "disabled"}>
          ${maxed ? "Maximum" : `Vylepšit · ${upCost} 💰`}
        </button>
      </div>
    </div>
  `;
}

function wire(root, onStatus) {
  root.querySelectorAll('[data-act="buy"]').forEach((btn) =>
    btn.addEventListener("click", () => {
      const r = buyPokeballs(1, btn.dataset.id);
      onStatus(r.ok ? "Koupil jsi Poké Ball ✓" : r.reason);
    })
  );
  root.querySelectorAll('[data-act="upgrade"]').forEach((btn) =>
    btn.addEventListener("click", () => {
      const r = upgradeBuilding(btn.dataset.id);
      onStatus(r.ok ? "Budova vylepšena ✓" : r.reason);
    })
  );
}
