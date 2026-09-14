/**
 * fishingSystem.js – Rybaření: mechanika háhoru vodního Pokémona ze skupiny podle
 * vlastněného prutu a spuštění souboje.
 */

import { ROD_POOLS, FISHING_POOLS, AREA_FISHING, ROD_ORDER } from "../../data/fishing.js";
import { getState } from "../core/state.js";
import { startStaticEncounter, getActiveArea, teamHasFighter } from "./battleSystem.js";
import { getSpecies } from "../../data/pokemon.js";

/**
 * Vrátí nejlepší prut, který hráč vlastní (nullptr, pokud žádný).
 * @returns {string | null}
 */
export function bestRod() {
  const items = getState().resources?.items ?? {};
  for (const rodId of ROD_ORDER) {
    if ((items[rodId] ?? 0) > 0) return rodId;
  }
  return null;
}

/**
 * Má hráč aspoň jeden prut?
 * @returns {boolean}
 */
export function hasAnyRod() {
  return !!bestRod();
}

/** Zobrazovací pořadí prutů v UI: od nejslabšího k nejsilnějšímu (kánon). */
const ROD_DISPLAY_ORDER = ["old-rod", "good-rod", "super-rod"];

/**
 * Seznam prutů, které hráč vlastní, seřazený od nejslabšího k nejsilnějšímu
 * (pro výběr prutu v minihře).
 * @returns {string[]}
 */
export function ownedRods() {
  const items = getState().resources?.items ?? {};
  return ROD_DISPLAY_ORDER.filter((rodId) => (items[rodId] ?? 0) > 0);
}

/**
 * Dá se v dané oblasti rybařit? Kánonově všude, kde je aspoň kousek vody – to
 * značíme příznakem `area.water === true` (viz data/areas.js). Historické vodní
 * routy (biome "water") bereme jako vodu vždy, i kdyby příznak chyběl.
 * @param {object} [area] oblast (default = aktivní)
 * @returns {boolean}
 */
export function areaHasWater(area = getActiveArea()) {
  return !!area && (area.water === true || area.biome === "water");
}

/**
 * Může hráč TEĎ rybařit (má prut a je u vody)? Vrací důvod pro UI hlášku.
 * @returns {{ ok: boolean, reason?: string }}
 */
export function canFishHere() {
  if (!hasAnyRod()) return { ok: false, reason: "You don't have a fishing rod yet." };
  if (!areaHasWater()) return { ok: false, reason: "There's no water to fish here." };
  // Kompletně vyřazený tým: nemá smysl nahazovat rovnou do prohraného souboje –
  // pošli hráče nejdřív se vyléčit (Poké Centrum / domů). Brání smyčce proher.
  if (!teamHasFighter()) return { ok: false, reason: "Your whole team has fainted. Heal up before you fish." };
  return { ok: true };
}

/**
 * Rybářský biom aktuální (nebo zadané) oblasti – "ocean" pro pobřeží/mořské cesty
 * (viz AREA_FISHING), jinak výchozí "freshwater". Pro UI štítek v minihře.
 * @param {object} [area] oblast (default = aktivní)
 * @returns {string} "ocean" | "freshwater"
 */
export function fishingBiome(area = getActiveArea()) {
  return (area && AREA_FISHING[area.id]) || "freshwater";
}

/**
 * Vrátí konfiguraci poolu pro daný prut v dané oblasti. Když je oblast v mapě
 * AREA_FISHING (nevýchozí biom, např. "ocean") a ten biom má pool pro tento prut,
 * použije se; jinak spadne na výchozí sladkovodní ROD_POOLS.
 * @param {string} rod prut (klíč do poolů)
 * @param {object} [area] oblast (default = aktivní)
 * @returns {{ levels: number[], pool: Array<{id: string, weight: number}> } | undefined}
 */
export function poolFor(rod, area = getActiveArea()) {
  const biome = area && AREA_FISHING[area.id];
  return (biome && FISHING_POOLS[biome]?.[rod]) || ROD_POOLS[rod];
}

/**
 * Vylosuje Pokémona z váženého poolu.
 * @param {Array<{id: string, weight: number}>} pool
 * @returns {string} speciesId
 */
function pickWeighted(pool) {
  if (pool.length === 0) return "magikarp"; // fallback
  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  let rand = Math.random() * total;
  for (const item of pool) {
    rand -= item.weight;
    if (rand <= 0) return item.id;
  }
  return pool[pool.length - 1].id;
}

/**
 * Spustí rybaření: nahodí prut, vylosuje Pokémona a level, a spustí souboj.
 * @param {string} [rodId] konkrétní prut k nahození; když chybí nebo ho hráč
 *   nevlastní, použije se nejlepší vlastněný.
 * @returns {{ ok: boolean, reason?: string }}
 */
export function castRod(rodId) {
  const items = getState().resources?.items ?? {};
  // Zvolený prut musí hráč vlastnit, jinak spadni na nejlepší vlastněný.
  const rod = rodId && (items[rodId] ?? 0) > 0 ? rodId : bestRod();
  if (!rod) {
    return { ok: false, reason: "You don't have a fishing rod." };
  }

  if (!areaHasWater()) {
    return { ok: false, reason: "There's no water to fish here." };
  }

  // Pool podle prutu A rybářského biomu aktuální oblasti (viz poolFor).
  const cfg = poolFor(rod);
  if (!cfg) {
    return { ok: false, reason: "Invalid fishing rod configuration." };
  }

  // Vylosuj Pokémona ze skupiny.
  const speciesId = pickWeighted(cfg.pool);

  // Vylosuj level v rozsahu [min, max] (inkluzivně).
  const [minLevel, maxLevel] = cfg.levels;
  const level = Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;

  // Proveď setkání se spuštěním se znalostí, že je to rybaření.
  return startStaticEncounter(speciesId, level, { fishing: true });
}
