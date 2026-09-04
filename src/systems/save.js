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
import { randomIvs, emptyEvs, rollGender, computeStats, defaultMovesFor, randomNature, repairWeakMoveset } from "./pokemonSystem.js";
import { getSpecies } from "../../data/pokemon.js";
import { AREAS } from "../../data/areas.js";

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
  // v8 → v9: Pokédex (R-026). Přidáme prázdný seznam viděných druhů; chycené
  // se odvozují z kolekce, takže staré save rovnou ukážou vše vlastněné jako
  // „chyceno" a nic dalšího jako „viděno".
  if (data.saveVersion < 9) {
    if (!data.pokedex || typeof data.pokedex !== "object") data.pokedex = { seen: [] };
    if (!Array.isArray(data.pokedex.seen)) data.pokedex.seen = [];
    data.saveVersion = 9;
  }
  // v9 → v10: ball, ve kterém byl jedinec chycen (`caughtBall`). U starých
  // jedinců ho zpětně neznáme – nastavíme rozumný výchozí „poke" (naprostá
  // většina raných úlovků), ať se ikona na kartě ukáže i u dosavadní kolekce.
  if (data.saveVersion < 10) {
    for (const p of data.collection ?? []) {
      if (p.caughtBall === undefined) p.caughtBall = "poke";
    }
    data.saveVersion = 10;
  }
  // v10 → v11: pohlaví jedince (`gender`). U stávajících jedinců ho rozlosujeme
  // z poměru pohlaví druhu (jednorázově), ať mají všichni platné pohlaví.
  if (data.saveVersion < 11) {
    for (const p of data.collection ?? []) {
      if (p.gender === undefined) p.gender = rollGender(getSpecies(p.speciesId));
    }
    data.saveVersion = 11;
  }
  // v11 → v12: trvalé aktuální HP na jedinci (`hp`). Stávajícím doplníme plné
  // max HP, ať začínají „zdraví" (dřív se HP drželo jen běhově v souboji).
  if (data.saveVersion < 12) {
    for (const p of data.collection ?? []) {
      if (typeof p.hp !== "number") p.hp = computeStats(p).maxHp;
    }
    data.saveVersion = 12;
  }
  // v12 → v13: tahy na jedinci (`moves`). Stávajícím doplníme tahy z learnsetu
  // podle jejich aktuálního levelu, s plnými PP (dřív jedinci žádné tahy neměli).
  if (data.saveVersion < 13) {
    for (const p of data.collection ?? []) {
      if (!Array.isArray(p.moves)) p.moves = defaultMovesFor(p.speciesId, p.level);
    }
    data.saveVersion = 13;
  }
  // v13 → v14: fronta nabídek naučení tahu (`moveLearnQueue`). Když jedinec
  // levelováním získá nový tah, ale má plné 4 sloty, čeká zde na hráčovu volbu
  // nahrazení. Starým save doplníme prázdnou frontu.
  if (data.saveVersion < 14) {
    if (!Array.isArray(data.moveLearnQueue)) data.moveLearnQueue = [];
    data.saveVersion = 14;
  }
  // v14 → v15: trvalý stavový efekt na jedinci (`status`: otrava/popálení/paralýza).
  // Stávající jedinci žádný nemají – nastavíme null (status navěsí až souboj).
  if (data.saveVersion < 15) {
    for (const p of data.collection ?? []) {
      if (p.status === undefined) p.status = null;
    }
    data.saveVersion = 15;
  }
  // v15 → v16: povaha jedince (`nature`). Stávajícím rozlosujeme náhodnou povahu
  // (jednorázově), ať mají všichni platnou; staty se tím mírně přepočítají (±10 %).
  if (data.saveVersion < 16) {
    for (const p of data.collection ?? []) {
      if (typeof p.nature !== "string") p.nature = randomNature();
    }
    data.saveVersion = 16;
  }
  // v16 → v17: inventář léčivých předmětů (resources.items). Starým save doplníme
  // prázdný inventář; itemy se kupují v Poké Martu (viz data/items.js, itemSystem).
  if (data.saveVersion < 17) {
    if (!data.resources) data.resources = { gold: 0 };
    if (!data.resources.items || typeof data.resources.items !== "object") {
      data.resources.items = {};
    }
    data.saveVersion = 17;
  }
  // v17 → v18: drženého itemu na jedinci (`heldItem`). Stávajícím doplníme null
  // (žádný drženou item), ať všichni jedinci mají platné pole.
  if (data.saveVersion < 18) {
    for (const p of data.collection ?? []) {
      if (p.heldItem === undefined) p.heldItem = null;
    }
    data.saveVersion = 18;
  }
  // v18 → v19: PC boxy (úložiště jedinců mimo tým). Starým save doplníme prázdné
  // pole boxů; pcSystem.reconcile() při prvním vykreslení rozmístí všechny dosud
  // vlastněné jedince mimo tým do slotů (a založí Box 1, pokud žádný není).
  if (data.saveVersion < 19) {
    if (!Array.isArray(data.pcBoxes)) data.pcBoxes = [];
    data.saveVersion = 19;
  }
  // v19 → v20: herní pravidla / režimy (settings.rules: noItems/noPotions/nuzlocke)
  // a sledování Nuzlocke úlovků po oblastech (nuzlockeCaught). Starým save doplníme
  // vypnuté režimy a prázdný tracking, ať se chování nezmění.
  if (data.saveVersion < 20) {
    if (!data.settings) data.settings = { autoBattle: true };
    if (!data.settings.rules || typeof data.settings.rules !== "object") {
      data.settings.rules = { noItems: false, noPotions: false, nuzlocke: false };
    } else {
      const r = data.settings.rules;
      if (typeof r.noItems !== "boolean") r.noItems = false;
      if (typeof r.noPotions !== "boolean") r.noPotions = false;
      if (typeof r.nuzlocke !== "boolean") r.nuzlocke = false;
    }
    if (!data.nuzlockeCaught || typeof data.nuzlockeCaught !== "object") {
      data.nuzlockeCaught = {};
    }
    data.saveVersion = 20;
  }
  // v20 → v21: oprava „slabých" sad tahů (dřívější bug – jedinec mohl skončit
  // např. s 3 status + 1 útok, což v auto souboji vede k zaseknutí, protože nemá
  // čím ubírat HP). Přeskládá na útočné-first JEN u jedinců s ≤ 1 útočným tahem,
  // kde jde získat víc útočných; vyvážené sady (2+ útoky) nechává být.
  if (data.saveVersion < 21) {
    for (const p of data.collection ?? []) repairWeakMoveset(p);
    data.saveVersion = 21;
  }
  if (data.saveVersion < 22) {
    // Klikací mapa: aktivní oblast + odznaky (viz data/areas.js, mapView.js).
    data.progress = data.progress ?? { tier: 1 };
    if (!data.progress.activeAreaId) data.progress.activeAreaId = "route-01";
    if (!Array.isArray(data.progress.badges)) data.progress.badges = [];
    if (!data.mapPositions) data.mapPositions = {}; // override pozic uzlů z "režimu umístění"
    data.saveVersion = 22;
  }
  // v22 → v23: nový výchozí autocatch mód "none" (zapnutí Auto catch samo nezačne
  // hned chytat). Kdo autocatch nikdy nezapnul (enabled=false), dostane "none"
  // místo starého defaultu "all"; komu běžel (enabled=true), volbu necháme.
  if (data.saveVersion < 23) {
    const ac = data.settings?.autocatch;
    if (ac && ac.enabled === false && ac.mode === "all") ac.mode = "none";
    data.saveVersion = 23;
  }
  // v23 → v24: postup přes NÁVŠTĚVY (progress.visited) místo odemčení odznaky.
  // Staré save: označíme všechny oblasti jako navštívené (dřív byly všechny
  // odemčené), aby nikdo nepřišel o přístup – žádná regrese. Nová hra začíná
  // jen s Pallet Townem (viz createNewGame, data/areas.js).
  if (data.saveVersion < 24) {
    if (!data.progress) data.progress = { tier: 1, badges: [] };
    if (!Array.isArray(data.progress.visited)) {
      data.progress.visited = AREAS.map((a) => a.id);
    }
    data.saveVersion = 24;
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
