/**
 * main.js – vstupní bod aplikace.
 *
 * Bootstrap: načte/založí herní stav, vykreslí UI moduly a napojí je na
 * změny stavu přes event sběrnici. Herní logika žije v systems/, data v data/.
 */

import { VERSION } from "./core/version.js";
import { bus, EVENTS } from "./core/events.js";
import { getState } from "./core/state.js";
import { loadGame, newGame, saveGame } from "./systems/save.js";
import { renderLeftPanel } from "./ui/leftPanel.js";
import { renderBattle } from "./ui/battleView.js";
import { restore as restoreBattle } from "./systems/battleSystem.js";
import { applyOfflineProgress } from "./systems/idle.js";
import { applyDaycareOffline, startDaycareLoop } from "./systems/daycare.js";
import { applyEggOffline, startEggLoop } from "./systems/eggSystem.js";
import { applyBreedingOffline, startBreedingLoop } from "./systems/breedingSystem.js";
import { ensureStartersSeen } from "./systems/pokedex.js";
import { showOfflineSummary } from "./ui/offlineView.js";
import { renderMap } from "./ui/mapView.js";
import { renderSaveControls } from "./ui/saveControls.js";
import { renderSettings } from "./ui/settingsView.js";
import { openChangelog } from "./ui/changelogView.js";
import { initMoveLearnPrompts } from "./ui/moveLearnView.js";
import { initStarterPrompt } from "./ui/starterModal.js";
import { ballIconHtml } from "./ui/ballIcon.js";
import { POKEBALLS } from "../data/pokeballs.js";

/** Interval automatického ukládání (ms). */
const AUTOSAVE_MS = 30_000;

/** Bezpečně najde element podle id, jinak vyhodí srozumitelnou chybu. */
function el(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Chybí element #${id} v index.html`);
  return node;
}

/** Krátká stavová hláška v horní liště. */
function setStatus(msg) {
  el("status").textContent = msg;
}

/**
 * Rozpis Poké Ballů podle typu pro tooltip pod ikonou v horní liště.
 * Ukáže jen vlastněné typy (count > 0), jinak pobídku k nákupu.
 */
function ballsTooltipHtml(balls) {
  const owned = POKEBALLS.filter((ball) => (balls[ball.id] ?? 0) > 0);
  const rows = owned.length
    ? owned
        .map(
          (ball) =>
            `<span class="ball-row">${ballIconHtml(ball.id, { size: 16 })}
               <span class="ball-row-name">${ball.name}</span>
               <span class="ball-row-count">×${balls[ball.id]}</span>
             </span>`
        )
        .join("")
    : `<span class="placeholder">No Poké Balls — buy some in the Poké Mart.</span>`;
  return `<div class="ball-tooltip">
      <div class="ball-tooltip-title">Poké Balls</div>
      ${rows}
    </div>`;
}

/** Vykreslí zdrojovou lištu z reálného herního stavu. */
function renderResourceBar(root) {
  const s = getState();
  const balls = s.resources.balls ?? {};
  const totalBalls = Object.values(balls).reduce((a, b) => a + b, 0);
  const items = [
    { icon: "💰", label: "Gold", value: s.resources.gold },
    {
      iconHtml: ballIconHtml("poke", { size: 18 }),
      label: "Poké Balls",
      value: totalBalls,
      // Přehled kolik a jakých míčků mám – ukáže se po najetí myší na ikonu.
      tooltipHtml: ballsTooltipHtml(balls),
    },
    { icon: "📦", label: "Pokémon", value: s.collection.length },
    { icon: "🥚", label: "Eggs", value: (s.eggs ?? []).length },
  ];
  root.innerHTML = items
    .map(
      (r) => `<span class="resource${r.tooltipHtml ? " has-tooltip" : ""}"${r.tooltipHtml ? "" : ` title="${r.label}"`}>
                ${r.iconHtml ?? `<span class="icon">${r.icon}</span>`}
                <span class="value">${r.value}</span>
                ${r.tooltipHtml ?? ""}
              </span>`
    )
    .join("");
}

/** Inicializace hry. */
function init() {
  // 1) Načíst uloženou hru, jinak založit novou.
  let loaded = false;
  if (!loadGame()) {
    newGame();
    setStatus("New game");
  } else {
    loaded = true;
    setStatus("Game loaded");
  }

  // 1a) Startéry jsou vždy „viděné" (potkali jsme je na výběrové obrazovce) –
  // dorovná i starší rozehrané save, které je ještě nemá v Pokédexu.
  if (getState().collection.length > 0) ensureStartersSeen();

  // 1b) Offline (idle) progres – POČÍTÁ SE Z ULOŽENÉHO SNÍMKU souboje,
  // proto ještě před restore (ten by běh souboje přepsal na pauzu).
  // Elapsed čteme jednou (saveGame níže resetne lastSaved).
  let elapsedSec = 0;
  let offlineBattle = null;
  let offlineDaycare = null;
  let offlineEgg = null;
  let offlineBred = null;
  if (loaded) {
    const elapsedMs = Date.now() - getState().meta.lastSaved;
    elapsedSec = Math.floor(elapsedMs / 1000);
    offlineBattle = applyOfflineProgress(getState().battle, elapsedMs);
    offlineDaycare = applyDaycareOffline(elapsedMs);
    // Breeding vyprodukuje vejce PŘED inkubací, ať se čerstvá vejce mohou hned
    // dál dopočítat (nezačnou inkubovat sama, ale ať je pořadí předvídatelné).
    offlineBred = applyBreedingOffline(elapsedMs);
    offlineEgg = applyEggOffline(elapsedMs);
  }

  // 2) Vykreslit panely.
  renderLeftPanel(el("city-panel"), setStatus);
  renderBattle(el("battle-panel"));
  renderMap(el("map-panel"));

  // 2b) Obnovit rozehraný souboj ze save (pozastavený) – „přímý save“:
  // po F5 zůstane HP i nepřítel zachovaný, souboj se jen pozastaví.
  // (Case offline: hráč už má případný level-up z idle, restore ho zohlední.)
  restoreBattle(getState().battle);

  // 3) Ovládání save + globální nastavení + zdrojová lišta.
  renderSaveControls(el("save-controls"), setStatus);
  renderSettings(el("settings-controls"));
  renderResourceBar(el("resource-bar"));

  // 4) UI reaguje na změny stavu (oddělení logiky od UI).
  bus.on(EVENTS.STATE_CHANGED, () => {
    renderResourceBar(el("resource-bar"));
    renderLeftPanel(el("city-panel"), setStatus);
  });

  // 5) Automatické ukládání a uložení při zavření karty + pasivní výcvik ve školce.
  setInterval(saveGame, AUTOSAVE_MS);
  window.addEventListener("beforeunload", saveGame);
  startDaycareLoop();
  startEggLoop();
  startBreedingLoop();

  // Vejce vylíhnuté při běžící hře: krátká hláška v liště.
  bus.on(EVENTS.EGG_HATCHED, (r) => {
    setStatus(`🥚 Egg hatched: ${r.name}${r.shiny ? " ✨" : ""} (Lv ${r.level})`);
  });

  // Vejce vyprodukované breedingem při běžící hře: krátká hláška (druh skrytý).
  bus.on(EVENTS.EGG_BRED, () => {
    setStatus("💞 The Day Care couple produced an egg!");
  });

  // 6) Přehled offline zisků + hned uložit (reset lastSaved → žádné dvojí počítání).
  if (offlineBattle || offlineDaycare || offlineEgg || offlineBred) {
    saveGame();
    showOfflineSummary({
      elapsedSec,
      battle: offlineBattle,
      daycare: offlineDaycare,
      egg: offlineEgg,
      bred: offlineBred,
    });
    const parts = [];
    if (offlineBattle) parts.push(`battle +${offlineBattle.xp} XP, +${offlineBattle.gold} gold`);
    if (offlineDaycare) parts.push(`day care +${offlineDaycare.xp} XP`);
    if (offlineEgg) parts.push(`hatched ${offlineEgg.length} egg${offlineEgg.length > 1 ? "s" : ""}`);
    if (offlineBred) parts.push(`bred ${offlineBred.length} egg${offlineBred.length > 1 ? "s" : ""}`);
    setStatus(`Offline: ${parts.join(" · ")}`);
  }

  // 6b) Nabídky naučení tahu (plné sloty) – sleduje frontu i položky z offline.
  initMoveLearnPrompts();

  // 6c) Výběr startéra při nové hře (prázdná kolekce) – modální okno.
  initStarterPrompt();

  const versionTag = el("version-tag");
  versionTag.textContent = `Pokémon Idle RPG · v${VERSION}`;
  versionTag.title = "Show changelog";
  versionTag.classList.add("clickable");
  versionTag.addEventListener("click", openChangelog);
  console.log(`[Pokémon Idle RPG] v${VERSION} – inicializováno.`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
