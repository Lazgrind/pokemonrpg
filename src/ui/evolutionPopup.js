/**
 * evolutionPopup.js – animované vyskakovací okno evoluce „jako ve hrách".
 *
 * Sekvence: chvíli svítí PŮVODNÍ forma (intro), pak PROBLIKY (bílá silueta bliká
 * mezi starou a novou formou, blikání se zrychluje), ZÁBLESK a ODHALENÍ nové
 * formy; teprve pak se objeví tlačítko „Great!".
 *
 * Volá se centrálně z main.js na event EVENTS.POKEMON_EVOLVED, takže platí pro
 * VŠECHNY cesty evoluce (tlačítko v týmu/na kartě, evoluční kámen i trade v Bagu)
 * i pro tutoriál. Sprite bereme z payloadu (fromId/toId) – jedinec je v tu chvíli
 * už přepnutý na novou formu. Sprity jsou animované (GIF, fallback PNG).
 *
 * Klik během animace ji PŘESKOČÍ rovnou na odhalení.
 */

import { spriteImg } from "./sprites.js";

/** Držíme max jedno okno naráz. */
let openEvo = false;

/** Délky fází (ms). */
const INTRO_MS = 2000; // jak dlouho svítí původní forma, než začne blikat
const FLICKER_STEPS = 14; // počet probliků (silueta stará↔nová)
const FLICKER_START_MS = 260; // délka prvního probliku
const FLICKER_DECAY = 0.86; // každý další problik je kratší → zrychlování
const FLICKER_MIN_MS = 60; // nejkratší problik
const FLASH_MS = 650; // délka závěrečného záblesku před odhalením tlačítka

/**
 * Zobrazí animovanou evoluci.
 * @param {{ fromId?: string, toId?: string, fromName?: string, toName?: string }} e
 */
export function showEvolutionPopup(e) {
  if (openEvo) return;
  if (!e?.fromId || !e?.toId) return;
  openEvo = true;

  const timers = [];
  const later = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  };
  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers.length = 0;
  };

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay evo-overlay";
  overlay.innerHTML = `
    <div class="modal popup-modal evo-modal">
      <h2 class="panel-title">✨ Evolution!</h2>
      <div class="evo-scene">
        <div class="evo-flash"></div>
        <div class="evo-mon">
          <div class="evo-slot evo-slot-before">${spriteImg(e.fromId, { view: "front", animated: true, alt: e.fromName })}</div>
          <div class="evo-slot evo-slot-after">${spriteImg(e.toId, { view: "front", animated: true, alt: e.toName })}</div>
        </div>
        <p class="evo-caption story-text"></p>
      </div>
      <div class="popup-actions">
        <button class="btn evo-ok" data-ok hidden>Great!</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const scene = overlay.querySelector(".evo-scene");
  const caption = overlay.querySelector(".evo-caption");
  const okBtn = overlay.querySelector(".evo-ok");

  const close = () => {
    clearTimers();
    overlay.remove();
    openEvo = false;
    document.removeEventListener("keydown", onKey);
  };

  // ---- Fáze animace ---------------------------------------------------------
  let revealed = false;

  const doReveal = () => {
    if (revealed) return;
    revealed = true;
    clearTimers();
    scene.classList.remove("is-flicker", "show-after");
    scene.classList.add("is-reveal");
    caption.textContent = `${e.fromName} evolved into ${e.toName}!`;
    // Tlačítko až po záblesku, ať to má grády.
    later(() => {
      okBtn.hidden = false;
      okBtn.focus?.();
    }, FLASH_MS);
  };

  const runFlicker = (step, delay) => {
    if (step >= FLICKER_STEPS) {
      doReveal();
      return;
    }
    scene.classList.toggle("show-after"); // přepínej starou↔novou siluetu
    const next = Math.max(FLICKER_MIN_MS, delay * FLICKER_DECAY);
    later(() => runFlicker(step + 1, next), delay);
  };

  const startFlicker = () => {
    scene.classList.add("is-flicker");
    runFlicker(0, FLICKER_START_MS);
  };

  // Intro: svítí původní forma.
  caption.textContent = `What? ${e.fromName} is evolving!`;
  later(startFlicker, INTRO_MS);

  // ---- Ovládání -------------------------------------------------------------
  // Klik během animace = přeskoč na odhalení; po odhalení klik na Great! zavírá.
  okBtn.addEventListener("click", close);
  overlay.addEventListener("click", (ev) => {
    if (ev.target === okBtn) return; // řeší vlastní listener
    if (!revealed) {
      doReveal(); // přeskoč animaci
    } else if (ev.target === overlay) {
      close(); // klik mimo obsah po odhalení zavírá
    }
  });

  function onKey(ev) {
    if (ev.key === "Escape") {
      if (revealed) close();
      else doReveal();
    } else if (ev.key === "Enter" && revealed) {
      close();
    }
  }
  document.addEventListener("keydown", onKey);
}
