/**
 * contestView.js – záložka „Contest" (viditelná jen v oblasti national-park).
 *
 * Vykresluje Bug-Catching Contest (engine viz systems/contestSystem.js):
 *  • mimo soutěž: uvítací obrazovka s pravidly + tlačítko Vstoupit (1×/den),
 *  • během soutěže: HUD (Park Bally / zbývající brouci / nejlepší skóre) a
 *    tahové chytání – Park Ball / Skip / Leave při každém setkání.
 *
 * Tab sdílí #tab-rest s ostatními; živé překreslení na STATE_CHANGED běží jen
 * dokud paně patří nám (marker data-contest-root). Vzor: safariView.js.
 */

import { bus, EVENTS } from "../core/events.js";
import { getSpecies } from "../../data/pokemon.js";
import { spriteImg } from "./sprites.js";
import { setHtmlReuseSprites } from "./domReuse.js";
import { scrollAware, saveScroll, restoreScroll } from "./scrollPreserve.js";
import {
  getContest,
  isContestActive,
  contestAvailableToday,
  startContest,
  endContest,
  throwContestBall,
  skipBug,
  currentCatchChance,
  CONTEST_BALLS,
  CONTEST_ENCOUNTERS,
} from "../systems/contestSystem.js";

let rootRef = null;
let statusRef = () => {};
let unsub = null;

/** Vstupní bod z mainPanel (volá se při každém zobrazení tabu). */
export function renderContestTab(root, onStatus = () => {}) {
  rootRef = root;
  statusRef = onStatus;
  draw();
  if (unsub) unsub();
  unsub = bus.on(
    EVENTS.STATE_CHANGED,
    scrollAware(() => {
      if (!rootRef || !rootRef.querySelector("[data-contest-root]")) return; // paně převzal jiný tab
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
  setHtmlReuseSprites(root, isContestActive() ? activeHtml() : lobbyHtml());
  restoreScroll(root, _savedScroll);
  wire();
}

/* ------------------------------- Lobby ----------------------------------- */

function lobbyHtml() {
  const available = contestAvailableToday();
  return `
    <div data-contest-root="1">
      <h2 class="panel-title">🦗 Bug-Catching Contest</h2>
      <p class="story-text">National Park hosts the famous <strong>Bug-Catching Contest</strong>. Catch the finest Bug Pokémon you can — only your <strong>best catch</strong> is judged!</p>
      <ul class="safari-rules">
        <li>You get <strong>${CONTEST_BALLS} Park Balls</strong> and meet up to <strong>${CONTEST_ENCOUNTERS} bugs</strong>.</li>
        <li>No battling — just throw a <strong>Park Ball</strong>, or <strong>skip</strong> a bug hoping for a rarer one.</li>
        <li>Rarer bugs and higher levels score more. The judges rank your <strong>single best catch</strong>.</li>
        <li>Prizes: 1st → <strong>Sun Stone</strong>, 2nd → <strong>Everstone</strong>, 3rd → gold.</li>
        <li>You keep your <strong>best-caught bug</strong>. One contest per day.</li>
      </ul>
      ${
        available
          ? `<button class="btn" data-enter>🦗 Enter today's contest</button>`
          : `<p class="placeholder">✓ You've already entered today's contest. Come back tomorrow!</p>`
      }
    </div>`;
}

/* ------------------------------- Soutěž ---------------------------------- */

function activeHtml() {
  const c = getContest();
  const bestLine = c.best
    ? `${getSpecies(c.best.speciesId)?.name ?? c.best.speciesId} · score ${c.best.score}`
    : "— none yet —";
  const hud = `
    <div class="safari-hud">
      <div class="safari-stat"><span>🟢 Park Balls</span><strong>${c.balls} / ${CONTEST_BALLS}</strong>${bar(c.balls, CONTEST_BALLS, "#8bc34a")}</div>
      <div class="safari-stat"><span>🐛 Bugs left</span><strong>${c.encountersLeft}</strong>${bar(c.encountersLeft, CONTEST_ENCOUNTERS, "#4caf50")}</div>
      <div class="safari-stat"><span>🏅 Best catch</span><strong>${bestLine}</strong></div>
    </div>`;

  if (c.encounter) {
    const name = getSpecies(c.encounter.speciesId)?.name ?? c.encounter.speciesId;
    const chance = Math.round(currentCatchChance() * 100);
    return `
      <div data-contest-root="1">
        <h2 class="panel-title">🦗 Bug-Catching Contest</h2>
        ${hud}
        <div class="safari-encounter">
          <div class="safari-scene">
            ${spriteImg(c.encounter.speciesId, { animated: true, alt: name, extraClass: "safari-mon", dataKey: `contest:${c.encounter.speciesId}` })}
            <div class="safari-enc-info">
              <div class="safari-enc-name">${name}</div>
              <div class="safari-enc-lv">Lv ${c.encounter.level}</div>
            </div>
          </div>
          <p class="story-text">A wild <strong>${name}</strong> skitters through the grass!</p>
          <div class="move-grid safari-move-grid">
            <button class="btn move-btn move-typed" data-ball style="--tc:#4caf50" ${c.balls > 0 ? "" : "disabled"}>
              <span class="move-name">🟢 Park Ball</span>
              <span class="move-sub">~${chance}% · ${c.balls} left</span>
            </button>
            <button class="btn move-btn move-typed" data-skip style="--tc:#c9861f">
              <span class="move-name">⏭️ Skip</span>
              <span class="move-sub">move on to another bug</span>
            </button>
            <button class="btn move-btn move-typed" data-leave style="--tc:#c05050">
              <span class="move-name">🚪 Leave</span>
              <span class="move-sub">end the contest now</span>
            </button>
          </div>
        </div>
      </div>`;
  }

  return `
    <div data-contest-root="1">
      <h2 class="panel-title">🦗 Bug-Catching Contest</h2>
      ${hud}
      <p class="story-text">You scan the grass for the next bug…</p>
      <div class="move-grid safari-move-grid">
        <button class="btn move-btn move-typed" data-leave style="--tc:#c05050">
          <span class="move-name">🚪 Leave</span>
          <span class="move-sub">end the contest now</span>
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
    const res = startContest();
    statusRef(res.ok ? "The contest begins — catch the best bug you can!" : res.reason);
    draw();
  });
  root.querySelector("[data-leave]")?.addEventListener("click", () => {
    endContest("leave");
    draw();
  });
  root.querySelector("[data-ball]")?.addEventListener("click", () => act(throwContestBall));
  root.querySelector("[data-skip]")?.addEventListener("click", () => act(skipBug));
}
