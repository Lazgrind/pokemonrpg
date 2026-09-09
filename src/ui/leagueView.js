/**
 * UI: záložka League (Pokémon League – Elite Four + Champion) na Indigo Plateau.
 *
 * Na rozdíl od gym/Rockets gauntletu běží Liga STRIKTNĚ ZA SEBOU: pět soubojů
 * (Lorelei → Bruno → Agatha → Lance → Champion) bez léčení v Poké Centru mezi
 * nimi – jen bag itemy (Potion/Revive) a HP se přenáší. Prohra kdekoli vrací na
 * začátek. Běh drží progress.leagueActive/leagueStep; logiku řeší battleSystem
 * (leagueState / startLeagueRun / continueLeagueRun / forfeitLeagueRun).
 *
 * Souboj se spouští přes battleSystem a hráč se přepne na záložku Battle. Mezi
 * zápasy je otevřený běh: hráč si může otevřít Bag (tlačítko v týmovém panelu)
 * a dohealovat itemy, pak se vrátí sem a klikne „Continue".
 */

import { getTrainer, trainerSpriteUrl } from "../../data/trainers.js";
import {
  leagueState,
  startLeagueRun,
  continueLeagueRun,
  forfeitLeagueRun,
} from "../systems/battleSystem.js";
import { openMainTab } from "./mainPanel.js";

/** Vykreslí obsah záložky League do zadaného elementu. */
export function renderLeagueTab(root, onStatus = () => {}) {
  const st = leagueState();
  if (!st) {
    root.innerHTML = `<h2 class="panel-title">Pokémon League</h2><p class="placeholder">The Pokémon League is not here.</p>`;
    return;
  }

  const { league, active, step, cleared } = st;
  const members = league.order.map((id) => getTrainer(id)).filter(Boolean);
  const total = members.length;

  const rows = members
    .map((t, i) => {
      const maxLv = Math.max(...t.team.map((m) => m.level ?? 1));
      const teamInfo = `${t.team.length} Pokémon · up to Lv ${maxLv}`;
      const isChampion = t.kind === "champion";
      const roleLabel = isChampion ? "Champion" : `Elite Four`;

      let statusHtml;
      let cls;
      if (i < step) {
        // V tomto běhu už poražen.
        statusHtml = `<span class="gym-status done">✓ Defeated</span>`;
        cls = "is-done";
      } else if (i === step && active) {
        // Aktuální soupeř běžícího běhu.
        statusHtml = `<button class="btn btn-sm gym-fight" data-league-continue>${isChampion ? "Face the Champion ⚔" : "Continue ⚔"}</button>`;
        cls = "is-next";
      } else if (i === step && !active) {
        // Sem se dostane běh – ale zatím nezačal.
        statusHtml = `<span class="gym-status locked">⚔ Next up</span>`;
        cls = "is-next";
      } else {
        statusHtml = `<span class="gym-status locked">🔒 ${isChampion ? "Beyond the Elite Four" : "Awaits their turn"}</span>`;
        cls = "is-locked";
      }

      return `
        <li class="gym-trainer ${cls}">
          <img class="gym-trainer-sprite" src="${trainerSpriteUrl({ id: t.id, class: t.class, kind: t.kind })}" alt="${t.name}" onerror="this.style.visibility='hidden'">
          <span class="gym-trainer-info">
            <span class="gym-trainer-name">${t.name} <span class="placeholder">· ${roleLabel}</span></span>
            <span class="placeholder gym-trainer-team">${teamInfo}</span>
          </span>
          ${statusHtml}
        </li>`;
    })
    .join("");

  // Ovládací lišta pod rosterem – závisí na stavu běhu.
  let controls;
  if (active) {
    controls = `
      <div class="gym-badge-row">
        <span class="placeholder">Challenge in progress — ${step} / ${total} cleared. No Poké Center healing! Use your Bag between battles.</span>
      </div>
      <div class="league-actions">
        <button class="btn gym-fight" data-league-continue>${step >= total ? "Claim your title" : "Continue the challenge ⚔"}</button>
        <button class="btn btn-close" data-league-forfeit>Forfeit run</button>
      </div>`;
  } else if (cleared) {
    controls = `
      <div class="gym-badge-row"><span class="gym-badge-won">🏆 You are the Pokémon League Champion!</span></div>
      <div class="league-actions">
        <button class="btn gym-fight" data-league-start>Challenge the League again ⚔</button>
      </div>`;
  } else {
    controls = `
      <div class="league-actions">
        <button class="btn gym-fight" data-league-start>Begin the Elite Four Challenge ⚔</button>
      </div>`;
  }

  root.innerHTML = `
    <section class="gym-section type-league">
      <h2 class="panel-title">🏆 ${league.title}</h2>
      <p class="story-text">${league.intro}</p>
      <p class="placeholder">These battles are manual only, run one after another, and there is <strong>no Poké Center healing</strong> until the run ends — heal only with Bag items. Lose once and you restart from the first challenger.</p>
      <ul class="gym-trainer-list">${rows}</ul>
      ${controls}
    </section>`;

  const start = () => {
    const res = startLeagueRun();
    if (!res.ok) {
      onStatus(res.reason ?? "Can't begin the League.");
      return;
    }
    openMainTab("battle");
  };
  const cont = () => {
    const res = continueLeagueRun();
    if (!res.ok) {
      onStatus(res.reason ?? "Can't continue the League.");
      return;
    }
    openMainTab("battle");
  };

  root.querySelectorAll("[data-league-start]").forEach((b) => b.addEventListener("click", start));
  root.querySelectorAll("[data-league-continue]").forEach((b) => b.addEventListener("click", cont));
  root.querySelector("[data-league-forfeit]")?.addEventListener("click", () => {
    forfeitLeagueRun();
    onStatus("You stepped away from the League. Your run was reset — you can heal at the Poké Center now.");
    renderLeagueTab(root, onStatus);
  });
}
