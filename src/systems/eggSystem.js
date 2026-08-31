/**
 * eggSystem.js – vajíčka a líhnutí (R-021).
 *
 * Vejce se s malou šancí najde po výhře v souboji (druh se losuje z oblasti).
 * Nese jen druh – genetika (IV/EV/shiny) se vylosuje až při vylíhnutí. Vejce
 * se líhne ve Školce (Day Care) ve druhém slotu vedle výcviku: inkubace tiká
 * při běžící hře i offline (dopočet po návratu), stejně jako pasivní výcvik a
 * bez nerfu OFFLINE_EFFICIENCY (strop OFFLINE_CAP_HOURS). Doba líhnutí závisí
 * na raritě druhu (data/eggs.js). Po vylíhnutí projde jedinec pravidlem R-018
 * přes acquirePokemon() (nový druh se přidá, jinak se slijí lepší hodnoty).
 *
 * Zlomkové sekundy inkubace držíme v `city.daycare.egg.elapsedSec`.
 */

import { getState, commit } from "../core/state.js";
import { bus, EVENTS } from "../core/events.js";
import { getSpecies } from "../../data/pokemon.js";
import { createPokemon, inheritIvs } from "./pokemonSystem.js";
import { acquirePokemon } from "./team.js";
import { getDaycareSlot, eggSlotCount, hatchSpeedPercent } from "./buildingSystem.js";
import { OFFLINE_CAP_HOURS } from "./idle.js";
import {
  EGG_DROP_CHANCE,
  HATCH_LEVEL_MIN,
  HATCH_LEVEL_MAX,
  hatchMinutesFor,
} from "../../data/eggs.js";

/** Jak často aktivní smyčka připočítává čas inkubace (s). 1 s = odpočet a
 *  progress bary v otevřeném okně běží plynule v reálném čase. */
const EGG_TICK_SEC = 1;

let timer = null;
let eggCounter = 0;

/** Inventář vajec (lazy inicializace prázdným polem). */
export function getEggs() {
  const s = getState();
  if (!s.eggs) s.eggs = [];
  return s.eggs;
}

/** Rozumně unikátní id vejce. */
function makeEggId(speciesId) {
  return `egg-${speciesId}-${Date.now().toString(36)}-${(eggCounter++).toString(36)}`;
}

/**
 * S šancí EGG_DROP_CHANCE vytvoří vejce druhu z dané oblasti a přidá ho do
 * inventáře. Mutuje stav BEZ commitu (volající – handleFaint – commituje).
 * @param {import("../../data/areas.js").Area} area
 * @returns {null | { id: string, speciesId: string }} nalezené vejce, nebo null
 */
export function rollEggDrop(area) {
  const species = area?.species ?? [];
  if (species.length === 0) return null;
  if (Math.random() >= EGG_DROP_CHANCE) return null;
  const speciesId = species[Math.floor(Math.random() * species.length)];
  const egg = { id: makeEggId(speciesId), speciesId };
  getEggs().push(egg);
  return egg;
}

/**
 * Vytvoří breeding vejce (R-022) a přidá do inventáře. Nese druh potomka a
 * `breed` data (IV rodičů, počet dědění, zvýšená šance na shiny); genetika se
 * losuje až při vylíhnutí. Volá breedingSystem po vyprodukování páru.
 * @param {string} speciesId  druh potomka
 * @param {{ parents: object[], inherit: number, shinyChance: number }} breed
 * @returns {{ id: string, speciesId: string, breed: object }}
 */
export function makeBredEgg(speciesId, breed) {
  const egg = { id: makeEggId(speciesId), speciesId, breed };
  getEggs().push(egg);
  return egg;
}

/* --------------------------- Inkubace ve Školce --------------------------- */

/**
 * Sloty inkubace ve Školce = pole { id, elapsedSec }. Lazy inicializace +
 * migrace z dřívějšího jediného slotu `city.daycare.egg` (verze 0.15.0).
 */
function incubators() {
  const dc = getDaycareSlot();
  if (!Array.isArray(dc.eggs)) {
    dc.eggs = [];
    if (dc.egg) dc.eggs.push(dc.egg); // převod ze single slotu
    delete dc.egg;
  }
  return dc.eggs;
}

/** Potřebná doba líhnutí (s) pro daný druh. */
function needSecondsFor(speciesId) {
  const rarity = getSpecies(speciesId)?.rarity ?? "common";
  return hatchMinutesFor(rarity) * 60;
}

/** Násobitel rychlosti inkubace z upgradu Školky (1 + bonus %). */
function speedMultiplier() {
  return 1 + hatchSpeedPercent() / 100;
}

/** Kolik dalších vajec lze ještě vložit do inkubace (volné sloty). */
export function freeIncubatorSlots() {
  return Math.max(0, eggSlotCount() - incubators().length);
}

/** Je dané vejce (podle id) právě v inkubaci? */
export function isIncubating(eggId) {
  return incubators().some((s) => s.id === eggId);
}

/**
 * Vloží vejce do volného slotu inkubace. Vejce zůstává v inventáři, jen se
 * odkáže a začne mu odpočet.
 * @param {string} eggId
 * @returns {{ ok: boolean, reason?: string }}
 */
export function addIncubatingEgg(eggId) {
  const egg = getEggs().find((e) => e.id === eggId);
  if (!egg) return { ok: false, reason: "Unknown egg." };
  if (isIncubating(eggId)) return { ok: false, reason: "Egg is already incubating." };
  if (freeIncubatorSlots() <= 0) return { ok: false, reason: "No free incubator slots." };
  incubators().push({ id: eggId, elapsedSec: 0 });
  commit();
  return { ok: true };
}

/** Vyndá vejce z inkubace (zůstává v inventáři, odpočet se zahodí). */
export function removeIncubatingEgg(eggId) {
  const arr = incubators();
  const i = arr.findIndex((s) => s.id === eggId);
  if (i === -1) return { ok: false, reason: "Egg is not incubating." };
  arr.splice(i, 1);
  commit();
  return { ok: true };
}

/**
 * Přehled inkubovaných vajec pro UI (jen ta, která jsou stále v inventáři).
 * @returns {Array<{ id: string, name: string, elapsedSec: number, needSec: number, remainingSec: number, ratio: number }>}
 */
export function incubationList() {
  const eggs = getEggs();
  const out = [];
  for (const slot of incubators()) {
    const egg = eggs.find((e) => e.id === slot.id);
    if (!egg) continue;
    const needSec = needSecondsFor(egg.speciesId);
    const elapsedSec = Math.min(slot.elapsedSec ?? 0, needSec);
    out.push({
      id: egg.id,
      name: getSpecies(egg.speciesId)?.name ?? egg.speciesId,
      elapsedSec,
      needSec,
      remainingSec: Math.max(0, needSec - elapsedSec),
      ratio: needSec > 0 ? Math.min(1, elapsedSec / needSec) : 1,
    });
  }
  return out;
}

/**
 * Připočítá čas inkubace všem slotům (zrychleno upgradem) a vylíhne ta vejce,
 * která dosáhla doby. Mutuje stav; acquirePokemon uvnitř volá commit(). Vrací
 * pole výsledků vylíhnutí (může být prázdné).
 * @param {number} seconds
 * @returns {Array<{ name: string, outcome: any, shiny: boolean, level: number }>}
 */
export function accrueIncubation(seconds) {
  const arr = incubators();
  if (arr.length === 0) return [];
  const eggs = getEggs();
  const add = seconds * speedMultiplier();
  const hatched = [];
  const remaining = [];

  for (const slot of arr) {
    const egg = eggs.find((e) => e.id === slot.id);
    if (!egg) continue; // osiřelý slot (vejce zmizelo) – zahoď
    slot.elapsedSec = (slot.elapsedSec ?? 0) + add;
    if (slot.elapsedSec < needSecondsFor(egg.speciesId)) {
      remaining.push(slot);
      continue;
    }
    // Vylíhnutí: teprve teď se losuje genetika (level 1–5, náhodné IV/shiny).
    // Breeding vejce (egg.breed) zdědí část IV od rodičů a má vyšší šanci na shiny.
    const level =
      HATCH_LEVEL_MIN + Math.floor(Math.random() * (HATCH_LEVEL_MAX - HATCH_LEVEL_MIN + 1));
    const poke = egg.breed
      ? createPokemon(egg.speciesId, level, {
          ivs: inheritIvs(egg.breed.parents, egg.breed.inherit),
          shinyChance: egg.breed.shinyChance,
        })
      : createPokemon(egg.speciesId, level);
    const shiny = !!poke.shiny;
    const name = getSpecies(egg.speciesId)?.name ?? egg.speciesId;
    const idx = eggs.findIndex((e) => e.id === egg.id);
    if (idx !== -1) eggs.splice(idx, 1);
    const outcome = acquirePokemon(poke); // volá commit()
    hatched.push({ name, outcome, shiny, level });
  }

  getDaycareSlot().eggs = remaining; // ponech jen nevylíhnuté sloty
  return hatched;
}

/** Spustí aktivní smyčku líhnutí (idempotentní). */
export function startEggLoop() {
  stopEggLoop();
  timer = setInterval(() => {
    const hatched = accrueIncubation(EGG_TICK_SEC);
    // Commit každý tik, pokud se něco líhne – ať progress bary v otevřeném okně
    // žijí i bez jiných zdrojů commitu (soubojů). `incubators()` po vylíhnutí
    // vrací zbývající sloty, takže commitujeme, dokud se něco inkubuje.
    if (hatched.length || incubators().length > 0) {
      commit();
      for (const h of hatched) bus.emit(EVENTS.EGG_HATCHED, h);
    }
  }, EGG_TICK_SEC * 1000);
}

/** Zastaví aktivní smyčku líhnutí. */
export function stopEggLoop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

/**
 * Dopočítá inkubaci po návratu do hry. Vrací pole vylíhnutých vajec, nebo null.
 * @param {number} elapsedMs
 * @returns {null | Array<{ name: string, shiny: boolean, level: number, outcome: any }>}
 */
export function applyEggOffline(elapsedMs) {
  if (incubators().length === 0) return null;
  const usableSec = Math.min(Math.floor(elapsedMs / 1000), OFFLINE_CAP_HOURS * 3600);
  if (usableSec <= 0) return null;
  const hatched = accrueIncubation(usableSec);
  if (hatched.length === 0) return null;
  commit();
  return hatched;
}
