/**
 * UI: panel Města – vizuální město s klikatelnými budovami (Krok 5+).
 * Budovy jsou dlaždice v „mapě“ města; klik otevře detail budovy s možnostmi.
 * Volné parcely naznačují, že město poroste (další budovy = jen data).
 */

import { BUILDINGS } from "../../data/buildings.js";
import { getLevel } from "../systems/buildingSystem.js";
import { openBuilding } from "./buildingView.js";

/** Kolik dlaždic (parcel) město celkem ukazuje – zbytek jsou volné parcely. */
const CITY_PLOTS = 6;

/**
 * Vykreslí panel města do zadaného elementu.
 * @param {HTMLElement} root
 * @param {(msg: string) => void} [onStatus]
 */
export function renderCity(root, onStatus = () => {}) {
  const emptyCount = Math.max(0, CITY_PLOTS - BUILDINGS.length);

  root.innerHTML = `
    <h2 class="panel-title">Město</h2>
    <p class="placeholder">Klikni na budovu a otevřou se její možnosti.</p>
    <div class="city-map">
      ${BUILDINGS.map(buildingTile).join("")}
      ${Array.from({ length: emptyCount }, emptyTile).join("")}
    </div>
  `;

  wire(root, onStatus);
}

/** Dlaždice existující budovy. */
function buildingTile(def) {
  const level = getLevel(def.id);
  return `
    <button class="plot building" data-id="${def.id}" title="${def.name}">
      <span class="plot-icon">${def.icon}</span>
      <span class="plot-name">${def.name}</span>
      <span class="plot-lvl">Lv ${level}</span>
    </button>
  `;
}

/** Volná parcela pro budoucí budovu. */
function emptyTile() {
  return `
    <div class="plot empty" title="Volná parcela – další budovy přijdou">
      <span class="plot-icon">🏗️</span>
      <span class="plot-name">Volná parcela</span>
    </div>
  `;
}

function wire(root, onStatus) {
  root.querySelectorAll(".plot.building").forEach((tile) =>
    tile.addEventListener("click", () => openBuilding(tile.dataset.id, onStatus))
  );
}
