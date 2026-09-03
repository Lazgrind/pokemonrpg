/**
 * devTools.js – ladicí (dev) akce mimo kartu jedince.
 *
 * Slouží k rychlému testování mechanik bez normálního průběhu hry (výhry,
 * chytání, líhnutí). Napojeno na Dev sekci v Nastavení (⚙). Per-jedincové dev
 * nástroje (level, shiny) zůstávají na Kartě Pokémona (`pokemonCard.js`).
 */

import { POKEMON_SPECIES, getSpecies } from "../../data/pokemon.js";
import { getState, commit } from "../core/state.js";
import { createPokemon } from "./pokemonSystem.js";
import { acquirePokemon } from "./team.js";
import { addEgg } from "./eggSystem.js";

/** Náhodný druh z celého Dexu (pro „přidej něco na zkoušku"). */
function randomSpeciesId() {
  const list = POKEMON_SPECIES;
  return list[Math.floor(Math.random() * list.length)].id;
}

/**
 * Přidá do inventáře vejce – daného druhu, jinak náhodného. Pak se dá vložit do
 * inkubace ve Školce a nechat vylíhnout.
 * @param {string} [speciesId]
 * @returns {{ id: string, speciesId: string, name: string }}
 */
export function devAddEgg(speciesId) {
  const id = speciesId ?? randomSpeciesId();
  const egg = addEgg(id);
  return { ...egg, name: getSpecies(id)?.name ?? id };
}

/**
 * Přidá jedince daného druhu do kolekce (přes acquirePokemon → platí R-018:
 * nový druh se přidá, duplikát slije lepší hodnoty). Výchozí druh je Ditto.
 * @param {string} [speciesId="ditto"]
 * @param {number} [level=5]
 * @returns {{ ok: boolean, name: string, outcome: any }}
 */
export function devAddPokemon(speciesId = "ditto", level = 5) {
  if (!getSpecies(speciesId)) return { ok: false, name: speciesId, outcome: null };
  const poke = createPokemon(speciesId, level);
  const outcome = acquirePokemon(poke); // commit uvnitř
  return { ok: true, name: getSpecies(speciesId)?.name ?? speciesId, outcome };
}

/**
 * Přidá hráči zlato (dev). Kladné i záporné; nikdy nespadne pod 0.
 * @param {number} amount
 * @returns {number} nový stav zlata
 */
export function devAddMoney(amount) {
  const res = getState().resources;
  res.gold = Math.max(0, (res.gold ?? 0) + amount);
  commit();
  return res.gold;
}
