/**
 * leftPanel.js – levý panel se záložkami Tým / Pokédex / Město.
 * Rozvržení tří panelů zůstává; jen levý sloupec zpřehledňujeme záložkami.
 */

import { renderCity } from "./cityView.js";
import { renderTeamTab } from "./teamView.js";
import { renderPokedexTab } from "./pokedexView.js";
import { renderPcTab } from "./pcView.js";

const TABS = [
  { id: "team", label: "Team" },
  { id: "pc", label: "PC" },
  { id: "pokedex", label: "Pokédex" },
  { id: "city", label: "City" },
];

/** Aktivní záložka přežívá překreslení (modulová proměnná). */
let activeTab = "team";

/**
 * Vykreslí levý panel se záložkami a obsahem aktivní záložky.
 * @param {HTMLElement} root
 * @param {(msg: string) => void} onStatus
 */
export function renderLeftPanel(root, onStatus = () => {}) {
  root.innerHTML = `
    <div class="tabs">
      ${TABS.map(
        (t) => `<button class="tab ${t.id === activeTab ? "active" : ""}" data-tab="${t.id}">${t.label}</button>`
      ).join("")}
    </div>
    <div class="tab-content" id="tab-content"></div>
  `;

  root.querySelectorAll(".tab").forEach((btn) =>
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab;
      renderLeftPanel(root, onStatus);
    })
  );

  const content = root.querySelector("#tab-content");
  if (activeTab === "team") renderTeamTab(content, onStatus);
  else if (activeTab === "pc") renderPcTab(content, onStatus);
  else if (activeTab === "pokedex") renderPokedexTab(content, onStatus);
  else renderCity(content, onStatus);
}
