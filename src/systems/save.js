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
import { randomIvs, emptyEvs } from "./pokemonSystem.js";

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
  // v2 → v3: přidány budovy města.
  if (data.saveVersion < 3) {
    if (!data.city) data.city = { buildings: {} };
    data.saveVersion = 3;
  }
  // v3 → v4: IV/EV/shiny na jedincích. Doplníme jen chybějící pole, aby
  // stávající jedinci dostali náhodné IV (jako by odjakživa existovaly),
  // prázdné EV a shiny=false. Existující staty se tím jen doplní, ne přepíší.
  if (data.saveVersion < 4) {
    for (const p of data.collection ?? []) {
      if (!p.ivs) p.ivs = randomIvs();
      if (!p.evs) p.evs = emptyEvs();
      if (typeof p.shiny !== "boolean") p.shiny = false;
    }
    data.saveVersion = 4;
  }
  // v4 → v5: nastavení autocatch (chytání v souboji). Doplníme výchozí,
  // pokud chybí, ať staré save fungují beze změny chování (vypnuto).
  if (data.saveVersion < 5) {
    if (!data.settings) data.settings = { autoBattle: true };
    if (!data.settings.autocatch) {
      data.settings.autocatch = { enabled: false, newSpecies: true, betterIvs: true, shiny: true };
    }
    data.saveVersion = 5;
  }
  // v5 → v6: Poké Bally jako inventář po typech (resources.balls), vybraný typ
  // ballu a postup světem (progress.tier, odemyká typy ballů). Dosavadní počet
  // Poké Ballů se převede na typ „poke".
  if (data.saveVersion < 6) {
    if (!data.resources) data.resources = { gold: 0 };
    if (!data.resources.balls) {
      data.resources.balls = { poke: data.resources.pokeballs ?? 0 };
    }
    delete data.resources.pokeballs;
    if (!data.settings) data.settings = { autoBattle: true };
    if (!data.settings.selectedBall) data.settings.selectedBall = "poke";
    if (!data.progress) data.progress = { tier: 1 };
    data.saveVersion = 6;
  }
  // v6 → v7: vajíčka a líhnutí (R-021). Přidáme prázdný inventář vajec; slot
  // inkubace ve Školce (city.daycare.egg) se doplňuje lazy.
  if (data.saveVersion < 7) {
    if (!Array.isArray(data.eggs)) data.eggs = [];
    data.saveVersion = 7;
  }
  // v7 → v8: breeding podle egg groups (R-022). Breeding slot ve Školce
  // (city.daycare.breeding = { a, b, buffer }) se doplňuje lazy v buildingSystem,
  // takže tu jen posuneme verzi – staré save fungují beze změny chování.
  if (data.saveVersion < 8) {
    data.saveVersion = 8;
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
