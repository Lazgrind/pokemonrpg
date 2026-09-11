/**
 * UI: záložka Move Tutor (samostatný tab v hlavním panelu). Ukáže se JEN na
 * Route 8 (Saffron ↔ Lavender, střed Kanta – dostupné kolem půlky postupu, kdy
 * začnou evoluce a přeučování tahů dávat smysl).
 *
 * Pozn.: v Gen 1 Move Tutor / move relearner NEEXISTOVAL (přeučit tah nešlo);
 * je to čistě quality-of-life doplněk, proto volné umístění. Move Tutor není
 * budova ve městě – žije jako tento tab a znovupoužívá `openMoveTutorPicker`
 * z buildingView.js. Def budovy „move-tutor" dál žije v data/buildings.js.
 */

import { getBuilding } from "../../data/buildings.js";
import { getState } from "../core/state.js";
import { openMoveTutorPicker } from "./buildingView.js";
import { saveScroll, restoreScroll } from "./scrollPreserve.js";

const MOVE_TUTOR = "move-tutor";

/**
 * Vykreslí obsah záložky Move Tutor do zadaného elementu.
 * @param {HTMLElement} root
 * @param {(msg: string) => void} onStatus
 */
export function renderMoveTutorTab(root, onStatus = () => {}) {
  const def = getBuilding(MOVE_TUTOR);
  if (!def) {
    root.innerHTML = `<h2 class="panel-title">Move Tutor</h2><p class="placeholder">The Move Tutor is unavailable.</p>`;
    return;
  }

  const _savedScroll = saveScroll(root);

  const count = getState().collection.length;
  const actionHtml =
    count === 0
      ? `<p class="placeholder" style="margin-top:8px">You have no Pokémon yet — catch one first.</p>`
      : `<div class="building-actions"><button class="btn" data-act="tutor">📖 Reteach moves</button></div>`;

  root.innerHTML = `
    <div class="building-modal-head" style="margin-bottom:10px">
      <span class="b-icon">${def.icon}</span>
      <div>
        <h2 class="panel-title" style="border:0;margin:0;padding:0">${def.name}</h2>
        <div class="building-desc">${def.description}</div>
      </div>
    </div>
    ${actionHtml}
  `;

  const tutor = root.querySelector('[data-act="tutor"]');
  if (tutor) tutor.addEventListener("click", () => openMoveTutorPicker(MOVE_TUTOR, onStatus));

  restoreScroll(root, _savedScroll);
}
