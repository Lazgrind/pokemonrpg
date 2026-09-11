/**
 * starterModal.js – vyskakovací výběr startovního Pokémona.
 *
 * Při nové hře (prázdná kolekce) se otevře modální okno s kartami startérů.
 * Okno je povinné: zavře se až po volbě startéra.
 *
 * Věrný detail (skrytý Pikachu): klik na kartu se nejdřív musí POTVRDIT
 * (Ano/Ne). Když hráč odmítne („Ne") všechny tři nabízené startéry, profesor
 * Oak odhalí čtvrtou skrytou volbu – Pikachu (jako v originále, kde na všechny
 * tři řekneš „No").
 */

import { bus, EVENTS } from "../core/events.js";
import { getState } from "../core/state.js";
import { STARTER_IDS, getSpecies } from "../../data/pokemon.js";
import { chooseStarter } from "../systems/team.js";
import { spriteImg } from "./sprites.js";
import { typeBadge } from "./typeColors.js";

/** Skrytý čtvrtý startér, odhalený po odmítnutí všech tří nabízených. */
const SECRET_STARTER = "pikachu";

/** Je zrovna otevřený modal? (zabraňuje více oknům naráz) */
let modalOpen = false;

/** Karta jednoho startéra: sprite, jméno, barevné typy. */
function starterCardHtml(id, secret = false) {
  const sp = getSpecies(id);
  const sprite = spriteImg(id, { view: "front", alt: sp.name, extraClass: "starter-sprite", animated: true });
  const types = sp.types.map(typeBadge).join("");
  return `<button class="starter-card${secret ? " secret" : ""}" data-starter="${id}">
      ${sprite}
      <span class="starter-name">${sp.name}</span>
      <span class="starter-types">${types}</span>
    </button>`;
}

/** Otevře okno výběru startéra (pokud už není otevřené). onDone se zavolá po volbě. */
function open(onDone = () => {}) {
  if (modalOpen) return;
  modalOpen = true;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  const declined = new Set(); // startéři, na které hráč řekl „Ne"
  let pending = null; // startér čekající na potvrzení Ano/Ne

  const render = () => {
    // Fáze potvrzení volby (Ano/Ne).
    if (pending) {
      const sp = getSpecies(pending);
      overlay.innerHTML = `
        <div class="modal starter-modal">
          <h2 class="panel-title">Choose ${sp.name}?</h2>
          <div class="starter-grid">${starterCardHtml(pending)}</div>
          <p class="placeholder">Will you really take this partner on your journey?</p>
          <div class="starter-confirm">
            <button class="btn ghost" data-confirm-no>No</button>
            <button class="btn" data-confirm-yes>Yes, I'll take it!</button>
          </div>
        </div>
      `;
      overlay.querySelector("[data-confirm-yes]")?.addEventListener("click", () => {
        chooseStarter(pending);
        overlay.remove();
        modalOpen = false;
        onDone();
      });
      overlay.querySelector("[data-confirm-no]")?.addEventListener("click", () => {
        declined.add(pending);
        pending = null;
        render();
      });
      return;
    }

    // Fáze výběru: tři startéři; po odmítnutí všech tří se odhalí Pikachu.
    const allDeclined = STARTER_IDS.every((id) => declined.has(id));
    const secretCard = allDeclined ? starterCardHtml(SECRET_STARTER, true) : "";
    const secretHint = allDeclined
      ? `<p class="story-text">Professor Oak smiles: "Looks like none of them suited you... I've got one more little rascal here!"</p>`
      : "";

    overlay.innerHTML = `
      <div class="modal starter-modal">
        <h2 class="panel-title">Choose your starter!</h2>
        <p class="placeholder">Pick your first Pokémon and set off on your journey.</p>
        <div class="starter-grid">
          ${STARTER_IDS.map((id) => starterCardHtml(id)).join("")}
          ${secretCard}
        </div>
        ${secretHint}
      </div>
    `;
    overlay.querySelectorAll("[data-starter]").forEach((card) =>
      card.addEventListener("click", () => {
        pending = card.dataset.starter;
        render();
      })
    );
  };

  render();
}

/** Otevře okno, jen když je kolekce prázdná (nová hra) a žádné okno neběží. */
function maybeOpen() {
  if (modalOpen) return;
  if (getState().collection.length === 0) open();
}

/** Veřejné otevření výběru startéra (např. z Oakovy laboratoře). onDone po volbě. */
export function openStarterModal(onDone) {
  open(onDone);
}

/** Napojí sledování stavu. Volat jednou při startu. */
export function initStarterPrompt() {
  bus.on(EVENTS.STATE_CHANGED, maybeOpen);
  maybeOpen(); // pokrýt i nově založenou hru z bootstrapu
}
