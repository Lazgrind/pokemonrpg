/**
 * assets.js – gen-aware stavba cest k assetům.
 *
 * PRAVIDLO (viz [[asset-split-per-gen]]): každá OBSAHOVÁ kategorie žije per
 * generace v `assets/gen<N>/<kat>/…`. Generace se odvodí buď z druhu
 * (`getSpecies(id).gen` – pokemon, cries), z dat entity (`getBadge(id).gen` –
 * odznaky), nebo z aktuálně aktivního regionu (`currentGen()` – gym-leaders,
 * trainers, city, buildings, npc). Vracející se / sdílené entity (Koga, Bruno,
 * Lance, generické třídy trenérů, sdílené budovy jako Poké Center) se FYZICKY
 * duplikují do každé gen složky → cesta je pak vždy `assets/gen<N>/…` bez
 * fallback logiky a bez 404.
 *
 * Opravdu globální (bez regionálního vizuálu) ZŮSTÁVÁ mimo gen složky:
 * `items`, `pokeballs`, `backgrounds` (biomy), `audio/sfx`, `audio/bgm`, `title`.
 */

import { getSpecies } from "../../data/pokemon.js";
import { getBadge } from "../../data/badges.js";
import { generationByRegion } from "../../data/generations.js";
import { getState } from "./state.js";

/**
 * Generace druhu (fallback 1, když druh není znám – nerozbije cestu).
 * @param {string} speciesId
 * @returns {number}
 */
export function speciesGen(speciesId) {
  return getSpecies(speciesId)?.gen ?? 1;
}

/**
 * Generace regionu podle slugu (fallback 1).
 * @param {string} region
 * @returns {number}
 */
export function regionGen(region) {
  return generationByRegion(region)?.gen ?? 1;
}

/**
 * Generace aktuálně aktivního regionu (`state.progress.region`, default kanto=1).
 * Používá se pro kontextové kategorie (trenéři, města, budovy…), kde hráč vidí
 * jen assety právě aktivního regionu.
 * @returns {number}
 */
export function currentGen() {
  return regionGen(getState()?.progress?.region ?? "kanto");
}

/**
 * Kořen složky spritů druhu: `assets/gen<N>/pokemon/<id>`.
 * @param {string} speciesId
 * @returns {string}
 */
export function pokemonAssetDir(speciesId) {
  return `assets/gen${speciesGen(speciesId)}/pokemon/${speciesId}`;
}

/**
 * Cesta k cry (hlasu) druhu: `assets/gen<N>/cries/<id>.mp3`.
 * @param {string} speciesId
 * @returns {string}
 */
export function cryUrl(speciesId) {
  return `assets/gen${speciesGen(speciesId)}/cries/${speciesId}.mp3`;
}

/**
 * Sprite lídra gymu / Elite Four / Championa: `assets/gen<N>/gym-leaders/<id>/front.png`.
 * @param {string} id  id leadera (např. "brock", "falkner")
 * @param {number} [gen] generace (default = aktuální region)
 * @returns {string}
 */
export function gymLeaderSpriteUrl(id, gen = currentGen()) {
  return `assets/gen${gen}/gym-leaders/${id}/front.png`;
}

/**
 * Sprite trenérské třídy: `assets/gen<N>/trainers/<class>/<n>.png`.
 * @param {string} cls  třída (např. "youngster")
 * @param {number} [n]  varianta (default 1)
 * @param {number} [gen] generace (default = aktuální region)
 * @returns {string}
 */
export function trainerClassSpriteUrl(cls, n = 1, gen = currentGen()) {
  return `assets/gen${gen}/trainers/${cls}/${n}.png`;
}

/**
 * Ikona odznaku: `assets/gen<N>/badges/<id>.png`. Generaci bere primárně z dat
 * odznaku (`getBadge(id).gen`), aby profil ukázal správnou i mimo daný region.
 * @param {string} badgeId
 * @param {number} [gen] explicitní override generace
 * @returns {string}
 */
export function badgeUrl(badgeId, gen) {
  const g = gen ?? getBadge(badgeId)?.gen ?? currentGen();
  return `assets/gen${g}/badges/${badgeId}.png`;
}

/**
 * Pozadí města: `assets/gen<N>/city/<cityId>.png`.
 * @param {string} cityId
 * @param {number} [gen] generace (default = aktuální region)
 * @returns {string}
 */
export function cityBgUrl(cityId, gen = currentGen()) {
  return `assets/gen${gen}/city/${cityId}.png`;
}

/**
 * Sprite budovy odvozený z její definice (`def.sprite` = "assets/buildings/<file>").
 * Přesměruje na `assets/gen<N>/buildings/<file>` – zachová původní název souboru
 * (odolné vůči tomu, když se id budovy liší od názvu souboru).
 * @param {{sprite?: string}} def BuildingDef
 * @param {number} [gen] generace (default = aktuální region)
 * @returns {string}
 */
export function buildingSpriteUrl(def, gen = currentGen()) {
  const file = String(def?.sprite ?? "").split("/").pop() || "";
  return `assets/gen${gen}/buildings/${file}`;
}

/**
 * Portrét NPC: `assets/gen<N>/npc/<name>.png`.
 * @param {string} name  jméno souboru NPC (např. "oak")
 * @param {number} [gen] generace (default = aktuální region)
 * @returns {string}
 */
export function npcUrl(name, gen = currentGen()) {
  return `assets/gen${gen}/npc/${name}.png`;
}
