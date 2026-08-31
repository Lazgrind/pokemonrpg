/**
 * UI: přehled offline (idle) zisků po návratu do hry.
 * Zobrazí jednorázový, zavíratelný panel přes obrazovku. Skládá se ze sekcí,
 * které mají data: bojový idle (souboj na Route 1) a Školka (pasivní výcvik).
 */

import { formatDuration, OFFLINE_CAP_HOURS } from "../systems/idle.js";
import { lootLabel } from "../systems/battleSystem.js";

/**
 * Ukáže přehled offline progresu.
 * @param {{
 *   elapsedSec: number,
 *   battle: null | { kills: number, xp: number, gold: number, loot: Record<string, number> },
 *   daycare: null | { xp: number, name: string, fromLevel: number, toLevel: number }
 * }} summary
 */
export function showOfflineSummary(summary) {
  const capped = summary.elapsedSec > OFFLINE_CAP_HOURS * 3600;

  let sections = "";

  if (summary.battle) {
    const b = summary.battle;
    const lootLines = Object.entries(b.loot)
      .map(([res, amt]) => `<li>+${amt} ${lootLabel(res)}</li>`)
      .join("");
    sections += `
      <p class="placeholder" style="margin-top:6px">⚔️ Tvůj tým bojoval na Route 1:</p>
      <ul class="offline-gains">
        <li>Poraženo nepřátel: <strong>${b.kills}</strong></li>
        <li>✨ +${b.xp} XP</li>
        <li>💰 +${b.gold} gold</li>
        ${lootLines}
      </ul>`;
  }

  if (summary.daycare) {
    const d = summary.daycare;
    const lvl = d.toLevel > d.fromLevel ? ` (Lv ${d.fromLevel} → ${d.toLevel})` : "";
    sections += `
      <p class="placeholder" style="margin-top:6px">🐣 Ve školce se cvičil ${d.name}:</p>
      <ul class="offline-gains">
        <li>✨ +${d.xp} XP${lvl}</li>
      </ul>`;
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <h2 class="panel-title">Vítej zpět!</h2>
      <p class="placeholder">
        Byl jsi pryč <strong>${formatDuration(summary.elapsedSec)}</strong>${
          capped ? ` (počítáno max ${OFFLINE_CAP_HOURS} h)` : ""
        }.
      </p>
      ${sections}
      <button class="btn" id="offline-ok">Pokračovat</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector("#offline-ok").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
}
