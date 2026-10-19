/**
 * devMapPlacement.js – DEV nástroj pro naklikání pozic uzlů na mapě.
 *
 * Protože art mapa nemá popisky, pozice uzlů si naklikáme sami: vybere se uzel
 * (čip v liště nebo tečka na mapě) a klikne se na mapu, kam patří. Pozice se
 * uloží do `state.mapPositions` (override nad areas.js) a přes „📋 Position dump"
 * se vypíše text, který se pak přepíše natvrdo do `data/areas.js`.
 *
 * Celý nástroj patří k dev menu (viz [[dev-story-checkpoints]] / „🔧 Dev tools"
 * v Nastavení) a žije proto tady ve složce `src/dev/`. Do `mapView.js` se
 * zapojuje jen přes malé API (render* / wire* / handle*), takže se ukáže JEN na
 * localhostu (`isDevEnv()`); na ostré GitHub/GitLab Pages verzi se nevykreslí,
 * `mapPlacementEnabled()` je false a edit režim nejde ani zapnout.
 */

import { AREAS } from "../../data/areas.js";
import { getState, commit } from "../core/state.js";
import { isDevEnv } from "./devEnv.js";

/** Režim umístění uzlů + aktuálně vybraný uzel + skrytí popisků (modulový stav). */
let editMode = false;
let editTarget = null;
let editHideLabels = false; // v edit režimu skrýt názvy → jen tečky (nepřekáží v kliku)

const round1 = (n) => Math.round(n * 10) / 10;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** Je dev placement nástroj vůbec dostupný? (jen localhost) */
export function mapPlacementEnabled() {
  return isDevEnv();
}

/** Jsme právě v režimu umístění uzlů? (na produkci vždy false – nejde zapnout). */
export function mapPlacementActive() {
  return editMode;
}

/** Aktuálně vybraný cílový uzel (pro zvýraznění markeru). */
export function mapPlacementTarget() {
  return editTarget;
}

/** Skrýt popisky v edit režimu (jen tečky)? – pro CSS třídy stage. */
export function mapPlacementHideLabels() {
  return editMode && editHideLabels;
}

/** Efektivní pozice uzlu (override ze state.mapPositions, jinak z areas.js). */
function posOf(area) {
  const o = getState().mapPositions?.[area.id];
  return o && typeof o.x === "number" ? o : { x: area.x, y: area.y };
}

/** Zapíše naklikanou pozici uzlu (override) a uloží. */
function setMapPos(areaId, x, y) {
  const s = getState();
  if (!s.mapPositions) s.mapPositions = {};
  s.mapPositions[areaId] = { x: round1(x), y: round1(y) };
  commit();
}

/** První uzel bez naklikané pozice (jinak první uzel). */
function firstUnplaced() {
  const mp = getState().mapPositions ?? {};
  return (AREAS.find((a) => !mp[a.id]) ?? AREAS[0]).id;
}

/** Textový výpis aktuálních pozic (pro přepis do data/areas.js). */
function positionsDump() {
  return AREAS.map((a) => {
    const p = posOf(a);
    return `${a.id}: x: ${p.x}, y: ${p.y}`;
  }).join("\n");
}

/**
 * HTML dev tlačítek do hlavičky mapy: v edit režimu Labels + Position dump,
 * plus přepínač „📍 Place nodes"/„✓ Done". Prázdné mimo localhost.
 */
export function renderPlacementButtons() {
  if (!isDevEnv()) return "";
  const labels = editMode
    ? `<button class="btn btn-sm" data-toggle-labels>${editHideLabels ? "🏷 Labels: off" : "🏷 Labels: on"}</button>`
    : "";
  const dump = editMode
    ? `<button class="btn btn-sm" data-show-dump title="Show position dump to submit">📋 Position dump</button>`
    : "";
  const toggle = `<button class="btn btn-sm map-edit-toggle" data-edit-toggle>${editMode ? "✓ Done" : "📍 Place nodes"}</button>`;
  return `${labels}${dump}${toggle}`;
}

/** HTML lišty edit režimu (čipy uzlů + instrukce). Prázdné mimo edit režim. */
export function renderPlacementBar() {
  if (!editMode) return "";
  const chips = AREAS.map((a) => {
    const placed = !!getState().mapPositions?.[a.id];
    const active = a.id === editTarget;
    return `<button class="map-chip ${active ? "active" : ""} ${placed ? "placed" : ""}"
              data-pick="${a.id}">${placed ? "✓ " : ""}${a.name}</button>`;
  }).join("");
  return `
    <div class="map-edit">
      <p class="map-edit-hint">Pick a node (click its dot on the map or the chip below), then click the map where it belongs. Click empty space to fine-tune. Finally click <strong>📋 Position dump</strong> above and send me the dump.</p>
      <div class="map-chips">${chips}</div>
    </div>`;
}

/**
 * Zapojí posluchače placement nástroje na čerstvě vyrenderované mapě.
 * @param {HTMLElement} root      kořen panelu mapy
 * @param {() => void} rerender   překreslí mapu
 */
export function wirePlacement(root, rerender) {
  if (!isDevEnv()) return;

  // Přepínač edit režimu (tlačítko existuje jen na localhostu).
  const editToggle = root.querySelector("[data-edit-toggle]");
  if (editToggle) {
    editToggle.addEventListener("click", () => {
      editMode = !editMode;
      editTarget = editMode ? firstUnplaced() : null;
      rerender();
    });
  }

  if (!editMode) return;

  // Výběr uzlu k umístění (čipy v liště).
  for (const chip of root.querySelectorAll("[data-pick]")) {
    chip.addEventListener("click", () => {
      editTarget = chip.dataset.pick;
      rerender();
    });
  }
  const labelsBtn = root.querySelector("[data-toggle-labels]");
  if (labelsBtn) {
    labelsBtn.addEventListener("click", () => {
      editHideLabels = !editHideLabels;
      rerender();
    });
  }
  const dumpBtn = root.querySelector("[data-show-dump]");
  if (dumpBtn) dumpBtn.addEventListener("click", openPositionsModal);
}

/**
 * Zpracuje klik na scénu mapy v edit režimu. Vrátí true, když klik obsloužil
 * (mapView pak NEdělá normální navigaci). Mimo edit režim vrací false.
 * @param {MouseEvent} e
 * @param {HTMLElement} stage      element scény mapy (.map-stage)
 * @param {() => void} rerender    překreslí mapu
 * @returns {boolean}
 */
export function handlePlacementClick(e, stage, rerender) {
  if (!editMode) return false;
  // Klik na existující uzel = vyber ho k přesunu (ne umístit).
  const hit = e.target.closest(".map-node");
  if (hit) {
    editTarget = hit.dataset.area;
    rerender();
    return true;
  }
  // Klik do prázdna = umísti vybraný uzel sem. Cíl zůstává vybraný,
  // takže jde pozici hned doladit dalším klikem (žádný auto-skok).
  if (!editTarget) return true;
  const rect = stage.getBoundingClientRect();
  const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
  const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100);
  setMapPos(editTarget, x, y); // → STATE_CHANGED přesune marker
  rerender();
  return true;
}

/**
 * Vyskakovací okno s textovým výpisem pozic (nad vším → neořízne ho overflow
 * panelu mapy). Uživatel ho zkopíruje a pošle → přepíše se do data/areas.js.
 */
function openPositionsModal() {
  // Guard proti dvojímu otevření.
  if (document.querySelector(".map-pos-modal")) return;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay map-pos-modal";
  overlay.innerHTML = `
    <div class="modal map-pos-card">
      <h3 style="margin:0 0 8px">📋 Node position dump</h3>
      <p style="margin:0 0 10px;font-size:12px;opacity:0.8">Copy the whole dump and send it to me – I'll hardcode it into <code>data/areas.js</code> and it'll ship to production.</p>
      <textarea class="map-pos-dump" readonly rows="10">${positionsDump()}</textarea>
      <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end">
        <button class="btn btn-sm" data-copy>📋 Copy</button>
        <button class="btn btn-sm" data-close>Close</button>
      </div>
    </div>`;

  const close = () => {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  };
  const onKey = (e) => {
    if (e.key === "Escape") close();
  };

  const ta = overlay.querySelector(".map-pos-dump");
  overlay.querySelector("[data-copy]").addEventListener("click", (e) => {
    ta.select();
    navigator.clipboard?.writeText(ta.value).catch(() => {});
    // Fallback pro prostředí bez clipboard API: text je vybraný, jde Ctrl+C.
    try {
      document.execCommand("copy");
    } catch {}
    const b = e.currentTarget;
    b.textContent = "✓ Copied";
    setTimeout(() => (b.textContent = "📋 Copy"), 1500);
  });
  overlay.querySelector("[data-close]").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", onKey);

  document.body.appendChild(overlay);
  ta.focus();
  ta.select();
}
