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
import { getLearnset, learnableMovesAtLevel } from "../../data/learnsets.js";
import { getMove } from "../../data/moves.js";
import { NATURES, getNature, NATURE_UP_MULT, NATURE_DOWN_MULT } from "../../data/natures.js";
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
  const ids = balancedMovesetIds(learnableMovesAtLevel(speciesId, level).map((e) => e.id));
  return ids.map((id) => {
    const mv = getMove(id);
    const pp = mv?.pp ?? 0;
    return { id, pp, maxPp: pp };
  });
}

/** Je tah útočný (má sílu > 0)? Status tahy mají power 0/undefined. */
function isAttackingMove(moveId) {
  return (getMove(moveId)?.power ?? 0) > 0;
}

/** Ubližuje tah sám svému uživateli (recoil – take-down, double-edge…)? Auto
 *  režim si ho NIKDY sám nenaučí ani nevybere; v manuálu si ho hráč může zvolit. */
function isSelfHarmingMove(moveId) {
  return getMove(moveId)?.effect?.kind === "recoil";
}

/**
 * Vybere „bojeschopnou" sadu ≤ MAX_MOVES tahů z kandidátů: ÚTOČNÉ tahy mají
 * přednost (zaplní klidně všechny sloty), status tahy jen doplní zbylé sloty.
 * Díky tomu jedinec nikdy neskončí s převahou statusů (např. „3 status + 1
 * útok"), což je fatální hlavně v auto režimu – neměl by čím ubírat HP a souboj
 * by uvízl. Kandidáti se berou v pořadí ROSTOUCÍ priority (poslední = nejvyšší
 * priorita, typicky nejnovější naučené tahy).
 * @param {string[]} candidateIds
 * @returns {string[]} id tahů (útočné first), ≤ MAX_MOVES, bez duplikátů
 */
function balancedMovesetIds(candidateIds) {
  const uniq = [...new Set(candidateIds)].filter((id) => getMove(id));
  const status = uniq.filter((id) => !isAttackingMove(id));
  // Útočné tahy: sebe-poškozující (recoil) do auto sady NIKDY nedáváme – jen jako
  // fallback, kdyby jinak nebylo čím útočit (jedinec nesmí uvíznout bez damage).
  const attackingSafe = uniq.filter((id) => isAttackingMove(id) && !isSelfHarmingMove(id));
  const attacking = attackingSafe.length ? attackingSafe : uniq.filter((id) => isAttackingMove(id));
  const chosen = attacking.slice(-MAX_MOVES);
  const statusSlots = Math.max(0, MAX_MOVES - chosen.length);
  for (const id of status.slice(-statusSlots)) chosen.push(id);
  return chosen;
}

/**
 * Oprava „slabé" sady (např. dřívější bug: 3 status + 1 útok). Zasáhne JEN
 * jedince s ≤ 1 útočným tahem (hrozí zaseknutí – v auto souboji nemá čím ubírat
 * HP) A jen když z learnsetu/stávajících tahů jde získat VÍC útočných tahů.
 * Záměrné vyvážené sady (2+ útoky) nechává být. Zachovává PP. Mutuje jedince.
 * @param {import("../core/state.js").OwnedPokemon} pokemon
 * @returns {boolean} true, pokud sadu opravil
 */
export function repairWeakMoveset(pokemon) {
  if (!pokemon || !Array.isArray(pokemon.moves) || !pokemon.moves.length) return false;
  const attacks = pokemon.moves.filter((m) => isAttackingMove(m.id)).length;
  if (attacks >= 2) return false; // dost útočných tahů → nesahat
  const pool = [
    ...learnableMovesAtLevel(pokemon.speciesId, pokemon.level).map((e) => e.id),
    ...pokemon.moves.map((m) => m.id),
  ];
  const balanced = balancedMovesetIds(pool);
  const newAttacks = balanced.filter((id) => isAttackingMove(id)).length;
  if (newAttacks <= attacks) return false; // víc útočných stejně nezískáme
  setActiveMoves(pokemon, balanced);
  return true;
}

/**
 * Naučí jedince tahy, které se jeho druh učí v rozsahu levelů (prevLevel, level].
 *  - `auto` (auto battle / offline / Školka): celou sadu přeskládá na „útočné-
 *    first" (viz {@link balancedMovesetIds}), aby měl jedinec vždy čím útočit –
 *    bez otravování hráče; ignoruje prevLevel (přepočítá dle aktuálního levelu).
 *  - jinak (manuální souboj): přidá do VOLNÝCH slotů (max 4), a při PLNÝCH
 *    slotech tah NEzahazuje – zařadí do fronty `moveLearnQueue` a hráč později
 *    zvolí nahrazení (viz moveLearnView).
 * Mutuje jedince, vrací nově naučené id.
 * @param {import("../core/state.js").OwnedPokemon} pokemon
 * @param {number} prevLevel  level PŘED level-upem
 * @param {{ auto?: boolean }} [opts]
 * @returns {string[]} id tahů, které se nově naučil
 */
export function learnLevelUpMoves(pokemon, prevLevel, { auto = false } = {}) {
  if (!Array.isArray(pokemon.moves)) pokemon.moves = [];
  if (auto) {
    // AUTO režim (auto battle / offline / Školka): celou sadu přeskládá na
    // „útočné-first" (viz balancedMovesetIds), aby měl jedinec VŽDY čím útočit a
    // souboj neuvázl (žádné „3 status + 1 útok"). Kandidáti = tahy naučitelné do
    // aktuálního levelu + ty, které už umí (zachová i egg/TM tahy mimo learnset).
    // Tím se navíc při dalším level-upu OPRAVÍ i sady pokažené dřívější verzí.
    const before = new Set(pokemon.moves.map((m) => m.id));
    const pool = [
      ...learnableMovesAtLevel(pokemon.speciesId, pokemon.level).map((e) => e.id),
      ...pokemon.moves.map((m) => m.id),
    ];
    setActiveMoves(pokemon, balancedMovesetIds(pool));
    return pokemon.moves.filter((m) => !before.has(m.id)).map((m) => m.id);
  }
  const learned = [];
  for (const entry of getLearnset(pokemon.speciesId)) {
    if (entry.level <= prevLevel || entry.level > pokemon.level) continue; // mimo rozsah
    if (pokemon.moves.some((m) => m.id === entry.id)) continue; // už umí
    const mv = getMove(entry.id);
    if (!mv) continue;
    if (pokemon.moves.length >= MAX_MOVES) {
      queueMoveLearn(pokemon.uid, entry.id); // manuál → nabídnout nahrazení později
      continue;
    }
    pokemon.moves.push({ id: entry.id, pp: mv.pp, maxPp: mv.pp });
    learned.push(entry.id);
  }
  return learned;
}

/**
 * Přenastaví AKTIVNÍ tahy jedince na zvolenou sadu (max 4) – pro Move Tutor
 * (přeučení/prohození už naučitelných tahů, i po evoluci). Zachovává PP u tahů,
 * které jedinec už měl; nové tahy dostanou plné PP. Nekontroluje learnset – to
 * dělá volající (UI nabídne jen naučitelné). Mutuje jedince (bez commit).
 * @param {import("../core/state.js").OwnedPokemon} pokemon
 * @param {string[]} moveIds  id tahů, které mají být aktivní (v pořadí slotů)
 */
export function setActiveMoves(pokemon, moveIds) {
  const prev = new Map((pokemon.moves ?? []).map((m) => [m.id, m]));
  const next = [];
  for (const id of moveIds.slice(0, MAX_MOVES)) {
    const mv = getMove(id);
    if (!mv) continue;
    if (next.some((m) => m.id === id)) continue; // bez duplikátů
    const keep = prev.get(id);
    next.push(keep ? { id, pp: keep.pp, maxPp: keep.maxPp ?? mv.pp } : { id, pp: mv.pp, maxPp: mv.pp });
  }
  pokemon.moves = next;
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

/** Náhodně vybere povahu jedince (id z data/natures.js). */
export function randomNature() {
  return NATURES[Math.floor(Math.random() * NATURES.length)].id;
}

/**
 * Násobitel statu daný povahou: 1.1 pro zvednutý, 0.9 pro snížený, jinak 1.
 * HP povaha neovlivňuje nikdy (žádná povaha nemá up/down = "hp").
 * @param {string} natureId
 * @param {string} key  klíč statu (viz STAT_KEYS)
 * @returns {number}
 */
export function natureMultiplier(natureId, key) {
  const n = getNature(natureId);
  if (n.up === key && n.down !== key) return NATURE_UP_MULT;
  if (n.down === key && n.up !== key) return NATURE_DOWN_MULT;
  return 1;
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
 * @param {{ ivs?: object, evs?: object, shiny?: boolean, shinyChance?: number, caughtBall?: string, gender?: "m"|"f"|"genderless", nature?: string }} [opts]
 *        volitelné přepsání (využijí líhnutí/breeding pro lepší IV apod.);
 *        caughtBall = id ballu, ve kterém byl chycen (u startéra „poke",
 *        u divokých se doplní až při chycení, u vylíhnutých zůstane prázdné);
 *        gender = pohlaví (jinak se rozlosuje z genderRatio druhu);
 *        nature = povaha (jinak se rozlosuje náhodně)
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
    nature: opts.nature ?? randomNature(),
    shiny: opts.shiny ?? rollShiny(opts.shinyChance),
    caughtBall: opts.caughtBall ?? null,
    gender: opts.gender ?? rollGender(species),
    hp: 0, // doplní se níž na plné max HP
    moves: defaultMovesFor(speciesId, level), // tahy z learnsetu (plné PP)
    heldItem: null, // žádný drženou item na začátku
  };
  p.hp = computeStats(p).maxHp; // nový jedinec začíná s plným HP
  return p;
}

/**
 * Spočítá aktuální bojové staty jedince z base statů druhu, levelu, IV, EV a povahy.
 * (Zjednodušený vzorec inspirovaný Pokémon hrami; povaha ±10 % na jeden stat,
 * HP nikdy neovlivňuje – přesně jako v kanonu.)
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
  const nat = pokemon.nature ?? "hardy";
  // Efektivní základ pro daný stat = 2*base + IV + floor(EV/4).
  const eff = (base, key) => 2 * base + (iv[key] ?? 0) + Math.floor((ev[key] ?? 0) / 4);
  // Non-HP stat = floor((základ * povaha)); povaha se aplikuje až na hotový stat
  // (klasické pořadí: nejdřív base výpočet, pak zaokrouhlené ×0.9/×1.1).
  const stat = (base, key) =>
    Math.floor((Math.floor((eff(base, key) * lvl) / 100) + 5) * natureMultiplier(nat, key));
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
