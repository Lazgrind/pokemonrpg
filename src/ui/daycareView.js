/**
 * UI: záložka Day Care (samostatný tab v hlavním panelu). Ukáže se JEN na
 * Route 5 (kanonické místo Day Care v Gen 1 – domek mezi Cerulean a Saffronem).
 *
 * Day Care není budova ve městě (v žádném městě není v CITY_BUILDINGS) – žije
 * jako tento tab. Veškerá logika (svěřenec + pasivní XP, líhnutí vajec, breeding,
 * upgrady) se znovupoužívá z buildingView.js přes exportovaná sub-okna, takže tu
 * jen skládáme inline přehled a napojujeme tlačítka. Def budovy „day-care" i její
 * úrovně/tracky dál žijí v data/buildings.js + buildingSystem.js.
 */

import { getBuilding } from "../../data/buildings.js";
import {
  getLevel,
  isMaxed,
  daycareXpPerMinute,
  getDaycareOccupant,
  clearDaycareOccupant,
  getBreedingSlot,
  hatchSpeedPercent,
  eggSlotCount,
} from "../systems/buildingSystem.js";
import { breedingStatus } from "../systems/breedingSystem.js";
import { incubationList } from "../systems/eggSystem.js";
import { xpForNextLevel } from "../systems/progression.js";
import { isInTeam } from "../systems/team.js";
import { getState } from "../core/state.js";
import { getSpecies } from "../../data/pokemon.js";
import {
  openDaycarePicker,
  openBreeders,
  openBreeding,
  openUpgrades,
} from "./buildingView.js";
import { saveScroll, restoreScroll } from "./scrollPreserve.js";

const DAY_CARE = "day-care";

/** Zobrazované jméno druhu daného jedince. */
function speciesName(owned) {
  return getSpecies(owned?.speciesId)?.name ?? "Pokémon";
}

/**
 * Vykreslí obsah záložky Day Care do zadaného elementu. Zrcadlí sekci „školka"
 * z detailu budovy (buildingView.openBuilding), ale inline v tabu.
 * @param {HTMLElement} root
 * @param {(msg: string) => void} onStatus
 */
export function renderDaycareTab(root, onStatus = () => {}) {
  const def = getBuilding(DAY_CARE);
  if (!def) {
    root.innerHTML = `<h2 class="panel-title">Day Care</h2><p class="placeholder">The Day Care is unavailable.</p>`;
    return;
  }

  const _savedScroll = saveScroll(root);

  const level = getLevel(DAY_CARE);
  const maxed = isMaxed(DAY_CARE);
  const rate = daycareXpPerMinute(DAY_CARE);
  const occ = getDaycareOccupant();

  const stats = [];
  const actions = [];
  let extraHtml = "";

  // Pasivní XP pro svěřence.
  stats.push(`<span>🐣 Training speed: <strong>${rate} XP/min</strong></span>`);
  if (occ) {
    stats.push(
      `<span>👶 In care: <strong>${speciesName(occ)}</strong> · Lv ${occ.level} (${occ.xp}/${xpForNextLevel(occ.level)} XP)</span>`
    );
    actions.push(`<button class="btn" data-act="daycare-remove">Pick up ${speciesName(occ)}</button>`);
  } else {
    const br = getBreedingSlot();
    const avail = getState().collection.filter(
      (p) => !isInTeam(p.uid) && p.uid !== br.a && p.uid !== br.b
    );
    if (avail.length === 0) {
      extraHtml += `<p class="placeholder" style="margin-top:8px">You have no free Pokémon (outside your team) to place in the Day Care.</p>`;
    } else {
      actions.push(
        `<button class="btn" data-act="daycare-open">🐣 Choose a Pokémon for the Day Care (${avail.length})</button>`
      );
    }
  }

  // Egg breeders (líhnutí vajec).
  if (def.tracks) {
    const hs = hatchSpeedPercent(DAY_CARE);
    const unlocked = eggSlotCount(DAY_CARE);
    const maxSlots = def.tracks.eggSlots.maxLevel;
    const used = incubationList().length;
    stats.push(`<span>⏩ Hatch speed: <strong>+${hs} %</strong></span>`);
    stats.push(`<span>🥚 Egg breeders: <strong>${used}/${unlocked}</strong> (max ${maxSlots})</span>`);
    actions.push(`<button class="btn" data-act="breeders">🥚 Hatch an egg</button>`);
  }

  // Breeding (dva rodiče se sdílenou egg group).
  const bs = breedingStatus();
  const parentCount = (bs.a ? 1 : 0) + (bs.b ? 1 : 0);
  let breedStat;
  if (bs.a && bs.b) {
    breedStat = bs.compatible
      ? `<strong>${speciesName(bs.a)} × ${speciesName(bs.b)}</strong> · ${Math.round(bs.ratio * 100)}%`
      : `<strong>${speciesName(bs.a)} × ${speciesName(bs.b)}</strong> — incompatible`;
  } else {
    breedStat = `<strong>${parentCount}/2 parents</strong>`;
  }
  stats.push(`<span>💞 Breeding: ${breedStat}</span>`);
  actions.push(`<button class="btn" data-act="breeding">💞 Breeding</button>`);

  // Upgrady (úroveň školky + tracky) za jedním oknem.
  const upgradeCount = 1 + (def.tracks ? Object.keys(def.tracks).length : 0);
  actions.push(
    `<button class="btn" data-act="upgrades">⬆️ Upgrades${upgradeCount > 1 ? ` (${upgradeCount})` : ""}</button>`
  );

  root.innerHTML = `
    <div class="building-modal-head" style="margin-bottom:10px">
      <span class="b-icon">${def.icon}</span>
      <div>
        <h2 class="panel-title" style="border:0;margin:0;padding:0">${def.name}</h2>
        <div class="building-desc">${def.description}</div>
      </div>
      <span class="lvl">Lv ${level}${maxed ? " (max)" : ""}</span>
    </div>

    <div class="building-stats">
      ${stats.join("\n      ")}
    </div>
    ${extraHtml}

    <div class="building-actions">
      ${actions.join("\n      ")}
    </div>
  `;

  const dcOpen = root.querySelector('[data-act="daycare-open"]');
  if (dcOpen) dcOpen.addEventListener("click", () => openDaycarePicker(DAY_CARE, onStatus));

  const dcRem = root.querySelector('[data-act="daycare-remove"]');
  if (dcRem)
    dcRem.addEventListener("click", () => {
      clearDaycareOccupant();
      onStatus("Pokémon picked up from the Day Care");
    });

  const breeders = root.querySelector('[data-act="breeders"]');
  if (breeders) breeders.addEventListener("click", () => openBreeders(DAY_CARE, onStatus));

  const breeding = root.querySelector('[data-act="breeding"]');
  if (breeding) breeding.addEventListener("click", () => openBreeding(DAY_CARE, onStatus));

  const upgrades = root.querySelector('[data-act="upgrades"]');
  if (upgrades) upgrades.addEventListener("click", () => openUpgrades(DAY_CARE, onStatus));

  restoreScroll(root, _savedScroll);
}
