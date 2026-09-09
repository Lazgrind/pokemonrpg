/**
 * safariSystem.js – Safari Zone expedice (věrná Gen 1, přizpůsobená idle hře).
 *
 * Safari Zone se NEBOJUJE. Místo souboje běží samostatná „výprava":
 *  • Zaplatíš vstupné (gold) → dostaneš rozpočet KROKŮ a SAFARI BALLŮ.
 *  • Idle: každý tik uděláš pár kroků a občas narazíš na divokého Pokémona.
 *  • Chytání je věrné Safari: Bait (jídlo → míň utíká, hůř se chytá) / Rock
 *    (kámen → líp se chytá, víc utíká) / Safari Ball / Run.
 *  • Postupuješ do hloubky (4 oblasti). Ve 3. oblasti leží GOLD TEETH,
 *    ve 4. (Secret House) HM03 SURF – odměny za dojití, ne zadarmo.
 *  • Když dojdou kroky nebo Bally → „Ding! Time's up!" a vyhození ke vchodu
 *    (chycené Pokémony i sebrané itemy si necháš).
 *
 * Vlastní běhový stav žije v `state.safari` (serializuje se, ať přežije reload).
 * Tik řídí interní časovač (jako battleSystem.schedule) – rozjede se v
 * startSafari() a jako pojistka i z safariView (ensureTicking) po reloadu.
 */

import { getState, commit } from "../core/state.js";
import { bus, EVENTS } from "../core/events.js";
import { getSpecies } from "../../data/pokemon.js";
import { createPokemon } from "./pokemonSystem.js";
import { acquirePokemon } from "./team.js";

/* ------------------------------- Konstanty ------------------------------- */

export const SAFARI_FEE = 500; // vstupné (gold), věrné kánonu
export const SAFARI_STEPS = 500; // rozpočet kroků na jednu výpravu
export const SAFARI_BALLS = 30; // Safari Balls na jednu výpravu
export const MAX_DEPTH = 4; // 4 oblasti; Secret House (Surf) je ve 4.
const STEP_PER_TICK = 4; // kolik kroků ubere jeden idle tik
const GO_DEEPER_COST = 60; // kroky za přesun do hlubší oblasti
const ENCOUNTER_CHANCE = 0.4; // šance na setkání za tik (když nikoho nemáš)
const TICK_MS = 900; // délka idle tiku výpravy

// Chytání v Safari (BEZ oslabení HP – nebojuje se): base × rarita × ball × mód.
const SAFARI_BASE_CATCH = 0.36;
const SAFARI_BALL_MULT = 1.5; // Safari Ball je o něco lepší než Poké Ball
const RARITY_CATCH_MULT = { common: 1, uncommon: 0.85, rare: 0.6, epic: 0.45, legendary: 0.3 };
// Základní šance, že Pokémon po akci uteče (roste s vzácností).
const FLEE_BASE = { common: 0.06, uncommon: 0.1, rare: 0.16, epic: 0.24, legendary: 0.34 };
// Bait/Rock modifikátory (kumulativní, s clampem) – risk/reward.
const BAIT_CATCH = 0.6, BAIT_FLEE = 0.5; // jídlo: hůř chytit, míň utíká
const ROCK_CATCH = 1.8, ROCK_FLEE = 2.0; // kámen: líp chytit, víc utíká
const MOD_MIN = 0.25, MOD_MAX = 4;

// Hloubkové pooly (z data/areas.js safari-zone species). Hlouběji = vzácněji.
// Nekumulativní: vzácné druhy vyžadují dojít hloub (proto se vyplatí riskovat).
const SAFARI_AREAS = [
  ["nidoran-m", "nidoran-f", "paras", "venonat", "doduo"], // oblast 1 (vstup)
  ["nidorina", "nidorino", "exeggcute", "tangela", "paras"], // oblast 2
  ["parasect", "rhyhorn", "kangaskhan", "tangela", "dratini"], // oblast 3 (+ Gold Teeth; Dratini v rybníku)
  ["chansey", "scyther", "pinsir", "tauros", "kangaskhan", "dragonair"], // oblast 4 (Secret House + Surf)
];

/* -------------------------------- Helpery -------------------------------- */

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const clampMod = (m) => Math.max(MOD_MIN, Math.min(MOD_MAX, m));

/** Vrátí (a lazy-inicializuje) běhový stav výpravy. */
export function getSafari() {
  const s = getState();
  if (!s.safari || typeof s.safari !== "object") {
    s.safari = { active: false, steps: 0, balls: 0, depth: 1, bestDepth: 0, encounter: null };
  }
  return s.safari;
}

export function isSafariActive() {
  return !!getState().safari?.active;
}

/* ----------------------------- Idle časovač ------------------------------ */

let timer = null;

/** Rozjede tik výpravy, pokud běží a ještě netiká (volá i safariView po reloadu). */
export function ensureTicking() {
  if (timer || !isSafariActive()) return;
  timer = setInterval(safariTick, TICK_MS);
}

function stopTicking() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

/** Jeden idle krok výpravy: popojdeš, možná narazíš na Pokémona. */
function safariTick() {
  const safari = getSafari();
  if (!safari.active) {
    stopTicking();
    return;
  }
  if (safari.encounter) return; // čeká se na tvé rozhodnutí – kroky nefrčí

  safari.steps -= STEP_PER_TICK;
  if (safari.steps <= 0) {
    safari.steps = 0;
    endSafari("time");
    return;
  }
  if (Math.random() < ENCOUNTER_CHANCE) spawnEncounter(safari);
  commit(); // živý bar kroků + případně nový encounter
}

function spawnEncounter(safari) {
  const pool = SAFARI_AREAS[Math.min(safari.depth, MAX_DEPTH) - 1] ?? SAFARI_AREAS[0];
  const speciesId = pool[Math.floor(Math.random() * pool.length)];
  const level = 20 + safari.depth * 2 + randInt(0, 2);
  safari.encounter = { speciesId, level, catchMod: 1, fleeMod: 1 };
}

/* ------------------------------ Životní cyklus --------------------------- */

/** Vstup do Safari Zone: zaplať vstupné, dostaň rozpočet, rozjeď výpravu. */
export function startSafari() {
  const s = getState();
  const safari = getSafari();
  if (safari.active) return { ok: false, reason: "You're already exploring the Safari Zone." };
  if (!s.resources) s.resources = {};
  if ((s.resources.gold ?? 0) < SAFARI_FEE) {
    return { ok: false, reason: `You need ${SAFARI_FEE} gold for the entrance fee.` };
  }
  s.resources.gold -= SAFARI_FEE;
  safari.active = true;
  safari.steps = SAFARI_STEPS;
  safari.balls = SAFARI_BALLS;
  safari.depth = 1;
  safari.bestDepth = Math.max(1, safari.bestDepth ?? 0);
  safari.encounter = null;
  if (!s.story) s.story = {};
  s.story.safariEntered = true;
  commit();
  ensureTicking();
  return { ok: true };
}

/** Ukončí výpravu. reason: "time" | "balls" | "leave" | "manual". */
export function endSafari(reason = "manual") {
  const safari = getSafari();
  if (!safari.active && reason !== "time" && reason !== "balls") return { ok: false };
  safari.active = false;
  safari.encounter = null;
  safari.depth = 1;
  stopTicking();
  commit();
  if (reason === "time" || reason === "balls") {
    const why =
      reason === "balls"
        ? "You've run out of Safari Balls!"
        : "You've run out of steps!";
    bus.emit(EVENTS.STORY_POPUP, {
      title: "🔔 Ding-dong! Time's up!",
      body: `<p class="story-text">${why} A ranger escorts you back to the entrance.</p>
        <p class="placeholder">Any Pokémon you caught and items you found are yours to keep. Pay the fee to try again.</p>`,
      okLabel: "Back to the gate",
    });
  }
  return { ok: true };
}

/** Postup do hlubší oblasti (stojí kroky); ve 3./4. oblasti odemyká odměny. */
export function goDeeper() {
  const safari = getSafari();
  if (!safari.active) return { ok: false, reason: "Enter the Safari Zone first." };
  if (safari.encounter) return { ok: false, reason: "Deal with this Pokémon first!" };
  if (safari.depth >= MAX_DEPTH) return { ok: false, reason: "You've reached the Secret House — the deepest point." };
  if (safari.steps < GO_DEEPER_COST) {
    return { ok: false, reason: `Not enough steps to press on (need ${GO_DEEPER_COST}).` };
  }
  safari.steps -= GO_DEEPER_COST;
  safari.depth += 1;
  if (safari.depth > (safari.bestDepth ?? 0)) safari.bestDepth = safari.depth;
  const reward = grantDepthReward(safari.depth);
  commit();
  return { ok: true, depth: safari.depth, reward };
}

/** Jednorázové odměny za dosaženou hloubku (řízeno story flagy). */
function grantDepthReward(depth) {
  const s = getState();
  if (!s.story) s.story = {};
  if (!s.resources) s.resources = {};
  if (!s.resources.items) s.resources.items = {};
  if (depth >= 3 && !s.story.hasGoldTeeth) {
    s.story.hasGoldTeeth = true;
    s.resources.items["gold-teeth"] = (s.resources.items["gold-teeth"] ?? 0) + 1;
    bus.emit(EVENTS.STORY_POPUP, {
      title: "🦷 Gold Teeth!",
      body: `<p class="story-text">Half-buried in the tall grass, something glints — a set of <strong>Gold Teeth</strong>!</p>
        <p class="placeholder">These must belong to the <strong>Warden</strong> back in Fuchsia. Return them to him for a reward.</p>`,
      okLabel: "Pocket them",
    });
    return "gold-teeth";
  }
  if (depth >= 4 && !s.story.hasSurf) {
    s.story.hasSurf = true;
    s.resources.items["hm03-surf"] = (s.resources.items["hm03-surf"] ?? 0) + 1;
    bus.emit(EVENTS.STORY_POPUP, {
      title: "🌊 HM03 Surf!",
      body: `<p class="story-text">Deep in the reserve you reach the lonely <strong>Secret House</strong>. On the table lies a Hidden Machine — you pocket <strong>HM03 Surf</strong>!</p>
        <p class="placeholder">You can now cross water. The sea south of Fuchsia (Route 19) is open at last.</p>`,
      okLabel: "Amazing!",
    });
    return "hm03-surf";
  }
  return null;
}

/* ------------------------------ Akce v setkání --------------------------- */

function catchChance(enc) {
  const rarity = getSpecies(enc.speciesId)?.rarity ?? "common";
  const c = SAFARI_BASE_CATCH * (RARITY_CATCH_MULT[rarity] ?? 1) * SAFARI_BALL_MULT * enc.catchMod;
  return Math.max(0.02, Math.min(0.95, c));
}

/** Aktuální šance na chycení (pro UI: „Catch ~52 %"). */
export function currentCatchChance() {
  const enc = getSafari().encounter;
  return enc ? catchChance(enc) : 0;
}

function fleeChance(enc) {
  const rarity = getSpecies(enc.speciesId)?.rarity ?? "common";
  return Math.min(0.85, (FLEE_BASE[rarity] ?? 0.08) * enc.fleeMod);
}

/** Vrátí true a vyčistí setkání, když Pokémon utekl. */
function rollFlee(safari, enc) {
  if (Math.random() < fleeChance(enc)) {
    safari.encounter = null;
    return true;
  }
  return false;
}

const encName = (enc) => getSpecies(enc.speciesId)?.name ?? enc.speciesId;

/** Hodí jídlo: Pokémon míň utíká, ale hůř se chytá. */
export function throwBait() {
  const safari = getSafari();
  const enc = safari.encounter;
  if (!enc) return { ok: false, reason: "There's no Pokémon here." };
  const name = encName(enc);
  enc.fleeMod = clampMod(enc.fleeMod * BAIT_FLEE);
  enc.catchMod = clampMod(enc.catchMod * BAIT_CATCH);
  const fled = rollFlee(safari, enc);
  commit();
  return { ok: true, msg: fled ? `${name} ate the bait… then fled!` : `${name} is eating the bait — it seems less wary.` };
}

/** Hodí kámen: Pokémon se líp chytá, ale víc utíká. */
export function throwRock() {
  const safari = getSafari();
  const enc = safari.encounter;
  if (!enc) return { ok: false, reason: "There's no Pokémon here." };
  const name = encName(enc);
  enc.fleeMod = clampMod(enc.fleeMod * ROCK_FLEE);
  enc.catchMod = clampMod(enc.catchMod * ROCK_CATCH);
  const fled = rollFlee(safari, enc);
  commit();
  return { ok: true, msg: fled ? `${name} was angered… and fled!` : `${name} is angry — easier to catch, but ready to bolt!` };
}

/** Hodí Safari Ball (spotřebuje 1). Úspěch → do kolekce; jinak možná uteče. */
export function throwSafariBall() {
  const safari = getSafari();
  const enc = safari.encounter;
  if (!enc) return { ok: false, reason: "There's no Pokémon here." };
  if (safari.balls <= 0) {
    endSafari("balls");
    return { ok: false, reason: "Out of Safari Balls!" };
  }
  safari.balls -= 1;
  const name = encName(enc);
  if (Math.random() < catchChance(enc)) {
    const mon = createPokemon(enc.speciesId, enc.level, { caughtBall: "safari" });
    const res = acquirePokemon(mon); // commit uvnitř
    safari.encounter = null;
    if (safari.balls <= 0) endSafari("balls");
    else commit();
    const extra = res?.released ? " (a better one was already in your collection)" : "";
    return { ok: true, caught: true, msg: `Gotcha! ${name} was caught!${extra}` };
  }
  const fled = rollFlee(safari, enc);
  if (safari.balls <= 0) endSafari("balls");
  else commit();
  return { ok: true, caught: false, msg: fled ? `${name} broke free and fled!` : `Oh no! ${name} broke free!` };
}

/** Necháš Pokémona být a jdeš dál. */
export function runFromEncounter() {
  const safari = getSafari();
  const enc = safari.encounter;
  if (!enc) return { ok: false };
  const name = encName(enc);
  safari.encounter = null;
  commit();
  return { ok: true, msg: `You left ${name} alone and moved on.` };
}
