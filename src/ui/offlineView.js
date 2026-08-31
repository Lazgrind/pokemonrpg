/**
 * UI: přehled offline (idle) zisků po návratu do hry.
 * Zobrazí jednorázový, zavíratelný panel přes obrazovku.
 */

import { formatDuration, OFFLINE_CAP_HOURS } from "../systems/idle.js";
import { lootLabel } from "../systems/battleSystem.js";

/**
 * Ukáže přehled offline progresu.
 * @param {{ elapsedSec: number, capped: boolean, kills: number, xp: number, gold: number, loot: Record<string, number> }} summary
 */
export function showOfflineSummary(summary) {
  const lootLines = Object.entries(summary.loot)
    .map(([res, amt]) => `<li>+${amt} ${lootLabel(res)}</li>`)
    .join("");

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <h2 class="panel-title">Vítej zpět!</h2>
      <p class="placeholder">
        Byl jsi pryč <strong>${formatDuration(summary.elapsedSec)}</strong>${
          summary.capped ? ` (počítáno max ${OFFLINE_CAP_HOURS} h)` : ""
        }.<br>
        Tvůj tým mezitím bojoval na Route 1.
      </p>
      <ul class="offline-gains">
        <li>⚔️ Poraženo nepřátel: <strong>${summary.kills}</strong></li>
        <li>✨ +${summary.xp} XP</li>
        <li>💰 +${summary.gold} gold</li>
        ${lootLines}
      </ul>
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
