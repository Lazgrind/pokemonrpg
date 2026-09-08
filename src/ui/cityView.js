/**
 * UI: panel Města – izometrické 2.5D město (čistě CSS, bez závislostí).
 * Budovy jsou prostorové domečky (střecha + dvě stěny) na zelené ploše;
 * klik na budovu otevře její detail s možnostmi. Volné parcely = prázdné
 * pozemky, které naznačují růst města (další budovy = jen data).
 */

import { buildingsForCity } from "../../data/buildings.js";
import { getLevel } from "../systems/buildingSystem.js";
import { openBuilding } from "./buildingView.js";
import { openStoryBuilding } from "./storyBuildingView.js";
import { getActiveArea } from "../systems/battleSystem.js";
import { getState, commit } from "../core/state.js";
import { showPopup } from "./popup.js";

/** Celkový počet pozemků ve městě (zbytek nad počtem budov = volné parcely). */
const CITY_PLOTS = 6;

/**
 * Vykreslí panel města do zadaného elementu. Roster budov závisí na aktivním
 * městě (viz buildingsForCity) – Pallet má laboratoř + domy, ostatní zatím idle pětici.
 * @param {HTMLElement} root
 * @param {(msg: string) => void} [onStatus]
 */
export function renderCity(root, onStatus = () => {}) {
  const cityId = getActiveArea()?.id;
  const buildings = buildingsForCity(cityId);
  const emptyCount = Math.max(0, CITY_PLOTS - buildings.length);

  root.innerHTML = `
    <h2 class="panel-title">City</h2>
    <p class="placeholder">Click a building to open its options.</p>
    <div class="iso-city">
      ${buildings.map(buildingCell).join("")}
      ${Array.from({ length: emptyCount }, emptyCell).join("")}
    </div>
  `;

  wire(root, onStatus);
}

/** Buňka s budovou – buď obrázkový sprite, nebo CSS domeček (fallback). */
function buildingCell(def) {
  // Story budovy nemají level ani upgrade – klik vede do příběhové interakce.
  const isStory = !!def.story;
  const storyAttr = isStory ? ` data-story="${def.story}"` : "";
  const visual = def.sprite
    ? `<button class="iso-building has-sprite" data-id="${def.id}"${storyAttr} title="${def.name}">
         <img class="b-sprite" src="${def.sprite}" alt="${def.name}" draggable="false">
       </button>`
    : `<button class="iso-building iso-b-${def.id}" data-id="${def.id}"${storyAttr} title="${def.name}" style="--roof:${def.color}">
         <span class="face top"></span>
         <span class="face left"></span>
         <span class="face right"></span>
         <span class="facade awning"></span>
         <span class="facade window-l"></span>
         <span class="facade window-r"></span>
         <span class="facade door"></span>
         <span class="b-sign">${def.icon}</span>
       </button>`;

  const tag = isStory
    ? `<div class="iso-tag">${def.name}</div>`
    : `<div class="iso-tag">${def.name} · <span class="lvl-inline">Lv ${getLevel(def.id)}</span></div>`;

  return `
    <div class="iso-cell">
      ${visual}
      ${tag}
    </div>
  `;
}

/** Buňka s volnou parcelou. */
function emptyCell() {
  return `
    <div class="iso-cell">
      <div class="iso-plot" title="Empty lot — more buildings coming">
        <span class="plot-hint">🏗️</span>
      </div>
      <div class="iso-tag muted">Empty lot</div>
    </div>
  `;
}

function wire(root, onStatus) {
  root.querySelectorAll(".iso-building").forEach((tile) =>
    tile.addEventListener("click", () => {
      // Oak's Parcel: první klik na Poké Mart ve Viridianu → clerk poprosí o
      // doručení balíčku Oakovi; OK potvrdí quest (oakParcelGiven), pak se Mart
      // otevře normálně. Věrné kánonu (balíček dostaneš právě tady).
      if (tile.dataset.id === "poke-mart" && tryOfferParcel(onStatus)) return;
      // Story budova → příběhová interakce; jinak klasický upgrade detail.
      if (tile.dataset.story) openStoryBuilding(tile.dataset.story, onStatus);
      else openBuilding(tile.dataset.id, onStatus);
    })
  );
}

/**
 * Nabídne Oak's Parcel v Poké Martu ve Viridianu (jen když je quest ještě
 * nespuštěný). Vrátí true, když převzal řízení (ukázal popup) – volající pak
 * NEotevírá běžný detail Martu; ten se otevře až po potvrzení questu.
 * @param {(msg: string) => void} onStatus
 * @returns {boolean}
 */
function tryOfferParcel(onStatus) {
  const cityId = getActiveArea()?.id;
  if (cityId !== "viridian-city") return false;
  const story = getState().story ?? {};
  if (story.oakParcelDelivered || story.oakParcelGiven) return false;

  showPopup({
    title: "🏪 Poké Mart",
    body: `<p class="story-text">The clerk waves you over the moment you walk in.</p>
      <p class="story-text">"Perfect timing! I have a <strong>parcel</strong> here that belongs to <strong>Professor Oak</strong> in Pallet Town. Could you take it back to him for me? I'd really appreciate it!"</p>
      <p class="story-text">You take <strong>Oak's Parcel</strong>. Better bring it to the Professor in Pallet Town.</p>`,
    okLabel: "Take Oak's Parcel",
    onOk: () => {
      const s = getState();
      if (!s.story) s.story = {};
      s.story.oakParcelGiven = true;
      commit();
      onStatus("📦 Received Oak's Parcel — deliver it to Professor Oak in Pallet Town.");
    },
  });
  return true;
}
