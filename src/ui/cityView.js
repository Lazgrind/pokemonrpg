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
    <h2 class="panel-title">Město</h2>
    <p class="placeholder">Klikni na budovu a otevřou se její možnosti.</p>
    <div class="iso-city">
      ${BUILDINGS.map(buildingCell).join("")}
      ${Array.from({ length: emptyCount }, emptyCell).join("")}
    </div>
  `;

  wire(root, onStatus);
}

/** Buňka s izometrickou budovou. */
function buildingCell(def) {
  const level = getLevel(def.id);
  return `
    <div class="iso-cell">
      <button class="iso-building" data-id="${def.id}" title="${def.name}" style="--roof:${def.color}">
        <span class="face top"></span>
        <span class="face left"></span>
        <span class="face right"></span>
        <span class="b-emoji">${def.icon}</span>
      </button>
      <div class="iso-tag">${def.name} · <span class="lvl-inline">Lv ${level}</span></div>
    </div>
  `;
}

/** Buňka s volnou parcelou. */
function emptyCell() {
  return `
    <div class="iso-cell">
      <div class="iso-plot" title="Volná parcela – další budovy přijdou">
        <span class="plot-hint">🏗️</span>
      </div>
      <div class="iso-tag muted">Volná parcela</div>
    </div>
  `;
}

function wire(root, onStatus) {
  root.querySelectorAll(".iso-building").forEach((tile) =>
    tile.addEventListener("click", () => openBuilding(tile.dataset.id, onStatus))
  );
}
