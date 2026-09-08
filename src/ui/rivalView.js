/**
 * UI: záložka Rival (samostatný „gateway" tab). Ukáže se JEN když je hráč na
 * oblasti, kde má rival gate (data/trainers.js → rivalForArea). Rival NENÍ
 * náhodné setkání – je to brána dál, kterou si hráč vyvolá KLIKEM. Dokud rivala
 * neporazíš, cesta dál je zamčená (unlock.trainer), ale divoké souboje na téhle
 * oblasti jdou pořád.
 *
 * Souboj se spouští přes battleSystem.startTrainerBattle(trainerId) (bez gymId →
 * není povinně manuál; auto se řídí nastavením hráče). Chytání je vypnuté.
 */

import { rivalForArea, trainerSpriteUrl } from "../../data/trainers.js";
import { getState } from "../core/state.js";
import { startTrainerBattle, getActiveArea } from "../systems/battleSystem.js";
import { getSpecies } from "../../data/pokemon.js";
import { openMainTab } from "./mainPanel.js";

/** Vykreslí obsah záložky Rival do zadaného elementu. */
export function renderRivalTab(root, onStatus = () => {}) {
  const area = getActiveArea();
  const rival = rivalForArea(area?.id);
  if (!rival) {
    root.innerHTML = `<h2 class="panel-title">Rival</h2><p class="placeholder">No rival is waiting here.</p>`;
    return;
  }

  const defeated = (getState().progress?.defeatedTrainers ?? []).includes(rival.id);
  const maxLv = Math.max(...rival.team.map((m) => m.level ?? 1));
  const sprite = trainerSpriteUrl({ id: rival.id, class: rival.class, kind: rival.kind });
  // Jméno rivala zvolené hráčem v úvodním intru (drží se celý playthrough).
  const displayName = getState().player?.rivalName?.trim() || rival.name;

  // Náhled týmu (bez counter-starter kusů – ty se dopočítají za běhu).
  const teamPreview = rival.team
    .map((m) => {
      const label = m.speciesId ? getSpecies(m.speciesId)?.name ?? m.speciesId : "???";
      return `<li class="rival-mon"><span class="rival-mon-name">${label}</span> <span class="placeholder">Lv ${m.level}</span></li>`;
    })
    .join("");

  // Story-gate prohra (jen první rival): souboj prošel i bez výhry – ukaž prohru,
  // ne falešné „beaten". Flag nastavuje battleSystem při prohře (gateOnFight).
  const lost = !!getState().story?.[`gateLost:${rival.id}`];
  const action = defeated
    ? lost
      ? `<div class="rival-cleared rival-lost">You lost... ${displayName} smirked and set off on their own journey. The road ahead is open all the same.</div>`
      : `<div class="rival-cleared">✓ You've beaten your Rival here — the path ahead is open.</div>`
    : `<button class="btn rival-fight" data-trainer="${rival.id}">⚔ Challenge your Rival</button>`;

  root.innerHTML = `
    <section class="rival-section">
      <h2 class="panel-title">🔥 Rival Battle</h2>
      <p class="placeholder">Your Rival blocks the way forward. Beat them to pass — you can still battle wild Pokémon here anytime.</p>
      <div class="rival-card">
        <img class="rival-sprite" src="${sprite}" alt="${displayName}" onerror="this.style.visibility='hidden'">
        <div class="rival-meta">
          <div class="rival-name">${displayName} <span class="placeholder">· up to Lv ${maxLv}</span></div>
          <ul class="rival-team">${teamPreview}</ul>
        </div>
      </div>
      ${action}
    </section>`;

  const btn = root.querySelector(".rival-fight");
  if (btn)
    btn.addEventListener("click", () => {
      const res = startTrainerBattle(rival.id);
      if (!res.ok) {
        onStatus(res.reason ?? "Can't start the battle.");
        return;
      }
      openMainTab("battle");
    });
}
