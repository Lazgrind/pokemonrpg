/**
 * breedingSystem.js – breeding podle egg groups (R-022).
 *
 * Dva rodiče vložení do breeding slotů Školky (buildingSystem: get/setBreedingParent)
 * po čase vyprodukují vejce, pokud jsou kompatibilní (sdílená egg group nebo
 * žolík Ditto – viz data/breeding.js). Produkce tiká při běžící hře i offline
 * (dopočet po návratu, strop OFFLINE_CAP_HOURS), stejně jako výcvik a inkubace.
 *
 * Vejce nese jen druh potomka a „breed" data (IV rodičů + počet dědění + zvýšená
 * šance na shiny). Konkrétní genetika se stejně jako u nalezených vajec losuje
 * až při vylíhnutí (R-021) – zde jen předáme suroviny do eggSystem.
 *
 * Nasbíraný čas držíme v `city.daycare.breeding.buffer` (sekundy), ať se nic
 * neztrácí.
 */

import { commit } from "../core/state.js";
import { bus, EVENTS } from "../core/events.js";
import { getSpecies } from "../../data/pokemon.js";
import { getBreedingSlot, getBreedingParents } from "./buildingSystem.js";
import { makeBredEgg } from "./eggSystem.js";
import { holdsEverstone } from "./evolutionSystem.js";
import { OFFLINE_CAP_HOURS } from "./idle.js";
import {
  areCompatible,
  chooseChildSpeciesId,
  BREED_SECONDS,
  INHERIT_IV_COUNT,
  BREED_SHINY_CHANCE,
} from "../../data/breeding.js";

/** Jak často aktivní smyčka připočítává čas breedingu (s). 1 s = odpočet a
 *  progress bar v otevřeném okně běží plynule v reálném čase. */
const BREED_TICK_SEC = 1;

let timer = null;

/** Jsou aktuální rodiče kompatibilní pro breeding? */
export function breedingCompatible() {
  const { a, b } = getBreedingParents();
  if (!a || !b) return false;
  return areCompatible(getSpecies(a.speciesId), getSpecies(b.speciesId));
}

/**
 * Přehled breedingu pro UI.
 * @returns {{ a: any, b: any, compatible: boolean, needSec: number,
 *   elapsedSec: number, remainingSec: number, ratio: number }}
 */
export function breedingStatus() {
  const { a, b } = getBreedingParents();
  const compatible = breedingCompatible();
  const buffer = getBreedingSlot().buffer ?? 0;
  const elapsedSec = compatible ? Math.min(buffer, BREED_SECONDS) : 0;
  return {
    a,
    b,
    compatible,
    needSec: BREED_SECONDS,
    elapsedSec,
    remainingSec: compatible ? Math.max(0, BREED_SECONDS - buffer) : BREED_SECONDS,
    ratio: compatible ? Math.min(1, buffer / BREED_SECONDS) : 0,
  };
}

/**
 * Připočítá čas breedingu a vyprodukuje vejce, která dozrála. Mutuje stav bez
 * commitu (volající commituje). Vrací pole vyprodukovaných vajec.
 * @param {number} seconds
 * @returns {Array<{ id: string, speciesId: string }>}
 */
export function accrueBreeding(seconds) {
  const { a, b } = getBreedingParents();
  if (!a || !b) return [];
  const spA = getSpecies(a.speciesId);
  const spB = getSpecies(b.speciesId);
  if (!areCompatible(spA, spB)) return [];

  const slot = getBreedingSlot();
  slot.buffer = (slot.buffer ?? 0) + seconds;

  const produced = [];
  // Offline může dozrát i více vajec najednou (strop řeší volající přes čas).
  while (slot.buffer >= BREED_SECONDS) {
    slot.buffer -= BREED_SECONDS;
    const childId = chooseChildSpeciesId(spA, spB);
    const breed = {
      // Kopie IV rodičů (neměnné, ale ať nedržíme referenci na živého jedince).
      parents: [{ ...a.ivs }, { ...b.ivs }],
      inherit: INHERIT_IV_COUNT,
      shinyChance: BREED_SHINY_CHANCE,
    };
    // Dědičnost povahy přes Everstone: drží-li ho rodič, potomek zdědí JEHO
    // povahu. Když ho drží oba, náhodně vybereme jednoho (jinak zůstane náhodná).
    const stoneA = holdsEverstone(a);
    const stoneB = holdsEverstone(b);
    if (stoneA && stoneB) breed.nature = Math.random() < 0.5 ? a.nature : b.nature;
    else if (stoneA) breed.nature = a.nature;
    else if (stoneB) breed.nature = b.nature;
    const egg = makeBredEgg(childId, breed);
    produced.push(egg);
  }
  return produced;
}

/** Spustí aktivní smyčku breedingu (idempotentní). */
export function startBreedingLoop() {
  stopBreedingLoop();
  timer = setInterval(() => {
    const produced = accrueBreeding(BREED_TICK_SEC);
    // Commit každý tik, pokud pár aktivně produkuje – ať se progress bar (i čas)
    // v otevřeném okně živě aktualizuje i bez jiných zdrojů commitu (soubojů).
    if (produced.length || breedingCompatible()) {
      commit();
      for (const egg of produced) bus.emit(EVENTS.EGG_BRED, egg);
    }
  }, BREED_TICK_SEC * 1000);
}

/** Zastaví aktivní smyčku breedingu. */
export function stopBreedingLoop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

/**
 * Dopočítá breeding po návratu do hry. Vrací pole vyprodukovaných vajec, nebo null.
 * @param {number} elapsedMs
 * @returns {null | Array<{ id: string, speciesId: string }>}
 */
export function applyBreedingOffline(elapsedMs) {
  const { a, b } = getBreedingParents();
  if (!a || !b) return null;
  const usableSec = Math.min(Math.floor(elapsedMs / 1000), OFFLINE_CAP_HOURS * 3600);
  if (usableSec <= 0) return null;
  const produced = accrueBreeding(usableSec);
  if (produced.length === 0) return null;
  commit();
  return produced;
}
