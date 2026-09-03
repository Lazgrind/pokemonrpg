/**
 * pcView.js – záložka „PC" v levém panelu: úložiště jedinců mimo tým.
 *
 * Boxy po 30 slotech (mřížka 6×5), přepínání mezi boxy, přidání nového boxu.
 * Jedince lze přetáhnout (drag & drop) na jiný slot v boxu (obsazený cíl se
 * prohodí) nebo na navigační šipky ◀/▶ = přesun do sousedního boxu (do prvního
 * volného slotu). Klik na jméno boxu ho přejmenuje. Klik na slot otevře Kartu
 * Pokémona; tlačítko ＋ Team ho přidá do týmu (pak zmizí z boxu – řídí
 * pcSystem.reconcile). Pokédex se nijak nedotýká.
 *
 * Pozn.: levý panel se překresluje na každou změnu stavu, proto si aktivní box
 * i scroll mřížky držíme napříč rendery (modulové proměnné + restore).
 */

import { getSpecies } from "../../data/pokemon.js";
import { getState } from "../core/state.js";
import { getBoxes, storedCount, moveToSlot, moveToBox, renameBox } from "../systems/pcSystem.js";
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

/**
 * Zůstává true, dokud držíš jedince „v ruce" nad výběrem boxů. Je to modulová
 * proměnná, protože levý panel se během tažení překresluje (živé progress bary)
 * – bez ní by picker po prvním překreslení „spadl". Zhasne se až při dropu nebo
 * konci tažení (dragend).
 */
let pickerOpen = false;

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
      <button class="btn btn-sm" data-box-prev title="Previous box (drop here to move)" ${boxes.length <= 1 ? "disabled" : ""}>◀</button>
      <div class="pc-box-name-wrap">
        <span class="pc-box-name" data-box-rename title="Click to rename · drag a Pokémon here to pick a box">${box.name} <span class="placeholder">(${activeBox + 1}/${boxes.length})</span></span>
        <div class="pc-box-picker" data-box-picker ${pickerOpen ? "" : "hidden"}>
          ${boxes
            .map((b, i) => {
              const cnt = b.slots.filter(Boolean).length;
              const full = cnt >= b.slots.length;
              return `<div class="pc-box-pick ${i === activeBox ? "active" : ""} ${full ? "full" : ""}" data-pick-box="${i}" title="${b.name} (${cnt}/${b.slots.length})"><span class="pick-num">${i + 1}</span><span class="pick-cnt">${cnt}/${b.slots.length}</span></div>`;
            })
            .join("")}
        </div>
      </div>
      <button class="btn btn-sm" data-box-next title="Next box (drop here to move)" ${boxes.length <= 1 ? "disabled" : ""}>▶</button>
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

  // Přejmenování boxu (klik na jméno → prompt).
  const nameEl = root.querySelector("[data-box-rename]");
  if (nameEl) nameEl.addEventListener("click", () => {
    const current = boxes[activeBox]?.name ?? "";
    const val = window.prompt("Rename box:", current);
    if (val == null) return; // zrušeno
    if (renameBox(activeBox, val)) onStatus("Box renamed"); // commit → překreslení
  });

  // Přetažení jedince na jméno boxu → rozbalí VŠECHNY boxy jako dlaždice 6×5
  // (přesun o víc než 1 box najednou). Jakmile picker jednou během tažení
  // otevřeš, zůstane otevřený, dokud držíš jedince „v ruce" – zhasne se až
  // při dropu na box nebo při konci tažení (dragend). Žádné skrývání na
  // dragleave (to dřív způsobovalo okamžité „spadnutí" pickeru).
  const nameWrap = root.querySelector(".pc-box-name-wrap");
  const picker = root.querySelector("[data-box-picker]");
  const hidePicker = () => {
    pickerOpen = false;
    if (picker) picker.hidden = true;
  };
  if (nameWrap && picker) {
    nameWrap.addEventListener("dragover", (e) => {
      if (!draggingUid) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!pickerOpen) {
        pickerOpen = true;
        picker.hidden = false;
      }
    });
    picker.querySelectorAll("[data-pick-box]").forEach((row) => {
      row.addEventListener("dragover", (e) => {
        if (!draggingUid) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        row.classList.add("drag-over");
      });
      row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        row.classList.remove("drag-over");
        hidePicker();
        const uid = draggingUid ?? e.dataTransfer.getData("text/plain");
        const dest = Number(row.dataset.pickBox);
        if (!uid || Number.isNaN(dest)) return;
        if (moveToBox(uid, dest)) {
          activeBox = dest;
          onStatus(`Moved to ${boxes[dest].name}`); // commit z moveToBox překreslí
        } else {
          onStatus("Target box is full");
        }
      });
    });
  }

  // Drop na navigační šipky = přesun taženého jedince do sousedního boxu.
  const navDrop = (btn, targetIndex) => {
    if (!btn) return;
    btn.addEventListener("dragover", (e) => {
      if (!draggingUid) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      btn.classList.add("drag-over");
    });
    btn.addEventListener("dragleave", () => btn.classList.remove("drag-over"));
    btn.addEventListener("drop", (e) => {
      e.preventDefault();
      btn.classList.remove("drag-over");
      const uid = draggingUid ?? e.dataTransfer.getData("text/plain");
      if (!uid || boxes.length <= 1) return;
      const dest = (targetIndex + boxes.length) % boxes.length;
      if (moveToBox(uid, dest)) {
        activeBox = dest; // ať hráč vidí, kam se přesunul
        onStatus(`Moved to ${boxes[dest].name}`); // commit z moveToBox překreslí
      } else {
        onStatus("Target box is full");
      }
    });
  };
  navDrop(prev, activeBox - 1);
  navDrop(next, activeBox + 1);

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
      hidePicker(); // zavři případně otevřený box-picker
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
      hidePicker(); // zavři případně otevřený picker
      const uid = draggingUid ?? e.dataTransfer.getData("text/plain");
      if (!uid) return;
      const toSlot = Number(slot.dataset.slot);
      moveToSlot(uid, activeBox, toSlot); // commit → překreslení
    });
  });

  const grid = root.querySelector(".pc-grid");
  if (grid) grid.scrollTop = scrollTop;
}
