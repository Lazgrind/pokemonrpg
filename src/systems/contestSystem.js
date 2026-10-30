/**
 * contestSystem.js – Bug-Catching Contest v National Parku (věrné GSC, idle úprava).
 *
 * Kánon GSC: v National Parku se koná soutěž v chytání hmyzu. Dostaneš omezený
 * počet Park Ballů, chytáš brouky a boduje se tvůj NEJLEPŠÍ úlovek (druh × level ×
 * kondice). Podle skóre dostaneš umístění a cenu (1. místo Sun Stone, 2. Everstone,
 * 3. gold). U nás: jednou za reálný den, tahové (žádný idle timer), nejlepší úlovek
 * si na konci necháš + cena dle umístění.
 *
 * Běhový stav žije v `state.contest` (serializuje se s celým state → přežije reload;
 * starý save se dolaďuje líně přes getContest, žádná migrace netřeba).
 */

import { getState, commit } from "../core/state.js";
import { bus, EVENTS } from "../core/events.js";
import { getSpecies } from "../../data/pokemon.js";
import { createPokemon } from "./pokemonSystem.js";
import { acquirePokemon } from "./team.js";

/* ------------------------------- Konstanty ------------------------------- */

export const CONTEST_BALLS = 20; // Park Bally na jednu soutěž (kánon ~20)
export const CONTEST_ENCOUNTERS = 12; // kolik brouků potkáš, než soutěž skončí

/**
 * Pool soutěžních brouků. `w` = váha spawnu (vyšší = častější), `base` = základ
 * skóre (vzácnější = víc), `lvl` = rozsah úrovně.
 * Johto je gen2-locked: jen brouci z HGSS soutěže, kteří jsou Gen 2, + Scyther
 * (dexImports, předchůdce Scizora). Kantští Caterpie/Weedle/Paras/Venonat/Pinsir vyřazeni.
 */
const CONTEST_POOL = [
  { id: "ledyba", w: 9, base: 45, lvl: [8, 13] },
  { id: "spinarak", w: 9, base: 45, lvl: [8, 13] },
  { id: "pineco", w: 6, base: 70, lvl: [10, 15] },
  { id: "yanma", w: 4, base: 85, lvl: [12, 16] },
  { id: "heracross", w: 2, base: 120, lvl: [13, 18] },
  { id: "scyther", w: 1, base: 150, lvl: [14, 18] },
];

// Prahy skóre pro umístění (na NEJLEPŠÍM úlovku) + ceny.
const PLACEMENTS = [
  { min: 160, place: "1st", item: "sun-stone", gold: 2000, label: "1st Place", prizeText: "a Sun Stone" },
  { min: 125, place: "2nd", item: "everstone", gold: 1000, label: "2nd Place", prizeText: "an Everstone" },
  { min: 90, place: "3rd", item: null, gold: 3000, label: "3rd Place", prizeText: "3000₽" },
];
const CONSOLATION_GOLD = 800; // chytil jsi aspoň něco, ale na bednu to nestačilo
const NO_CATCH_GOLD = 300; // nechytil jsi vůbec nic

/* -------------------------------- Helpery -------------------------------- */

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

/** Dnešní den jako stabilní řetězec (lokální) pro denní limit. */
function todayStr() {
  return new Date().toDateString();
}

/** Vrátí (a lazy-inicializuje) běhový stav soutěže. */
export function getContest() {
  const s = getState();
  if (!s.contest || typeof s.contest !== "object") {
    s.contest = { active: false, balls: 0, encountersLeft: 0, encounter: null, best: null, lastDay: null };
  }
  return s.contest;
}

export function isContestActive() {
  return !!getState().contest?.active;
}

/** Je soutěž dnes ještě k dispozici (1×/reálný den)? */
export function contestAvailableToday() {
  return getContest().lastDay !== todayStr();
}

/* ------------------------------- Mechanika ------------------------------- */

function poolEntry(id) {
  return CONTEST_POOL.find((e) => e.id === id) ?? null;
}

/** Vylosuje brouka dle vah. */
function rollBug() {
  const total = CONTEST_POOL.reduce((a, e) => a + e.w, 0);
  let r = Math.random() * total;
  for (const e of CONTEST_POOL) {
    r -= e.w;
    if (r <= 0) return e;
  }
  return CONTEST_POOL[0];
}

/** Nasadí další setkání (nebo ukončí, když došli brouci). */
function spawnEncounter(c) {
  if (c.encountersLeft <= 0) {
    endContest("done");
    return;
  }
  const e = rollBug();
  const level = randInt(e.lvl[0], e.lvl[1]);
  // Kondice 0–10 (náhodný bonus ke skóre – kánon boduje i „kondici" brouka).
  const condition = randInt(0, 10);
  c.encounter = { speciesId: e.id, level, condition };
}

/** Skóre úlovku: base druhu + level + kondice. */
function scoreOf(speciesId, level, condition) {
  const e = poolEntry(speciesId);
  return (e?.base ?? 40) + level + (condition ?? 0);
}

/** Šance na chycení Park Ballem (vzácnější brouk = těžší). */
function catchChance(enc) {
  const e = poolEntry(enc.speciesId);
  const base = e?.base ?? 40;
  return Math.max(0.12, Math.min(0.9, 0.95 - base / 300));
}

/** Aktuální šance na chycení (pro UI). */
export function currentCatchChance() {
  const enc = getContest().encounter;
  return enc ? catchChance(enc) : 0;
}

/** Šance, že brouk po neúspěšném hodu uletí. */
function fleeChance(enc) {
  const e = poolEntry(enc.speciesId);
  return Math.min(0.5, (e?.base ?? 40) / 400);
}

const encName = (enc) => getSpecies(enc.speciesId)?.name ?? enc.speciesId;

/* ------------------------------ Životní cyklus --------------------------- */

/** Zahájí soutěž (1×/den). Nasadí první setkání. */
export function startContest() {
  const c = getContest();
  if (c.active) return { ok: false, reason: "You're already in the contest." };
  if (!contestAvailableToday()) {
    return { ok: false, reason: "You've already entered today's contest. Come back tomorrow!" };
  }
  c.active = true;
  c.balls = CONTEST_BALLS;
  c.encountersLeft = CONTEST_ENCOUNTERS;
  c.best = null;
  c.lastDay = todayStr();
  spawnEncounter(c);
  commit();
  return { ok: true };
}

/** Hodí Park Ball (−1). Úspěch → aktualizuje nejlepší úlovek, další brouk. */
export function throwContestBall() {
  const c = getContest();
  const enc = c.encounter;
  if (!enc) return { ok: false, reason: "There's no Bug Pokémon here." };
  if (c.balls <= 0) {
    endContest("balls");
    return { ok: false, reason: "Out of Park Balls!" };
  }
  c.balls -= 1;
  const name = encName(enc);
  if (Math.random() < catchChance(enc)) {
    const score = scoreOf(enc.speciesId, enc.level, enc.condition);
    let improved = false;
    if (!c.best || score > c.best.score) {
      c.best = { speciesId: enc.speciesId, level: enc.level, score };
      improved = true;
    }
    c.encounter = null;
    c.encountersLeft -= 1;
    if (c.balls <= 0 || c.encountersLeft <= 0) {
      endContest(c.balls <= 0 ? "balls" : "done");
    } else {
      spawnEncounter(c);
      commit();
    }
    return {
      ok: true,
      caught: true,
      msg: improved
        ? `Gotcha! ${name} caught — your best catch so far! (score ${score})`
        : `Gotcha! ${name} caught, but your earlier catch scored higher.`,
    };
  }
  // Neúspěch: možná uletí, jinak zůstává (zkus znovu, dokud máš Bally).
  const fled = Math.random() < fleeChance(enc);
  if (fled) {
    c.encounter = null;
    c.encountersLeft -= 1;
  }
  if (c.balls <= 0 || (fled && c.encountersLeft <= 0)) {
    endContest(c.balls <= 0 ? "balls" : "done");
  } else {
    if (fled) spawnEncounter(c);
    commit();
  }
  return { ok: true, caught: false, msg: fled ? `${name} broke free and flew off!` : `${name} broke free!` };
}

/** Nechá brouka být a jde dál na dalšího. */
export function skipBug() {
  const c = getContest();
  if (!c.encounter) return { ok: false };
  const name = encName(c.encounter);
  c.encounter = null;
  c.encountersLeft -= 1;
  if (c.encountersLeft <= 0) {
    endContest("done");
  } else {
    spawnEncounter(c);
    commit();
  }
  return { ok: true, msg: `You let ${name} go, hoping for a better bug.` };
}

/**
 * Ukončí soutěž, vyhodnotí umístění z nejlepšího úlovku, předá cenu a nejlepšího
 * brouka přidá do kolekce. reason: "done" | "balls" | "leave".
 */
export function endContest(reason = "leave") {
  const c = getContest();
  if (!c.active) return { ok: false };
  const best = c.best;
  c.active = false;
  c.encounter = null;
  c.balls = 0;
  c.encountersLeft = 0;

  const s = getState();
  if (!s.resources) s.resources = {};
  if (!s.resources.items) s.resources.items = {};

  let resultBody;
  if (!best) {
    s.resources.gold = (s.resources.gold ?? 0) + NO_CATCH_GOLD;
    c.best = null;
    commit();
    resultBody = `<p class="story-text">The whistle blows — the Bug-Catching Contest is over. You didn't catch a single bug this time!</p>
      <p class="placeholder">The judges award you ${NO_CATCH_GOLD}₽ for taking part. Better luck tomorrow!</p>`;
  } else {
    // Nejlepší úlovek si necháš (do kolekce).
    const mon = createPokemon(best.speciesId, best.level, { caughtBall: "park" });
    acquirePokemon(mon); // commit uvnitř
    const name = getSpecies(best.speciesId)?.name ?? best.speciesId;
    const pl = PLACEMENTS.find((p) => best.score >= p.min);
    let prizeLine;
    if (pl) {
      if (pl.item) s.resources.items[pl.item] = (s.resources.items[pl.item] ?? 0) + 1;
      s.resources.gold = (s.resources.gold ?? 0) + pl.gold;
      prizeLine = `<strong>${pl.label}!</strong> You win ${pl.prizeText}${pl.item ? ` and ${pl.gold}₽` : ""}.`;
    } else {
      s.resources.gold = (s.resources.gold ?? 0) + CONSOLATION_GOLD;
      prizeLine = `You didn't place, but the judges award you ${CONSOLATION_GOLD}₽ for your effort.`;
    }
    c.best = null;
    commit();
    resultBody = `<p class="story-text">The whistle blows — the Bug-Catching Contest is over! Your best catch was a <strong>${name}</strong> (Lv ${best.level}), scoring <strong>${best.score}</strong>.</p>
      <p class="story-text">${prizeLine}</p>
      <p class="placeholder">You get to keep your prize ${name}. Come back tomorrow for another contest!</p>`;
  }

  bus.emit(EVENTS.STORY_POPUP, {
    title: "Bug-Catching Contest",
    body: resultBody,
    okLabel: "Leave the park",
  });
  return { ok: true };
}
