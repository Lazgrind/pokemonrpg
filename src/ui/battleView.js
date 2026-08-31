/**
 * UI: panel Battle Area (pravá horní část).
 * Vizuální souboj: HP bary obou stran, ovládání (start/pauza, rychlost) a log.
 * Reaguje na událost BATTLE_UPDATE ze soubojového systému.
 */

import { bus, EVENTS } from "../core/events.js";
import { getState } from "../core/state.js";
import {
  getBattle,
  toggleBattle,
  setSpeed,
  attemptCatch,
  getCatchChance,
  getAutocatch,
  setAutocatch,
  getSelectedBall,
  setSelectedBall,
} from "../systems/battleSystem.js";
import { POKEBALLS } from "../../data/pokeballs.js";

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
  const name = `${c.ref.shiny ? "✨ " : ""}${c.name}`;
  return `
    <div class="combatant ${side}">
      <div class="c-head"><strong>${name}</strong> · Lv ${c.ref.level} ${types}</div>
      <div class="hpbar"><div class="hpfill${low}" style="width:${pct}%"></div></div>
      <div class="hptext">${c.hp} / ${c.stats.maxHp} HP</div>
    </div>`;
}

function draw(root) {
  const b = getBattle();

  if (!b) {
    root.innerHTML = `
      <h2 class="panel-title">Battle Area</h2>
      <p class="placeholder">No battle yet. Build a team and start it.</p>
      <button class="btn" id="battle-toggle">▶ Start battle</button>
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

  const ac = getAutocatch();
  const balls = getState().resources.balls ?? {};
  const owned = POKEBALLS.filter((ball) => (balls[ball.id] ?? 0) > 0);
  const selected = getSelectedBall();
  const selCount = balls[selected] ?? 0;
  const canCatch = !b.result && b.enemy && b.enemy.hp > 0 && selCount > 0;
  const catchPct = Math.round(getCatchChance() * 100);

  const ballChips = owned.length
    ? owned
        .map(
          (ball) =>
            `<button class="ball-chip ${ball.id === selected ? "active" : ""}" data-ball="${ball.id}" title="${ball.name} — ${ball.desc}">${ball.icon} ${balls[ball.id]}</button>`
        )
        .join("")
    : `<span class="placeholder">No Poké Balls — buy some in the Poké Mart.</span>`;

  root.innerHTML = `
    <h2 class="panel-title">Battle Area — ${b.area.name}</h2>
    <div class="battle-field">
      ${combatantHtml(b.enemy, "enemy")}
      <div class="vs">VS</div>
      ${combatantHtml(b.player, "player")}
    </div>
    <div class="battle-controls">
      <button class="btn" id="battle-toggle">
        ${b.result ? "▶ New battle" : b.running ? "⏸ Pause" : "▶ Resume"}
      </button>
      <span class="speed-group">${speeds}</span>
    </div>
    <div class="catch-controls">
      <button class="btn catch-btn" id="catch-btn" ${canCatch ? "" : "disabled"}>
        🔴 Catch${b.enemy && b.enemy.hp > 0 && selCount > 0 ? ` (${catchPct}%)` : ""}
      </button>
      <label class="autocatch-toggle">
        <input type="checkbox" id="ac-enabled" ${ac.enabled ? "checked" : ""} />
        Autocatch
      </label>
      <div class="autocatch-filters${ac.enabled ? "" : " hidden"}">
        <label><input type="checkbox" data-ac="newSpecies" ${ac.newSpecies ? "checked" : ""} /> New species</label>
        <label><input type="checkbox" data-ac="betterIvs" ${ac.betterIvs ? "checked" : ""} /> Better IVs</label>
        <label><input type="checkbox" data-ac="shiny" ${ac.shiny ? "checked" : ""} /> Shiny</label>
      </div>
    </div>
    <div class="ball-picker">${ballChips}</div>
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

  const catchBtn = root.querySelector("#catch-btn");
  if (catchBtn) catchBtn.addEventListener("click", () => attemptCatch());

  root.querySelectorAll("[data-ball]").forEach((chip) =>
    chip.addEventListener("click", () => setSelectedBall(chip.dataset.ball))
  );

  const acEnabled = root.querySelector("#ac-enabled");
  if (acEnabled) {
    acEnabled.addEventListener("change", (e) => setAutocatch({ enabled: e.target.checked }));
  }
  root.querySelectorAll("[data-ac]").forEach((cb) =>
    cb.addEventListener("change", (e) => setAutocatch({ [cb.dataset.ac]: e.target.checked }))
  );
}
