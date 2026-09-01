/**
 * starterModal.js – vyskakovací výběr startovního Pokémona.
 *
 * Při nové hře (prázdná kolekce) se otevře modální okno s kartami startérů –
 * pohodlnější než hledat výběr v Pokédexu. Okno je povinné: zavře se až po
 * volbě startéra (klik do prázdna ani Esc ho nezavře).
 */

import { bus, EVENTS } from "../core/events.js";
import { getState } from "../core/state.js";
import { STARTER_IDS, getSpecies } from "../../data/pokemon.js";
import { chooseStarter } from "../systems/team.js";
import { spriteImg } from "./sprites.js";
import { typeBadge } from "./typeColors.js";

/** Je zrovna otevřený modal? (zabraňuje více oknům naráz) */
let modalOpen = false;

/** Karta jednoho startéra: sprite, jméno, barevné typy. */
function starterCardHtml(id) {
  const sp = getSpecies(id);
  const sprite = spriteImg(id, { view: "front", alt: sp.name, extraClass: "starter-sprite" });
  const types = sp.types.map(typeBadge).join("");
  return `<button class="starter-card" data-starter="${id}">
      ${sprite}
      <span class="starter-name">${sp.name}</span>
      <span class="starter-types">${types}</span>
    </button>`;
}

/** Otevře okno výběru startéra (pokud už není otevřené). */
function open() {
  if (modalOpen) return;
  modalOpen = true;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal starter-modal">
      <h2 class="panel-title">Choose your starter!</h2>
      <p class="placeholder">Pick your first Pokémon to begin your journey.</p>
      <div class="starter-grid">
        ${STARTER_IDS.map(starterCardHtml).join("")}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    const card = e.target.closest("[data-starter]");
    if (!card) return; // klik mimo kartu nezavírá – volba je povinná
    chooseStarter(card.dataset.starter);
    overlay.remove();
    modalOpen = false;
  });
}

/** Otevře okno, jen když je kolekce prázdná (nová hra) a žádné okno neběží. */
function maybeOpen() {
  if (modalOpen) return;
  if (getState().collection.length === 0) open();
}

/** Napojí sledování stavu. Volat jednou při startu. */
export function initStarterPrompt() {
  bus.on(EVENTS.STATE_CHANGED, maybeOpen);
  maybeOpen(); // pokrýt i nově založenou hru z bootstrapu
}
