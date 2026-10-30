/**
 * DATA: statická legendární / jednorázová setkání vázaná na oblast.
 *
 * Vzor „výzva žije v tabu" (jako gymy/rival/gauntlety): legendární NENÍ náhodné
 * divoké setkání – je to vstupní bod v samostatném tabu (viz src/ui/legendaryView.js),
 * který si hráč vyvolá KLIKEM. Tab se ukáže jen když oblast má legendárního,
 * je splněná story-podmínka (`requiresStory`, typicky HM gate) a druh ještě
 * NEVLASTNÍŠ. Souboj samotný běží v Battle tabu přes battleSystem.startStaticEncounter
 * (vždy manuál, chytatelný). Jednorázovost = vlastnictví druhu, takže dokud
 * legendárního nechytíš, tab (a šance) zůstává – nutné pro plný dex 151.
 *
 * @typedef {Object} LegendaryEncounter
 * @property {string} id            stabilní id setkání
 * @property {string} areaId        oblast, kde legendární je
 * @property {string} speciesId     druh (musí existovat v data/pokemon.js)
 * @property {number} level         level legendárního
 * @property {string} tabLabel      popisek tabu (dynamický, jako u gauntletů)
 * @property {string} tabIcon       ikona tabu
 * @property {string|string[]} [requiresStory] story-flag(y) nutné pro zobrazení tabu (HM gate; pole = všechny)
 * @property {string} [requiresBadge] odznak nutný pro zobrazení tabu (Lugia: Glacier Badge)
 * @property {string} [displayName] zobrazené jméno na kartě/tabu (když druh v dexu
 *   nese jiné jméno – např. „Red Gyarados" pro shiny #130 gyarados)
 * @property {boolean} [shiny]      VŽDY shiny varianta (vynucená, přebíjí losování) –
 *   např. Red Gyarados; jinak se shiny losuje jako u divokých
 * @property {boolean} [oneTime]    jednorázové setkání (ne opakovatelný shiny-hunt);
 *   tab zmizí po chycení (řídí claimFlag), ne po pouhém vlastnictví druhu
 * @property {string} [claimFlag]   story-flag označující jednorázové setkání za hotové;
 *   nastaví se až při CHYCENÍ (nutné, když je druh i jinak získatelný – gyarados)
 * @property {string} [scene]     klíč scény příchodu (src/ui/legendaryScene.js); default = speciesId
 * @property {string} title         nadpis karty
 * @property {string} intro         krátký úvod na kartě
 * @property {string} lore          delší flavour text
 * @property {string} button        popisek tlačítka na spuštění souboje
 */

import { GENERATIONS } from "./generations.js";

/**
 * Legendární setkání všech aktivních generací (mapa areaId → setkání). Data jsou
 * po generacích ve složkách data/genN/legendaries.js; tady se jen sloučí.
 * @type {Record<string, LegendaryEncounter>}
 */
export const LEGENDARY_ENCOUNTERS = Object.assign({}, ...GENERATIONS.map((g) => g.legendaries));

/**
 * Vrátí legendární setkání pro oblast, nebo null.
 * @param {string} areaId
 * @returns {LegendaryEncounter|null}
 */
export function legendaryForArea(areaId) {
  return LEGENDARY_ENCOUNTERS[areaId] ?? null;
}
