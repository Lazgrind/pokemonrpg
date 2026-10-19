/**
 * hatchPopup.js – animované vyskakovací okno vylíhnutí vejce „jako u evoluce".
 *
 * Sekvence: chvíli se KLÁTÍ vejce (intro), pak ZÁBLESK a ODHALENÍ vylíhnutého
 * Pokémona s jeho statistikami; teprve pak se objeví tlačítko „Great!"/„Next egg".
 *
 * Volá se centrálně z main.js na event EVENTS.EGG_HATCHED (jen ŽIVÉ líhnutí za
 * běhu hry; offline vylíhnutá vejce jdou do offline souhrnu). Když se vylíhne
 * víc vajec najednou, okna se FRONTUJÍ a hráč si je odklikává jedno po druhém.
 *
 * Klik během animace ji PŘESKOČÍ rovnou na odhalení.
 */

import { spriteImg } from "./sprites.js";
import { eggSpriteHtml } from "./eggSprite.js";
import { computeStats, STAT_KEYS, IV_MAX } from "../systems/pokemonSystem.js";
import { playCry } from "../systems/audioSystem.js";

/** Čitelné popisky statů (v pořadí STAT_KEYS). */
const STAT_LABELS = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  spAttack: "Sp. Atk",
  spDefense: "Sp. Def",
  speed: "Speed",
};

/** Délky fází (ms). */
const INTRO_MS = 1700; // jak dlouho se klátí vejce, než praskne
const FLASH_MS = 650; // délka závěrečného záblesku před odhalením tlačítka

/** Fronta payloadů (víc vajec naráz) + zda je zrovna okno otevřené. */
const queue = [];
let open = false;

/**
 * Zařadí vylíhnutí do fronty a (pokud nic neběží) spustí okno.
 * @param {{ name?: string, speciesId?: string, shiny?: boolean, level?: number,
 *           pokemon?: any, outcome?: { added?: boolean, released?: boolean, improvements?: string[] } }} payload
 */
export function showHatchPopup(payload) {
  if (!payload?.speciesId || !payload?.pokemon) return;
  queue.push(payload);
  if (!open) showNext();
}

/** Zobrazí další vejce z fronty (nebo uvolní zámek, když je prázdná). */
function showNext() {
  const payload = queue.shift();
  if (!payload) {
    open = false;
    return;
  }
  open = true;
  renderOne(payload);
}

/** Popisek statů vylíhnutého jedince (Stat · hodnota · IV). */
function statsTableHtml(pokemon) {
  const stats = computeStats(pokemon);
  const iv = pokemon.ivs ?? {};
  const rows = STAT_KEYS.map((k) => {
    const value = k === "hp" ? stats.maxHp : stats[k];
    const ivv = iv[k] ?? 0;
    return `<tr>
      <td class="hatch-stat-name">${STAT_LABELS[k]}</td>
      <td class="hatch-stat-val">${value}</td>
      <td class="hatch-stat-iv">IV ${ivv}/${IV_MAX}</td>
    </tr>`;
  }).join("");
  return `<table class="hatch-stats"><tbody>${rows}</tbody></table>`;
}

/** Řádek o osudu vylíhnutého jedince (nový druh vs. duplikát → sloučeno). */
function outcomeNoteHtml(payload) {
  const o = payload.outcome ?? {};
  if (o.added) {
    return `<p class="hatch-note hatch-note-new">New addition to your collection!</p>`;
  }
  if (o.released) {
    const imp = Array.isArray(o.improvements) ? o.improvements : [];
    const detail = imp.length
      ? `It passed on better values: <strong>${imp.join(", ")}</strong>.`
      : `No new improvements this time.`;
    return `<p class="hatch-note">You already have a ${payload.name} — this one was released. ${detail}</p>`;
  }
  return "";
}

/** Vykreslí a odanimuje JEDNO okno vylíhnutí; po zavření spustí showNext(). */
function renderOne(payload) {
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

  const shiny = payload.shiny ? " ✨" : "";
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay hatch-overlay";
  overlay.innerHTML = `
    <div class="modal popup-modal hatch-modal">
      <h2 class="panel-title">🥚 Egg hatching!</h2>
      <div class="hatch-scene">
        <div class="hatch-flash"></div>
        <div class="hatch-mon">
          <div class="hatch-slot hatch-slot-egg">${eggSpriteHtml(payload.speciesId, { size: 150 })}</div>
          <div class="hatch-slot hatch-slot-mon">${spriteImg(payload.speciesId, {
            view: "front",
            animated: true,
            shiny: !!payload.pokemon.shiny,
            gender: payload.pokemon.gender,
            alt: payload.name,
          })}</div>
        </div>
        <p class="hatch-caption story-text"></p>
      </div>
      <div class="hatch-reveal-body" hidden>
        <div class="hatch-title">${payload.name}${shiny} <span class="placeholder">· Lv ${payload.level}</span></div>
        ${statsTableHtml(payload.pokemon)}
        ${outcomeNoteHtml(payload)}
      </div>
      <div class="popup-actions">
        <button class="btn hatch-ok" data-ok hidden></button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const scene = overlay.querySelector(".hatch-scene");
  const caption = overlay.querySelector(".hatch-caption");
  const revealBody = overlay.querySelector(".hatch-reveal-body");
  const okBtn = overlay.querySelector(".hatch-ok");

  const close = () => {
    clearTimers();
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    showNext(); // další vejce z fronty (nebo uvolní zámek)
  };

  let revealed = false;
  const doReveal = () => {
    if (revealed) return;
    revealed = true;
    clearTimers();
    scene.classList.remove("is-wobble");
    scene.classList.add("is-reveal");
    caption.textContent = `${payload.name}${shiny} hatched!`;
    if (payload.speciesId) playCry(payload.speciesId); // cry až při odhalení
    // Tělo se staty + tlačítko až po záblesku, ať to má grády.
    later(() => {
      revealBody.hidden = false;
      // „Next egg", pokud ve frontě čeká další vejce, jinak „Great!".
      okBtn.textContent = queue.length > 0 ? "Next egg →" : "Great!";
      okBtn.hidden = false;
      okBtn.focus?.();
    }, FLASH_MS);
  };

  // Intro: vejce se klátí, pak praskne.
  caption.textContent = "The egg is hatching!";
  scene.classList.add("is-wobble");
  later(doReveal, INTRO_MS);

  // Ovládání: klik během animace = přeskoč na odhalení; po odhalení zavírá.
  okBtn.addEventListener("click", close);
  overlay.addEventListener("click", (ev) => {
    if (ev.target === okBtn) return;
    if (!revealed) doReveal();
    else if (ev.target === overlay) close();
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
