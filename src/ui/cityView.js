/**
 * UI: panel Města – izometrické 2.5D město (čistě CSS, bez závislostí).
 * Budovy jsou prostorové domečky (střecha + dvě stěny) na zelené ploše;
 * klik na budovu otevře její detail s možnostmi. Volné parcely = prázdné
 * pozemky, které naznačují růst města (další budovy = jen data).
 */

import { BUILDINGS } from "../../data/buildings.js";
import { getLevel } from "../systems/buildingSystem.js";
import { openBuilding } from "./buildingView.js";

/** Celkový počet pozemků ve městě (zbytek nad počtem budov = volné parcely). */
const CITY_PLOTS = 6;

/**
 * Vykreslí panel města do zadaného elementu.
 * @param {HTMLElement} root
 * @param {(msg: string) => void} [onStatus]
 */
export function renderCity(root, onStatus = () => {}) {
  const emptyCount = Math.max(0, CITY_PLOTS - BUILDINGS.length);

  root.innerHTML = `
    <h2 class="panel-title">City</h2>
    <p class="placeholder">Click a building to open its options.</p>
    <div class="iso-city">
      ${BUILDINGS.map(buildingCell).join("")}
      ${Array.from({ length: emptyCount }, emptyCell).join("")}
    </div>
  `;

  wire(root, onStatus);
}

/** Buňka s budovou – buď obrázkový sprite, nebo CSS domeček (fallback). */
function buildingCell(def) {
  const level = getLevel(def.id);
  const visual = def.sprite
    ? `<button class="iso-building has-sprite" data-id="${def.id}" title="${def.name}">
         <img class="b-sprite" src="${def.sprite}" alt="${def.name}" draggable="false">
       </button>`
    : `<button class="iso-building iso-b-${def.id}" data-id="${def.id}" title="${def.name}" style="--roof:${def.color}">
         <span class="face top"></span>
         <span class="face left"></span>
         <span class="face right"></span>
         <span class="facade awning"></span>
         <span class="facade window-l"></span>
         <span class="facade window-r"></span>
         <span class="facade door"></span>
         <span class="b-sign">${def.icon}</span>
       </button>`;

  return `
    <div class="iso-cell">
      ${visual}
      <div class="iso-tag">${def.name} · <span class="lvl-inline">Lv ${level}</span></div>
    </div>
  `;
}

/** Buňka s volnou parcelou. */
function emptyCell() {
  return `
    <div class="iso-cell">
      <div class="iso-plot" title="Empty lot — more buildings coming">
        <span class="plot-hint">🏗️</span>
      </div>
      <div class="iso-tag muted">Empty lot</div>
    </div>
  `;
}

function wire(root, onStatus) {
  root.querySelectorAll(".iso-building").forEach((tile) =>
    tile.addEventListener("click", () => openBuilding(tile.dataset.id, onStatus))
  );
}
