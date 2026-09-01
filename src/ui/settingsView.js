/**
 * UI: globální nastavení hry (horní lišta, tlačítko ⚙ s rozbalovacím menu).
 *
 * Zatím obsahuje jen herní rychlost (přesunutou sem z okna souboje). Další
 * možnosti (Lock max level, Nuzlocke, …) přibudou později – viz docs/BACKLOG.md.
 */

import { bus, EVENTS } from "../core/events.js";
import { getSpeed, setSpeed } from "../systems/battleSystem.js";

let subscribed = false;

/**
 * Vykreslí ovládání nastavení do daného kořene (horní lišta) a jednorázově
 * se přihlásí ke změnám stavu (aby se aktivní rychlost překreslila).
 * @param {HTMLElement} root
 */
export function renderSettings(root) {
  draw(root);
  if (!subscribed) {
    bus.on(EVENTS.STATE_CHANGED, () => draw(root));
    subscribed = true;
  }
}

function draw(root) {
  const wasOpen = root.querySelector(".settings-menu")?.classList.contains("open");
  const speed = getSpeed();
  const speeds = [1, 2, 4]
    .map(
      (s) => `<button class="btn spd ${speed === s ? "active" : ""}" data-speed="${s}">${s}×</button>`
    )
    .join("");

  root.innerHTML = `
    <button class="btn settings-btn" id="settings-toggle" title="Settings" aria-label="Settings">⚙</button>
    <div class="settings-menu${wasOpen ? " open" : ""}">
      <div class="settings-row">
        <span class="settings-label">Game speed</span>
        <span class="speed-group">${speeds}</span>
      </div>
      <div class="settings-note">More options (Lock max level, Nuzlocke…) coming soon.</div>
    </div>
  `;
  wire(root);
}

function wire(root) {
  const toggle = root.querySelector("#settings-toggle");
  const menu = root.querySelector(".settings-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("open");
    });
  }

  root.querySelectorAll("[data-speed]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation(); // překreslení + outside-click listener by jinak menu zavřel
      setSpeed(Number(b.dataset.speed));
    })
  );

  // Zavření kliknutím mimo menu (přihlásit jen jednou na dokument).
  if (!document.body.dataset.settingsOutside) {
    document.body.dataset.settingsOutside = "1";
    document.addEventListener("click", (e) => {
      const m = document.querySelector(".settings-menu.open");
      const t = document.getElementById("settings-toggle");
      if (m && !m.contains(e.target) && e.target !== t) m.classList.remove("open");
    });
  }
}
