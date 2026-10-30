/**
 * pokedex.js – stav a dotazy Pokédexu.
 *
 * Model (viz BACKLOG R-026):
 *  - „caught" (chyceno) se ODVOZUJE z kolekce (vlastníš druh → chyceno). Díky
 *    R-018 (1 kus/druh) je kolekce de facto Pokédex chycených. ZÁMĚR = LIVING DEX:
 *    Pokédex ukazuje, co hráč PRÁVĚ vlastní, takže evoluce/prodej/uvolnění druhu se
 *    projeví jako mezera („chybí ti, chyť znovu") – to je feature, ne bug.
 *  - „seen" (viděno) je nové perzistentní pole `state.pokedex.seen` – druhy
 *    potkané v souboji, které ještě nemáš.
 *  - „unseen" = ani viděno, ani chyceno.
 */

import { getState, commit } from "../core/state.js";
import { POKEMON_SPECIES, STARTER_IDS, getSpecies, speciesByGen } from "../../data/pokemon.js";
import { AREAS, areaSpeciesIds, getArea } from "../../data/areas.js";
import { GENERATIONS } from "../../data/generations.js";

/** Pokédex stav se seznamem viděných druhů (lazy default). */
export function getPokedex() {
  const s = getState();
  if (!s.pokedex || typeof s.pokedex !== "object") s.pokedex = { seen: [] };
  if (!Array.isArray(s.pokedex.seen)) s.pokedex.seen = [];
  return s.pokedex;
}

/**
 * Označí druh jako viděný (potkán v souboji). Chycené druhy se neřeší tady –
 * ty se poznají z kolekce. Vrátí true, když šlo o nově viděný druh.
 * @param {string} speciesId
 */
export function markSeen(speciesId) {
  if (!speciesId) return false;
  const dex = getPokedex();
  if (dex.seen.includes(speciesId)) return false;
  dex.seen.push(speciesId);
  commit();
  return true;
}

/**
 * Zajistí, že všichni startéři jsou v Pokédexu vedení jako „viděno" – hráč je
 * reálně vidí na výběrové obrazovce. Commit jen když se něco změnilo. Vrací true,
 * pokud přibyl aspoň jeden.
 */
export function ensureStartersSeen() {
  const dex = getPokedex();
  let changed = false;
  for (const id of STARTER_IDS) {
    // Guard: přeskočit id, pro která neexistuje druh
    if (!getSpecies(id)) continue;
    if (!dex.seen.includes(id)) {
      dex.seen.push(id);
      changed = true;
    }
  }
  if (changed) commit();
  return changed;
}

/** Region (slug) generace daného čísla, např. 1 → "kanto". */
function regionOfGen(gen) {
  return GENERATIONS.find((g) => g.gen === gen)?.region ?? "kanto";
}

/** Region (slug), do jehož mapy oblast patří (fallback = aktuální region). */
function regionOfArea(area) {
  const g = GENERATIONS.find((gen) => (gen.areas ?? []).some((a) => a.id === area?.id));
  return g?.region ?? (getState().progress?.region ?? "kanto");
}

/**
 * Máš druh chycený V DANÉM REGIONU? (living dex, region-lock). Jedinec chycený
 * jinde je v PC navíc, do dexu ani na mapu toho regionu se nepočítá.
 * Staré save bez `caughtRegion` = „kanto".
 * @param {string} speciesId
 * @param {string} region  slug regionu ("kanto" | "johto")
 * @param {boolean} [shinyOnly=false]  jen shiny jedinci
 */
export function isCaughtIn(speciesId, region, shinyOnly = false) {
  return getState().collection.some(
    (p) => p.speciesId === speciesId && (p.caughtRegion ?? "kanto") === region && (!shinyOnly || p.shiny)
  );
}

/**
 * Máš daný druh chycený pro jeho regionální Pokédex? (odvozeno z kolekce – living
 * dex). Počítá se jen jedinec chycený v regionu generace druhu (Zubat z Johta
 * kantský dex nevyplní) – stejně jako dexCountsByGen.
 */
export function isCaught(speciesId) {
  const gen = getSpecies(speciesId)?.gen ?? 1;
  return isCaughtIn(speciesId, regionOfGen(gen));
}

/**
 * Stav druhu v Pokédexu.
 * @param {string} speciesId
 * @returns {"caught"|"seen"|"unseen"}
 */
export function dexStatus(speciesId) {
  if (isCaught(speciesId)) return "caught";
  if (getPokedex().seen.includes(speciesId)) return "seen";
  return "unseen";
}

/**
 * Počty pro ukazatel „chyceno X / z Y". Y = počet druhů ve hře v daný okamžik.
 * @returns {{ caught: number, total: number }}
 */
export function dexCounts() {
  // Součet regionálních dexů (viz dexCountsByGen) – bonusoví jedinci se nepočítají.
  const caught = Object.values(dexCountsByGen()).reduce((n, c) => n + c.caught, 0);
  return { caught, total: POKEMON_SPECIES.length };
}

/**
 * Počty chycených / celkem ROZDĚLENÉ podle generace. Slouží per-region dex
 * logice (achievementy „dokončit Johto dex", regionální diplomy/Shiny Charm).
 * „caught" se stejně jako dexCounts odvozuje z kolekce (vlastníš druh → chyceno),
 * ALE jen jedinci chycení v regionu té generace (region-lock): Gen 1 druh chycený
 * v Johtu (Zubat, Onix…, bonusový Dratini, Red Gyarados) se do kantského dexu
 * nepočítá – v PC je navíc. Staré save bez `caughtRegion` = „kanto".
 * Klíč = číslo generace; hodnota = { caught, total }. Automaticky pokryje i
 * budoucí generace (bere všechny `gen` hodnoty napříč POKEMON_SPECIES).
 * @returns {Record<number, { caught: number, total: number }>}
 */
export function dexCountsByGen() {
  const regionOfGen = Object.fromEntries(GENERATIONS.map((g) => [g.gen, g.region]));
  const caughtByGen = {};
  for (const p of getState().collection ?? []) {
    const g = getSpecies(p.speciesId)?.gen;
    if (!g) continue;
    if ((p.caughtRegion ?? "kanto") !== (regionOfGen[g] ?? "kanto")) continue; // chycený jinde = bonus, ne dex
    (caughtByGen[g] ??= new Set()).add(p.speciesId);
  }
  const out = {};
  for (const g of new Set(POKEMON_SPECIES.map((s) => s.gen))) {
    out[g] = { caught: caughtByGen[g]?.size ?? 0, total: speciesByGen(g).length };
  }
  return out;
}

/**
 * Oblasti, kde se druh vyskytuje (podle area.species). Slouží detailu druhu
 * v kartě/Pokédexu – „kde ho chytit" (ukázat jen když už je objeven).
 * @param {string} speciesId
 * @returns {import("../../data/areas.js").Area[]}
 */
export function areasForSpecies(speciesId) {
  return AREAS.filter((a) => areaSpeciesIds(a).includes(speciesId));
}

/**
 * Postup CHYCENÍ druhů dané oblasti (R-023): kolik z druhů oblasti hráč už
 * CHYTIL (má v kolekci) z celkového počtu. Slouží jako cíl „vychytej oblast".
 * @param {import("../../data/areas.js").Area|string} area  oblast nebo její id
 * @returns {{ caught: number, total: number }}
 */
export function areaCatchProgress(area) {
  const a = typeof area === "string" ? getArea(area) : area;
  const ids = areaSpeciesIds(a);
  if (!ids.length) return { caught: 0, total: 0 };
  const region = regionOfArea(a); // počítá se jen to, co jsi chytil v regionu oblasti
  let caught = 0;
  for (const id of ids) {
    if (isCaughtIn(id, region)) caught++;
  }
  return { caught, total: ids.length };
}

/** Máš daný druh chycený jako SHINY? (aspoň jeden shiny jedinec v kolekci) */
export function isCaughtShiny(speciesId) {
  return getState().collection.some((p) => p.speciesId === speciesId && p.shiny);
}

/**
 * Kompletnost oblasti pro obarvení uzlu mapy + detail „co jsem tu chytil".
 * `allCaught` = mám všechny druhy oblasti (uzel červený), `allShiny` = navíc
 * mám i všechny jako shiny (uzel zlatý). Prázdné oblasti (města) → vše false.
 * @param {import("../../data/areas.js").Area|string} area
 * @returns {{ caught:number, total:number, shiny:number, allCaught:boolean, allShiny:boolean }}
 */
export function areaCompletion(area) {
  const a = typeof area === "string" ? getArea(area) : area;
  const ids = areaSpeciesIds(a);
  const total = ids.length;
  if (!total) return { caught: 0, total: 0, shiny: 0, allCaught: false, allShiny: false };
  const region = regionOfArea(a); // počítá se jen to, co jsi chytil v regionu oblasti
  let caught = 0;
  let shiny = 0;
  for (const id of ids) {
    if (isCaughtIn(id, region)) caught++;
    if (isCaughtIn(id, region, true)) shiny++;
  }
  return {
    caught,
    total,
    shiny,
    allCaught: caught === total,
    allShiny: shiny === total,
  };
}
