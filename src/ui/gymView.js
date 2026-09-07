/**
 * UI: záložka Gym (samostatný tab v hlavním panelu). Ukáže se JEN když je hráč
 * ve městě s gymem (data/gyms.js → getGymForCity). Gym = sekvence trenérů;
 * odemčený je vždy jen další neporažený (striktní pořadí). Poražením posledního
 * (leadera) padne odznak.
 *
 * Souboj se spouští přes battleSystem.startTrainerBattle(trainerId, {gymId}) a
 * hráč se přepne na záložku Battle (openMainTab). Chytání je vypnuté a gym
 * souboje jsou POVINNĚ manuální (auto zakázáno – řeší engine přes forceManual).
 */

import { getGymForCity, gymTrainers } from "../../data/gyms.js";
import { trainerSpriteUrl } from "../../data/trainers.js";
import { getBadge } from "../../data/badges.js";
import { getState } from "../core/state.js";
import { startTrainerBattle, getActiveArea } from "../systems/battleSystem.js";
import { openMainTab } from "./mainPanel.js";

/** Vykreslí obsah záložky Gym do zadaného elementu. */
export function renderGymTab(root, onStatus = () => {}) {
  const cityId = getActiveArea()?.id ?? null;
  const gym = getGymForCity(cityId);
  if (!gym) {
    root.innerHTML = `<h2 class="panel-title">Gym</h2><p class="placeholder">There's no Gym here.</p>`;
    return;
  }

  const defeated = getState().progress?.defeatedTrainers ?? [];
  const trainers = gymTrainers(gym);
  // Index dalšího neporaženého trenéra (odemčený). -1 = celý gym hotový.
  const nextIdx = trainers.findIndex((t) => !defeated.includes(t.id));
  const cleared = nextIdx === -1;
  const badge = getBadge(gym.badge);

  const rows = trainers
    .map((t, i) => {
      const isDefeated = defeated.includes(t.id);
      const isNext = i === nextIdx;
      const isLeader = t.kind === "gym-leader";
      const maxLv = Math.max(...t.team.map((m) => m.level ?? 1));
      const teamInfo = `${t.team.length} Pokémon · up to Lv ${maxLv}`;

      let statusHtml;
      if (isDefeated) {
        statusHtml = `<span class="gym-status done">✓ Defeated</span>`;
      } else if (isNext) {
        statusHtml = `<button class="btn btn-sm gym-fight" data-trainer="${t.id}" data-gym="${gym.id}">${isLeader ? "Challenge ⚔" : "Fight ⚔"}</button>`;
      } else {
        statusHtml = `<span class="gym-status locked">🔒 Beat the previous challenger</span>`;
      }

      return `
        <li class="gym-trainer ${isLeader ? "is-leader" : ""} ${isDefeated ? "is-done" : isNext ? "is-next" : "is-locked"}">
          <img class="gym-trainer-sprite" src="${trainerSpriteUrl({ id: t.id, class: t.class, kind: t.kind })}" alt="${t.name}" onerror="this.style.visibility='hidden'">
          <span class="gym-trainer-info">
            <span class="gym-trainer-name">${isLeader ? "👑 " : ""}${t.name}</span>
            <span class="placeholder gym-trainer-team">${teamInfo}</span>
          </span>
          ${statusHtml}
        </li>`;
    })
    .join("");

  const badgeName = badge?.name ?? gym.badge;
  const badgeState = cleared
    ? `<span class="gym-badge-won"><img class="badge-icon" src="assets/badges/${gym.badge}.png" alt="${badgeName}" onerror="this.style.display='none'"> ${badgeName} earned!</span>`
    : `<span class="placeholder">Beat the Leader to earn the ${badgeName}.</span>`;

  root.innerHTML = `
    <section class="gym-section type-${gym.type}">
      <h2 class="panel-title">🏟️ ${gym.name} <span class="placeholder">· ${gym.type}</span></h2>
      <p class="placeholder">Gym battles are manual only — Auto battle is disabled here.</p>
      <div class="gym-badge-row">${badgeState}</div>
      <ul class="gym-trainer-list">${rows}</ul>
    </section>`;

  root.querySelectorAll(".gym-fight").forEach((btn) =>
    btn.addEventListener("click", () => {
      const res = startTrainerBattle(btn.dataset.trainer, { gymId: btn.dataset.gym });
      if (!res.ok) {
        onStatus(res.reason ?? "Can't start the battle.");
        return;
      }
      openMainTab("battle");
    })
  );
}
