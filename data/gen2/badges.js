/**
 * DATA: 8 gym odznaků Johta (gen 2). Čistá data; typedef + helpery + sloučení
 * generací viz ../badges.js. Pořadí = kánon (Gold/Silver/Crystal).
 *
 * cityId odkazuje na uzel města v data/gen2/areas.js. Odznaky se v boji ukládají
 * per region; ikona žije v assets/gen2/badges/<id>.png (zatím neexistuje – viz
 * SPRITES-TODO-GEN2). Kánon: Jasmine (mineral) je 6. – její gym je zavřený, dokud
 * hráč nevyřeší olivinský maják, proto se v areas.js gatuje storm (Chuck) dřív.
 */

/** @type {import("../badges.js").Badge[]} */
export const BADGES_GEN2 = [
  { id: "zephyr-badge", name: "Zephyr Badge", leader: "Falkner", cityId: "violet-city", type: "flying", gen: 2 },
  { id: "hive-badge", name: "Hive Badge", leader: "Bugsy", cityId: "azalea-town", type: "bug", gen: 2 },
  { id: "plain-badge", name: "Plain Badge", leader: "Whitney", cityId: "goldenrod-city", type: "normal", gen: 2 },
  { id: "fog-badge", name: "Fog Badge", leader: "Morty", cityId: "ecruteak-city", type: "ghost", gen: 2 },
  { id: "storm-badge", name: "Storm Badge", leader: "Chuck", cityId: "cianwood-city", type: "fighting", gen: 2 },
  { id: "mineral-badge", name: "Mineral Badge", leader: "Jasmine", cityId: "olivine-city", type: "steel", gen: 2 },
  { id: "glacier-badge", name: "Glacier Badge", leader: "Pryce", cityId: "mahogany-town", type: "ice", gen: 2 },
  { id: "rising-badge", name: "Rising Badge", leader: "Clair", cityId: "blackthorn-city", type: "dragon", gen: 2 },
];
