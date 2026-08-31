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
 *   egg?: null | Array<{ name: string, shiny: boolean, level: number, outcome: any }>,
 *   bred?: null | Array<{ id: string, speciesId: string }>
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

  if (summary.egg?.length) {
    const lines = summary.egg
      .map((e) => {
        const o = e.outcome ?? {};
        if (o.added) {
          return `<li>🎉 A new ${e.name}${e.shiny ? " ✨" : ""} joined your collection (Lv ${e.level})</li>`;
        }
        if (o.improvements?.length) {
          return `<li>${e.name}${e.shiny ? " ✨" : ""} hatched — improved ${o.improvements.join(", ")} (released)</li>`;
        }
        return `<li>${e.name} hatched, but your own was better — released</li>`;
      })
      .join("");
    const heading =
      summary.egg.length > 1
        ? `🥚 ${summary.egg.length} eggs hatched at the Day Care:`
        : "🥚 An egg hatched at the Day Care:";
    sections += `
      <p class="placeholder" style="margin-top:6px">${heading}</p>
      <ul class="offline-gains">
        ${lines}
      </ul>`;
  }

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

  const close = () => overlay.remove();
  overlay.querySelector("#offline-ok").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
}
