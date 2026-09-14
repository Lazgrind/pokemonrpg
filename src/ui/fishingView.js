/**
 * fishingView.js – záložka „Fishing": reakční minihra (kánon FRLG).
 *
 * Průběh: hráč nahodí prut → čeká se náhodnou dobu → objeví se „!" a hráč musí
 * stihnout kliknout v krátkém okně → úspěch spustí souboj s háknutým Pokémonem
 * (přepne se na Battle tab). Moc brzy nebo pozdě = ryba uteče.
 *
 * ODOLNOST VŮČI PŘEKRESLENÍ: mainPanel překresluje nebattle taby při každém
 * STATE_CHANGED (idle souboj commituje ~1×/s). Proto stav minihry žije v
 * modulových proměnných a časovače NEsahají přímo na DOM – jen mění stav a
 * zavolají repaint(), který překreslí aktuální fázi. renderFishingTab je tak
 * idempotentní: každé volání jen zobrazí aktuální fázi a znovu naváže kliknutí.
 */

import { canFishHere, castRod, bestRod, areaHasWater } from "../systems/fishingSystem.js";
import { hasAnyRod, ownedRods, fishingBiome } from "../systems/fishingSystem.js";
import { getItem } from "../../data/items.js";
import { currentMainTab, openMainTab } from "./mainPanel.js";

/** Fáze minihry: idle | waiting | bite | result. */
let phase = "idle";
/** Text výsledku (úspěch/neúspěch) zobrazený ve fázi "result". */
let resultMsg = "";
/** Časovač do zabrání (waiting → bite). */
let waitTimer = null;
/** Časovač promeškaného okna (bite → result). */
let missTimer = null;
/** Poslední root element tabu (pro repaint z časovače). */
let rootRef = null;
/** Poslední onStatus callback. */
let onStatusRef = () => {};
/** Prut zvolený hráčem k nahození (null = použij nejlepší vlastněný). */
let selectedRod = null;

/** Prut, který se teď nahodí: zvolený (pokud ho hráč vlastní), jinak nejlepší. */
function effectiveRod() {
  if (selectedRod && ownedRods().includes(selectedRod)) return selectedRod;
  return bestRod();
}

/** Zruší běžící časovače (bez změny fáze). */
function clearTimers() {
  if (waitTimer) clearTimeout(waitTimer);
  if (missTimer) clearTimeout(missTimer);
  waitTimer = null;
  missTimer = null;
}

/** Vrátí se do klidové fáze a zruší časovače. */
function resetFishing() {
  clearTimers();
  phase = "idle";
  resultMsg = "";
}

/** Je záložka Fishing pořád aktivní a její DOM v dokumentu? (guard pro časovače) */
function stillMounted() {
  return currentMainTab() === "fishing" && rootRef && document.contains(rootRef);
}

/** Znovu vykreslí aktuální fázi – ale jen když je tab pořád zobrazený. */
function repaint() {
  if (!stillMounted()) {
    // Hráč odešel z tabu během minihry → nech doběhnout, ale nekresli jinam.
    resetFishing();
    return;
  }
  draw(rootRef);
}

/** Zabrání: konec čekání, objeví se „!". */
function onBite() {
  waitTimer = null;
  if (!stillMounted()) return resetFishing();
  phase = "bite";
  // Okno na reakci ~800 ms; když ho hráč promešká, ryba uteče.
  missTimer = setTimeout(onMiss, 800);
  repaint();
}

/** Promeškané okno – ryba utekla. */
function onMiss() {
  missTimer = null;
  phase = "result";
  resultMsg = "Oh! It got away... You were too slow to reel it in.";
  repaint();
}

/** Nahození prutu – spustí čekání na zabrání. */
function startCast() {
  const chk = canFishHere();
  if (!chk.ok) {
    clearTimers();
    phase = "result";
    resultMsg = chk.reason || "You can't fish here.";
    repaint();
    return;
  }
  clearTimers();
  phase = "waiting";
  // Náhodná prodleva 1.2–4.0 s do zabrání.
  const delay = 1200 + Math.floor(Math.random() * 2800);
  waitTimer = setTimeout(onBite, delay);
  repaint();
}

/** Kliknutí na vodní plochu – reakce podle fáze. */
function onWaterClick() {
  if (phase === "idle" || phase === "result") {
    // Klidná hladina → klik nahodí prut (nahradilo tlačítko „Cast line").
    startCast();
    return;
  }
  if (phase === "waiting") {
    // Zabral moc brzy → splašil rybu.
    clearTimers();
    phase = "result";
    resultMsg = "You reeled in too early! The Pokémon got spooked and fled.";
    repaint();
    return;
  }
  if (phase === "bite") {
    // Úspěch! Spusť souboj se zvoleným prutem a přepni na Battle tab.
    clearTimers();
    const r = castRod(effectiveRod());
    if (r && r.ok) {
      resetFishing();
      onStatusRef("Something's on the hook!");
      openMainTab("battle");
      return;
    }
    // Selhání na straně systému (nemělo by nastat, ale ošetři).
    phase = "result";
    resultMsg = (r && r.reason) || "The line snapped...";
    repaint();
  }
}

/**
 * Vykreslí obsah tabu podle aktuální fáze.
 * @param {HTMLElement} root
 */
function draw(root) {
  const casting = phase === "waiting" || phase === "bite";

  // Fáze řídí CSS třídu scény (voda/animace) i drobné prvky uvnitř.
  let sceneMod = "";
  let overlay = ""; // extra prvky pro danou fázi (bublina „!", kruhy vln)
  let hint = "";
  if (phase === "waiting") {
    sceneMod = " is-waiting";
    overlay = `<div class="fishing-rings"><span></span><span></span></div>`;
    hint = `Waiting for a bite... <strong>don't</strong> reel in yet!`;
  } else if (phase === "bite") {
    sceneMod = " is-bite";
    overlay = `<div class="fishing-rings is-strong"><span></span><span></span></div>
               <div class="fishing-bite"><span>!</span></div>`;
    hint = `<strong>Now!</strong> Click the water to reel it in!`;
  } else if (phase === "result") {
    sceneMod = " is-result";
    hint = `${resultMsg} <em>Click the water to cast again.</em>`;
  } else {
    hint = `<strong>Click the water</strong> to cast your line.`;
  }

  // Výběr prutu: chips nad hladinou. Během nahazování zamčené (jako v kánonu se
  // prut volí před nahozením). Nejlepší/zvolený je zvýrazněný.
  // Štítek rybářského biomu oblasti – hráč hned vidí, že lov závisí na místě
  // (jiné druhy ve sladké vodě vs. u moře).
  const biome = fishingBiome();
  const biomeLabel = biome === "ocean" ? `🌊 Ocean` : `🏞️ Freshwater`;

  const cur = effectiveRod();
  const rodChips = ownedRods()
    .map((rodId) => {
      const it = getItem(rodId);
      const active = rodId === cur ? " is-active" : "";
      return `<button class="fishing-rod-chip${active}" data-rod="${rodId}"${casting ? " disabled" : ""}>${it?.icon ?? "🎣"} ${it?.name ?? rodId}</button>`;
    })
    .join("");

  // Vrstvená vodní scéna přes celou plochu tabu – čistě CSS (žádný asset):
  //  nebe s odleskem → hladina se třemi posouvajícími se vlnami → vlasec s
  //  plovákem → dle fáze kruhy vln / bublina „!". Klik kamkoli na scénu = akce.
  root.innerHTML = `
    <div class="fishing-tab">
      <div class="fishing-scene${sceneMod}" id="fishing-pond" title="Click the water to fish">
        <div class="fishing-sky"><div class="fishing-glint"></div></div>
        <div class="fishing-water">
          <div class="fishing-wave wave-far"></div>
          <div class="fishing-wave wave-mid"></div>
          <div class="fishing-wave wave-near"></div>
          <div class="fishing-line"></div>
          <div class="fishing-float">🔴</div>
          ${overlay}
        </div>
        <div class="fishing-rods">${rodChips}</div>
        <div class="fishing-biome" title="Fishing here draws from this water's pool">${biomeLabel}</div>
        <div class="fishing-caption">${hint}</div>
      </div>
    </div>`;

  const pond = root.querySelector("#fishing-pond");
  if (pond) pond.addEventListener("click", onWaterClick);
  // Chips výběru prutu – klik nesmí probublat na scénu (jinak by rovnou nahodil).
  root.querySelectorAll("[data-rod]").forEach((chip) =>
    chip.addEventListener("click", (e) => {
      e.stopPropagation();
      if (phase === "waiting" || phase === "bite") return; // během nahazování nelze měnit
      selectedRod = chip.dataset.rod;
      draw(rootRef);
    })
  );
}

/**
 * Vstupní bod záložky (volá mainPanel). Idempotentní – jen vykreslí aktuální
 * fázi minihry a naváže kliknutí; časovače běží nezávisle v modulu.
 * @param {HTMLElement} root
 * @param {(msg: string) => void} onStatus
 */
export function renderFishingTab(root, onStatus = () => {}) {
  rootRef = root;
  onStatusRef = onStatus;
  // Když už nemá prut / není u vody, spadni do klidu (např. po přechodu jinam).
  if (!hasAnyRod() || !areaHasWater()) resetFishing();
  draw(root);
}
