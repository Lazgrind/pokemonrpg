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
 *   daycare: null | { xp: number, name: string, fromLevel: number, toLevel: number },
 *   bred?: null | Array<{ id: string, speciesId: string }>
 * }} summary
 * @param {() => void} [onClose]  zavolá se po zavření přehledu (Continue / klik mimo).
 *   Sem řetězíme reveal popupy vylíhnutých vajec, ať se neukážou pod tímto oknem.
 *   (Vylíhnutá vejce se v tomto souhrnu NEVYPISUJÍ – jen přes reveal popupy.)
 */
export function showOfflineSummary(summary, onClose) {
  const capped = summary.elapsedSec > OFFLINE_CAP_HOURS * 3600;

  let sections = "";

  if (summary.battle) {
    const b = summary.battle;
    const lootLines = Object.entries(b.loot)
      .map(([res, amt]) => `<li>+${amt} ${lootLabel(res)}</li>`)
      .join("");
    sections += `
      <p class="placeholder" style="margin-top:6px">⚔️ Your team was battling on Route 1:</p>
      <ul class="offline-gains">
        <li>Enemies defeated: <strong>${b.kills}</strong></li>
        <li>✨ +${b.xp} XP</li>
        <li>💰 +${b.gold} gold</li>
        ${lootLines}
      </ul>`;
  }

  if (summary.daycare) {
    const d = summary.daycare;
    const lvl = d.toLevel > d.fromLevel ? ` (Lv ${d.fromLevel} → ${d.toLevel})` : "";
    sections += `
      <p class="placeholder" style="margin-top:6px">🐣 ${d.name} trained at the Day Care:</p>
      <ul class="offline-gains">
        <li>✨ +${d.xp} XP${lvl}</li>
      </ul>`;
  }

  // Vylíhnutá vejce ZÁMĚRNĚ nevypisujeme – každé se ukáže jako samostatný
  // animovaný reveal popup po zavření tohoto souhrnu (viz onClose v main.js),
  // takže duplikovat je i tady by byla dvojí informace.

  if (summary.bred?.length) {
    const n = summary.bred.length;
    sections += `
      <p class="placeholder" style="margin-top:6px">💞 The Day Care couple produced ${
        n > 1 ? `<strong>${n}</strong> eggs` : "an egg"
      }:</p>
      <ul class="offline-gains">
        <li>🥚 ${n} new egg${n > 1 ? "s" : ""} in your inventory — the species stays a mystery until it hatches.</li>
      </ul>`;
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <h2 class="panel-title">Welcome back!</h2>
      <p class="placeholder">
        You were away <strong>${formatDuration(summary.elapsedSec)}</strong>${
          capped ? ` (counted up to ${OFFLINE_CAP_HOURS} h)` : ""
        }.
      </p>
      ${sections}
      <button class="btn" id="offline-ok">Continue</button>
    </div>
  `;
  document.body.appendChild(overlay);

  let closed = false;
  const close = () => {
    if (closed) return; // ať onClose (reveal popupy) neběží dvakrát
    closed = true;
    overlay.remove();
    onClose?.();
  };
  overlay.querySelector("#offline-ok").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
}
