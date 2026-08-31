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
import { showOfflineSummary } from "./ui/offlineView.js";
import { renderMap } from "./ui/mapView.js";
import { renderSaveControls } from "./ui/saveControls.js";

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

/** Vykreslí zdrojovou lištu z reálného herního stavu. */
function renderResourceBar(root) {
  const s = getState();
  const items = [
    { icon: "💰", label: "Gold", value: s.resources.gold },
    { icon: "🔴", label: "Poké Balls", value: s.resources.pokeballs },
    { icon: "📦", label: "Pokémoni", value: s.collection.length },
  ];
  root.innerHTML = items
    .map(
      (r) => `<span class="resource" title="${r.label}">
                <span class="icon">${r.icon}</span>
                <span class="value">${r.value}</span>
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
    setStatus("Nová hra");
  } else {
    loaded = true;
    setStatus("Hra načtena");
  }

  // 1b) Offline (idle) progres – POČÍTÁ SE Z ULOŽENÉHO SNÍMKU souboje,
  // proto ještě před restore (ten by běh souboje přepsal na pauzu).
  let offline = null;
  if (loaded) {
    const savedBattle = getState().battle;
    const elapsedMs = Date.now() - getState().meta.lastSaved;
    offline = applyOfflineProgress(savedBattle, elapsedMs);
  }

  // 2) Vykreslit panely.
  renderLeftPanel(el("city-panel"), setStatus);
  renderBattle(el("battle-panel"));
  renderMap(el("map-panel"));

  // 2b) Obnovit rozehraný souboj ze save (pozastavený) – „přímý save“:
  // po F5 zůstane HP i nepřítel zachovaný, souboj se jen pozastaví.
  // (Case offline: hráč už má případný level-up z idle, restore ho zohlední.)
  restoreBattle(getState().battle);

  // 3) Ovládání save + zdrojová lišta.
  renderSaveControls(el("save-controls"), setStatus);
  renderResourceBar(el("resource-bar"));

  // 4) UI reaguje na změny stavu (oddělení logiky od UI).
  bus.on(EVENTS.STATE_CHANGED, () => {
    renderResourceBar(el("resource-bar"));
    renderLeftPanel(el("city-panel"), setStatus);
  });

  // 5) Automatické ukládání a uložení při zavření karty.
  setInterval(saveGame, AUTOSAVE_MS);
  window.addEventListener("beforeunload", saveGame);

  // 6) Přehled offline zisků + hned uložit (reset lastSaved → žádné dvojí počítání).
  if (offline) {
    saveGame();
    showOfflineSummary(offline);
    setStatus(`Offline: +${offline.xp} XP, +${offline.gold} gold`);
  }

  el("version-tag").textContent = `Pokémon Idle RPG · v${VERSION}`;
  console.log(`[Pokémon Idle RPG] v${VERSION} – inicializováno.`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
