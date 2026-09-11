/**
 * UI: záložka Rockets (samostatný tab v hlavním panelu). Ukáže se JEN když je
 * hráč na oblasti s POVINNÝM Rocket gauntletem (data/trainers.js →
 * rocketGauntletForArea). Gauntlet = sekvence trenérů jako gym, ale bez odznaku;
 * odemčený je vždy jen další neporažený (striktní pořadí). Poražením VŠECH se
 * nastaví story flag a odemkne se další cesta (viz finishTrainerBattle).
 *
 * Souboj se spouští přes battleSystem.startTrainerBattle(trainerId, {forceManual})
 * a hráč se přepne na záložku Battle (openMainTab). Chytání je vypnuté a tyto
 * souboje jsou POVINNĚ manuální (auto zakázáno – řeší engine přes forceManual).
 */

import { rocketGauntletForArea, rocketTrainers, trainerSpriteUrl } from "../../data/trainers.js";
import { getState } from "../core/state.js";
import { startTrainerBattle, getActiveArea } from "../systems/battleSystem.js";
import { openMainTab } from "./mainPanel.js";
import { saveScroll, restoreScroll } from "./scrollPreserve.js";

/** Vykreslí obsah záložky Rockets do zadaného elementu. */
export function renderRocketsTab(root, onStatus = () => {}) {
  const areaId = getActiveArea()?.id ?? null;
  const gaunt = rocketGauntletForArea(areaId);
  if (!gaunt) {
    const _savedScroll = saveScroll(root);
    root.innerHTML = `<h2 class="panel-title">Rockets</h2><p class="placeholder">There's nothing to fight here.</p>`;
    restoreScroll(root, _savedScroll);
    return;
  }

  const defeated = getState().progress?.defeatedTrainers ?? [];
  const trainers = rocketTrainers(gaunt);
  // Index dalšího neporaženého trenéra (odemčený). -1 = celý gauntlet hotový.
  const nextIdx = trainers.findIndex((t) => !defeated.includes(t.id));
  const cleared = nextIdx === -1;
  const beatenCount = trainers.filter((t) => defeated.includes(t.id)).length;

  const _savedScroll = saveScroll(root);
  const rows = trainers
    .map((t, i) => {
      const isDefeated = defeated.includes(t.id);
      const isNext = i === nextIdx;
      const maxLv = Math.max(...t.team.map((m) => m.level ?? 1));
      const teamInfo = `${t.team.length} Pokémon · up to Lv ${maxLv}`;

      let statusHtml;
      if (isDefeated) {
        statusHtml = `<span class="gym-status done">✓ Defeated</span>`;
      } else if (isNext) {
        statusHtml = `<button class="btn btn-sm gym-fight" data-trainer="${t.id}">Fight ⚔</button>`;
      } else {
        statusHtml = `<span class="gym-status locked">🔒 Beat the previous grunt</span>`;
      }

      return `
        <li class="gym-trainer ${isDefeated ? "is-done" : isNext ? "is-next" : "is-locked"}">
          <img class="gym-trainer-sprite" src="${trainerSpriteUrl({ id: t.id, class: t.class, kind: t.kind })}" alt="${t.name}" onerror="this.style.visibility='hidden'">
          <span class="gym-trainer-info">
            <span class="gym-trainer-name">${t.name}</span>
            <span class="placeholder gym-trainer-team">${teamInfo}</span>
          </span>
          ${statusHtml}
        </li>`;
    })
    .join("");

  const progressState = cleared
    ? `<span class="gym-badge-won">✓ All grunts defeated — the path onward is open!</span>`
    : `<span class="placeholder">Grunts defeated: ${beatenCount} / ${trainers.length}</span>`;

  root.innerHTML = `
    <section class="gym-section type-rocket">
      <h2 class="panel-title">🚫 ${gaunt.title}</h2>
      <p class="story-text">${gaunt.intro}</p>
      <p class="placeholder">These battles are manual only — Auto battle is disabled here.</p>
      <div class="gym-badge-row">${progressState}</div>
      <ul class="gym-trainer-list">${rows}</ul>
    </section>`;
  restoreScroll(root, _savedScroll);

  root.querySelectorAll(".gym-fight").forEach((btn) =>
    btn.addEventListener("click", () => {
      const res = startTrainerBattle(btn.dataset.trainer, { forceManual: true });
      if (!res.ok) {
        onStatus(res.reason ?? "Can't start the battle.");
        return;
      }
      openMainTab("battle");
    })
  );
}
