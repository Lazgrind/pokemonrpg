/**
 * moveLearnView.js – vyskakovací volba nahrazení tahu.
 *
 * Když jedinec levelováním získá nový tah, ale má už plné 4 sloty, uloží se
 * nabídka do fronty `moveLearnQueue` (viz pokemonSystem). Tento modul frontu
 * sleduje a postupně nabízí hráči: buď nový tah zapomenout, nebo jím přepsat
 * jeden ze stávajících. Funguje i pro tahy získané offline (fronta je v save).
 */

import { bus, EVENTS } from "../core/events.js";
import { getState, commit } from "../core/state.js";
import { getMoveLearnQueue, resolveMoveLearn, MAX_MOVES } from "../systems/pokemonSystem.js";
import { getMove } from "../../data/moves.js";
import { getSpecies } from "../../data/pokemon.js";

/** Ikonky kategorie tahu (sjednotné napříč UI). */
const CAT_ICON = { physical: "💥", special: "✨", status: "🌀" };

/** Je zrovna otevřený modal? (zabraňuje více oknům naráz) */
let modalOpen = false;

/** Escapuje HTML speciální znaky. */
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Řádek tahu ve stylu karty jedince. `slot` (pokud je) nese aktuální PP;
 * `index` (pokud je) udělá z řádku tlačítko k přepsání daného slotu.
 */
function moveRowHtml(mv, { slot, index } = {}) {
  const name = mv?.name ?? mv?.id ?? "—";
  const type = mv?.type ?? "—";
  const icon = CAT_ICON[mv?.category] ?? "";
  const power = mv?.power ? `⚔️ ${mv.power}` : "—";
  const pp = slot ? `${slot.pp}/${slot.maxPp ?? mv?.pp ?? 0}` : `${mv?.pp ?? "?"}`;
  const inner = `
    <span class="mc-move-main">${icon} <strong>${esc(name)}</strong> <span class="type">${esc(type)}</span></span>
    <span class="ml-move-side"><span class="ml-pow">${esc(power)}</span><span class="mc-move-pp placeholder">PP ${pp}</span></span>`;
  if (index != null) return `<button class="mc-move ml-slot" data-replace="${index}">${inner}</button>`;
  return `<div class="mc-move ml-new">${inner}</div>`;
}

/** Otevře nabídku pro první položku fronty (nebo ji tiše vyřeší, když nedává smysl). */
function openPrompt(entry) {
  const owned = getState().collection.find((p) => p.uid === entry.uid);
  const mv = getMove(entry.moveId);

  // Nabídka už nedává smysl (jedinec puštěn / neznámý tah / už ho umí) → zahodit.
  if (!owned || !mv || (owned.moves ?? []).some((m) => m.id === entry.moveId)) {
    resolveMoveLearn(entry.uid, entry.moveId, -1);
    commit();
    return;
  }
  // Mezitím se uvolnil slot → rovnou nauč, neotravuj hráče.
  if ((owned.moves?.length ?? 0) < MAX_MOVES) {
    resolveMoveLearn(entry.uid, entry.moveId, owned.moves.length);
    commit();
    return;
  }

  modalOpen = true;
  const name = getSpecies(owned.speciesId)?.name ?? owned.speciesId;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal movelearn-modal">
      <h2 class="panel-title">🎓 New move!</h2>
      <p class="ml-intro"><strong>${esc(name)}</strong> wants to learn <strong>${esc(mv.name)}</strong>,
        but already knows 4 moves. Forget one to make room?</p>
      <div class="ml-newwrap">
        <div class="ml-label">New move</div>
        ${moveRowHtml(mv)}
      </div>
      <div class="ml-label">Replace which move?</div>
      <div class="ml-slots">
        ${(owned.moves ?? []).map((m, i) => moveRowHtml(getMove(m.id) ?? { id: m.id, name: m.id }, { slot: m, index: i })).join("")}
      </div>
      <button class="btn btn-close" data-act="skip">Don't learn ${esc(mv.name)}</button>
    </div>
  `;
  document.body.appendChild(overlay);

  function close() {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
    modalOpen = false;
    maybeOpen(); // navázat na další čekající nabídku
  }
  function onKey(e) {
    if (e.key === "Escape") skip();
  }
  function skip() {
    resolveMoveLearn(entry.uid, entry.moveId, -1);
    commit();
    close();
  }
  function replace(index) {
    resolveMoveLearn(entry.uid, entry.moveId, index);
    commit();
    close();
  }

  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) return; // klik do prázdna nezavírá (rozhodnutí je záměrné)
    const slot = e.target.closest("[data-replace]");
    if (slot) {
      replace(Number(slot.dataset.replace));
      return;
    }
    if (e.target.closest('[data-act="skip"]')) skip();
  });
}

/** Když je fronta neprázdná a žádný modal neběží, otevře další nabídku. */
function maybeOpen() {
  if (modalOpen) return;
  const q = getMoveLearnQueue();
  if (q.length > 0) openPrompt(q[0]);
}

/** Napojí sledování fronty na změny stavu. Volat jednou při startu. */
export function initMoveLearnPrompts() {
  bus.on(EVENTS.STATE_CHANGED, maybeOpen);
  maybeOpen(); // zpracovat i případné položky z offline/save
}
