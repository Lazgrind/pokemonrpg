/**
 * pcView.js – záložka „PC" v levém panelu: úložiště jedinců mimo tým.
 *
 * PC se NEscrolluje a nemá klasické boxy s pevnou velikostí (v1.15.4). Dlaždice
 * mají pevnou velikost a jejich POČET se přizpůsobí velikosti PC okna – kolik se
 * jich vejde na šířku × výšku, tolik se jich zobrazí (jedna „stránka"). Zbytek
 * uložených jedinců je na dalších stránkách (navigace ◀ ▶). Datový model
 * (pcSystem: pevné boxy po 30 slotech) zůstává; UI ho čte jako jeden souvislý
 * seznam slotů a jen ho stránkuje podle vypočítaného počtu dlaždic.
 *
 * Jedince lze přetáhnout na jiný slot (obsazený cíl se prohodí) nebo na
 * navigační šipku ◀/▶ = přesun na sousední stránku (do prvního volného slotu).
 * Klik na slot otevře Kartu Pokémona; do týmu se dostane přetažením na slot
 * v Týmu. Hledání (name/#no) ukáže ploché výsledky napříč vším (scrollovatelné).
 *
 * Pozn.: levý panel se překresluje na každou změnu stavu; počet dlaždic
 * (sloupce×řádky) i aktuální stránku držíme napříč rendery (modulové proměnné).
 */

import { getSpecies } from "../../data/pokemon.js";
import { getState } from "../core/state.js";
import { getBoxes, storedCount, moveToSlot, sortAllBoxes } from "../systems/pcSystem.js";
import { isInTeam, removeFromTeam } from "../systems/team.js";
import { pokemonEngagement } from "../systems/buildingSystem.js";
import { dragState, beginDrag, endDrag } from "./dragState.js";
import { spriteImg } from "./sprites.js";
import { setHtmlReuseSprites } from "./domReuse.js";
import { openPokemonCard } from "./pokemonCard.js";
import { genderSymbolHtml } from "./gender.js";
import { saveScroll, restoreScroll } from "./scrollPreserve.js";

/** Rozměry dlaždice (musí ladit s .pc-grid v css/main.css) – pro výpočet počtu. */
const TILE_W = 92; // cílová šířka dlaždice včetně mezery se dopočítává
const TILE_H = 96; // = grid-auto-rows
const GRID_GAP = 6;

/** Aktuální stránka PC (přežívá překreslení). */
let pcPage = 0;
/** Vypočítaný počet sloupců/řádků → počet dlaždic na stránku. */
let pcCols = 6;
let pcRows = 5;
let tilesPerPage = pcCols * pcRows;

/** Hledaný řetězec (přežívá překreslení; když je neprázdný, ukáže ploché výsledky). */
let query = "";

/** ResizeObserver na PC panel (přizpůsobení počtu dlaždic při změně velikosti okna). */
let pcResizeObs = null;

/** Escapuje uvozovky do hodnoty atributu. */
function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}

/** uid právě taženého jedince (drag & drop) – i k potlačení kliknutí po tažení. */
let draggingUid = null;
let didDrag = false;

/** Jedinec v kolekci podle uid. */
function ownedByUid(uid) {
  return getState().collection.find((p) => p.uid === uid) ?? null;
}

/**
 * Patička slotu: jen stavový štítek (Day Care / Breeding / ✓ Team). Přidávání do
 * týmu se dělá VÝHRADNĚ přetažením jedince na slot v Týmu.
 */
function slotFoot(p) {
  if (isInTeam(p.uid)) return `<span class="dex-tag team">✓ Team</span>`; // teoreticky se v boxu neobjeví
  const eng = pokemonEngagement(p.uid);
  if (eng === "day-care") return `<span class="dex-tag">Day Care</span>`;
  if (eng === "breeding") return `<span class="dex-tag">Breeding</span>`;
  return "";
}

/**
 * Souvislý seznam VŠECH slotů napříč boxy: [{uid, box, slot}, …]. Prázdný slot
 * má uid === null. Pořadí = boxy za sebou, v každém slot 0..29.
 */
function flatSlots(boxes) {
  const flat = [];
  for (let bi = 0; bi < boxes.length; bi++) {
    const slots = boxes[bi].slots;
    for (let si = 0; si < slots.length; si++) {
      flat.push({ uid: slots[si], box: bi, slot: si });
    }
  }
  return flat;
}

/** HTML jednoho slotu (obsazený = draggable, prázdný = jen drop cíl). */
function slotHtml(entry) {
  const { uid, box, slot } = entry;
  if (!uid) {
    return `<div class="pc-slot empty" data-box="${box}" data-slot="${slot}"></div>`;
  }
  const p = ownedByUid(uid);
  if (!p) return `<div class="pc-slot empty" data-box="${box}" data-slot="${slot}"></div>`;
  const sp = getSpecies(p.speciesId);
  const name = `${p.shiny ? "✨ " : ""}${sp?.name ?? p.speciesId}`;
  return `<div class="pc-slot filled" data-box="${box}" data-slot="${slot}" data-uid="${p.uid}" draggable="true" title="Drag to rearrange · click for card">
    ${spriteImg(p.speciesId, { shiny: !!p.shiny, gender: p.gender, alt: sp?.name ?? p.speciesId, dataKey: `pc:${p.uid}:${p.speciesId}:${p.shiny ? 1 : 0}:${p.gender ?? ""}` })}
    <span class="pc-name">${name} ${genderSymbolHtml(p.gender)}</span>
    <span class="pc-lvl">Lv ${p.level}</span>
    <div class="dex-foot">${slotFoot(p)}</div>
  </div>`;
}

/** Karta jedince ve výsledcích hledání (plochý seznam napříč boxy; bez drag/slotu). */
function resultCardHtml(uid) {
  const p = ownedByUid(uid);
  if (!p) return "";
  const sp = getSpecies(p.speciesId);
  const name = `${p.shiny ? "✨ " : ""}${sp?.name ?? p.speciesId}`;
  return `<div class="pc-slot filled" data-uid="${p.uid}" title="Click for card">
    ${spriteImg(p.speciesId, { shiny: !!p.shiny, gender: p.gender, alt: sp?.name ?? p.speciesId, dataKey: `pc:${p.uid}:${p.speciesId}:${p.shiny ? 1 : 0}:${p.gender ?? ""}` })}
    <span class="pc-name">${name} ${genderSymbolHtml(p.gender)}</span>
    <span class="pc-lvl">Lv ${p.level}</span>
    <div class="dex-foot">${slotFoot(p)}</div>
  </div>`;
}

/** Změř mřížku → kolik sloupců a řádků se do ní vejde (pevná velikost dlaždice). */
function measureGrid(grid) {
  const w = grid.clientWidth;
  const h = grid.clientHeight;
  if (w <= 0 || h <= 0) return null;
  const cols = Math.max(1, Math.floor((w + GRID_GAP) / (TILE_W + GRID_GAP)));
  const rows = Math.max(1, Math.floor((h + GRID_GAP) / (TILE_H + GRID_GAP)));
  return { cols, rows };
}

/** První volný slot na dané stránce (pro drop na navigační šipku). */
function firstFreeOnPage(flat, page) {
  const start = page * tilesPerPage;
  const end = Math.min(flat.length, start + tilesPerPage);
  for (let i = start; i < end; i++) {
    if (!flat[i].uid) return flat[i];
  }
  return null;
}

/** Napojí ResizeObserver na PC panel (jednou) – při změně velikosti přepočítá
 *  počet dlaždic a překreslí. root (#tab-rest) je stabilní napříč rendery. */
function observeResize(root, onStatus) {
  if (typeof ResizeObserver === "undefined" || pcResizeObs) return;
  pcResizeObs = new ResizeObserver(() => {
    if (!root.querySelector(".pc-view")) return; // PC právě není aktivní
    const g = root.querySelector(".pc-grid");
    if (!g || g.classList.contains("pc-grid-search")) return;
    const m = measureGrid(g);
    if (m && (m.cols !== pcCols || m.rows !== pcRows)) {
      pcCols = m.cols;
      pcRows = m.rows;
      tilesPerPage = pcCols * pcRows;
      renderPcTab(root, onStatus);
    }
  });
  pcResizeObs.observe(root);
}

/**
 * Vykreslí záložku PC.
 * @param {HTMLElement} root
 * @param {(msg: string) => void} onStatus
 */
export function renderPcTab(root, onStatus = () => {}) {
  const boxes = getBoxes();
  const stored = storedCount();

  // Hledání: neprázdný dotaz → plochý seznam shod napříč VŠEMI boxy.
  const q = query.trim().toLowerCase();
  let results = [];
  if (q) {
    const allUids = [];
    for (const b of boxes) for (const uid of b.slots) if (uid) allUids.push(uid);
    results = allUids.filter((uid) => {
      const p = ownedByUid(uid);
      if (!p) return false;
      const sp = getSpecies(p.speciesId);
      const name = (sp?.name ?? p.speciesId).toLowerCase();
      const noStr = String(sp?.dexNo ?? "");
      const noLabel = `#${noStr.padStart(3, "0")}`;
      return name.includes(q) || noLabel.includes(q) || noStr.includes(q);
    });
  }

  // Souvislý seznam slotů + stránkování podle vypočítaného počtu dlaždic.
  // Nezobrazujeme všechny prázdné stránky až do plné kapacity – jen po poslední
  // obsazený slot + jeden volný navíc (kam se dá přetáhnout nový jedinec).
  const flat = flatSlots(boxes);
  let lastFilled = -1;
  for (let i = 0; i < flat.length; i++) if (flat[i].uid) lastFilled = i;
  const capPages = Math.max(1, Math.ceil(flat.length / tilesPerPage));
  const usePages = Math.max(1, Math.ceil((lastFilled + 2) / tilesPerPage));
  const totalPages = Math.min(capPages, usePages);
  if (pcPage >= totalPages) pcPage = totalPages - 1;
  if (pcPage < 0) pcPage = 0;
  const pageStart = pcPage * tilesPerPage;
  const pageEntries = flat.slice(pageStart, pageStart + tilesPerPage);

  // Zachytit fokus/caret vyhledávání (levý panel se překresluje na tik).
  const prevSearch = root.querySelector("#pc-search");
  const searchFocused = !!prevSearch && document.activeElement === prevSearch;
  const caret = prevSearch ? prevSearch.selectionStart : null;

  // Scroll drž jen u výsledků hledání (ta mřížka scrolluje).
  const prevGrid = root.querySelector(".pc-grid.pc-grid-search");
  const searchScrollTop = prevGrid ? prevGrid.scrollTop : 0;

  const navHtml = q
    ? ""
    : `<div class="pc-nav">
      <button class="btn btn-sm" data-page-prev title="Previous page (drop a Pokémon here to move it there)" ${totalPages <= 1 ? "disabled" : ""}>◀</button>
      <span class="pc-page-label">Page ${pcPage + 1} / ${totalPages}</span>
      <button class="btn btn-sm" data-page-next title="Next page (drop a Pokémon here to move it there)" ${totalPages <= 1 ? "disabled" : ""}>▶</button>
    </div>`;

  const gridInner = q
    ? (results.length
        ? results.map(resultCardHtml).join("")
        : `<p class="placeholder">No Pokémon match “${escapeAttr(query)}”.</p>`)
    : pageEntries.map(slotHtml).join("");

  const _savedScroll = saveScroll(root);
  setHtmlReuseSprites(root, `
    <div class="pc-view">
      <h2 class="panel-title">PC <span class="dex-count">${stored} stored</span></h2>
      <div class="pc-tools">
        <input type="search" id="pc-search" class="daycare-search" placeholder="Search name or #no" value="${escapeAttr(query)}">
        <div class="pc-sort">
          <span class="filter-label">Sort</span>
          <button class="btn btn-sm" data-sort="dex" title="Arrange all boxes by Pokédex number">Dex #</button>
          <button class="btn btn-sm" data-sort="level" title="Arrange all boxes by level (highest first)">Lv</button>
          <button class="btn btn-sm" data-sort="name" title="Arrange all boxes alphabetically">Name</button>
        </div>
      </div>
      ${navHtml}
      <div class="pc-grid${q ? " pc-grid-search" : ""}" style="--pc-cols:${pcCols}">
        ${gridInner}
      </div>
    </div>
  `);
  restoreScroll(root, _savedScroll);

  const grid = root.querySelector(".pc-grid");

  // Přizpůsobení počtu dlaždic velikosti okna (jen v režimu boxů, ne hledání).
  if (grid && !q) {
    const m = measureGrid(grid);
    if (m && (m.cols !== pcCols || m.rows !== pcRows)) {
      pcCols = m.cols;
      pcRows = m.rows;
      tilesPerPage = pcCols * pcRows;
      renderPcTab(root, onStatus); // překresli se správným počtem dlaždic
      return;
    }
    observeResize(root, onStatus);
  }

  // Vyhledávání: input → filtr; obnova fokusu/caretu po překreslení.
  const search = root.querySelector("#pc-search");
  if (search) search.addEventListener("input", () => {
    query = search.value;
    renderPcTab(root, onStatus);
  });
  if (searchFocused) {
    const el = root.querySelector("#pc-search");
    if (el) {
      el.focus();
      if (caret != null) el.setSelectionRange(caret, caret);
    }
  }

  // Sort: přeuspořádá všechny boxy (living-dex). commit() z sortAllBoxes překreslí.
  root.querySelectorAll("[data-sort]").forEach((b) =>
    b.addEventListener("click", () => {
      const key = b.dataset.sort;
      sortAllBoxes(key);
      const label = key === "dex" ? "Dex #" : key === "level" ? "level" : "name";
      onStatus(`Sorted all boxes by ${label}`);
    })
  );

  // Stránkování.
  const prevBtn = root.querySelector("[data-page-prev]");
  if (prevBtn) prevBtn.addEventListener("click", () => {
    pcPage = (pcPage - 1 + totalPages) % totalPages;
    renderPcTab(root, onStatus);
  });
  const nextBtn = root.querySelector("[data-page-next]");
  if (nextBtn) nextBtn.addEventListener("click", () => {
    pcPage = (pcPage + 1) % totalPages;
    renderPcTab(root, onStatus);
  });

  // Drop na navigační šipku = přesun taženého jedince na sousední stránku
  // (do prvního volného slotu té stránky).
  const pageDrop = (btn, targetPage) => {
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
      if (!uid || totalPages <= 1) return;
      const dest = (targetPage + totalPages) % totalPages;
      const free = firstFreeOnPage(flat, dest);
      if (free && moveToSlot(uid, free.box, free.slot)) {
        pcPage = dest; // ať hráč vidí, kam se přesunul
        onStatus(`Moved to page ${dest + 1}`); // commit z moveToSlot překreslí
      } else {
        onStatus("That page is full");
      }
    });
  };
  pageDrop(prevBtn, pcPage - 1);
  pageDrop(nextBtn, pcPage + 1);

  // Klik na slot → karta Pokémona (pokud se zrovna netáhlo).
  root.querySelectorAll(".pc-slot.filled").forEach((slot) =>
    slot.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      if (didDrag) { didDrag = false; return; }
      openPokemonCard({ uid: slot.dataset.uid });
    })
  );

  // --- Drag & drop (přeuspořádání slotů) ---
  // V režimu hledání (plochý seznam napříč boxy) se netáhne – výsledky nemají
  // platné pozice v boxu; jsou jen ke kliknutí.
  if (!q) {
    root.querySelectorAll(".pc-slot.filled").forEach((slot) => {
      slot.addEventListener("dragstart", (e) => {
        draggingUid = slot.dataset.uid;
        beginDrag(draggingUid, "pc"); // sdílený stav (i pro drop do panelu Týmu)
        didDrag = true;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", draggingUid);
        slot.classList.add("dragging");
      });
      slot.addEventListener("dragend", () => {
        slot.classList.remove("dragging");
        draggingUid = null;
        endDrag();
        setTimeout(() => { didDrag = false; }, 0);
      });
    });

    root.querySelectorAll(".pc-slot").forEach((slot) => {
      slot.addEventListener("dragover", (e) => {
        if (!dragState.uid) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        slot.classList.add("drag-over");
      });
      slot.addEventListener("dragleave", () => slot.classList.remove("drag-over"));
      slot.addEventListener("drop", (e) => {
        e.preventDefault();
        slot.classList.remove("drag-over");
        const uid = dragState.uid ?? e.dataTransfer.getData("text/plain");
        if (!uid) return;
        const toBox = Number(slot.dataset.box);
        const toSlot = Number(slot.dataset.slot);
        if (Number.isNaN(toBox) || Number.isNaN(toSlot)) return;
        if (dragState.source === "team") {
          // Přesun z týmu do PC: nejdřív z týmu ven (reconcile ho někam uklidí),
          // pak přesuň na konkrétní cílový slot (prohození, když je obsazený).
          removeFromTeam(uid);
          moveToSlot(uid, toBox, toSlot);
          onStatus("Moved to PC");
        } else {
          moveToSlot(uid, toBox, toSlot); // commit → překreslení
        }
      });
    });
  } // konec if (!q) – drag & drop

  // Obnov scroll výsledků hledání.
  const searchGrid = root.querySelector(".pc-grid.pc-grid-search");
  if (searchGrid) searchGrid.scrollTop = searchScrollTop;
}
