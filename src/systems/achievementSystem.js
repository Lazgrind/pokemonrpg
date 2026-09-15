/**
 * achievementSystem.js – engine pro odemykání a správu achievementů (v1.6.0).
 *
 * Systém sleduje statistiky hráče (chycení, faints, míjení, čas ve hře…) a
 * vyhodnocuje 60 achievementů proti odvozeným hodnotám (deriveStats). Odemčené
 * se zapisují do state.achievements.unlocked s timestampem a přidělí se odměna.
 *
 * Model dat achievementu: { id, name, hint, condition, tier, check, reward }
 * (viz data/achievements.js). Po odemčení UI odhalí i reálnou `condition`.
 *
 * TUTORIÁL: během tutoriálu se NIC neodemyká ani nepočítá – guard
 * isTutorialActive() = tutorialDemoActive || !story.tutorialDone.
 *
 * Countery, které nejdou odvodit ze stavu, plní ostatní moduly přes exportované
 * record*-helpery (recordMiss/Autocatch/Trade/Release/GameCorner/Afk/Playtime).
 */

import { bus, EVENTS } from "../core/events.js";
import { getState, commit, PC_BOX_SIZE } from "../core/state.js";
import { ACHIEVEMENTS } from "../../data/achievements.js";
import { dexCounts } from "./pokedex.js";
import { showAchievementToast } from "../ui/achievementToast.js";

/* ---- Brána zobrazování toastů (title screen) ----------------------------
 * Achievement se může odemknout ještě než hráč proklikne title screen (první
 * evaluate po načtení + recordAfk běží hned při init). Toast by pak vyskočil
 * POD úvodní obrazovkou. Vzhledem k AFK povaze hry se všechno VIDITELNÉ ukáže
 * až po Continue – proto toasty do té doby FRONTUJEME a vyprázdníme je až
 * `flushAchievementToasts()` (volá main.js z title-screen callbacku). Odemčení,
 * odměny i zápis do save probíhají normálně hned; odkládá se jen toast. */
let toastsGateOpen = false;
const pendingToasts = [];

/** Ukáže toast hned (brána otevřená), jinak ho zařadí do fronty. */
function emitAchievementToast(a) {
  if (toastsGateOpen) showAchievementToast(a);
  else pendingToasts.push(a);
}

/**
 * Otevře bránu toastů a vyprázdní frontu odložených (volá se po Continue na
 * title screenu). Idempotentní.
 */
export function flushAchievementToasts() {
  toastsGateOpen = true;
  while (pendingToasts.length) showAchievementToast(pendingToasts.shift());
}

/* ------------------------------ Staty / stav ----------------------------- */

/** Výchozí hodnoty všech counterů (zdroj pravdy pro seed i migraci). */
export const ACH_STAT_DEFAULTS = {
  catches: 0,
  hatches: 0,
  evolves: 0,
  playerFaints: 0,
  enemyFaints: 0,
  releases: 0,
  trades: 0,
  fishingCatches: 0,
  autocatchCatches: 0,
  misses: 0,
  fullAutoIdle: false,
  maxAfkSec: 0,
  playSeconds: 0,
  speciesCatchCounts: {},
  gc: { plays: 0, jackpots: 0, losses: 0 },
};

/** Zajistí, že state.achievements má tvar { unlocked, stats:{…defaults} }. */
function ensureAchievements(state) {
  if (!state.achievements || typeof state.achievements !== "object") {
    state.achievements = { unlocked: {}, stats: {} };
  }
  if (!state.achievements.unlocked) state.achievements.unlocked = {};
  const s = state.achievements.stats && typeof state.achievements.stats === "object" ? state.achievements.stats : {};
  for (const [k, v] of Object.entries(ACH_STAT_DEFAULTS)) {
    if (s[k] == null) s[k] = typeof v === "object" ? (Array.isArray(v) ? [] : { ...v }) : v;
  }
  if (!s.speciesCatchCounts || typeof s.speciesCatchCounts !== "object") s.speciesCatchCounts = {};
  if (!s.gc || typeof s.gc !== "object") s.gc = { plays: 0, jackpots: 0, losses: 0 };
  state.achievements.stats = s;
  return state.achievements;
}

/**
 * Běží právě tutoriálové demo/sandbox? Během něj se achievementy NEodemykají
 * ani nepočítají (demo-souboj i Bag sandbox běží pod tutorialDemoActive – viz
 * tutorial.beginSandbox/endSandbox; stav se pak stejně vrátí ze snapshotu).
 *
 * POZOR: NEkontrolujeme story.tutorialDone – ten se u existujících (a starých
 * pre-tutorial) savů nikdy nenastaví, protože tutoriál se nabízí jen prázdné
 * kolekci. Kontrola na !tutorialDone by tak navždy zablokovala achievementy
 * všem rozehraným hráčům.
 */
export function isTutorialActive() {
  return getState().tutorialDemoActive === true;
}

/* ------------------------------ deriveStats ------------------------------ */

/**
 * Spočítá odvozené statistiky pro vyhodnocení achievementů.
 * @returns {object} d – vše, na co sahají check() funkce v data/achievements.js
 */
export function deriveStats(state) {
  const ach = ensureAchievements(state);
  const stats = ach.stats;
  const collection = state.collection ?? [];

  const { caught } = dexCounts();
  const owned = new Set(collection.map((p) => p.speciesId));
  const shinyCount = collection.filter((p) => p.shiny).length;
  const maxLevel = collection.length ? Math.max(...collection.map((p) => p.level || 0)) : 0;
  const level100Count = collection.filter((p) => (p.level || 0) >= 100).length;

  const boxes = Array.isArray(state.pcBoxes) ? state.pcBoxes : [];
  const boxFull = boxes.some(
    (b) => Array.isArray(b?.slots) && b.slots.length >= PC_BOX_SIZE && b.slots.every((s) => s !== null)
  );

  const speciesCounts = Object.values(stats.speciesCatchCounts ?? {});
  const maxSpeciesCatches = speciesCounts.length ? Math.max(...speciesCounts) : 0;

  const unlockedCount = Object.keys(ach.unlocked).filter((id) => id !== "completionist").length;

  return {
    // odvozené ze stavu
    dexCount: caught,
    owned,
    shinyCount,
    maxLevel,
    level100Count,
    badges: (state.progress?.badges ?? []).length,
    isChampion: !!state.story?.isChampion,
    gold: state.resources?.gold ?? 0,
    teamSize: (state.team ?? []).length,
    boxFull,
    story: state.story ?? {},
    unlockedCount,
    // countery
    catches: stats.catches ?? 0,
    hatches: stats.hatches ?? 0,
    evolves: stats.evolves ?? 0,
    playerFaints: stats.playerFaints ?? 0,
    enemyFaints: stats.enemyFaints ?? 0,
    releases: stats.releases ?? 0,
    trades: stats.trades ?? 0,
    fishingCatches: stats.fishingCatches ?? 0,
    autocatchCatches: stats.autocatchCatches ?? 0,
    misses: stats.misses ?? 0,
    fullAutoIdle: !!stats.fullAutoIdle,
    maxSpeciesCatches,
    maxAfkSec: stats.maxAfkSec ?? 0,
    playSeconds: stats.playSeconds ?? 0,
    gcPlays: stats.gc?.plays ?? 0,
    gcJackpots: stats.gc?.jackpots ?? 0,
    gcLosses: stats.gc?.losses ?? 0,
  };
}

/* ---------------------------- Vyhodnocení -------------------------------- */

/**
 * Vyhodnotí všechny achievements a odemkne ty, kterých bylo dosaženo.
 * Odměny (gold/coins/items) jsou přiděleny pouze při prvním odemčení.
 * Commituje jen pokud se něco odemklo. Během tutoriálu no-op.
 */
export function evaluateAchievements() {
  if (isTutorialActive()) return;
  const state = getState();
  const ach = ensureAchievements(state);

  const d = deriveStats(state);
  let changed = false;

  for (const a of ACHIEVEMENTS) {
    if (ach.unlocked[a.id]) continue; // už odemčeno
    let ok = false;
    try {
      ok = !!a.check(d);
    } catch (e) {
      ok = false; // vadný check nikdy neshodí hru
    }
    if (!ok) continue;

    ach.unlocked[a.id] = Date.now();
    changed = true;

    if (a.reward) {
      if (!state.resources) state.resources = {};
      if (a.reward.gold) state.resources.gold = (state.resources.gold ?? 0) + a.reward.gold;
      if (a.reward.coins) state.resources.coins = (state.resources.coins ?? 0) + a.reward.coins;
      if (a.reward.items) {
        if (!state.resources.items) state.resources.items = {};
        for (const [itemId, qty] of Object.entries(a.reward.items)) {
          state.resources.items[itemId] = (state.resources.items[itemId] ?? 0) + qty;
        }
      }
    }

    emitAchievementToast(a); // hned, nebo do fronty dokud není proklikán title screen
  }

  if (changed) commit();
}

/* ------------------------- record* háčky (ext.) --------------------------- */
// Volají je jiné moduly (battleSystem/team/storyBuildingView/main). Terminální
// akce po zvýšení counteru rovnou commitnou → STATE_CHANGED → evaluate → toast
// okamžitě. Výjimka recordMiss (běží v bojovém tiku, který commituje sám → jen
// mutuje, ať se nepřekresluje uprostřed tahu). Během tutoriálu se nic nepočítá.

/** Míjení útoku (accuracy miss) hráčova Pokémona. Commit obstará bojový tik. */
export function recordMiss() {
  if (isTutorialActive()) return;
  ensureAchievements(getState()).stats.misses++;
}

/** Úspěšné chycení přes Auto catch. */
export function recordAutocatch() {
  if (isTutorialActive()) return;
  ensureAchievements(getState()).stats.autocatchCatches++;
  commit();
}

/** Dokončená in-game výměna (trade). */
export function recordTrade() {
  if (isTutorialActive()) return;
  ensureAchievements(getState()).stats.trades++;
  commit();
}

/** Puštění Pokémona (release). */
export function recordRelease() {
  if (isTutorialActive()) return;
  ensureAchievements(getState()).stats.releases++;
  commit();
}

/**
 * Aktivita v Game Corneru.
 * @param {"play"|"jackpot"|"loss"} kind
 */
export function recordGameCorner(kind) {
  if (isTutorialActive()) return;
  const gc = ensureAchievements(getState()).stats.gc;
  if (kind === "play") gc.plays++;
  else if (kind === "jackpot") gc.jackpots++;
  else if (kind === "loss") gc.losses++;
  commit();
}

/** Zaznamená délku jedné offline pauzy (bere se maximum). */
export function recordAfk(seconds) {
  if (isTutorialActive()) return;
  const stats = ensureAchievements(getState()).stats;
  if (seconds > (stats.maxAfkSec ?? 0)) stats.maxAfkSec = seconds;
  commit();
}

/** Připočte odehraný čas (kumulativně, v sekundách). */
export function recordPlaytime(seconds) {
  if (isTutorialActive()) return;
  ensureAchievements(getState()).stats.playSeconds += seconds;
  commit();
}

/* ------------------------------- init ----------------------------------- */

/**
 * Inicializuje systém – napojí se na event bus a udělá první vyhodnocení
 * (zachytí achievementy splněné už v načteném save).
 */
export function initAchievements() {
  ensureAchievements(getState());

  // Chycení Pokémona (payload { speciesId, shiny, pokemon, fishing }).
  bus.on(EVENTS.POKEMON_CAUGHT, (payload = {}) => {
    if (isTutorialActive()) return;
    const stats = ensureAchievements(getState()).stats;
    stats.catches++;
    if (payload.speciesId) {
      stats.speciesCatchCounts[payload.speciesId] = (stats.speciesCatchCounts[payload.speciesId] ?? 0) + 1;
    }
    if (payload.fishing) stats.fishingCatches++;
    commit();
    evaluateAchievements();
  });

  // Vylíhnutí vejce.
  bus.on(EVENTS.EGG_HATCHED, () => {
    if (isTutorialActive()) return;
    ensureAchievements(getState()).stats.hatches++;
    commit();
    evaluateAchievements();
  });

  // Evoluce Pokémona.
  bus.on(EVENTS.POKEMON_EVOLVED, () => {
    if (isTutorialActive()) return;
    ensureAchievements(getState()).stats.evolves++;
    commit();
    evaluateAchievements();
  });

  // Omdlení (payload { side, speciesId }).
  bus.on(EVENTS.BATTLE_FAINT, (payload = {}) => {
    if (isTutorialActive()) return;
    const stats = ensureAchievements(getState()).stats;
    if (payload.side === "player") stats.playerFaints++;
    else stats.enemyFaints++;
    commit();
    evaluateAchievements();
  });

  // Level-up: může posunout maxLevel; navíc „Full Auto" idle achievement.
  bus.on(EVENTS.LEVEL_UP, () => {
    if (isTutorialActive()) return;
    if (getState().settings?.fullAuto) {
      ensureAchievements(getState()).stats.fullAutoIdle = true;
      commit();
    }
    evaluateAchievements();
  });

  // Jakákoliv změna stavu (gold, badges, kolekce, story flagy…).
  // Evaluate commituje jen při reálném odemčení (monotónní) → žádná smyčka.
  bus.on(EVENTS.STATE_CHANGED, () => {
    evaluateAchievements();
  });

  // První vyhodnocení po načtení (mimo tutoriál).
  evaluateAchievements();
}
