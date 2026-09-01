/**
 * pokemonSystem.js – vytváření konkrétních jedinců Pokémonů (instancí) a
 * výpočet jejich bojových statů z base statů druhu, levelu, IV a EV.
 *
 * Druhy (species) jsou data (data/pokemon.js). Zde z nich vyrábíme konkrétní
 * jedince s vlastním uid, levelem, XP a individuálními hodnotami:
 *  - IV (Individual Values): 0–31 na stat, náhodné a neměnné při vzniku jedince.
 *  - EV (Effort Values): 0–252 na stat (max 510 celkem). NEROSTOU ze soubojů –
 *    budou se získávat ve speciálním tréninku (budoucí budova Training Grounds).
 *    Zde je jen datové pole, příspěvek do statů a tréninková funkce addEv().
 *  - shiny: vzácná barevná varianta (kosmetika, náhodné při vzniku).
 * Vzorec je zpětně kompatibilní: chybí-li IV/EV (staré save), berou se jako 0
 * a staty vyjdou stejně jako dřív.
 */

import { getSpecies } from "../../data/pokemon.js";
import { getLearnset, movesAtLevel } from "../../data/learnsets.js";
import { getMove } from "../../data/moves.js";
import { getState } from "../core/state.js";

let counter = 0;

/** Klíče statů v pevném pořadí (sdíleno napříč IV/EV). */
export const STAT_KEYS = ["hp", "attack", "defense", "spAttack", "spDefense", "speed"];

/** Maximální IV na jeden stat. */
export const IV_MAX = 31;
/** Maximální EV na jeden stat. */
export const EV_MAX_PER_STAT = 252;
/** Maximální součet EV přes všechny staty. */
export const EV_MAX_TOTAL = 510;
/** Šance na shiny při vzniku jedince (laditelné). Klasická hodnota z her. */
export const SHINY_CHANCE = 1 / 8192;

/** Maximální počet tahů, které může jedinec současně znát. */
export const MAX_MOVES = 4;

/**
 * Výchozí tahy jedince daného druhu na daném levelu (z learnsetu, plné PP).
 * Vrací pole slotů `{ id, pp, maxPp }` (0–4). Sdíleno vznikem i migrací save.
 * @param {string} speciesId
 * @param {number} level
 * @returns {Array<{ id: string, pp: number, maxPp: number }>}
 */
export function defaultMovesFor(speciesId, level) {
  return movesAtLevel(speciesId, level).map((id) => {
    const mv = getMove(id);
    const pp = mv?.pp ?? 0;
    return { id, pp, maxPp: pp };
  });
}

/**
 * Naučí jedince tahy, které se jeho druh učí v rozsahu levelů (prevLevel, level].
 * Přidává do VOLNÝCH slotů (max 4); když jsou plné, tah se NEzahazuje – zařadí se
 * do fronty `moveLearnQueue` a hráč později zvolí nahrazení (viz moveLearnView).
 * Mutuje jedince, vrací nově naučené id (jen ty rovnou přidané do volných slotů).
 * @param {import("../core/state.js").OwnedPokemon} pokemon
 * @param {number} prevLevel  level PŘED level-upem
 * @returns {string[]} id tahů, které se nově naučil
 */
export function learnLevelUpMoves(pokemon, prevLevel) {
  if (!Array.isArray(pokemon.moves)) pokemon.moves = [];
  const learned = [];
  for (const entry of getLearnset(pokemon.speciesId)) {
    if (entry.level <= prevLevel || entry.level > pokemon.level) continue; // mimo rozsah
    if (pokemon.moves.some((m) => m.id === entry.id)) continue; // už umí
    const mv = getMove(entry.id);
    if (!mv) continue;
    if (pokemon.moves.length >= MAX_MOVES) {
      queueMoveLearn(pokemon.uid, entry.id); // plné sloty → nabídnout nahrazení později
      continue;
    }
    pokemon.moves.push({ id: entry.id, pp: mv.pp, maxPp: mv.pp });
    learned.push(entry.id);
  }
  return learned;
}

/**
 * Vrátí frontu čekajících nabídek naučení tahu (lazy inicializace na stavu).
 * @returns {Array<{ uid: string, moveId: string }>}
 */
export function getMoveLearnQueue() {
  const s = getState();
  if (!Array.isArray(s.moveLearnQueue)) s.moveLearnQueue = [];
  return s.moveLearnQueue;
}

/**
 * Zařadí nabídku „jedinec chce nový tah, ale má plno" do fronty (bez duplikátů).
 * Nekomituje – persistne ji až commit() volajícího kontextu (souboj/idle/load).
 * @param {string} uid
 * @param {string} moveId
 */
export function queueMoveLearn(uid, moveId) {
  const q = getMoveLearnQueue();
  if (q.some((e) => e.uid === uid && e.moveId === moveId)) return; // už čeká
  q.push({ uid, moveId });
}

/**
 * Vyřeší jednu nabídku z fronty: buď nahradí tah na `replaceIndex`, nebo
 * (replaceIndex == null / -1) se hráč tahu vzdá. Vždy nabídku z fronty odebere.
 * Nekomituje – volající (UI) po výsledku zavolá commit().
 * @param {string} uid
 * @param {string} moveId
 * @param {number|null} [replaceIndex]  index slotu 0–3 k přepsání, nebo null/-1 = zahodit
 * @returns {{ ok: boolean, replaced?: boolean }}
 */
export function resolveMoveLearn(uid, moveId, replaceIndex = null) {
  const q = getMoveLearnQueue();
  const i = q.findIndex((e) => e.uid === uid && e.moveId === moveId);
  if (i >= 0) q.splice(i, 1); // odeber nabídku ať už dopadne jakkoli
  const owned = getState().collection.find((p) => p.uid === uid);
  if (!owned) return { ok: false };
  if (replaceIndex == null || replaceIndex < 0) return { ok: true, replaced: false }; // vzdal se
  const mv = getMove(moveId);
  if (!mv) return { ok: false };
  if (!Array.isArray(owned.moves)) owned.moves = [];
  if (owned.moves.some((m) => m.id === moveId)) return { ok: true, replaced: false }; // mezitím už umí
  const slot = { id: moveId, pp: mv.pp, maxPp: mv.pp };
  if (replaceIndex >= owned.moves.length) owned.moves.push(slot);
  else owned.moves[replaceIndex] = slot;
  return { ok: true, replaced: true };
}

/** Vygeneruje rozumně unikátní uid pro jedince. */
function makeUid(speciesId) {
  return `${speciesId}-${Date.now().toString(36)}-${(counter++).toString(36)}`;
}

/** Náhodné IV (0–31) pro každý stat. */
export function randomIvs() {
  const ivs = {};
  for (const k of STAT_KEYS) ivs[k] = Math.floor(Math.random() * (IV_MAX + 1));
  return ivs;
}

/**
 * Dědičnost IV pro breeding: `count` náhodně vybraných statů se zdědí (každý po
 * náhodně vybraném rodiči), zbylé staty se hodí náhodně. Losuje se až při
 * vylíhnutí (genetika-at-hatch, R-021), takže konkrétní hodnoty jsou překvapení.
 * @param {Array<object|undefined>} parents  IV objekty rodičů (mohou být i 1)
 * @param {number} [count=3]  kolik statů zdědit (budoucí Destiny Knot = 5)
 * @returns {object} IV objekt potomka
 */
export function inheritIvs(parents, count = 3) {
  const ivs = randomIvs();
  const pool = (parents ?? []).filter(Boolean);
  if (pool.length === 0) return ivs;
  // Zamíchej klíče a vezmi prvních `count` – ty se zdědí.
  const keys = [...STAT_KEYS];
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  for (const k of keys.slice(0, Math.max(0, Math.min(count, keys.length)))) {
    const parent = pool[Math.floor(Math.random() * pool.length)];
    if (parent[k] != null) ivs[k] = parent[k];
  }
  return ivs;
}

/** Prázdné EV (0 pro každý stat). */
export function emptyEvs() {
  const evs = {};
  for (const k of STAT_KEYS) evs[k] = 0;
  return evs;
}

/** Hodí si na shiny. @param {number} [chance] */
export function rollShiny(chance = SHINY_CHANCE) {
  return Math.random() < chance;
}

/**
 * Rozlosuje pohlaví jedince podle poměru pohlaví druhu (`genderRatio`).
 * @param {import("../../data/pokemon.js").Species} species
 * @returns {"m"|"f"|"genderless"}
 */
export function rollGender(species) {
  const g = species?.genderRatio;
  if (!g || g === "genderless") return "genderless";
  return Math.random() < g.m ? "m" : "f";
}

/**
 * Vytvoří nového jedince daného druhu.
 * @param {string} speciesId
 * @param {number} [level=5]
 * @param {{ ivs?: object, evs?: object, shiny?: boolean, shinyChance?: number, caughtBall?: string, gender?: "m"|"f"|"genderless" }} [opts]
 *        volitelné přepsání (využijí líhnutí/breeding pro lepší IV apod.);
 *        caughtBall = id ballu, ve kterém byl chycen (u startéra „poke",
 *        u divokých se doplní až při chycení, u vylíhnutých zůstane prázdné);
 *        gender = pohlaví (jinak se rozlosuje z genderRatio druhu)
 * @returns {import("../core/state.js").OwnedPokemon}
 */
export function createPokemon(speciesId, level = 5, opts = {}) {
  const species = getSpecies(speciesId);
  if (!species) throw new Error(`Neznámý druh Pokémona: ${speciesId}`);
  const p = {
    uid: makeUid(speciesId),
    speciesId,
    level,
    xp: 0,
    ivs: opts.ivs ?? randomIvs(),
    evs: opts.evs ?? emptyEvs(),
    shiny: opts.shiny ?? rollShiny(opts.shinyChance),
    caughtBall: opts.caughtBall ?? null,
    gender: opts.gender ?? rollGender(species),
    hp: 0, // doplní se níž na plné max HP
    moves: defaultMovesFor(speciesId, level), // tahy z learnsetu (plné PP)
  };
  p.hp = computeStats(p).maxHp; // nový jedinec začíná s plným HP
  return p;
}

/**
 * Spočítá aktuální bojové staty jedince z base statů druhu, levelu, IV a EV.
 * (Zjednodušený vzorec inspirovaný Pokémon hrami, bez povah.)
 * @param {import("../core/state.js").OwnedPokemon} pokemon
 * @returns {{ maxHp:number, attack:number, defense:number, spAttack:number, spDefense:number, speed:number }}
 */
export function computeStats(pokemon) {
  const species = getSpecies(pokemon.speciesId);
  if (!species) throw new Error(`Neznámý druh Pokémona: ${pokemon.speciesId}`);
  const b = species.baseStats;
  const lvl = pokemon.level;
  const iv = pokemon.ivs ?? {};
  const ev = pokemon.evs ?? {};
  // Efektivní základ pro daný stat = 2*base + IV + floor(EV/4).
  const eff = (base, key) => 2 * base + (iv[key] ?? 0) + Math.floor((ev[key] ?? 0) / 4);
  const stat = (base, key) => Math.floor((eff(base, key) * lvl) / 100) + 5;
  return {
    maxHp: Math.floor((eff(b.hp, "hp") * lvl) / 100) + lvl + 10,
    attack: stat(b.attack, "attack"),
    defense: stat(b.defense, "defense"),
    spAttack: stat(b.spAttack, "spAttack"),
    spDefense: stat(b.spDefense, "spDefense"),
    speed: stat(b.speed, "speed"),
  };
}

/** Součet IV jedince (max 6×31 = 186). */
export function ivTotal(pokemon) {
  const iv = pokemon.ivs ?? {};
  return STAT_KEYS.reduce((s, k) => s + (iv[k] ?? 0), 0);
}

/** IV kvalita jedince v procentech (0–100). */
export function ivPercent(pokemon) {
  return Math.round((ivTotal(pokemon) / (IV_MAX * STAT_KEYS.length)) * 100);
}

/** Součet EV jedince (max 510). */
export function evTotal(pokemon) {
  const ev = pokemon.evs ?? {};
  return STAT_KEYS.reduce((s, k) => s + (ev[k] ?? 0), 0);
}

/**
 * Trénink: přičte EV do konkrétního statu s respektem k oběma stropům
 * (na stat i celkem). Mutuje jedince. Toto je seam pro budoucí Training Grounds.
 * @param {import("../core/state.js").OwnedPokemon} pokemon
 * @param {string} key   klíč statu (viz STAT_KEYS)
 * @param {number} amount  kolik EV zkusit přidat
 * @returns {number} kolik EV se skutečně přičetlo
 */
export function addEv(pokemon, key, amount) {
  if (!STAT_KEYS.includes(key)) return 0;
  if (!pokemon.evs) pokemon.evs = emptyEvs();
  const total = evTotal(pokemon);
  const roomTotal = EV_MAX_TOTAL - total;
  if (roomTotal <= 0) return 0;
  const roomStat = EV_MAX_PER_STAT - (pokemon.evs[key] ?? 0);
  const add = Math.max(0, Math.min(amount, roomStat, roomTotal));
  pokemon.evs[key] = (pokemon.evs[key] ?? 0) + add;
  return add;
}
