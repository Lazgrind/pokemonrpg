/**
 * gymChallengeView.js – „gym challenge" minihry (puzzle PŘED soubojem s gym trenéry).
 *
 * Věrné kánonu: některé gymy Kanta mají hádanku, kterou hráč musí vyřešit, než ho
 * pustí k trenérům a leaderovi. Tady je řešíme jako interaktivní modal (klikací UI),
 * ne jen flavour popup. Splnění se uloží do jednorázového `state.story.<flag>`; dokud
 * není splněno, gymView zamkne souboje a nabídne tlačítko „Start Challenge".
 *
 * Framework je datově řízený (CHALLENGES registr) – další gymy (Saffron teleport
 * dlaždice, Fuchsia neviditelné zdi) se přidají jako nová položka + `build` funkce.
 * ŽÁDNÉ nové assety: vše je klikací DOM + CSS + emoji.
 */

import { getState, commit } from "../core/state.js";

/**
 * @typedef {Object} GymChallenge
 * @property {string} flag   story flag, který se nastaví po splnění
 * @property {string} title  nadpis modalu
 * @property {(ctx: BuildCtx) => void} build  postaví interaktivní obsah do ctx.body
 */

/**
 * @typedef {Object} BuildCtx
 * @property {HTMLElement} body    kontejner pro obsah miniher
 * @property {() => void} succeed  zavolej při vyřešení – nastaví flag, uloží, zavře, onComplete
 * @property {() => void} close    zavře modal bez splnění (bail out)
 */

/** Registr challenge miniher po gymech. */
const CHALLENGES = {
  "vermilion-gym": {
    flag: "vermilionGymSwitches", // (přepoužit původní flavour-flag: teď = „hádanka splněna")
    title: "🗑️ Lt. Surge's Gym",
    build: buildTrashCans,
  },
  "fuchsia-gym": {
    flag: "fuchsiaGymWalls", // (přepoužit původní flavour-flag)
    title: "🥷 Koga's Gym",
    build: buildInvisibleWalls,
  },
  "saffron-gym": {
    flag: "saffronGymIntro", // (přepoužit původní flavour-flag)
    title: "🔮 Sabrina's Gym",
    build: buildTeleportPads,
  },
};

/** Má daný gym definovanou challenge minihru? */
export function hasGymChallenge(gymId) {
  return !!CHALLENGES[gymId];
}

/** Je challenge daného gymu už splněná (nastavený story flag)? */
export function isGymChallengeDone(gymId) {
  const ch = CHALLENGES[gymId];
  if (!ch) return true; // gym bez challenge = „splněno" (nic neblokuje)
  return !!getState().story?.[ch.flag];
}

/**
 * Otevře modal s minihrou daného gymu. Po vyřešení nastaví story flag, uloží
 * (commit) a zavolá onComplete (typicky překreslení gym tabu / spuštění souboje).
 * @param {string} gymId
 * @param {{ onComplete?: () => void }} [opts]
 */
export function startGymChallenge(gymId, { onComplete = () => {} } = {}) {
  const ch = CHALLENGES[gymId];
  if (!ch) { onComplete(); return; }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay gym-challenge-overlay";
  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  const succeed = () => {
    const st = getState();
    if (!st.story) st.story = {};
    st.story[ch.flag] = true;
    commit();
    close();
    onComplete();
  };

  overlay.innerHTML = `
    <div class="modal gym-challenge">
      <button class="modal-close" data-close aria-label="Close">✕</button>
      <h2 class="panel-title">${ch.title}</h2>
      <div class="gym-challenge-body"></div>
    </div>`;

  overlay.querySelector("[data-close]")?.addEventListener("click", close);

  const body = overlay.querySelector(".gym-challenge-body");
  ch.build({ body, succeed, close });
}

/* --------------------------------------------------------------------------
 * Minihra: Vermilion / Lt. Surge – odpadkové koše (trash can switches)
 *
 * Kánonicky jsou v gymu dva skryté vypínače v odpadkových koších. Najdeš první,
 * pak MUSÍŠ najít druhý v koši SOUSEDÍCÍM s prvním. Špatný druhý tip → elektrický
 * zámek se resetuje a oba vypínače se znovu zamíchají (klasická frustrace originálu).
 * ------------------------------------------------------------------------ */

const CAN_COLS = 5;
const CAN_ROWS = 3;
const CAN_COUNT = CAN_COLS * CAN_ROWS;

/** Sousední indexy (nahoru/dolů/vlevo/vpravo) v mřížce CAN_COLS × CAN_ROWS. */
function canNeighbors(idx) {
  const r = Math.floor(idx / CAN_COLS);
  const c = idx % CAN_COLS;
  const out = [];
  if (r > 0) out.push(idx - CAN_COLS);
  if (r < CAN_ROWS - 1) out.push(idx + CAN_COLS);
  if (c > 0) out.push(idx - 1);
  if (c < CAN_COLS - 1) out.push(idx + 1);
  return out;
}

function buildTrashCans({ body, succeed }) {
  let firstIdx = 0;
  let secondIdx = 0;
  let phase = "findFirst"; // "findFirst" | "findSecond" | "won"
  let resets = 0;

  // Rozmístí vypínače: první náhodně, druhý do náhodného sousedního koše.
  const rollPositions = () => {
    firstIdx = Math.floor(Math.random() * CAN_COUNT);
    const nb = canNeighbors(firstIdx);
    secondIdx = nb[Math.floor(Math.random() * nb.length)];
    phase = "findFirst";
  };
  rollPositions();

  body.innerHTML = `
    <p class="story-text">The path to Lt. Surge is sealed by an electric door. Two hidden switches are buried in the Gym's <strong>trash cans</strong>.</p>
    <p class="story-text">Rummage through the bins to find the <strong>first switch</strong>. The <strong>second</strong> is always in a can right <strong>next to it</strong> — a wrong guess resets the lock!</p>
    <div class="gc-message" data-msg>Search the cans…</div>
    <div class="gc-cans" data-cans></div>
    <p class="placeholder"><span data-resets>0</span> lock resets</p>`;

  const cansEl = body.querySelector("[data-cans]");
  const msgEl = body.querySelector("[data-msg]");
  const resetsEl = body.querySelector("[data-resets]");

  const draw = () => {
    cansEl.innerHTML = Array.from({ length: CAN_COUNT }, (_, i) => {
      const isFirstFound = phase !== "findFirst" && i === firstIdx;
      const cls = isFirstFound ? "gc-can on" : "gc-can";
      const glyph = isFirstFound ? "🔛" : "🗑️";
      return `<button class="${cls}" data-idx="${i}">${glyph}</button>`;
    }).join("");
  };

  const onPick = (i) => {
    if (phase === "won") return;
    if (phase === "findFirst") {
      if (i === firstIdx) {
        phase = "findSecond";
        msgEl.textContent = "Click! There's a switch under here! The second one must be in an adjacent can…";
        draw();
      } else {
        msgEl.textContent = "…just trash. Keep looking.";
      }
      return;
    }
    // phase === "findSecond"
    if (i === firstIdx) {
      msgEl.textContent = "That's the switch you already flipped. Try a can next to it.";
      return;
    }
    if (i === secondIdx) {
      phase = "won";
      msgEl.innerHTML = `<strong>Clunk!</strong> Both switches are on — the electric door slides open!`;
      // Grid vypnout, ať se výherní panel neroztlačí do jednoho sloupce vlevo.
      cansEl.classList.add("gc-cans--won");
      cansEl.innerHTML = `
        <div class="gc-win">
          <p class="story-text">Lt. Surge, the Lightning American, is waiting inside.</p>
          <p class="placeholder">Electric-types are weak to Ground.</p>
          <button class="btn gc-enter" data-enter>Enter the Gym ⚡</button>
        </div>`;
      cansEl.querySelector("[data-enter]")?.addEventListener("click", succeed);
      return;
    }
    // Špatný druhý koš → reset zámku (nové rozmístění).
    resets += 1;
    resetsEl.textContent = String(resets);
    rollPositions();
    msgEl.textContent = "Bzzt! Wrong can — the lock resets. Both switches are hidden again. Start over.";
    draw();
  };

  cansEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-idx]");
    if (!btn) return;
    onPick(Number(btn.dataset.idx));
  });

  draw();
}

/* --------------------------------------------------------------------------
 * Minihra: Saffron / Sabrina – teleportační dlaždice (warp pads)
 *
 * Sabrinin gym je bludiště warp dlaždic. Existuje jedna správná posloupnost padů
 * vedoucí k Sabrině; špatný pad tě teleportuje zpět na vstup. Na rozdíl od
 * Vermilionu se cesta během minihry NEMÍCHÁ – je pevná, takže se ji hráč naučí
 * zapamatováním (deduktivní paměťové puzzle, férově vyřešitelné).
 * ------------------------------------------------------------------------ */

const PAD_COLS = 3;
const PAD_COUNT = 9;
const PAD_PATH_LEN = 4;

function buildTeleportPads({ body, succeed }) {
  // Pevná (během minihry neměnná) správná posloupnost různých padů.
  const path = [];
  while (path.length < PAD_PATH_LEN) {
    const p = Math.floor(Math.random() * PAD_COUNT);
    if (!path.includes(p)) path.push(p);
  }
  let progress = 0; // kolik padů posloupnosti hráč zatím správně sešlápl
  let warps = 0; // kolik špatných teleportů zpět na vstup

  body.innerHTML = `
    <p class="story-text">Sabrina's Gym is a maze of <strong>teleport pads</strong>. Only one sequence of pads leads to her chamber.</p>
    <p class="story-text">Step on the pads in the <strong>right order</strong>. A wrong pad warps you straight back to the entrance — but the maze never changes, so remember your route!</p>
    <div class="gc-message" data-msg>Step onto a pad…</div>
    <div class="gc-cans gc-cols-3" data-cans></div>
    <p class="placeholder">Sequence: <span data-prog>0</span> / ${PAD_PATH_LEN} · <span data-warps>0</span> warps back</p>`;

  const padsEl = body.querySelector("[data-cans]");
  const msgEl = body.querySelector("[data-msg]");
  const progEl = body.querySelector("[data-prog]");
  const warpsEl = body.querySelector("[data-warps]");

  const draw = () => {
    const lit = path.slice(0, progress);
    padsEl.innerHTML = Array.from({ length: PAD_COUNT }, (_, i) => {
      const on = lit.includes(i);
      return `<button class="gc-can${on ? " on" : ""}" data-idx="${i}">${on ? "🔷" : "🌀"}</button>`;
    }).join("");
  };

  const onPick = (i) => {
    if (progress >= PAD_PATH_LEN) return;
    if (i === path[progress]) {
      progress += 1;
      progEl.textContent = String(progress);
      if (progress >= PAD_PATH_LEN) {
        msgEl.innerHTML = `<strong>Warp!</strong> The final pad blinks you into Sabrina's chamber.`;
        padsEl.classList.add("gc-cans--won");
        padsEl.innerHTML = `
          <div class="gc-win">
            <p class="story-text">Sabrina sits at the center, eyes closed. "I knew you would come. I saw it long ago."</p>
            <p class="placeholder">Psychic-types are weak to Bug, Ghost and Dark.</p>
            <button class="btn gc-enter" data-enter>Enter the Gym 🔮</button>
          </div>`;
        padsEl.querySelector("[data-enter]")?.addEventListener("click", succeed);
        return;
      }
      msgEl.textContent = "The pad hums — you warp deeper into the maze…";
      draw();
      return;
    }
    // Špatný pad → teleport zpět na vstup (reset posloupnosti).
    warps += 1;
    progress = 0;
    warpsEl.textContent = String(warps);
    progEl.textContent = "0";
    msgEl.textContent = "Fzzt! That pad warps you back to the entrance. Try to recall the route.";
    draw();
  };

  padsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-idx]");
    if (!btn) return;
    onPick(Number(btn.dataset.idx));
  });

  draw();
}

/* --------------------------------------------------------------------------
 * Minihra: Fuchsia / Koga – neviditelné zdi (invisible-wall maze)
 *
 * Kogův gym je bludiště neviditelných stěn. Hráč se hmatem prodírá z dolního
 * vchodu nahoru ke Kogovi. Bludiště je pevné a řešitelné; nárazem do skryté zdi
 * se stěna odhalí (🧱), takže se hráč férově „nahmatá" k cestě.
 * ------------------------------------------------------------------------ */

const MAZE_COLS = 5;
const MAZE_ROWS = 5;
const MAZE_COUNT = MAZE_COLS * MAZE_ROWS;
const MAZE_START = 22; // dolní řada, prostřední sloupec (vchod)
const MAZE_GOAL = 2; // horní řada, prostřední sloupec (Koga)
// Pevné rozmístění neviditelných zdí – ponechává klikatou průchozí cestu
// 22→21→20→15→10→11→12→7→2 (ověřeno, bludiště je řešitelné).
const MAZE_WALLS = new Set([5, 6, 8, 13, 16, 17, 18]);

/** Ortogonální sousedé (nahoru/dolů/vlevo/vpravo) v mřížce MAZE_COLS × MAZE_ROWS. */
function mazeNeighbors(idx) {
  const r = Math.floor(idx / MAZE_COLS);
  const c = idx % MAZE_COLS;
  const out = [];
  if (r > 0) out.push(idx - MAZE_COLS);
  if (r < MAZE_ROWS - 1) out.push(idx + MAZE_COLS);
  if (c > 0) out.push(idx - 1);
  if (c < MAZE_COLS - 1) out.push(idx + 1);
  return out;
}

function buildInvisibleWalls({ body, succeed }) {
  let pos = MAZE_START;
  let bumps = 0;
  const revealed = new Set(); // odhalené (naražené) zdi

  body.innerHTML = `
    <p class="story-text">Koga's floor is a maze of <strong>invisible walls</strong>. Feel your way from the entrance (bottom) up to Koga (🥷 top).</p>
    <p class="story-text">Click a <strong>highlighted adjacent tile</strong> to step. Bump into a hidden wall and it reveals itself (🧱) — so grope forward inch by inch.</p>
    <div class="gc-message" data-msg>Feel your way forward…</div>
    <div class="gc-cans gc-cols-5" data-cans></div>
    <p class="placeholder"><span data-bumps>0</span> walls bumped</p>`;

  const mazeEl = body.querySelector("[data-cans]");
  const msgEl = body.querySelector("[data-msg]");
  const bumpsEl = body.querySelector("[data-bumps]");

  const draw = () => {
    const reach = mazeNeighbors(pos);
    mazeEl.innerHTML = Array.from({ length: MAZE_COUNT }, (_, i) => {
      let cls = "gc-can";
      let glyph = "·";
      if (i === pos) {
        cls += " gc-can--me";
        glyph = "🧍";
      } else if (i === MAZE_GOAL) {
        cls += " gc-can--goal";
        glyph = "🥷";
      } else if (revealed.has(i)) {
        cls += " gc-can--wall";
        glyph = "🧱";
      } else if (reach.includes(i)) {
        cls += " gc-can--reach";
        glyph = "·";
      }
      return `<button class="${cls}" data-idx="${i}">${glyph}</button>`;
    }).join("");
  };

  const win = () => {
    msgEl.innerHTML = `<strong>The path opens!</strong> You emerge from the invisible maze face to face with Koga.`;
    mazeEl.classList.add("gc-cans--won");
    mazeEl.innerHTML = `
      <div class="gc-win">
        <p class="story-text">Koga, the poisonous ninja master, awaits in the shadows.</p>
        <p class="placeholder">Poison-types are weak to Ground and Psychic — and watch out for status effects!</p>
        <button class="btn gc-enter" data-enter>Enter the Gym 🥷</button>
      </div>`;
    mazeEl.querySelector("[data-enter]")?.addEventListener("click", succeed);
  };

  const onPick = (i) => {
    if (i === pos) return;
    if (!mazeNeighbors(pos).includes(i)) {
      msgEl.textContent = "You can only feel your way to an adjacent tile.";
      return;
    }
    if (MAZE_WALLS.has(i)) {
      revealed.add(i);
      bumps += 1;
      bumpsEl.textContent = String(bumps);
      msgEl.textContent = "Bump! An invisible wall blocks the way there.";
      draw();
      return;
    }
    pos = i;
    if (pos === MAZE_GOAL) {
      win();
      return;
    }
    msgEl.textContent = "You edge forward through the darkness…";
    draw();
  };

  mazeEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-idx]");
    if (!btn) return;
    onPick(Number(btn.dataset.idx));
  });

  draw();
}
