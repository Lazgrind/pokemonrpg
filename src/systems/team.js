/**
 * team.js – správa kolekce a aktivního týmu (max 6, zadání sekce 9).
 *
 * Kolekce = všichni vlastnění Pokémoni. Tým = pole uid odkazujících do kolekce.
 * Každá změna volá commit(), aby se aktualizovalo UI.
 */

import { getState, commit, MAX_TEAM_SIZE } from "../core/state.js";
import { createPokemon, STAT_KEYS, emptyEvs } from "./pokemonSystem.js";
import { pokemonEngagement } from "./buildingSystem.js";
import { ensureStartersSeen } from "./pokedex.js";

/**
 * Výběr startovního Pokémona – jen dokud je kolekce prázdná.
 * @param {string} speciesId
 * @returns {boolean}
 */
export function chooseStarter(speciesId) {
  const s = getState();
  if (s.collection.length > 0) return false;
  const p = createPokemon(speciesId, 5, { caughtBall: "poke" }); // startér přichází v Poké Ballu
  s.collection.push(p);
  s.team.push(p.uid);
  ensureStartersSeen(); // všechny startéry jsme viděli na výběrové obrazovce
  commit();
  return true;
}

/** Máš už tento druh v kolekci? (Každý druh lze vlastnit jen 1×.) */
export function ownsSpecies(speciesId) {
  return getState().collection.some((p) => p.speciesId === speciesId);
}

/**
 * Zlepšil by tento (nově získaný) jedinec IV existujícího jedince téhož druhu?
 * Používá autocatch filtr „lepší IV" i UI. Nemutuje. Když druh nemáš, vrací
 * false (to je „nový druh", řeší se zvlášť).
 * @param {import("../core/state.js").OwnedPokemon} pokemon
 * @returns {boolean}
 */
export function ivWouldImprove(pokemon) {
  const existing = getState().collection.find((p) => p.speciesId === pokemon.speciesId);
  if (!existing) return false;
  return STAT_KEYS.some((k) => (pokemon.ivs?.[k] ?? 0) > (existing.ivs?.[k] ?? 0));
}

/**
 * Získá jedince do kolekce podle pravidla „1 kus na druh, sluč lepší hodnoty":
 *  - když druh ještě nemáš → přidá se do kolekce,
 *  - když už ho máš → do stávajícího jedince se přepíšou LEPŠÍ hodnoty
 *    (per-stat vyšší IV/EV, shiny), level a XP zůstávají stávajícímu; nově
 *    získaný jedinec se „pustí" (nepřidává se). Zdroj: rozhodnutí R-018.
 * @param {import("../core/state.js").OwnedPokemon} pokemon nově získaný jedinec
 * @returns {{ added: boolean, released: boolean, pokemon: import("../core/state.js").OwnedPokemon, improvements: string[] }}
 */
export function acquirePokemon(pokemon) {
  const s = getState();
  const existing = s.collection.find((p) => p.speciesId === pokemon.speciesId);
  if (!existing) {
    s.collection.push(pokemon);
    commit();
    return { added: true, released: false, pokemon, improvements: [] };
  }

  // Merge: přenes jen lepší hodnoty do stávajícího jedince.
  if (!existing.ivs) existing.ivs = { ...(pokemon.ivs ?? {}) };
  if (!existing.evs) existing.evs = emptyEvs();
  const improvements = [];
  if (pokemon.shiny && !existing.shiny) {
    existing.shiny = true;
    improvements.push("shiny");
  }
  for (const k of STAT_KEYS) {
    if ((pokemon.ivs?.[k] ?? 0) > (existing.ivs[k] ?? 0)) {
      existing.ivs[k] = pokemon.ivs[k];
      improvements.push(`IV ${k}`);
    }
    if ((pokemon.evs?.[k] ?? 0) > (existing.evs[k] ?? 0)) {
      existing.evs[k] = pokemon.evs[k];
      improvements.push(`EV ${k}`);
    }
  }
  commit();
  return { added: false, released: true, pokemon: existing, improvements };
}

/**
 * Přidá jedince z kolekce do týmu.
 * @param {string} uid
 * @returns {boolean}
 */
export function addToTeam(uid) {
  const s = getState();
  if (s.team.includes(uid)) return false;
  if (s.team.length >= MAX_TEAM_SIZE) return false;
  if (!s.collection.some((p) => p.uid === uid)) return false;
  // Jedinec může být jen na jednom místě: ve Školce (výcvik) nebo breedingu
  // ho nejdřív musíš vyzvednout. UI ho jako přidatelného ani nenabízí.
  if (pokemonEngagement(uid)) return false;
  s.team.push(uid);
  commit();
  return true;
}

/**
 * Odebere jedince z týmu (zůstává v kolekci).
 * @param {string} uid
 * @returns {boolean}
 */
export function removeFromTeam(uid) {
  const s = getState();
  const i = s.team.indexOf(uid);
  if (i === -1) return false;
  s.team.splice(i, 1);
  commit();
  return true;
}

/**
 * Posune jedince v týmu doleva (-1) nebo doprava (+1).
 * @param {string} uid
 * @param {number} dir
 * @returns {boolean}
 */
export function moveInTeam(uid, dir) {
  const s = getState();
  const i = s.team.indexOf(uid);
  if (i === -1) return false;
  const j = i + dir;
  if (j < 0 || j >= s.team.length) return false;
  [s.team[i], s.team[j]] = [s.team[j], s.team[i]];
  commit();
  return true;
}

/**
 * Vrátí jedince aktivního týmu ve správném pořadí.
 * @returns {import("../core/state.js").OwnedPokemon[]}
 */
export function getTeamPokemon() {
  const s = getState();
  return s.team
    .map((uid) => s.collection.find((p) => p.uid === uid))
    .filter(Boolean);
}

/** Je daný jedinec v týmu? */
export function isInTeam(uid) {
  return getState().team.includes(uid);
}
