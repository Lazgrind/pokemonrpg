/**
 * UI: panel Mapy (pravá dolní část) – KLIKACÍ mapa (à la PokeClicker / nintendo).
 *
 * Nad artem regionu (assets/map/kanto.webp) jsou umístěné klikací markery uzlů
 * z datové vrstvy (data/areas.js) na pozicích x/y v %. Klik na uzel = „přesun":
 * nastaví aktivní oblast (battleSystem.setActiveArea) → souboje pak spawnují
 * odsud. Odemčení řídí navštívené oblasti (isAreaUnlocked nad progress.visited);
 * zamčené uzly nejdou kliknout a hráč je nevidí (jen dev „reveal" je ukáže).
 *
 * REŽIM UMÍSTĚNÍ (📍): protože art mapa nemá popisky, hráč si pozice uzlů
 * naklikká sám – vybere uzel v liště a klikne na mapu, kam patří. Pozice se
 * uloží do state.mapPositions (override nad areas.js) a zobrazí se textový
 * výpis, který se pak přepíše natvrdo do data/areas.js.
 */

import { AREAS, getArea, isAreaUnlocked } from "../../data/areas.js";
import { setActiveArea, getActiveAreaId } from "../systems/battleSystem.js";
import { getState, commit } from "../core/state.js";
import { bus, EVENTS } from "../core/events.js";

const MAP_IMG = "assets/map/kanto.webp";

/* ===================== DEV: Map placement mode =====================
 * Vývojový nástroj pro naklikání pozic uzlů na mapě (tlačítko 📍 Place nodes)
 * + výpis pozic (📋), který se ručně přepíše do data/areas.js.
 *
 * PŘED OSTRÝM RELEASEM: přepni DEV_MAP_PLACEMENT = false → celý nástroj zmizí
 * z UI (tlačítko se nevykreslí, edit režim je nedostupný, žádné mapPositions).
 * Pro ÚPLNÉ smazání kódu vyřízni bloky ohraničené značkami
 * `DEV-PLACEMENT-START` … `DEV-PLACEMENT-END` níže.
 * (Konvence stejná jako u ostatních dev věcí – viz „🔧 Dev tools" v Nastavení.)
 * =================================================================== */
const DEV_MAP_PLACEMENT = true;

/** Režim umístění uzlů + aktuálně vybraný uzel (modulový stav UI). */
let editMode = false;
let editTarget = null;
let editHideLabels = false; // v edit režimu skrýt názvy → jen tečky (nepřekáží v kliku)
let unsub = null;
let rootRef = null;

/** Navštívené oblasti (řídí odemykání navazujících uzlů, viz data/areas.js). */
function visitedAreas() {
  return getState().progress?.visited ?? [];
}

/** Získané odznaky (gatují uzly s unlock.badge, viz data/areas.js). */
function earnedBadges() {
  return getState().progress?.badges ?? [];
}

/** Dev přepínač „ukázat všechny uzly" (i zamčené) – řídí ho Dev sekce v Nastavení. */
function devReveal() {
  return !!getState().settings?.mapReveal;
}

/** Pozice uzlu na mapě: override ze state.mapPositions, jinak výchozí z areas.js. */
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

const round1 = (n) => Math.round(n * 10) / 10;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * Vykreslí klikací mapu do zadaného elementu.
 * @param {HTMLElement} root
 */
export function renderMap(root) {
  rootRef = root;
  const visited = visitedAreas();

  const badges = earnedBadges();
  const nodesHtml = AREAS.map((area) => {
    const unlocked = isAreaUnlocked(area, visited, badges);
    const p = posOf(area);
    const lvl = area.species?.length ? ` · Lv ${area.recommendedLevel}` : "";
    return `
      <button
        class="map-node"
        data-area="${area.id}"
        style="left:${p.x}%; top:${p.y}%"
        ${unlocked ? "" : "disabled"}
        title="${area.name}"
      >
        <span class="map-node-dot"></span>
        <span class="map-node-label">${area.name}${lvl}</span>
      </button>`;
  }).join("");

  root.innerHTML = `
    <div class="map-head">
      <h2 class="panel-title">Map</h2>
      <div class="map-head-actions">
        ${editMode ? `<button class="btn btn-sm" data-toggle-labels>${editHideLabels ? "🏷 Labels: off" : "🏷 Labels: on"}</button>` : ""}
        ${editMode ? `<button class="btn btn-sm" data-show-dump title="Zobrazit výpis pozic k odeslání">📋 Výpis pozic</button>` : ""}
        ${DEV_MAP_PLACEMENT ? `<button class="btn btn-sm map-edit-toggle" data-edit-toggle>${editMode ? "✓ Done" : "📍 Place nodes"}</button>` : ""}
      </div>
    </div>
    <div class="kanto-map ${editMode ? "is-editing" : ""}">
      <div class="map-stage ${editMode ? "is-editing" : ""} ${editMode && editHideLabels ? "hide-labels" : ""}">
        <img class="map-img" src="${MAP_IMG}" alt="Map of Kanto" draggable="false" />
        ${nodesHtml}
      </div>
      ${editMode ? editPanelHtml() : `<div class="map-info" aria-live="polite"></div>`}
    </div>
  `;

  const stage = root.querySelector(".map-stage");
  const info = root.querySelector(".map-info");

  // Přepínač režimu umístění (dev; tlačítko existuje jen když DEV_MAP_PLACEMENT).
  const editToggle = root.querySelector("[data-edit-toggle]");
  if (editToggle) {
    editToggle.addEventListener("click", () => {
      editMode = !editMode;
      editTarget = editMode ? firstUnplaced() : null;
      renderMap(root);
    });
  }

  // Výběr uzlu k umístění (čipy v liště) + kopírování výpisu.
  if (editMode) {
    for (const chip of root.querySelectorAll("[data-pick]")) {
      chip.addEventListener("click", () => {
        editTarget = chip.dataset.pick;
        renderMap(root);
      });
    }
    const labelsBtn = root.querySelector("[data-toggle-labels]");
    if (labelsBtn) {
      labelsBtn.addEventListener("click", () => {
        editHideLabels = !editHideLabels;
        renderMap(root);
      });
    }
    const dumpBtn = root.querySelector("[data-show-dump]");
    if (dumpBtn) dumpBtn.addEventListener("click", openPositionsModal);
  }

  // Klik na scénu.
  stage.addEventListener("click", (e) => {
    if (editMode) {
      // Klik na existující uzel = vyber ho k přesunu (ne umístit).
      const hit = e.target.closest(".map-node");
      if (hit) {
        editTarget = hit.dataset.area;
        renderMap(root);
        return;
      }
      // Klik do prázdna = umísti vybraný uzel sem. Cíl zůstává vybraný,
      // takže jde pozici hned doladit dalším klikem (žádný auto-skok).
      if (!editTarget) return;
      const rect = stage.getBoundingClientRect();
      const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
      const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100);
      setMapPos(editTarget, x, y); // → STATE_CHANGED přesune marker
      renderMap(root);
      return;
    }
    const btn = e.target.closest(".map-node");
    if (!btn || btn.disabled) return;
    const area = getArea(btn.dataset.area);
    if (!area) return;
    const res = setActiveArea(area.id);
    if (!res.ok) {
      flash(info, res.reason ?? "Can't go there.");
      return;
    }
    flash(
      info,
      area.type === "city"
        ? `🏙️ ${area.name} — shops & Gym coming soon.`
        : `📍 Now battling at ${area.name}.`
    );
  });

  // Živá aktualizace stavu (aktivní/odemčeno + pozice) bez přepisu obrázku.
  updateStates(root);
  if (unsub) unsub();
  unsub = bus.on(EVENTS.STATE_CHANGED, () => updateStates(root));
}

/* ---------- DEV-PLACEMENT-START (celý blok lze při releasu smazat) ---------- */

/** Lišta režimu umístění: čipy uzlů + instrukce + výpis pozic. */
function editPanelHtml() {
  const chips = AREAS.map((a) => {
    const placed = !!getState().mapPositions?.[a.id];
    const active = a.id === editTarget;
    return `<button class="map-chip ${active ? "active" : ""} ${placed ? "placed" : ""}"
              data-pick="${a.id}">${placed ? "✓ " : ""}${a.name}</button>`;
  }).join("");
  return `
    <div class="map-edit">
      <p class="map-edit-hint">Vyber uzel (klikni na jeho tečku na mapě nebo na čip níže), pak klikni na mapu, kam patří. Klikáním do prázdna pozici dolaď. Nakonec klikni na <strong>📋 Výpis pozic</strong> nahoře a pošli mi ten výpis.</p>
      <div class="map-chips">${chips}</div>
    </div>`;
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
      <h3 style="margin:0 0 8px">📋 Výpis pozic uzlů</h3>
      <p style="margin:0 0 10px;font-size:12px;opacity:0.8">Zkopíruj celý výpis a pošli mi ho – přepíšu ho natvrdo do <code>data/areas.js</code> a bude i na produkci.</p>
      <textarea class="map-pos-dump" readonly rows="10">${positionsDump()}</textarea>
      <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end">
        <button class="btn btn-sm" data-copy>📋 Kopírovat</button>
        <button class="btn btn-sm" data-close>Zavřít</button>
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
    b.textContent = "✓ Zkopírováno";
    setTimeout(() => (b.textContent = "📋 Kopírovat"), 1500);
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

/** Textový výpis aktuálních pozic (pro přepis do data/areas.js). */
function positionsDump() {
  return AREAS.map((a) => {
    const p = posOf(a);
    return `${a.id}: x: ${p.x}, y: ${p.y}`;
  }).join("\n");
}

/** První uzel bez naklikané pozice (jinak první uzel). */
function firstUnplaced() {
  const mp = getState().mapPositions ?? {};
  return (AREAS.find((a) => !mp[a.id]) ?? AREAS[0]).id;
}

/* ---------- DEV-PLACEMENT-END ---------- */

/** Přepočítá stavové třídy + pozice markerů a popisek aktivní oblasti. */
function updateStates(root) {
  if (!root.isConnected) return;
  const activeId = getActiveAreaId();
  const visited = visitedAreas();
  const badges = earnedBadges();
  const reveal = devReveal();
  for (const btn of root.querySelectorAll(".map-node")) {
    const area = getArea(btn.dataset.area);
    if (!area) continue;
    const unlocked = isAreaUnlocked(area, visited, badges);
    // Hráč vidí jen odemčené; zamčené se skryjí (mimo edit režim a dev „reveal").
    const visible = unlocked || editMode || reveal;
    const p = posOf(area);
    btn.style.left = `${p.x}%`;
    btn.style.top = `${p.y}%`;
    btn.disabled = !unlocked && !editMode;
    btn.classList.toggle("is-hidden", !visible);
    btn.classList.toggle("is-locked", !unlocked);
    btn.classList.toggle("is-active", area.id === activeId);
    btn.classList.toggle("is-target", editMode && area.id === editTarget);
    btn.classList.toggle("type-city", area.type === "city");
    btn.classList.toggle("type-route", area.type !== "city");
  }
  const info = root.querySelector(".map-info");
  if (info && !info.dataset.flashing) {
    const active = getArea(activeId);
    if (active) info.textContent = `Current location: ${active.name}`;
  }
}

/** Krátká dočasná hláška v info řádku (po chvíli se vrátí na aktuální lokaci). */
function flash(info, msg) {
  if (!info) return;
  info.textContent = msg;
  info.dataset.flashing = "1";
  clearTimeout(flash._t);
  flash._t = setTimeout(() => {
    delete info.dataset.flashing;
    const active = getArea(getActiveAreaId());
    if (active) info.textContent = `Current location: ${active.name}`;
  }, 2500);
}
