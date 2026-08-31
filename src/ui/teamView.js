/**
 * teamView.js – obsah záložek "Tým" a "Kolekce" v levém panelu.
 */

import { getSpecies } from "../../data/pokemon.js";
import { getState, MAX_TEAM_SIZE } from "../core/state.js";
import {
  getTeamPokemon,
  addToTeam,
  removeFromTeam,
  moveInTeam,
  chooseStarter,
  isInTeam,
} from "../systems/team.js";
import { ivPercent, evTotal } from "../systems/pokemonSystem.js";

// Ditto je tu dočasně, ať jde otestovat breeding (žolík). Cílově bude Ditto
// běžně chytatelný a ze starterů zmizí – viz docs/BACKLOG.md.
const STARTERS = ["bulbasaur", "charmander", "squirtle", "ditto"];

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
        <div class="card team-slot">
          <div><strong>${displayName(p)}</strong> · Lv ${p.level} ${typeBadges(p)}</div>
          <div>${ivEvLine(p)}</div>
          <div class="row-actions">
            <button class="btn" data-move="-1" data-uid="${p.uid}" title="Move left">◀</button>
            <button class="btn" data-move="1" data-uid="${p.uid}" title="Move right">▶</button>
            <button class="btn btn-danger" data-remove="${p.uid}">Remove</button>
          </div>
        </div>`);
    } else {
      slots.push(`<div class="card team-slot empty">Empty slot ${i + 1}</div>`);
    }
  }

  root.innerHTML = `
    <h2 class="panel-title">Team (${team.length}/${MAX_TEAM_SIZE})</h2>
    ${team.length === 0 ? `<p class="placeholder">Your team is empty. Add Pokémon from the Collection tab.</p>` : ""}
    ${slots.join("")}
  `;

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
}

/**
 * Záložka Kolekce: výběr startéra (dokud je prázdná), chytání a přidávání do týmu.
 * @param {HTMLElement} root
 * @param {(msg: string) => void} onStatus
 */
export function renderCollectionTab(root, onStatus) {
  const s = getState();

  // Prázdná kolekce → výběr startovního Pokémona.
  if (s.collection.length === 0) {
    root.innerHTML = `
      <h2 class="panel-title">Starter Pokémon</h2>
      <p class="placeholder">Choose your first Pokémon:</p>
      ${STARTERS.map((id) => {
        const sp = getSpecies(id);
        return `<button class="btn starter" data-starter="${id}">
                  <strong>${sp.name}</strong>
                  <span class="placeholder">(${sp.types.join("/")})</span>
                </button>`;
      }).join("")}
    `;
    root.querySelectorAll("[data-starter]").forEach((b) =>
      b.addEventListener("click", () => {
        chooseStarter(b.dataset.starter);
        onStatus("You got your first Pokémon!");
      })
    );
    return;
  }

  // Jinak výpis kolekce. Chytání se řeší v souboji (Battle Area), ne tady.
  root.innerHTML = `
    <h2 class="panel-title">Collection (${s.collection.length})</h2>
    <p class="placeholder" style="margin-bottom:10px">Catch Pokémon by fighting them in the Battle Area.</p>
    ${s.collection
      .map(
        (p) => `
        <div class="card">
          <div><strong>${displayName(p)}</strong> · Lv ${p.level} ${typeBadges(p)}</div>
          <div>${ivEvLine(p)}</div>
          <div class="row-actions">
            ${
              isInTeam(p.uid)
                ? `<span class="placeholder">in team</span>`
                : `<button class="btn" data-add="${p.uid}">Add to team</button>`
            }
          </div>
        </div>`
      )
      .join("")}
  `;

  root.querySelectorAll("[data-add]").forEach((b) =>
    b.addEventListener("click", () => {
      const ok = addToTeam(b.dataset.add);
      onStatus(ok ? "Added to team" : "Team is full (max 6)");
    })
  );
}
