/**
 * evYields.js - DATA: kanonicke EV yieldy druhu (kolik EV padne za jeho porazeni).
 * Klic = species id (data/pokemon.js), hodnota = objekt jen s NENULOVYMI staty
 * v nasem nazvoslovi (hp, attack, defense, spAttack, spDefense, speed).
 *
 * Zdroj: PokeAPI CSV (pokemon_stats.csv, sloupec effort) - aktualni hodnoty.
 * VYGENEROVANO skriptem tools/fetch_ev_yields.ps1 - needituj rucne.
 *
 * @type {Record<string, Partial<Record<"hp"|"attack"|"defense"|"spAttack"|"spDefense"|"speed", number>>>}
 */
import { GENERATIONS } from "./generations.js";

/**
 * EV yieldy všech aktivních generací. Data jsou po generacích ve složkách
 * data/genN/evYields.js; tady se jen sloučí do jedné mapy.
 * @type {Record<string, Partial<Record<"hp"|"attack"|"defense"|"spAttack"|"spDefense"|"speed", number>>>}
 */
export const EV_YIELDS = Object.assign({}, ...GENERATIONS.map((g) => g.evYields));
