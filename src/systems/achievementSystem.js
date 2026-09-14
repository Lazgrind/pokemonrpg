/**
 * achievementSystem.js – engine pro odemykání a správu achievementů (v0.105.0).
 *
 * Systém sleduje statistiky hráče (počet chycených, shiny, max level atd.)
 * a vyhodnocuje achievements proti těmto hodnotám. Odemčené se zapisují
 * do state.achievements.unlocked s timestampem a přidělí se odměna.
 */

import { bus, EVENTS } from "../core/events.js";
import { getState, commit } from "../core/state.js";
import { ACHIEVEMENTS } from "../../data/achievements.js";
import { dexCounts } from "./pokedex.js";
import { showAchievementToast } from "../ui/achievementToast.js";

/**
 * Spočítá odvozené statistiky pro vyhodnocení achievementů.
 * @returns {{ dexCount, shinyCount, maxLevel, badges, isChampion, gold, catches, hatches, evolves }}
 */
export function deriveStats(state) {
  const { caught } = dexCounts();
  const shinyCount = (state.collection ?? []).filter((p) => p.shiny).length;
  const maxLevel =
    state.collection && state.collection.length > 0
      ? Math.max(...state.collection.map((p) => p.level || 0))
      : 0;
  const badges = (state.progress?.badges ?? []).length;
  const isChampion = !!state.story?.isChampion;
  const gold = state.resources?.gold ?? 0;
  const stats = state.achievements?.stats ?? {};
  const catches = stats.catches ?? 0;
  const hatches = stats.hatches ?? 0;
  const evolves = stats.evolves ?? 0;

  return { dexCount: caught, shinyCount, maxLevel, badges, isChampion, gold, catches, hatches, evolves };
}

/**
 * Vyhodnotí všechny achievements a odemkne ty, kterých bylo dosaženo.
 * Odměny (gold/coins/items) jsou přiděleny pouze při prvním odemčení.
 * Commituje jen pokud se něco odemklo.
 */
export function evaluateAchievements() {
  const state = getState();
  if (!state.achievements) state.achievements = { unlocked: {}, stats: { catches: 0, hatches: 0, evolves: 0 } };
  if (!state.achievements.unlocked) state.achievements.unlocked = {};
  if (!state.achievements.stats) state.achievements.stats = { catches: 0, hatches: 0, evolves: 0 };

  const d = deriveStats(state);
  let changed = false;

  for (const ach of ACHIEVEMENTS) {
    // Pokud je už odemčeno, skip
    if (state.achievements.unlocked[ach.id]) continue;

    // Vyhodnoť check funkci
    if (!ach.check(d)) continue;

    // Odemkni
    state.achievements.unlocked[ach.id] = Date.now();
    changed = true;

    // Přidělej odměnu
    if (ach.reward) {
      if (ach.reward.gold) {
        state.resources.gold = (state.resources.gold ?? 0) + ach.reward.gold;
      }
      if (ach.reward.coins) {
        state.resources.coins = (state.resources.coins ?? 0) + ach.reward.coins;
      }
      if (ach.reward.items) {
        if (!state.resources.items) state.resources.items = {};
        for (const [itemId, qty] of Object.entries(ach.reward.items)) {
          state.resources.items[itemId] = (state.resources.items[itemId] ?? 0) + qty;
        }
      }
    }

    // Toast
    showAchievementToast(ach);
  }

  // Commituj jen pokud se něco změnilo
  if (changed) {
    commit();
  }
}

/**
 * Inicializuje systém – napojí se na event bus.
 * Emituje evaluaci při POKEMON_CAUGHT, EGG_HATCHED, POKEMON_EVOLVED, LEVEL_UP a STATE_CHANGED.
 */
export function initAchievements() {
  const state = getState();
  if (!state.achievements) state.achievements = { unlocked: {}, stats: { catches: 0, hatches: 0, evolves: 0 } };
  if (!state.achievements.unlocked) state.achievements.unlocked = {};
  if (!state.achievements.stats) state.achievements.stats = { catches: 0, hatches: 0, evolves: 0 };

  // Chycení Pokémona
  bus.on(EVENTS.POKEMON_CAUGHT, () => {
    const st = getState();
    st.achievements.stats.catches = (st.achievements.stats.catches ?? 0) + 1;
    commit();
    evaluateAchievements();
  });

  // Vylíhnutí vejce
  bus.on(EVENTS.EGG_HATCHED, () => {
    const st = getState();
    st.achievements.stats.hatches = (st.achievements.stats.hatches ?? 0) + 1;
    commit();
    evaluateAchievements();
  });

  // Evoluce Pokémona
  bus.on(EVENTS.POKEMON_EVOLVED, () => {
    const st = getState();
    st.achievements.stats.evolves = (st.achievements.stats.evolves ?? 0) + 1;
    commit();
    evaluateAchievements();
  });

  // Level-up (může změnit maxLevel)
  bus.on(EVENTS.LEVEL_UP, () => {
    evaluateAchievements();
  });

  // Jakákoliv změna stavu (gold, badges atd.)
  // Guard: evaluate se nesmí volat zbytečně, aby se nezvyšovaly tokeny
  // Protože evaluate commituje jen při odemčení (monotónní), cyklus se zastaví.
  bus.on(EVENTS.STATE_CHANGED, () => {
    evaluateAchievements();
  });
}
