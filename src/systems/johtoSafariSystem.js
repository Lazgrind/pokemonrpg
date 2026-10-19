/**
 * johtoSafariSystem.js – Safari Zone Johta (HeartGold/SoulSilver), samostatný engine.
 *
 * Nesdílí nic s kantskou Safari (systems/safariSystem.js). Pravidla a data viz
 * data/gen2/safari.js:
 *  • Vstupné → 30 Safari Ballů, bez limitu kroků. Výprava končí, když dojdou Bally
 *    nebo když odejdeš (i odchodem z uzlu mapy).
 *  • Vybereš si oblast (Plains, Meadow, Forest…). Idle tik občas přivede Pokémona
 *    z oblasti; čeká se na tvé rozhodnutí (Bait / Rock / Safari Ball / Run).
 *  • Bloky: v každé oblasti si rozmístíš trávu / stromy / kameny / vodu (počet míst
 *    roste s počtem výprav). Druhy s podmínkou se objeví, až má oblast dost bloků
 *    a od poslední přestavby uběhlo dost „dní" (SAFARI_DAY_MS).
 *
 * Stav: `state.johtoSafari` = { active, areaId, balls, encounter, visits, layouts }.
 *   layouts: { [areaId]: { grass, tree, rock, water, since } } – since = čas přestavby.
 */

import { getState, commit } from "../core/state.js";
import { bus, EVENTS } from "../core/events.js";
import { getSpecies } from "../../data/pokemon.js";
import { createPokemon } from "./pokemonSystem.js";
import { acquirePokemon } from "./team.js";
import {
  JOHTO_SAFARI_AREAS,
  JOHTO_SAFARI_FEE,
  JOHTO_SAFARI_BALLS,
  JOHTO_SAFARI_STARTERS,
  JOHTO_SAFARI_STARTER_CHANCE,
  SAFARI_BLOCKS,
  SAFARI_DAY_MS,
  blockSlotsFor,
} from "../../data/gen2/safari.js";

/* ------------------------------- Konstanty ------------------------------- */

const ENCOUNTER_CHANCE = 0.35; // šance na setkání za tik (když nikoho nemáš)
const TICK_MS = 900; // délka idle tiku výpravy
const BASE_WEIGHT = 3; // druh, který v oblasti žije vždy
const BONUS_WEIGHT = 1; // druh přilákaný bloky (vzácnější)

// Chytání (BEZ oslabení HP – nebojuje se): base × rarita × ball × mód. Stejné hodnoty
// jako kantská Safari, ať se obě chytají podobně – ale vlastní kopie, engine je samostatný.
const BASE_CATCH = 0.36;
const BALL_MULT = 1.5;
const RARITY_CATCH_MULT = { common: 1, uncommon: 0.85, rare: 0.6, epic: 0.45, legendary: 0.3 };
const FLEE_BASE = { common: 0.06, uncommon: 0.1, rare: 0.16, epic: 0.24, legendary: 0.34 };
const BAIT_CATCH = 0.6, BAIT_FLEE = 0.5;
const ROCK_CATCH = 1.8, ROCK_FLEE = 2.0;
const MOD_MIN = 0.25, MOD_MAX = 4;

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const clampMod = (m) => Math.max(MOD_MIN, Math.min(MOD_MAX, m));
const BLOCK_IDS = SAFARI_BLOCKS.map((b) => b.id);

/* ------------------------------- Stav ------------------------------------ */

/** Vrátí (a lazy-inicializuje) stav johtské Safari. */
export function getJohtoSafari() {
  const s = getState();
  if (!s.johtoSafari || typeof s.johtoSafari !== "object") {
    s.johtoSafari = { active: false, areaId: "plains", balls: 0, encounter: null, visits: 0, layouts: {} };
  }
  const js = s.johtoSafari;
  if (!js.layouts || typeof js.layouts !== "object") js.layouts = {};
  if (!getSafariArea(js.areaId)) js.areaId = JOHTO_SAFARI_AREAS[0].id;
  return js;
}

export function isJohtoSafariActive() {
  return !!getState().johtoSafari?.active;
}

/** Definice oblasti podle id. */
export function getSafariArea(areaId) {
  return JOHTO_SAFARI_AREAS.find((a) => a.id === areaId) ?? null;
}

/** Rozmístění bloků v oblasti (vždy úplný objekt). */
export function getLayout(areaId) {
  const l = getJohtoSafari().layouts[areaId] ?? {};
  const out = { since: typeof l.since === "number" ? l.since : 0 };
  for (const id of BLOCK_IDS) out[id] = Math.max(0, l[id] | 0);
  return out;
}

/** Kolik bloků jde v každé oblasti rozmístit (roste s počtem výprav). */
export function blockSlots() {
  return blockSlotsFor(getJohtoSafari().visits);
}

/** Celé dny od poslední přestavby oblasti (bez bloků = 0). */
export function daysSinceLayout(areaId, now = Date.now()) {
  const l = getLayout(areaId);
  if (!l.since) return 0;
  return Math.max(0, Math.floor((now - l.since) / SAFARI_DAY_MS));
}

/** Splňuje oblast podmínku druhu (bloky + dny)? */
export function speciesAvailable(areaId, sp, now = Date.now()) {
  const l = getLayout(areaId);
  for (const [block, n] of Object.entries(sp.need ?? {})) if ((l[block] ?? 0) < n) return false;
  if (sp.days && daysSinceLayout(areaId, now) < sp.days) return false;
  return true;
}

/** Druhy, které se teď v oblasti můžou objevit. */
export function availableSpecies(areaId, now = Date.now()) {
  const area = getSafariArea(areaId);
  return area ? area.species.filter((sp) => speciesAvailable(areaId, sp, now)) : [];
}

/**
 * Změní počet bloku v oblasti o `delta` (+1 / −1). Každá přestavba vynuluje
 * počítadlo dní – Pokémoni si na nové prostředí musí zvyknout (jako v HGSS).
 */
export function changeBlock(areaId, blockId, delta) {
  if (!getSafariArea(areaId) || !BLOCK_IDS.includes(blockId)) return { ok: false };
  const js = getJohtoSafari();
  const l = getLayout(areaId);
  const used = BLOCK_IDS.reduce((sum, id) => sum + l[id], 0);
  const next = l[blockId] + delta;
  if (next < 0) return { ok: false };
  if (delta > 0 && used >= blockSlots()) {
    return { ok: false, reason: `This area has room for only ${blockSlots()} blocks. More room opens up as you keep visiting.` };
  }
  l[blockId] = next;
  l.since = Date.now();
  js.layouts[areaId] = l;
  commit();
  return { ok: true };
}

/* ----------------------------- Idle časovač ------------------------------ */

let timer = null;

/** Rozjede tik výpravy, pokud běží a ještě netiká (volá i view po reloadu). */
export function ensureJohtoSafariTicking() {
  if (timer || !isJohtoSafariActive()) return;
  timer = setInterval(tick, TICK_MS);
}

function stopTicking() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function tick() {
  const js = getJohtoSafari();
  if (!js.active) {
    stopTicking();
    return;
  }
  if (js.encounter) return; // čeká se na tvé rozhodnutí
  if (Math.random() < ENCOUNTER_CHANCE) {
    spawnEncounter(js);
    commit();
  }
}

function pickWeighted(list) {
  const total = list.reduce((sum, x) => sum + x.w, 0);
  let r = Math.random() * total;
  for (const x of list) {
    r -= x.w;
    if (r < 0) return x.id;
  }
  return list[list.length - 1]?.id;
}

function spawnEncounter(js) {
  const area = getSafariArea(js.areaId) ?? JOHTO_SAFARI_AREAS[0];
  const lv = (range) => randInt(range[0], range[1]);
  if (getState().story?.isJohtoChampion && Math.random() < JOHTO_SAFARI_STARTER_CHANCE) {
    const speciesId = JOHTO_SAFARI_STARTERS[Math.floor(Math.random() * JOHTO_SAFARI_STARTERS.length)];
    js.encounter = { speciesId, level: lv(area.level), catchMod: 1, fleeMod: 1 };
    return;
  }
  // Oblast bez bloků může být prázdná (Rocky Beach, Savannah – v HGSS tam Gen 2 chodí jen s bloky).
  const avail = availableSpecies(area.id);
  const speciesId = pickWeighted(avail.map((sp) => ({ id: sp.id, w: sp.need || sp.days ? BONUS_WEIGHT : BASE_WEIGHT })));
  if (!speciesId) return;
  const sp = avail.find((x) => x.id === speciesId);
  js.encounter = { speciesId, level: lv(sp.level ?? area.level), catchMod: 1, fleeMod: 1 };
}

/* ------------------------------ Životní cyklus --------------------------- */

/** Vstup: zaplať vstupné, dostaň Safari Bally, rozjeď výpravu ve zvolené oblasti. */
export function startJohtoSafari(areaId) {
  const s = getState();
  const js = getJohtoSafari();
  if (js.active) return { ok: false, reason: "You're already in the Safari Zone." };
  if (!s.resources) s.resources = {};
  if ((s.resources.gold ?? 0) < JOHTO_SAFARI_FEE) {
    return { ok: false, reason: `You need ${JOHTO_SAFARI_FEE}₽ for the entrance fee.` };
  }
  s.resources.gold -= JOHTO_SAFARI_FEE;
  js.active = true;
  js.balls = JOHTO_SAFARI_BALLS;
  js.encounter = null;
  if (getSafariArea(areaId)) js.areaId = areaId;
  js.visits = (js.visits ?? 0) + 1;
  if (!s.story) s.story = {};
  s.story.safariJohtoEntered = true;
  commit();
  ensureJohtoSafariTicking();
  return { ok: true };
}

/** Přesun do jiné oblasti během výpravy (zdarma; rozpracované setkání se ruší). */
export function moveToArea(areaId) {
  const js = getJohtoSafari();
  if (!getSafariArea(areaId)) return { ok: false };
  if (js.encounter) return { ok: false, reason: "Deal with this Pokémon first!" };
  js.areaId = areaId;
  commit();
  return { ok: true, msg: `You walk over to the ${getSafariArea(areaId).name}.` };
}

/** Ukončí výpravu. reason: "balls" | "leave" | "manual". */
export function endJohtoSafari(reason = "manual") {
  const js = getJohtoSafari();
  if (!js.active) return { ok: false };
  js.active = false;
  js.encounter = null;
  stopTicking();
  commit();
  if (reason === "balls") {
    bus.emit(EVENTS.STORY_POPUP, {
      title: "Out of Safari Balls",
      body: `<p class="story-text">That was your last Safari Ball. A ranger walks you back to the gate.</p>
        <p class="placeholder">Every Pokémon you caught is yours to keep. Your blocks stay where you put them — pay the fee to come back.</p>`,
      okLabel: "Back to the gate",
    });
  }
  return { ok: true };
}

/* ------------------------------ Akce v setkání --------------------------- */

function catchChance(enc) {
  const rarity = getSpecies(enc.speciesId)?.rarity ?? "common";
  const c = BASE_CATCH * (RARITY_CATCH_MULT[rarity] ?? 1) * BALL_MULT * enc.catchMod;
  return Math.max(0.02, Math.min(0.95, c));
}

/** Aktuální šance na chycení (pro UI). */
export function johtoCatchChance() {
  const enc = getJohtoSafari().encounter;
  return enc ? catchChance(enc) : 0;
}

function fleeChance(enc) {
  const rarity = getSpecies(enc.speciesId)?.rarity ?? "common";
  return Math.min(0.85, (FLEE_BASE[rarity] ?? 0.08) * enc.fleeMod);
}

function rollFlee(js, enc) {
  if (Math.random() < fleeChance(enc)) {
    js.encounter = null;
    return true;
  }
  return false;
}

const encName = (enc) => getSpecies(enc.speciesId)?.name ?? enc.speciesId;

/** Bait: míň utíká, hůř se chytá. */
export function johtoThrowBait() {
  const js = getJohtoSafari();
  const enc = js.encounter;
  if (!enc) return { ok: false, reason: "There's no Pokémon here." };
  const name = encName(enc);
  enc.fleeMod = clampMod(enc.fleeMod * BAIT_FLEE);
  enc.catchMod = clampMod(enc.catchMod * BAIT_CATCH);
  const fled = rollFlee(js, enc);
  commit();
  return { ok: true, msg: fled ? `${name} ate the bait… then fled!` : `${name} is eating the bait — it seems less wary.` };
}

/** Rock: líp se chytá, víc utíká. */
export function johtoThrowRock() {
  const js = getJohtoSafari();
  const enc = js.encounter;
  if (!enc) return { ok: false, reason: "There's no Pokémon here." };
  const name = encName(enc);
  enc.fleeMod = clampMod(enc.fleeMod * ROCK_FLEE);
  enc.catchMod = clampMod(enc.catchMod * ROCK_CATCH);
  const fled = rollFlee(js, enc);
  commit();
  return { ok: true, msg: fled ? `${name} was angered… and fled!` : `${name} is angry — easier to catch, but ready to bolt!` };
}

/** Safari Ball (spotřebuje 1). Úspěch → do kolekce; jinak možná uteče. */
export function johtoThrowBall() {
  const js = getJohtoSafari();
  const enc = js.encounter;
  if (!enc) return { ok: false, reason: "There's no Pokémon here." };
  if (js.balls <= 0) {
    endJohtoSafari("balls");
    return { ok: false, reason: "Out of Safari Balls!" };
  }
  js.balls -= 1;
  const name = encName(enc);
  if (Math.random() < catchChance(enc)) {
    const mon = createPokemon(enc.speciesId, enc.level, { caughtBall: "safari" });
    const res = acquirePokemon(mon); // commit uvnitř
    js.encounter = null;
    if (js.balls <= 0) endJohtoSafari("balls");
    else commit();
    const extra = res?.released ? " (a better one was already in your collection)" : "";
    return { ok: true, caught: true, msg: `Gotcha! ${name} was caught!${extra}` };
  }
  const fled = rollFlee(js, enc);
  if (js.balls <= 0) endJohtoSafari("balls");
  else commit();
  return { ok: true, caught: false, msg: fled ? `${name} broke free and fled!` : `Oh no! ${name} broke free!` };
}

/** Necháš Pokémona být. */
export function johtoRun() {
  const js = getJohtoSafari();
  const enc = js.encounter;
  if (!enc) return { ok: false };
  const name = encName(enc);
  js.encounter = null;
  commit();
  return { ok: true, msg: `You left ${name} alone.` };
}
