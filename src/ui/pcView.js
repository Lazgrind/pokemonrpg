/**
 * pcView.js – záložka „PC" v levém panelu: úložiště jedinců mimo tým.
 *
 * Boxy po 30 slotech (mřížka 6×5), přepínání mezi boxy, přidání nového boxu.
 * Jedince lze přetáhnout (drag & drop) na jiný slot v boxu (obsazený cíl se
 * prohodí). Klik na slot otevře Kartu Pokémona; tlačítko ＋ Team ho přidá do
 * týmu (pak zmizí z boxu – řídí pcSystem.reconcile). Pokédex se nijak nedotýká.
 *
 * Pozn.: levý panel se překresluje na každou změnu stavu, proto si aktivní box
 * i scroll mřížky držíme napříč rendery (modulové proměnné + restore).
 */

import { getSpecies } from "../../data/pokemon.js";
import { getState } from "../core/state.js";
import { getBoxes, storedCount, addBox, moveToSlot } from "../systems/pcSystem.js";
import { addToTeam, isInTeam } from "../systems/team.js";
import { pokemonEngagement } from "../systems/buildingSystem.js";
import { spriteImg } from "./sprites.js";
import { openPokemonCard } from "./pokemonCard.js";
import { genderSymbolHtml } from "./gender.js";
import { saveScroll, restoreScroll } from "./scrollPreserve.js";

/** Aktivní box přežívá překreslení (modulová proměnná, jako activeTab). */
let activeBox = 0;

/** uid právě taženého jedince (drag & drop) – i k potlačení kliknutí po tažení. */
let draggingUid = null;
let didDrag = false;

/** Jedinec v kolekci podle uid. */
function ownedByUid(uid) {
  return getState().collection.find((p) => p.uid === uid) ?? null;
}

/** Patička slotu: ＋ Team / stav (Day Care / Breeding / ✓ Team). */
function slotFoot(p) {
  if (isInTeam(p.uid)) return `<span class="dex-tag team">✓ Team</span>`; // teoreticky se v boxu neobjeví
  const eng = pokemonEngagement(p.uid);
  if (eng === "day-care") return `<span class="dex-tag">Day Care</span>`;
  if (eng === "breeding") return `<span class="dex-tag">Breeding</span>`;
  return `<button class="btn dex-add" data-add="${p.uid}">＋ Team</button>`;
}

/** HTML jednoho slotu (obsazený = draggable, prázdný = jen drop cíl). */
function slotHtml(uid, index) {
  if (!uid) {
    return `<div class="pc-slot empty" data-slot="${index}"></div>`;
  }
  const p = ownedByUid(uid);
  if (!p) return `<div class="pc-slot empty" data-slot="${index}"></div>`;
  const sp = getSpecies(p.speciesId);
  const name = `${p.shiny ? "✨ " : ""}${sp?.name ?? p.speciesId}`;
  return `<div class="pc-slot filled" data-slot="${index}" data-uid="${p.uid}" draggable="true" title="Drag to rearrange · click for card">
    ${spriteImg(p.speciesId, { shiny: !!p.shiny, gender: p.gender, alt: sp?.name ?? p.speciesId })}
    <span class="pc-name">${name} ${genderSymbolHtml(p.gender)}</span>
    <span class="pc-lvl">Lv ${p.level}</span>
    <div class="dex-foot">${slotFoot(p)}</div>
  </div>`;
}

/**
 * Vykreslí záložku PC.
 * @param {HTMLElement} root
 * @param {(msg: string) => void} onStatus
 */
export function renderPcTab(root, onStatus = () => {}) {
  const boxes = getBoxes();
  if (activeBox >= boxes.length) activeBox = boxes.length - 1;
  if (activeBox < 0) activeBox = 0;
  const box = boxes[activeBox];
  const stored = storedCount();

  const scrollBox = root.querySelector(".pc-grid");
  const scrollTop = scrollBox ? scrollBox.scrollTop : 0;

  const _savedScroll = saveScroll(root);
  root.innerHTML = `
    <h2 class="panel-title">PC <span class="dex-count">${stored} stored</span></h2>
    <div class="pc-nav">
      <button class="btn btn-sm" data-box-prev title="Previous box" ${boxes.length <= 1 ? "disabled" : ""}>◀</button>
      <span class="pc-box-name">${box.name} <span class="placeholder">(${activeBox + 1}/${boxes.length})</span></span>
      <button class="btn btn-sm" data-box-next title="Next box" ${boxes.length <= 1 ? "disabled" : ""}>▶</button>
      <button class="btn btn-sm" data-box-add title="Add a new box">＋ Box</button>
    </div>
    <div class="pc-grid">
      ${box.slots.map((uid, i) => slotHtml(uid, i)).join("")}
    </div>
  `;
  restoreScroll(root, _savedScroll);

  // Navigace mezi boxy.
  const prev = root.querySelector("[data-box-prev]");
  if (prev) prev.addEventListener("click", () => {
    activeBox = (activeBox - 1 + boxes.length) % boxes.length;
    renderPcTab(root, onStatus);
  });
  const next = root.querySelector("[data-box-next]");
  if (next) next.addEventListener("click", () => {
    activeBox = (activeBox + 1) % boxes.length;
    renderPcTab(root, onStatus);
  });
  root.querySelector("[data-box-add]").addEventListener("click", () => {
    activeBox = addBox();
    onStatus("New box added");
    // commit() z addBox překreslí panel; aktivní box je nastavený na nový.
  });

  // ＋ Team.
  root.querySelectorAll("[data-add]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const ok = addToTeam(b.dataset.add);
      onStatus(ok ? "Added to team" : "Team is full (max 6)");
    })
  );

  // Klik na slot → karta Pokémona (pokud se zrovna netáhlo).
  root.querySelectorAll(".pc-slot.filled").forEach((slot) =>
    slot.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      if (didDrag) { didDrag = false; return; }
      openPokemonCard({ uid: slot.dataset.uid });
    })
  );

  // --- Drag & drop (přeuspořádání v rámci aktivního boxu) ---
  root.querySelectorAll(".pc-slot.filled").forEach((slot) => {
    slot.addEventListener("dragstart", (e) => {
      draggingUid = slot.dataset.uid;
      didDrag = true;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", draggingUid);
      slot.classList.add("dragging");
    });
    slot.addEventListener("dragend", () => {
      slot.classList.remove("dragging");
      draggingUid = null;
      // didDrag necháme na true jen do nejbližšího kliknutí (potlačí kartu).
      setTimeout(() => { didDrag = false; }, 0);
    });
  });

  root.querySelectorAll(".pc-slot").forEach((slot) => {
    slot.addEventListener("dragover", (e) => {
      if (!draggingUid) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      slot.classList.add("drag-over");
    });
    slot.addEventListener("dragleave", () => slot.classList.remove("drag-over"));
    slot.addEventListener("drop", (e) => {
      e.preventDefault();
      slot.classList.remove("drag-over");
      const uid = draggingUid ?? e.dataTransfer.getData("text/plain");
      if (!uid) return;
      const toSlot = Number(slot.dataset.slot);
      moveToSlot(uid, activeBox, toSlot); // commit → překreslení
    });
  });

  const grid = root.querySelector(".pc-grid");
  if (grid) grid.scrollTop = scrollTop;
}
