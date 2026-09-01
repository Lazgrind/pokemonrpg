/**
 * teamView.js – obsah záložky "Tým" v levém panelu. (Kolekci nahradil Pokédex,
 * viz pokedexView.js.)
 */

import { getSpecies } from "../../data/pokemon.js";
import { MAX_TEAM_SIZE } from "../core/state.js";
import { getTeamPokemon, removeFromTeam, moveInTeam } from "../systems/team.js";
import { healStatus } from "../systems/battleSystem.js";
import { ivPercent, evTotal, computeStats } from "../systems/pokemonSystem.js";
import { xpForNextLevel } from "../systems/progression.js";
import { openPokemonCard } from "./pokemonCard.js";
import { openBag } from "./bagView.js";
import { genderSymbolHtml } from "./gender.js";
import { statusBadge } from "./statusBadge.js";

/** Jméno druhu daného jedince. */
function speciesName(p) {
  return getSpecies(p.speciesId)?.name ?? p.speciesId;
}

/** Jméno se shiny hvězdičkou. */
function displayName(p) {
  return `${p.shiny ? "✨ " : ""}${speciesName(p)}`;
}

/** Řádek s IV kvalitou a EV součtem. */
function ivEvLine(p) {
  return `<span class="placeholder iv-ev">IV ${ivPercent(p)}% · EV ${evTotal(p)}${p.shiny ? " · ✨ shiny" : ""}</span>`;
}

/**
 * Aktuální HP jedince – čte se přímo z trvalého pole `hp` (fallback = plné max
 * HP u starých objektů). Zranění tak přežije swap i konec souboje.
 */
function currentHp(p, maxHp) {
  return Math.max(0, Math.min(maxHp, p.hp ?? maxHp));
}

/** HP + EXP bary jednoho člena týmu (trvalé HP jedince). */
function statBars(p) {
  const maxHp = computeStats(p).maxHp;
  const hp = currentHp(p, maxHp);
  const hpPct = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));
  const low = hp <= 0 ? " fainted" : hpPct <= 25 ? " low" : "";

  const need = xpForNextLevel(p.level);
  const xpPct = Math.max(0, Math.min(100, Math.round((p.xp / need) * 100)));

  return `<div class="slot-bars">
    <div class="bar-line">
      <span class="bar-cap">HP</span>
      <span class="hpbar"><span class="hpfill${low}" style="width:${hpPct}%"></span></span>
      <span class="bar-val">${hp} / ${maxHp}</span>
    </div>
    <div class="bar-line">
      <span class="bar-cap">XP</span>
      <span class="hpbar"><span class="xpfill" style="width:${xpPct}%"></span></span>
      <span class="bar-val">${p.xp} / ${need}</span>
    </div>
  </div>`;
}

/** HTML odznaky typů. */
function typeBadges(p) {
  return (getSpecies(p.speciesId)?.types ?? [])
    .map((t) => `<span class="type">${t}</span>`)
    .join("");
}

/**
 * Záložka Tým: 6 slotů, řazení a odebírání.
 * @param {HTMLElement} root
 * @param {(msg: string) => void} onStatus
 */
export function renderTeamTab(root, onStatus) {
  const team = getTeamPokemon();
  const slots = [];
  for (let i = 0; i < MAX_TEAM_SIZE; i++) {
    const p = team[i];
    if (p) {
      slots.push(`
        <div class="card team-slot clickable" data-open="${p.uid}" title="Show card">
          <div><strong>${displayName(p)}</strong> ${genderSymbolHtml(p.gender)} · Lv ${p.level} ${typeBadges(p)}${statusBadge(p.status)}</div>
          <div>${ivEvLine(p)}</div>
          ${statBars(p)}
          <div class="row-actions">
            <button class="btn" data-move="-1" data-uid="${p.uid}" title="Move left">◀</button>
            <button class="btn" data-move="1" data-uid="${p.uid}" title="Move right">▶</button>
            ${p.status ? `<button class="btn" data-cure="${p.uid}" title="Cure status effect (no HP/PP restore)">💊 Cure</button>` : ""}
            <button class="btn btn-danger" data-remove="${p.uid}">Remove</button>
          </div>
        </div>`);
    } else {
      slots.push(`<div class="card team-slot empty">Empty slot ${i + 1}</div>`);
    }
  }

  root.innerHTML = `
    <div class="team-head">
      <h2 class="panel-title">Team (${team.length}/${MAX_TEAM_SIZE})</h2>
      <button class="btn btn-sm" data-bag title="Use healing items">🎒 Bag</button>
    </div>
    ${team.length === 0 ? `<p class="placeholder">Your team is empty. Add Pokémon from the Pokédex tab.</p>` : ""}
    ${slots.join("")}
  `;

  const bagBtn = root.querySelector("[data-bag]");
  if (bagBtn) bagBtn.addEventListener("click", () => openBag(onStatus));

  root.querySelectorAll("[data-remove]").forEach((b) =>
    b.addEventListener("click", () => {
      removeFromTeam(b.dataset.remove);
      onStatus("Removed from team");
    })
  );
  root.querySelectorAll("[data-move]").forEach((b) =>
    b.addEventListener("click", () => {
      moveInTeam(b.dataset.uid, Number(b.dataset.move));
    })
  );
  root.querySelectorAll("[data-cure]").forEach((b) =>
    b.addEventListener("click", () => {
      if (healStatus(b.dataset.cure)) onStatus("Status cured");
    })
  );
  // Klik na slot (mimo tlačítka) → karta Pokémona.
  root.querySelectorAll("[data-open]").forEach((slot) =>
    slot.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      openPokemonCard({ uid: slot.dataset.open });
    })
  );
}
