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
 * Vytvoří nového jedince daného druhu.
 * @param {string} speciesId
 * @param {number} [level=5]
 * @param {{ ivs?: object, evs?: object, shiny?: boolean, shinyChance?: number }} [opts]
 *        volitelné přepsání (využijí líhnutí/breeding pro lepší IV apod.)
 * @returns {import("../core/state.js").OwnedPokemon}
 */
export function createPokemon(speciesId, level = 5, opts = {}) {
  const species = getSpecies(speciesId);
  if (!species) throw new Error(`Neznámý druh Pokémona: ${speciesId}`);
  return {
    uid: makeUid(speciesId),
    speciesId,
    level,
    xp: 0,
    ivs: opts.ivs ?? randomIvs(),
    evs: opts.evs ?? emptyEvs(),
    shiny: opts.shiny ?? rollShiny(opts.shinyChance),
  };
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
