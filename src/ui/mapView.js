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
import { setActiveArea, getActiveAreaId, applyFossilChoice } from "../systems/battleSystem.js";
import { getState, commit } from "../core/state.js";
import { bus, EVENTS } from "../core/events.js";
import { showPopup } from "./popup.js";

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

/** Poražení trenéři/rivalové (gatují uzly s unlock.trainer, viz data/areas.js). */
function defeatedTrainers() {
  return getState().progress?.defeatedTrainers ?? [];
}

/** Příběhové flagy (gatují uzly s unlock.story, viz data/areas.js). */
function storyFlags() {
  return getState().story ?? {};
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
  const beaten = defeatedTrainers();
  const story = storyFlags();
  const nodesHtml = AREAS.map((area) => {
    const unlocked = isAreaUnlocked(area, visited, badges, beaten, story);
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
    // Příběhový event → vyskakovací okno (NIKDY nic pod mapu). Zatím: příchod do
    // Viridianu s nevyřízeným Oak's Parcel navede hráče do Poké Martu.
    if (res.event === "viridian-parcel-hint") {
      showPopup({
        title: "🏙️ Viridian City",
        body: `<p class="story-text">You step into Viridian City. A townsperson points down the street:</p>
          <p class="story-text">"See that <strong>blue-roofed building</strong>? That's the <strong>Poké Mart</strong> — the clerk there was just asking about you. You should go take a look inside."</p>
          <p class="placeholder">Open the <strong>City</strong> tab and click the Poké Mart.</p>`,
        okLabel: "Head into town",
      });
      return;
    }
    if (res.event === "pewter-gym-hint") {
      showPopup({
        title: "🪨 Pewter City",
        body: `<p class="story-text">You arrive in Pewter City, a town of grey stone nestled against the mountains.</p>
          <p class="story-text">A local nods toward the large building at the north end: "That's our <strong>Pewter Gym</strong> — Leader <strong>Brock</strong> uses <strong>Rock-type</strong> Pokémon. Grass or Water types will serve you well against him."</p>
          <p class="placeholder">Open the <strong>Gym</strong> tab to challenge Brock. Don't miss the <strong>Museum of Science</strong> in the City tab!</p>`,
        okLabel: "Let's explore",
      });
      return;
    }
    if (res.event === "viridian-forest-item") {
      showPopup({
        title: "🌳 Viridian Forest",
        body: `<p class="story-text">The forest is a maze of towering trees, alive with the buzz of Bug Pokémon.</p>
          <p class="story-text">Among the roots you spot some items left behind by other trainers — you pick up a <strong>Potion</strong> and an <strong>Antidote</strong>!</p>
          <p class="placeholder">Tip: a rare <strong>Pikachu</strong> is said to live here.</p>`,
        okLabel: "Take them",
      });
      return;
    }
    if (res.event === "mt-moon-rocket") {
      showPopup({
        title: "🌑 Mt. Moon",
        body: `<p class="story-text">You enter Mt. Moon — a pitch-black cave echoing with the screech of Zubat.</p>
          <p class="story-text">Shady figures in black uniforms block the tunnels: <strong>Team Rocket</strong> has taken over the cave, digging for rare fossils and Moon Stones!</p>
          <p class="story-text">Five grunts stand between you and the way onward. Open the <strong>Rockets</strong> tab and beat every one of them to clear the path.</p>`,
        okLabel: "Press on",
      });
      return;
    }
    if (res.event === "mt-moon-fossil") {
      showPopup({
        title: "🦴 A Mysterious Fossil",
        body: `<p class="story-text">Deep in Mt. Moon, after driving off the Rockets, you find <strong>two ancient fossils</strong> resting on a stone table.</p>
          <p class="story-text">You can only carry one. Choose carefully — this choice is permanent!</p>
          <p class="placeholder">🐚 Helix Fossil → Omanyte · 🗿 Dome Fossil → Kabuto</p>`,
        dismissible: false, // hráč si MUSÍ vybrat
        choices: [
          { label: "🐚 Helix Fossil", onPick: () => pickFossil("helix") },
          { label: "🗿 Dome Fossil", onPick: () => pickFossil("dome") },
        ],
      });
      return;
    }
    if (res.event === "cerulean-arrival") {
      showPopup({
        title: "🌊 Cerulean City",
        body: `<p class="story-text">You reach Cerulean City, a bright town of bridges and shimmering waterfalls.</p>
          <p class="story-text">A local waves toward the Gym by the water: "That's <strong>Misty's</strong> Gym — she uses <strong>Water-type</strong> Pokémon. Grass or Electric types will give you the edge."</p>
          <p class="placeholder">Open the <strong>Gym</strong> tab to challenge Misty for the Cascade Badge.</p>`,
        okLabel: "Let's explore",
      });
      return;
    }
    if (res.event === "nugget-bridge") {
      showPopup({
        title: "🌉 Nugget Bridge",
        body: `<p class="story-text">You battle your way across Nugget Bridge, beating trainer after trainer.</p>
          <p class="story-text">At the far end, an impressed man hands you a shiny <strong>Nugget</strong> — you sell it on the spot for <strong>1000₽</strong>!</p>
          <p class="story-text">He then reveals himself as a <strong>Team Rocket</strong> recruiter... and you turn him down flat.</p>`,
        okLabel: "Keep going",
      });
      return;
    }
    if (res.event === "bill-route-25") {
      showPopup({
        title: "🏠 Bill's Cottage",
        body: `<p class="story-text">At the end of Route 25 you find <strong>Bill</strong>, the famous Pokémon researcher — accidentally fused with a Pokémon by his own teleporter!</p>
          <p class="story-text">You help him split back apart. Grateful, he hands you a <strong>S.S. Anne Ticket</strong>.</p>
          <p class="story-text">"The luxury liner <strong>S.S. Anne</strong> is docked at <strong>Vermilion City</strong> to the south. This ticket will get you aboard!"</p>`,
        okLabel: "Thanks, Bill!",
      });
      return;
    }
    if (res.event === "vermilion-arrival") {
      showPopup({
        title: "⚓ Vermilion City",
        body: `<p class="story-text">You arrive in Vermilion City, a sunny port town on the southern coast.</p>
          <p class="story-text">The luxury liner <strong>S.S. Anne</strong> is docked at the harbor — your ticket will get you aboard. Open the <strong>City</strong> tab and visit the ship!</p>
          <p class="placeholder">The <strong>Vermilion Gym</strong> (Lt. Surge, Electric) is blocked by a small tree — you'll need <strong>HM Cut</strong> to reach it.</p>`,
        okLabel: "Explore the port",
      });
      return;
    }
    // Běžný přesun – jen krátká informační hláška (žádný příběh).
    flash(
      info,
      area.type === "city"
        ? `🏙️ ${area.name} — visit its buildings in the City tab.`
        : `📍 Now battling at ${area.name}.`
    );
  });

  // Živá aktualizace stavu (aktivní/odemčeno + pozice) bez přepisu obrázku.
  updateStates(root);
  if (unsub) unsub();
  unsub = bus.on(EVENTS.STATE_CHANGED, () => updateStates(root));
}

/**
 * Zpracuje výběr fosílie z Mt. Moon: uloží item a potvrdí druhým popupem.
 * @param {"helix"|"dome"} kind
 */
function pickFossil(kind) {
  applyFossilChoice(kind);
  const name = kind === "dome" ? "Dome Fossil" : "Helix Fossil";
  const mon = kind === "dome" ? "Kabuto" : "Omanyte";
  showPopup({
    title: "🦴 Fossil Obtained",
    body: `<p class="story-text">You carefully pack the <strong>${name}</strong> into your bag.</p>
      <p class="placeholder">One day it might be revived into <strong>${mon}</strong>…</p>`,
    okLabel: "Nice!",
  });
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
  const beaten = defeatedTrainers();
  const story = storyFlags();
  const reveal = devReveal();
  for (const btn of root.querySelectorAll(".map-node")) {
    const area = getArea(btn.dataset.area);
    if (!area) continue;
    const unlocked = isAreaUnlocked(area, visited, badges, beaten, story);
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
