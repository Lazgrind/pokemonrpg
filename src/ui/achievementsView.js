/**
 * achievementsView.js – záložka „Achievements" (Steam styl).
 *
 * Mřížka všech achievementů. ZAMČENÝ: název „???", vždy viditelný kryptický
 * hint (hráč z něj hádá), reálná podmínka i odměna SKRYTÉ. ODEMČENÝ: pravý
 * název + hint + řádek „Unlocked for: …" (reveal reálné podmínky) + odměna +
 * datum. BEZ ikon. Barevný proužek dle tieru. Filtr All / Unlocked / Locked.
 * Scroll přežije překreslení (scrollPreserve). Žádná herní logika – jen čte stav.
 */

import { getState } from "../core/state.js";
import { ACHIEVEMENTS } from "../../data/achievements.js";
import { saveScroll, restoreScroll } from "./scrollPreserve.js";

/** Lidský popisek tieru (třídy tier-* řeší barvu proužku). */
const TIER_LABEL = { common: "Common", secret: "Secret", rare: "Rare", insane: "Insane" };

/** Aktivní filtr přežívá překreslení (modulová proměnná). */
let filter = "all"; // "all" | "unlocked" | "locked"

/** Odměna → čitelný text ("+200 Gold", "+30 Coins", "+1× Rare Candy"). */
function formatReward(reward) {
  if (!reward) return "";
  const parts = [];
  if (reward.gold) parts.push(`+${reward.gold} Gold`);
  if (reward.coins) parts.push(`+${reward.coins} Coins`);
  if (reward.items) {
    for (const [itemId, qty] of Object.entries(reward.items)) {
      const itemName = itemId
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      parts.push(`+${qty}× ${itemName}`);
    }
  }
  return parts.join(", ");
}

/**
 * Vykreslí záložku Achievements.
 * @param {HTMLElement} root
 * @param {(msg: string) => void} onStatus
 */
export function renderAchievementsTab(root, onStatus = () => {}) {
  const s = getState();
  const unlocked = s.achievements?.unlocked ?? {};
  const unlockedCount = Object.keys(unlocked).length;
  const total = ACHIEVEMENTS.length;

  const list = ACHIEVEMENTS.filter((a) => {
    const isU = !!unlocked[a.id];
    if (filter === "unlocked") return isU;
    if (filter === "locked") return !isU;
    return true;
  });

  const cards = list
    .map((a) => {
      const isU = !!unlocked[a.id];
      const dateStr = isU ? new Date(unlocked[a.id]).toLocaleDateString() : "";
      const reward = isU ? formatReward(a.reward) : "";
      return `<div class="achv-card ${isU ? "unlocked" : "locked"} tier-${a.tier}">
        <div class="achv-card-head">
          <span class="achv-card-name">${isU ? a.name : "???"}</span>
          <span class="achv-card-tier">${TIER_LABEL[a.tier] ?? a.tier}</span>
        </div>
        <div class="achv-card-hint">${a.hint ?? ""}</div>
        ${isU && a.condition ? `<div class="achv-card-condition">Unlocked for: ${a.condition}</div>` : ""}
        ${reward ? `<div class="achv-card-reward">${reward}</div>` : ""}
        <div class="achv-card-status">${isU ? `✓ Unlocked${dateStr ? ` · ${dateStr}` : ""}` : "◇ Locked"}</div>
      </div>`;
    })
    .join("");

  const filterBtn = (id, label) =>
    `<button class="achv-filter-btn ${filter === id ? "active" : ""}" data-filter="${id}">${label}</button>`;

  const _saved = saveScroll(root);
  root.innerHTML = `
    <h2 class="panel-title">Achievements <span class="dex-count">${unlockedCount} / ${total}</span></h2>
    <div class="achv-filters">
      ${filterBtn("all", "All")}
      ${filterBtn("unlocked", "Unlocked")}
      ${filterBtn("locked", "Locked")}
    </div>
    <div class="achv-grid">
      ${cards || `<p class="placeholder">No achievements match this filter.</p>`}
    </div>
  `;
  restoreScroll(root, _saved);

  root.querySelectorAll("[data-filter]").forEach((btn) =>
    btn.addEventListener("click", () => {
      filter = btn.dataset.filter;
      renderAchievementsTab(root, onStatus);
    })
  );
}
