/**
 * profileView.js – záložka „Profile" (trainer card).
 *
 * Přehled hráče na jednom místě (jako trainer card ve hrách): jméno, badge case
 * (8 slotů odznaků – získané barevné, chybějící ztmavené), souhrn Pokédexu,
 * peníze, odehraný čas a pár statistik. Žádná herní logika – jen čte `state`.
 *
 * Data: `state.player.name`, `state.resources.gold`, `state.progress.badges`,
 * `state.collection` (shiny), `dexCounts()` (chyceno/celkem), `state.meta.createdAt`
 * (odehraný čas). Odznaky definuje data/badges.js; ikona = assets/badges/<id>.png
 * (chybí-li, ukáže se glyf-fallback). Scroll přežije překreslení (scrollPreserve).
 */

import { getState, commit } from "../core/state.js";
import { dexCounts, getPokedex } from "../systems/pokedex.js";
import { BADGES } from "../../data/badges.js";
import { saveScroll, restoreScroll } from "./scrollPreserve.js";

/** ms → „Xd Yh" / „Yh Zm" / „Zm" (odehraný čas). */
function formatPlaytime(ms) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Jeden slot badge case (získaný vs. zamčený). */
function badgeSlotHtml(badge, earned) {
  return `<div class="badge-slot ${earned ? "earned" : "locked"}" title="${badge.name} · ${badge.leader}">
    <span class="badge-icon-wrap">
      <img src="assets/badges/${badge.id}.png" alt="${badge.name}" class="badge-icon" onerror="this.remove()">
      <span class="badge-fallback">${earned ? "◆" : "◇"}</span>
    </span>
    <span class="badge-label">${earned ? badge.name : "???"}</span>
  </div>`;
}

/** Řádek statistiky (label + hodnota). */
function statRow(label, value) {
  return `<div class="profile-stat"><span class="ps-label">${label}</span><span class="ps-value">${value}</span></div>`;
}

/**
 * Vykreslí záložku Profile.
 * @param {HTMLElement} root
 * @param {(msg: string) => void} onStatus
 */
export function renderProfileTab(root, onStatus = () => {}) {
  const s = getState();
  const { caught, total } = dexCounts();
  const seen = getPokedex().seen.length;
  const badges = s.progress?.badges ?? [];
  const shiny = s.collection.filter((p) => p.shiny).length;
  const playtime = formatPlaytime(Date.now() - (s.meta?.createdAt ?? Date.now()));

  const _savedScroll = saveScroll(root);
  root.innerHTML = `
    <h2 class="panel-title">Profile</h2>
    <div class="card profile-head">
      <div class="profile-name" data-rename title="Click to rename">
        <span class="pn-text">${s.player?.name ?? "Trainer"}</span>
        <span class="pn-edit">✎</span>
      </div>
      <div class="profile-stats">
        ${statRow("Pokédex", `${caught} / ${total} caught`)}
        ${statRow("Seen", `${seen}`)}
        ${statRow("Badges", `${badges.length} / ${BADGES.length}`)}
        ${statRow("Shiny caught", `${shiny}`)}
        ${statRow("Gold", `${s.resources?.gold ?? 0} G`)}
        ${statRow("Play time", playtime)}
      </div>
    </div>

    <h3 class="profile-subtitle">Badge Case <span class="dex-count">${badges.length} / ${BADGES.length}</span></h3>
    <div class="badge-case">
      ${BADGES.map((b) => badgeSlotHtml(b, badges.includes(b.id))).join("")}
    </div>
  `;
  restoreScroll(root, _savedScroll);

  // Přejmenování hráče (klik na jméno → prompt).
  const nameEl = root.querySelector("[data-rename]");
  if (nameEl) {
    nameEl.addEventListener("click", () => {
      const current = getState().player?.name ?? "Trainer";
      const val = window.prompt("Trainer name:", current);
      if (val == null) return; // zrušeno
      const trimmed = val.trim();
      if (!trimmed || trimmed === current) return;
      const st = getState();
      if (!st.player) st.player = { name: trimmed };
      else st.player.name = trimmed;
      commit(); // → STATE_CHANGED → překreslení
      onStatus("Trainer name updated");
    });
  }
}
