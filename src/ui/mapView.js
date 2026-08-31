/**
 * UI: panel Mapy (pravá dolní část).
 * Krok 0 = vypíše dostupné oblasti z datové vrstvy (ukázka DATA → UI).
 */

import { AREAS } from "../../data/areas.js";

/**
 * Vykreslí panel mapy do zadaného elementu.
 * @param {HTMLElement} root
 */
export function renderMap(root) {
  root.innerHTML = `
    <h2 class="panel-title">Map</h2>
    <p class="placeholder">Available areas:</p>
    ${AREAS.map(
      (area) => `
        <div class="card">
          <strong>${area.name}</strong>
          <span style="color:var(--text-dim)"> · ${area.region} · Lv ${area.recommendedLevel}</span>
          <div class="placeholder" style="margin-top:4px">${area.description}</div>
        </div>`
    ).join("")}
  `;
}
