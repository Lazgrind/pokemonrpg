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
  catchWild,
  chooseStarter,
  isInTeam,
} from "../systems/team.js";

const STARTERS = ["bulbasaur", "charmander", "squirtle"];

/** Jméno druhu daného jedince. */
function speciesName(p) {
  return getSpecies(p.speciesId)?.name ?? p.speciesId;
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
          <div><strong>${speciesName(p)}</strong> · Lv ${p.level} ${typeBadges(p)}</div>
          <div class="row-actions">
            <button class="btn" data-move="-1" data-uid="${p.uid}" title="Posunout doleva">◀</button>
            <button class="btn" data-move="1" data-uid="${p.uid}" title="Posunout doprava">▶</button>
            <button class="btn btn-danger" data-remove="${p.uid}">Odebrat</button>
          </div>
        </div>`);
    } else {
      slots.push(`<div class="card team-slot empty">Prázdný slot ${i + 1}</div>`);
    }
  }

  root.innerHTML = `
    <h2 class="panel-title">Tým (${team.length}/${MAX_TEAM_SIZE})</h2>
    ${team.length === 0 ? `<p class="placeholder">Tým je prázdný. Přidej Pokémony ze záložky Kolekce.</p>` : ""}
    ${slots.join("")}
  `;

  root.querySelectorAll("[data-remove]").forEach((b) =>
    b.addEventListener("click", () => {
      removeFromTeam(b.dataset.remove);
      onStatus("Odebráno z týmu");
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
      <h2 class="panel-title">Startovní Pokémon</h2>
      <p class="placeholder">Vyber si svého prvního Pokémona:</p>
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
        onStatus("Máš svého prvního Pokémona!");
      })
    );
    return;
  }

  // Jinak výpis kolekce + chytání.
  root.innerHTML = `
    <h2 class="panel-title">Kolekce (${s.collection.length})</h2>
    <button class="btn" data-catch style="margin-bottom:10px">🔴 Chytit divokého (1 Poké Ball)</button>
    ${s.collection
      .map(
        (p) => `
        <div class="card">
          <div><strong>${speciesName(p)}</strong> · Lv ${p.level} ${typeBadges(p)}</div>
          <div class="row-actions">
            ${
              isInTeam(p.uid)
                ? `<span class="placeholder">v týmu</span>`
                : `<button class="btn" data-add="${p.uid}">Do týmu</button>`
            }
          </div>
        </div>`
      )
      .join("")}
  `;

  root.querySelector("[data-catch]").addEventListener("click", () => {
    const r = catchWild();
    onStatus(r.ok ? `Chytil jsi: ${speciesName(r.pokemon)}!` : r.reason);
  });
  root.querySelectorAll("[data-add]").forEach((b) =>
    b.addEventListener("click", () => {
      const ok = addToTeam(b.dataset.add);
      onStatus(ok ? "Přidáno do týmu" : "Tým je plný (max 6)");
    })
  );
}
