/**
 * johtoSafariView.js – záložka „Safari" v johtské Safari Zone (uzel safari-zone-johto).
 *
 * Engine viz systems/johtoSafariSystem.js, data viz data/gen2/safari.js. Kantská
 * Safari má vlastní view (safariView.js) – tyhle dvě se nesdílí.
 *  • mimo výpravu: vstupné + výběr oblasti + rozmístění bloků v oblastech,
 *  • během výpravy: Safari Bally, oblast, setkání (Bait / Rock / Safari Ball / Run).
 *
 * Tab sdílí #tab-rest s ostatními, proto se živě překresluje jen dokud paně patří
 * nám (marker data-jsafari-root) – stejný vzor jako safariView.
 */

import { bus, EVENTS } from "../core/events.js";
import { getState } from "../core/state.js";
import { getSpecies } from "../../data/pokemon.js";
import { ownsSpeciesInRegion } from "../systems/team.js";
import { spriteImg } from "./sprites.js";
import { setHtmlReuseSprites } from "./domReuse.js";
import { scrollAware, saveScroll, restoreScroll } from "./scrollPreserve.js";
import {
  JOHTO_SAFARI_AREAS,
  JOHTO_SAFARI_FEE,
  JOHTO_SAFARI_BALLS,
  SAFARI_BLOCKS,
} from "../../data/gen2/safari.js";
import {
  getJohtoSafari,
  isJohtoSafariActive,
  getSafariArea,
  getLayout,
  blockSlots,
  daysSinceLayout,
  speciesAvailable,
  availableSpecies,
  changeBlock,
  startJohtoSafari,
  moveToArea,
  endJohtoSafari,
  johtoThrowBait,
  johtoThrowRock,
  johtoThrowBall,
  johtoRun,
  johtoCatchChance,
  ensureJohtoSafariTicking,
} from "../systems/johtoSafariSystem.js";

let rootRef = null;
let statusRef = () => {};
let unsub = null;
/** Oblast vybraná v lobby (kam vstoupíš / kde stavíš bloky). */
let pickedArea = null;

/** Vstupní bod z mainPanel (volá se při každém zobrazení tabu). */
export function renderJohtoSafariTab(root, onStatus = () => {}) {
  rootRef = root;
  statusRef = onStatus;
  ensureJohtoSafariTicking(); // po reloadu rozjede tik běžící výpravy
  draw();
  if (unsub) unsub();
  unsub = bus.on(
    EVENTS.STATE_CHANGED,
    scrollAware(() => {
      if (!rootRef || !rootRef.querySelector("[data-jsafari-root]")) return;
      draw();
    })
  );
}

function bar(value, max, color) {
  const w = Math.max(0, Math.min(100, (value / max) * 100));
  return `<div class="safari-bar"><div class="safari-bar-fill" style="width:${w}%;background:${color}"></div></div>`;
}

function draw() {
  const root = rootRef;
  if (!root) return;
  const saved = saveScroll(root);
  setHtmlReuseSprites(root, isJohtoSafariActive() ? activeHtml() : lobbyHtml());
  restoreScroll(root, saved);
  wire();
}

/** Seznam druhů oblasti: objevující se (jména, ✓ = chycený) a zatím skryté (??? + nápověda). */
function speciesListHtml(areaId) {
  const area = getSafariArea(areaId);
  const rows = area.species.map((sp) => {
    if (!speciesAvailable(areaId, sp)) {
      return `<li class="jsafari-sp is-locked">??? <span class="placeholder">— ${sp.hint ?? "needs the right blocks"}</span></li>`;
    }
    const name = getSpecies(sp.id)?.name ?? sp.id;
    const caught = ownsSpeciesInRegion(sp.id) ? " ✓" : "";
    return `<li class="jsafari-sp">${name}${caught}</li>`;
  });
  return `<ul class="jsafari-species">${rows.join("")}</ul>`;
}

/** Editor bloků jedné oblasti (+/−) a počítadlo dní. */
function blocksHtml(areaId) {
  const l = getLayout(areaId);
  const used = SAFARI_BLOCKS.reduce((sum, b) => sum + l[b.id], 0);
  const slots = blockSlots();
  const days = daysSinceLayout(areaId);
  const cells = SAFARI_BLOCKS.map(
    (b) => `<div class="jsafari-block">
        <span class="jsafari-block-name">${b.icon} ${b.name}</span>
        <button class="btn btn-sm" data-block="${b.id}" data-delta="-1" ${l[b.id] > 0 ? "" : "disabled"}>−</button>
        <strong>${l[b.id]}</strong>
        <button class="btn btn-sm" data-block="${b.id}" data-delta="1" ${used < slots ? "" : "disabled"}>+</button>
      </div>`
  ).join("");
  const since = used ? `${days} day${days === 1 ? "" : "s"} since you last moved blocks here` : "no blocks placed yet";
  return `
    <div class="jsafari-blocks">${cells}</div>
    <p class="placeholder">Blocks used: <strong>${used} / ${slots}</strong> · ${since}. Moving a block restarts the count — new Pokémon need time to settle in (1 Safari day = 1 hour).</p>`;
}

/* ------------------------------- Lobby ----------------------------------- */

function lobbyHtml() {
  const js = getJohtoSafari();
  if (!getSafariArea(pickedArea)) pickedArea = js.areaId;
  const gold = getState().resources?.gold ?? 0;
  const canAfford = gold >= JOHTO_SAFARI_FEE;
  const area = getSafariArea(pickedArea);
  const tabs = JOHTO_SAFARI_AREAS.map(
    (a) => `<button class="btn btn-sm ${a.id === pickedArea ? "is-active" : ""}" data-pick="${a.id}">${a.name}</button>`
  ).join("");
  const intro = js.visits
    ? `<p class="story-text">The gate attendant smiles. "Welcome back! Your blocks are just where you left them."</p>`
    : `<p class="story-text">"Welcome to the <strong>Safari Zone</strong>! Arrange the areas any way you like — Pokémon come to the places they love."</p>`;

  return `
    <div data-jsafari-root="1">
      <h2 class="panel-title">🦒 Safari Zone</h2>
      ${intro}
      <ul class="safari-rules">
        <li>Pay <strong>${JOHTO_SAFARI_FEE}₽</strong> → get <strong>${JOHTO_SAFARI_BALLS} Safari Balls</strong>. No step limit — you stay until your Balls run out.</li>
        <li>No battling. Use <strong>Bait</strong> (calms, harder to catch) or a <strong>Rock</strong> (easier to catch, more likely to flee).</li>
        <li>Place <strong>blocks</strong> (grass, trees, rocks, water) in each area. The right mix — and a few days of patience — brings rarer Pokémon.</li>
        <li>Every 2 visits give you room for one more block per area (up to 6).</li>
      </ul>
      <div class="jsafari-areas">${tabs}</div>
      <h3 class="jsafari-area-title">${area.name} <span class="placeholder">${area.desc}</span></h3>
      ${blocksHtml(area.id)}
      ${speciesListHtml(area.id)}
      <p class="placeholder">You have <strong>${gold}₽</strong>.</p>
      <button class="btn ${canAfford ? "" : "btn-disabled"}" data-enter ${canAfford ? "" : "disabled"}>
        🚪 Enter the ${area.name} (${JOHTO_SAFARI_FEE}₽)
      </button>
      ${canAfford ? "" : `<p class="placeholder">You can't afford the entrance fee yet.</p>`}
    </div>`;
}

/* ------------------------------- Výprava --------------------------------- */

function activeHtml() {
  const js = getJohtoSafari();
  const area = getSafariArea(js.areaId);
  const hud = `
    <div class="safari-hud">
      <div class="safari-stat"><span>🟢 Safari Balls</span><strong>${js.balls} / ${JOHTO_SAFARI_BALLS}</strong>${bar(js.balls, JOHTO_SAFARI_BALLS, "#8bc34a")}</div>
      <div class="safari-stat"><span>🗺️ Area</span><strong>${area.name}</strong></div>
    </div>`;

  if (js.encounter) {
    const name = getSpecies(js.encounter.speciesId)?.name ?? js.encounter.speciesId;
    const chance = Math.round(johtoCatchChance() * 100);
    return `
      <div data-jsafari-root="1">
        <h2 class="panel-title">🦒 Safari Zone</h2>
        ${hud}
        <div class="safari-encounter">
          <div class="safari-scene">
            ${spriteImg(js.encounter.speciesId, { animated: true, alt: name, extraClass: "safari-mon", dataKey: `jsafari:${js.encounter.speciesId}` })}
            <div class="safari-enc-info">
              <div class="safari-enc-name">${name}</div>
              <div class="safari-enc-lv">Lv ${js.encounter.level}</div>
            </div>
          </div>
          <p class="story-text">A wild <strong>${name}</strong> appeared! It looks wary…</p>
          <div class="move-grid safari-move-grid">
            <button class="btn move-btn move-typed" data-ball style="--tc:#4caf50" ${js.balls > 0 ? "" : "disabled"}>
              <span class="move-name">🟢 Safari Ball</span>
              <span class="move-sub">~${chance}% · ${js.balls} left</span>
            </button>
            <button class="btn move-btn move-typed" data-bait style="--tc:#8bc34a">
              <span class="move-name">🍎 Bait</span>
              <span class="move-sub">less likely to flee</span>
            </button>
            <button class="btn move-btn move-typed" data-rock style="--tc:#c9861f">
              <span class="move-name">🪨 Rock</span>
              <span class="move-sub">easier to catch · may flee</span>
            </button>
            <button class="btn move-btn move-typed" data-run style="--tc:#c05050">
              <span class="move-name">🏃 Run</span>
              <span class="move-sub">leave it alone</span>
            </button>
          </div>
        </div>
      </div>`;
  }

  const moves = JOHTO_SAFARI_AREAS.map(
    (a) => `<button class="btn btn-sm ${a.id === js.areaId ? "is-active" : ""}" data-move="${a.id}" ${a.id === js.areaId ? "disabled" : ""}>${a.name}</button>`
  ).join("");
  return `
    <div data-jsafari-root="1">
      <h2 class="panel-title">🦒 Safari Zone</h2>
      ${hud}
      <p class="story-text">${availableSpecies(area.id).length
        ? `You wait quietly in the ${area.name.toLowerCase()}, watching for movement…`
        : `The ${area.name.toLowerCase()} is silent. No Pokémon lives here yet — place the right blocks and give it time.`}</p>
      ${speciesListHtml(area.id)}
      <p class="placeholder">Walk to another area:</p>
      <div class="jsafari-areas">${moves}</div>
      <div class="move-grid safari-move-grid">
        <button class="btn move-btn move-typed" data-leave style="--tc:#c05050">
          <span class="move-name">🚪 Leave</span>
          <span class="move-sub">end the visit</span>
        </button>
      </div>
    </div>`;
}

/* -------------------------------- Wiring --------------------------------- */

function act(fn) {
  const res = fn();
  if (res && (res.msg || res.reason)) statusRef(res.msg || res.reason);
  draw();
}

function wire() {
  const root = rootRef;
  if (!root) return;
  root.querySelectorAll("[data-pick]").forEach((b) =>
    b.addEventListener("click", () => {
      pickedArea = b.dataset.pick;
      draw();
    })
  );
  root.querySelectorAll("[data-block]").forEach((b) =>
    b.addEventListener("click", () => act(() => changeBlock(pickedArea, b.dataset.block, Number(b.dataset.delta))))
  );
  root.querySelector("[data-enter]")?.addEventListener("click", () => {
    const res = startJohtoSafari(pickedArea);
    statusRef(res.ok ? "You step into the Safari Zone. Good luck!" : res.reason);
    draw();
  });
  root.querySelectorAll("[data-move]").forEach((b) => b.addEventListener("click", () => act(() => moveToArea(b.dataset.move))));
  root.querySelector("[data-leave]")?.addEventListener("click", () => {
    endJohtoSafari("manual");
    statusRef("You left the Safari Zone.");
    draw();
  });
  root.querySelector("[data-bait]")?.addEventListener("click", () => act(johtoThrowBait));
  root.querySelector("[data-rock]")?.addEventListener("click", () => act(johtoThrowRock));
  root.querySelector("[data-ball]")?.addEventListener("click", () => act(johtoThrowBall));
  root.querySelector("[data-run]")?.addEventListener("click", () => act(johtoRun));
}
