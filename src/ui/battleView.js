/**
 * UI: panel Battle Area (pravá horní část).
 * Vizuální souboj: HP bary obou stran, ovládání (start/pauza, rychlost) a log.
 * Reaguje na událost BATTLE_UPDATE ze soubojového systému.
 */

import { bus, EVENTS } from "../core/events.js";
import { getBattle, toggleBattle, setSpeed } from "../systems/battleSystem.js";

let subscribed = false;

/**
 * Vykreslí panel a jednorázově se přihlásí k aktualizacím souboje.
 * @param {HTMLElement} root
 */
export function renderBattle(root) {
  draw(root);
  if (!subscribed) {
    bus.on(EVENTS.BATTLE_UPDATE, () => draw(root));
    subscribed = true;
  }
}

/** HTML jednoho bojovníka (nepřítel nahoře, hráč dole). */
function combatantHtml(c, side) {
  const pct = Math.max(0, Math.round((c.hp / c.stats.maxHp) * 100));
  const low = pct <= 25 ? " low" : "";
  const types = c.types.map((t) => `<span class="type">${t}</span>`).join("");
  return `
    <div class="combatant ${side}">
      <div class="c-head"><strong>${c.name}</strong> · Lv ${c.ref.level} ${types}</div>
      <div class="hpbar"><div class="hpfill${low}" style="width:${pct}%"></div></div>
      <div class="hptext">${c.hp} / ${c.stats.maxHp} HP</div>
    </div>`;
}

function draw(root) {
  const b = getBattle();

  if (!b) {
    root.innerHTML = `
      <h2 class="panel-title">Battle Area</h2>
      <p class="placeholder">Zatím žádný souboj. Sestav si tým a spusť ho.</p>
      <button class="btn" id="battle-toggle">▶ Start souboje</button>
      <div id="battle-msg" class="placeholder" style="margin-top:8px"></div>
    `;
    wire(root);
    return;
  }

  const speeds = [1, 2, 4]
    .map(
      (s) => `<button class="btn spd ${b.speed === s ? "active" : ""}" data-speed="${s}">${s}×</button>`
    )
    .join("");

  root.innerHTML = `
    <h2 class="panel-title">Battle Area — ${b.area.name}</h2>
    <div class="battle-field">
      ${combatantHtml(b.enemy, "enemy")}
      <div class="vs">VS</div>
      ${combatantHtml(b.player, "player")}
    </div>
    <div class="battle-controls">
      <button class="btn" id="battle-toggle">
        ${b.result ? "▶ Nový souboj" : b.running ? "⏸ Pauza" : "▶ Pokračovat"}
      </button>
      <span class="speed-group">${speeds}</span>
    </div>
    <div class="battle-log">${b.log.slice(-8).map((l) => `<div>${l}</div>`).join("")}</div>
  `;
  wire(root);
}

function wire(root) {
  const toggle = root.querySelector("#battle-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const r = toggleBattle();
      if (r && r.ok === false) {
        const msg = root.querySelector("#battle-msg");
        if (msg) msg.textContent = r.reason;
      }
    });
  }
  root.querySelectorAll("[data-speed]").forEach((b) =>
    b.addEventListener("click", () => setSpeed(Number(b.dataset.speed)))
  );
}
