/**
 * UI: krátká scéna příchodu legendárního Pokémona (vyskakovací okno před soubojem).
 *
 * Přehraje se VŽDY celá (i při shiny huntu) – rozhodnutí autora 2026-10-29. Souboj
 * začne až potvrzením tlačítka (to jde kliknout kdykoli = přeskočení scény); křížek /
 * Esc / klik mimo okno souboj nezačne. Scéna je čisté CSS (css/main.css → „Scény
 * legendárních"): pozadí, efekty a sprite druhu s animací příchodu, bez nových obrázků.
 *
 * Nová legenda = nový řádek v SCENES (klíč = `scene` z dat legendy, jinak speciesId).
 * Text scény je dialog → bez emoji (CLAUDE.md).
 */

import { showPopup } from "./popup.js";
import { spriteUrl } from "./sprites.js";
import { playCry } from "../systems/audioSystem.js";

/** Kdy se legenda objeví (ms od otevření okna) – sedí na `--lp-delay` v CSS. */
const REVEAL_MS = 1100;

/**
 * Scény: `bg` = třída pozadí, `fx` = efekty (částice i jednorázové), `enter` = animace
 * příchodu spritu, `text` = vyprávění pod scénou.
 * Částice: snow, embers, rain, leaves, bubbles, feathers, sparks, sparkle.
 * Jednorázové: flash, lightning, flicker, glow, aura, eyes, mist, ripple, waves, splash,
 * rainbow, timewarp, shake, truck.
 */
const SCENES = {
  articuno: {
    bg: "ice", fx: ["snow", "sparkle"], enter: "swoop-left",
    text: "A freezing wind howls through the cave. Snow swirls, and out of the blizzard glides Articuno, its wings glittering with frost.",
  },
  zapdos: {
    bg: "plant", fx: ["flicker", "lightning", "flash", "sparks"], enter: "drop-top",
    text: "The Power Plant's lights flicker and die. A crack of thunder splits the dark, and Zapdos crashes down in a storm of sparks.",
  },
  moltres: {
    bg: "lava", fx: ["glow", "embers"], enter: "fly-right",
    text: "The rocks begin to glow red-hot. A trail of fire streaks across the cavern as Moltres sweeps in on blazing wings.",
  },
  mewtwo: {
    bg: "void", fx: ["eyes", "aura", "shake"], enter: "rise",
    text: "Deep in the cave, two eyes open in the darkness. The air hums with psychic power, and Mewtwo rises to face you.",
  },
  suicune: {
    bg: "mist", fx: ["mist", "ripple"], enter: "leap-left",
    text: "A cool mist drifts over the charred floor. With a single graceful leap, Suicune lands before you, its mane rippling like water.",
  },
  raikou: {
    bg: "storm", fx: ["rain", "lightning", "flash"], enter: "dash-right",
    text: "Rain lashes the route. Lightning strikes the ground, and in the flash Raikou is standing there, crackling with electricity.",
  },
  entei: {
    bg: "volcano", fx: ["embers", "glow", "shake"], enter: "burst-up",
    text: "The ground trembles and flames burst from the earth. Out of the blaze strides Entei with a volcanic roar.",
  },
  lugia: {
    bg: "sea", fx: ["waves", "bubbles", "splash"], enter: "emerge",
    text: "The whirlpools fall still. The sea swells, and from the depths rises Lugia, silver wings shedding seawater.",
  },
  "ho-oh": {
    bg: "sky", fx: ["rainbow", "feathers"], enter: "descend",
    text: "The clouds part and a rainbow arcs across the sky. On wings of sacred fire, Ho-Oh descends out of its light.",
  },
  celebi: {
    bg: "forest", fx: ["leaves", "timewarp"], enter: "fade-spin",
    text: "Leaves spiral up against the wind and the air shimmers. From a ripple in time, Celebi drifts out of the green light.",
  },
  "red-gyarados": {
    bg: "lake", fx: ["waves", "splash", "shake"], enter: "burst-water",
    text: "The Lake of Rage churns and boils. With a furious roar, a crimson Gyarados bursts from the water!",
  },
  mew: {
    bg: "dock", fx: ["truck", "sparkle"], enter: "pop-out",
    text: "You put your shoulder to the truck and heave. It grinds aside, and something small and pink floats up from beneath it, giggling.",
  },
};

/** Počet částic podle druhu (víc = hustší efekt). */
const PARTICLES = { snow: 26, embers: 22, rain: 34, leaves: 16, bubbles: 14, feathers: 12, sparks: 14, sparkle: 12 };

/** Deterministický pseudonáhodný generátor – stejná scéna vypadá pokaždé stejně. */
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

function particlesHtml(kind) {
  const R = rng(kind.length * 7919);
  let out = "";
  for (let i = 0; i < PARTICLES[kind]; i++) {
    const x = Math.round(R() * 100), y = Math.round(10 + R() * 70), dl = (R() * 2.4).toFixed(2), du = (1.6 + R() * 2.2).toFixed(2), sz = (0.6 + R() * 0.8).toFixed(2);
    out += `<i class="lp lp-${kind}" style="--x:${x}%;--y:${y}%;--dl:${dl}s;--du:${du}s;--sz:${sz}"></i>`;
  }
  return out;
}

function fxHtml(fx) {
  return fx.map((f) => (PARTICLES[f] ? particlesHtml(f) : f === "shake" ? "" : f === "eyes" ? `<div class="lpx lpx-eyes"><i></i><i></i></div>`
    : f === "truck" ? `<div class="lpx lpx-truck"><i class="cab"></i><i class="box"></i><i class="w1"></i><i class="w2"></i></div>`
    : `<div class="lpx lpx-${f}"></div>`)).join("");
}

/**
 * Otevře okno se scénou příchodu legendy. Souboj spustí až `onStart` (tlačítko).
 * @param {object} opts
 * @param {string} opts.speciesId   druh (sprite + cry)
 * @param {string} [opts.scene]     klíč scény (default = speciesId)
 * @param {string} opts.name        zobrazené jméno (nadpis okna)
 * @param {boolean} [opts.shiny]    ukázat shiny sprite (vynucené shiny, Red Gyarados)
 * @param {string} opts.button      popisek tlačítka (spustí souboj)
 * @param {() => void} opts.onStart spuštění souboje
 */
export function playLegendaryScene({ speciesId, scene, name, shiny = false, button, onStart }) {
  const sc = SCENES[scene ?? speciesId];
  if (!sc) { onStart(); return; } // legenda bez scény → rovnou souboj
  const view = shiny ? "shiny-front" : "front";
  const png = spriteUrl(speciesId, view, "png");
  showPopup({
    title: name,
    body: `<div class="leg-scene lp-bg-${sc.bg}${sc.fx.includes("shake") ? " lp-shake" : ""}" aria-hidden="true">
        ${fxHtml(sc.fx)}
        <div class="lp-mon lp-enter-${sc.enter}">
          <img src="${spriteUrl(speciesId, view, "gif")}" alt="" onerror="if(!this.dataset.fb){this.dataset.fb=1;this.src='${png}';}else{this.style.display='none';}">
        </div>
      </div>
      <p class="story-text">${sc.text}</p>`,
    okLabel: button,
    onOk: onStart,
  });
  setTimeout(() => { if (document.querySelector(".leg-scene")) playCry(speciesId); }, REVEAL_MS);
}

/** Klíče všech scén (dev náhled v Nastavení, src/dev/devPanel.js). */
export const LEGENDARY_SCENE_KEYS = Object.keys(SCENES);

/** DEV: přehraje scénu bez souboje (Red Gyarados = shiny gyarados). */
export function previewLegendaryScene(key) {
  const red = key === "red-gyarados";
  playLegendaryScene({ speciesId: red ? "gyarados" : key, scene: key, name: key, shiny: red, button: "Close", onStart: () => {} });
}
