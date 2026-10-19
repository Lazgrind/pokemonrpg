/**
 * UI: panel Města.
 *  - Město s mapou (data/cityMaps.js, zatím celé Kanto) → mapa shora v pixel artu (cityMap.js):
 *    budovy stojí na místech jako v originálních hrách, klik otevře budovu, klik na gym záložku Gym,
 *    klik na Pokémon League záložku League (dostupná až se všemi odznaky regionu).
 *  - Město bez mapy (zatím Johto) → původní rozložení: budovy daného města na travnatém podkladu.
 * Zobrazují se JEN budovy daného města (viz buildingsForCity). Budovy jsou sprity v pixel artu
 * (tools/pixelize_buildings.py), nebo CSS domeček (fallback, když sprite chybí).
 */

import { buildingsForCity, getBuilding } from "../../data/buildings.js";
import { getCityMap } from "../../data/cityMaps.js";
import { getGymForCity } from "../../data/gyms.js";
import { getLevel } from "../systems/buildingSystem.js";
import { openBuilding } from "./buildingView.js";
import { openStoryBuilding } from "./storyBuildingView.js";
import { openMainTab, isMainTabVisible } from "./mainPanel.js";
import { getActiveArea } from "../systems/battleSystem.js";
import { getState, commit } from "../core/state.js";
import { showPopup } from "./popup.js";
import { saveScroll, restoreScroll } from "./scrollPreserve.js";
import { buildingSpriteUrl } from "../core/assets.js";
import { VERSION } from "../core/version.js";
import { mountCityMap, refreshCityMapLabels } from "./cityMap.js";

/**
 * Vykreslí panel města do zadaného elementu. Roster budov závisí na aktivním
 * městě (viz buildingsForCity) – Pallet má laboratoř + domy, ostatní služby dle města.
 * @param {HTMLElement} root
 * @param {(msg: string) => void} [onStatus]
 */
export function renderCity(root, onStatus = () => {}) {
  const area = getActiveArea();
  const cityId = area?.id;
  const map = getCityMap(cityId);
  if (map) return renderCityMap(root, area, map, onStatus);

  const buildings = buildingsForCity(cityId);
  const _savedScroll = saveScroll(root);
  root.innerHTML = `
    <h2 class="panel-title">${area?.name ?? "City"}</h2>
    <p class="placeholder">Click a building to open its options.</p>
    <div class="iso-city">
      ${buildings.map(buildingCell).join("")}
    </div>
  `;
  restoreScroll(root, _savedScroll);

  wire(root, onStatus);
}

/** Popisek budovy na mapě: název, u vylepšovatelných i úroveň. */
function mapLabel(cityId, id) {
  if (id === "gym") return getGymForCity(cityId)?.name ?? "Gym";
  if (id === "league") return "Pokémon League";
  const def = getBuilding(id);
  if (!def) return id;
  return def.story ? def.name : `${def.name} · Lv ${getLevel(def.id)}`;
}

/**
 * Mapa města shora. Panel se překresluje při každé změně stavu – mapu ale stavíme jen
 * při změně města (jinak by se zbytečně kreslila znovu a ztrácel se popisek pod myší);
 * při stejném městě se jen obnoví popisky (úrovně budov).
 */
function renderCityMap(root, area, map, onStatus) {
  const cityId = area.id, labelFor = (id) => mapLabel(cityId, id);
  const existing = root.querySelector(`.city-map[data-city="${cityId}"]`);
  if (existing) { refreshCityMapLabels(existing, labelFor); return; }
  const _savedScroll = saveScroll(root);
  root.innerHTML = `
    <h2 class="panel-title">${area.name}</h2>
    <p class="placeholder">Click a building to open it.</p>
    <div class="city-map"></div>
  `;
  restoreScroll(root, _savedScroll);
  mountCityMap(root.querySelector(".city-map"), cityId, map, {
    name: area.name,
    labelFor,
    onPick: (id) => openBuildingById(id, onStatus),
  });
}

/** Otevře budovu podle id (sdílené mapou i původním rozložením). */
function openBuildingById(id, onStatus) {
  if (id === "gym") { openMainTab("gym"); return; }
  if (id === "league") {
    if (isMainTabVisible("league")) openMainTab("league");
    else showPopup({
      title: "Pokémon League",
      body: `<p class="story-text">A guard stands at the doors. "Only trainers who have earned every Gym Badge of this region may challenge the Elite Four. Come back when your badge case is full."</p>`,
    });
    return;
  }
  // Oak's Parcel: první klik na Poké Mart ve Viridianu → clerk poprosí o
  // doručení balíčku Oakovi; OK potvrdí quest (oakParcelGiven), pak se Mart
  // otevře normálně. Věrné kánonu (balíček dostaneš právě tady).
  if (id === "poke-mart" && tryOfferParcel(onStatus)) return;
  const def = getBuilding(id);
  // Story budova → příběhová interakce; jinak klasický upgrade detail.
  if (def?.story) openStoryBuilding(def.story, onStatus);
  else openBuilding(id, onStatus);
}

/** Buňka s budovou – buď obrázkový sprite, nebo CSS domeček (fallback). */
function buildingCell(def) {
  // Story budovy nemají level ani upgrade – klik vede do příběhové interakce.
  const isStory = !!def.story;
  const visual = def.sprite
    ? `<button class="iso-building has-sprite" data-id="${def.id}" title="${def.name}">
         <img class="b-sprite" src="${buildingSpriteUrl(def)}?v=${VERSION}" alt="${def.name}" draggable="false">
       </button>`
    : `<button class="iso-building iso-b-${def.id}" data-id="${def.id}" title="${def.name}" style="--roof:${def.color}">
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

function wire(root, onStatus) {
  root.querySelectorAll(".iso-building").forEach((tile) =>
    tile.addEventListener("click", () => openBuildingById(tile.dataset.id, onStatus))
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
    title: "Poké Mart",
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
