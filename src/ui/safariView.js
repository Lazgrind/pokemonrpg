/**
 * safariView.js – záložka „Safari" (viditelná jen v oblasti safari-zone).
 *
 * Vykresluje Safari Zone expedici (engine viz systems/safariSystem.js):
 *  • mimo výpravu: uvítací obrazovka s pravidly + tlačítko Vstoupit (za gold),
 *  • během výpravy: HUD (kroky / Safari Balls / oblast), postup do hloubky a
 *    věrné chytání Bait / Rock / Safari Ball / Run při setkání.
 *
 * Tab sdílí #tab-rest s ostatními (PC/Pokédex…), takže živé překreslování na
 * STATE_CHANGED se provádí JEN dokud paně patří nám (marker data-safari-root).
 * Jakmile ho převezme jiný tab, handler se sám utne až do dalšího renderu.
 */

import { bus, EVENTS } from "../core/events.js";
import { getState } from "../core/state.js";
import { getSpecies } from "../../data/pokemon.js";
import { spriteImg } from "./sprites.js";
import { scrollAware, saveScroll, restoreScroll } from "./scrollPreserve.js";
import {
  getSafari,
  isSafariActive,
  startSafari,
  endSafari,
  goDeeper,
  throwBait,
  throwRock,
  throwSafariBall,
  runFromEncounter,
  currentCatchChance,
  ensureTicking,
  SAFARI_FEE,
  SAFARI_STEPS,
  SAFARI_BALLS,
  MAX_DEPTH,
} from "../systems/safariSystem.js";

let rootRef = null;
let statusRef = () => {};
let unsub = null;

/** Vstupní bod z mainPanel (volá se při každém zobrazení tabu). */
export function renderSafariTab(root, onStatus = () => {}) {
  rootRef = root;
  statusRef = onStatus;
  ensureTicking(); // pojistka: po reloadu rozjede tik běžící výpravy
  draw();
  if (unsub) unsub();
  // Živý update (kroky/Bally frčí v čase) – ale jen dokud paně patří Safari.
  unsub = bus.on(
    EVENTS.STATE_CHANGED,
    scrollAware(() => {
      if (!rootRef || !rootRef.querySelector("[data-safari-root]")) return; // paně převzal jiný tab
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
  const _savedScroll = saveScroll(root);
  root.innerHTML = isSafariActive() ? activeHtml() : lobbyHtml();
  restoreScroll(root, _savedScroll);
  wire();
}

/* ------------------------------- Lobby ----------------------------------- */

function lobbyHtml() {
  const gold = getState().resources?.gold ?? 0;
  const canAfford = gold >= SAFARI_FEE;
  const beenBefore = (getSafari().bestDepth ?? 0) > 0 || !!getState().story?.hasSurf;
  const intro = beenBefore
    ? `<p class="story-text">The gatekeeper nods. "Back for more? Same rules — ${SAFARI_STEPS} steps, ${SAFARI_BALLS} Safari Balls. Good luck out there."</p>`
    : `<p class="story-text">"Welcome to the <strong>Safari Zone</strong>! Rare Pokémon roam these grounds — but here we play fair."</p>`;

  return `
    <div data-safari-root="1">
      <h2 class="panel-title">🦓 Safari Zone</h2>
      ${intro}
      <ul class="safari-rules">
        <li>Pay <strong>${SAFARI_FEE} 💰</strong> → get <strong>${SAFARI_STEPS} steps</strong> and <strong>${SAFARI_BALLS} Safari Balls</strong>.</li>
        <li>No battling here. Use <strong>Bait</strong> (calms, harder to catch) or a <strong>Rock</strong> (easier to catch, more likely to flee).</li>
        <li>Press <strong>deeper</strong> through 4 areas — the further you go, the rarer the Pokémon.</li>
        <li>Deep inside wait the <strong>Gold Teeth</strong> (area 3) and <strong>HM03 Surf</strong> in the Secret House (area 4).</li>
        <li>Run out of steps or Balls and you're escorted out — but you keep everything you found.</li>
      </ul>
      <p class="placeholder">You have <strong>${gold} 💰</strong>.</p>
      <button class="btn ${canAfford ? "" : "btn-disabled"}" data-enter ${canAfford ? "" : "disabled"}>
        🚪 Enter the Safari Zone (${SAFARI_FEE} 💰)
      </button>
      ${canAfford ? "" : `<p class="placeholder">You can't afford the entrance fee yet.</p>`}
    </div>`;
}

/* ------------------------------- Výprava --------------------------------- */

function activeHtml() {
  const s = getSafari();
  const hud = `
    <div class="safari-hud">
      <div class="safari-stat"><span>👟 Steps</span><strong>${s.steps} / ${SAFARI_STEPS}</strong>${bar(s.steps, SAFARI_STEPS, "#4caf50")}</div>
      <div class="safari-stat"><span>🟢 Safari Balls</span><strong>${s.balls} / ${SAFARI_BALLS}</strong>${bar(s.balls, SAFARI_BALLS, "#8bc34a")}</div>
      <div class="safari-stat"><span>🗺️ Area</span><strong>${s.depth} / ${MAX_DEPTH}${s.depth >= MAX_DEPTH ? " · Secret House" : ""}</strong>${bar(s.depth, MAX_DEPTH, "#03a9f4")}</div>
    </div>`;

  if (s.encounter) {
    const name = getSpecies(s.encounter.speciesId)?.name ?? s.encounter.speciesId;
    const chance = Math.round(currentCatchChance() * 100);
    return `
      <div data-safari-root="1">
        <h2 class="panel-title">🦓 Safari Zone</h2>
        ${hud}
        <div class="safari-encounter">
          <div class="safari-scene">
            ${spriteImg(s.encounter.speciesId, { animated: true, alt: name, extraClass: "safari-mon" })}
            <div class="safari-enc-info">
              <div class="safari-enc-name">${name}</div>
              <div class="safari-enc-lv">Lv ${s.encounter.level}</div>
            </div>
          </div>
          <p class="story-text">A wild <strong>${name}</strong> appeared! It looks wary…</p>
          <div class="move-grid safari-move-grid">
            <button class="btn move-btn move-typed" data-ball style="--tc:#4caf50" ${s.balls > 0 ? "" : "disabled"}>
              <span class="move-name">🟢 Safari Ball</span>
              <span class="move-sub">~${chance}% · ${s.balls} left</span>
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
              <span class="move-sub">leave it and move on</span>
            </button>
          </div>
        </div>
      </div>`;
  }

  const deepest = s.depth >= MAX_DEPTH;
  const canDeeper = !deepest && s.steps >= 60;
  const deeperBtn = deepest
    ? `<div class="safari-secret">🏚️ Secret House — the deepest part of the reserve.</div>`
    : `<button class="btn move-btn move-typed" data-deeper style="--tc:#03a9f4" ${canDeeper ? "" : "disabled"}>
         <span class="move-name">⛰️ Press deeper</span>
         <span class="move-sub">−60 steps · rarer Pokémon</span>
       </button>`;
  return `
    <div data-safari-root="1">
      <h2 class="panel-title">🦓 Safari Zone</h2>
      ${hud}
      <p class="story-text">You wander through the tall grass, watching for movement…</p>
      <div class="move-grid safari-move-grid">
        ${deeperBtn}
        <button class="btn move-btn move-typed" data-leave style="--tc:#c05050">
          <span class="move-name">🚪 Leave</span>
          <span class="move-sub">end the expedition</span>
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
  root.querySelector("[data-enter]")?.addEventListener("click", () => {
    const res = startSafari();
    statusRef(res.ok ? "You step into the Safari Zone. Good luck!" : res.reason);
    draw();
  });
  root.querySelector("[data-leave]")?.addEventListener("click", () => {
    endSafari("manual");
    statusRef("You left the Safari Zone.");
    draw();
  });
  root.querySelector("[data-deeper]")?.addEventListener("click", () => act(goDeeper));
  root.querySelector("[data-bait]")?.addEventListener("click", () => act(throwBait));
  root.querySelector("[data-rock]")?.addEventListener("click", () => act(throwRock));
  root.querySelector("[data-ball]")?.addEventListener("click", () => act(throwSafariBall));
  root.querySelector("[data-run]")?.addEventListener("click", () => act(runFromEncounter));
}
