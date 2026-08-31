/**
 * save.js – ukládání a načítání hry.
 *
 * Krok 1: localStorage + export/import do .txt souboru (zadání, sekce 7 a 15).
 * Save je verzovaný (saveVersion) a při načtení prochází migrací, aby šlo
 * v budoucnu bezpečně měnit datový model.
 */

import {
  getState,
  setState,
  createNewGame,
  CURRENT_SAVE_VERSION,
} from "../core/state.js";

/** Klíč v localStorage. */
const SAVE_KEY = "pokemonIdleRpg.save";

/** Je v localStorage uložená hra? */
export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

/** Uloží aktuální stav do localStorage. */
export function saveGame() {
  const state = getState();
  state.meta.lastSaved = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  return true;
}

/**
 * Načte hru z localStorage. Vrací true při úspěchu.
 * @returns {boolean}
 */
export function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    setState(migrate(JSON.parse(raw)));
    return true;
  } catch (err) {
    console.error("Poškozený save v localStorage:", err);
    return false;
  }
}

/** Založí novou hru a rovnou ji uloží. */
export function newGame() {
  setState(createNewGame());
  saveGame();
}

/**
 * Migrace mezi verzemi datového modelu. Zatím jen doplní chybějící verzi.
 * @param {any} data
 * @returns {import("../core/state.js").GameState}
 */
function migrate(data) {
  if (typeof data !== "object" || data === null) {
    throw new Error("Neplatná struktura save.");
  }
  if (!data.saveVersion) data.saveVersion = 1;
  // v1 → v2: přidán uložený stav souboje.
  if (data.saveVersion < 2) {
    if (data.battle === undefined) data.battle = null;
    data.saveVersion = 2;
  }
  return data;
}

/** Stáhne aktuální save jako .txt soubor. */
export function exportSave() {
  const json = JSON.stringify(getState(), null, 2);
  const blob = new Blob([json], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pokemon-idle-save-${stamp}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Načte save z nahraného .txt souboru. Vrací true při úspěchu.
 * @param {File} file
 * @returns {Promise<boolean>}
 */
export async function importSave(file) {
  try {
    const text = await file.text();
    setState(migrate(JSON.parse(text)));
    saveGame();
    return true;
  } catch (err) {
    console.error("Import save selhal:", err);
    return false;
  }
}
