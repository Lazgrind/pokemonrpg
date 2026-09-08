/**
 * introScene.js – krátká úvodní scéna nové hry (věrná duchu hry).
 *
 * Přeskočitelné textové okno: profesor Oak přivítá, zmínka o útěku Mew, a na
 * konci si hráč v textovém poli POJMENUJE svého rivala. Jméno se uloží do
 * `state.player.rivalName` a používá se celý playthrough (viz rivalView,
 * storyBuildingView). Po dokončení se volá `onDone` (typicky výběr startéra).
 *
 * Scéna se spouští JEN u nové hry (prázdná kolekce a ještě nezadané jméno
 * rivala) – wiring v main.js po Continue z title screenu.
 */

import { getState, commit } from "../core/state.js";
import { spriteImg } from "./sprites.js";

/** Kroky vyprávění (poslední „krok" je formulář se jménem rivala). */
const STEPS = [
  "Welcome to the world of Pokémon! I'm Professor Oak, and I've devoted my whole life to studying these wonderful creatures.",
  "This world is home to mysterious creatures called Pokémon. To some they are loyal friends, to others rivals in thrilling battles.",
  "On your journey you might even glimpse the rare Mew — but before you know it, it darts past you and vanishes into the tall grass...",
];

/** Index kroku, kde se objeví Mew (poslední kroky vyprávění). */
const MEW_STEP = STEPS.length - 1;

/** Portrét profesora Oaka (asset zatím nemusí existovat → onerror ho skryje). */
function oakPortrait() {
  return `<div class="intro-visual">
      <img class="intro-portrait" src="assets/npc/oak.png" alt="Professor Oak"
           onerror="this.style.display='none'">
    </div>`;
}

/** Mew vyskakující z Poké Ballu (sprite Mew má vlastní fallback glyf). */
function mewReveal() {
  const mew = spriteImg("mew", { view: "front", alt: "Mew", extraClass: "intro-mon" });
  return `<div class="intro-visual mew-scene">
      <img class="intro-ball" src="assets/pokeballs/master-ball.png" alt="Master Ball">
      <span class="intro-mew-pop">${mew}</span>
    </div>`;
}

/**
 * Spustí úvodní scénu. Po dokončení (nebo přeskočení + zadání jména) zavolá onDone.
 * @param {() => void} onDone
 */
export function startIntro(onDone = () => {}) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay intro-overlay";
  document.body.appendChild(overlay);

  let step = 0; // index vyprávění; === STEPS.length => formulář se jménem

  const finish = () => {
    const input = overlay.querySelector("#rival-name-input");
    const name = (input?.value ?? "").trim();
    const s = getState();
    if (!s.player) s.player = { name: "Trainer" };
    s.player.rivalName = name || "Rival"; // prázdné pole → rozumný default
    commit();
    overlay.remove();
    onDone();
  };

  const render = () => {
    const isNameStep = step >= STEPS.length;
    if (isNameStep) {
      overlay.innerHTML = `
        <div class="modal intro-modal">
          <h2 class="panel-title">🌿 The journey begins</h2>
          ${oakPortrait()}
          <p class="story-text">One more thing... This cheeky kid is your eternal rival — you've been competing since you were little. What's their name?</p>
          <input id="rival-name-input" class="text-input" type="text" maxlength="16" placeholder="Rival's name" autocomplete="off">
          <div class="intro-actions">
            <button class="btn" data-start>Begin your journey ➜</button>
          </div>
        </div>
      `;
      const input = overlay.querySelector("#rival-name-input");
      input?.focus();
      input?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") finish();
      });
      overlay.querySelector("[data-start]")?.addEventListener("click", finish);
      return;
    }

    overlay.innerHTML = `
      <div class="modal intro-modal">
        <h2 class="panel-title">🌿 Welcome!</h2>
        ${step === MEW_STEP ? mewReveal() : oakPortrait()}
        <p class="story-text">${STEPS[step]}</p>
        <div class="intro-actions">
          <button class="btn ghost" data-skip>Skip</button>
          <button class="btn" data-next>Next ➜</button>
        </div>
      </div>
    `;
    overlay.querySelector("[data-next]")?.addEventListener("click", () => {
      step += 1;
      render();
    });
    // Přeskočit = rovnou k pojmenování rivala (to se přeskočit nedá – je klíčové).
    overlay.querySelector("[data-skip]")?.addEventListener("click", () => {
      step = STEPS.length;
      render();
    });
  };

  render();
}
