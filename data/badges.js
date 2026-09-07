/**
 * badges.js – kanonická definice 8 gym odznaků Kanta.
 *
 * Zdroj pravdy pro odznaky: pořadí (kánon), jméno, vůdce, město a typ gymu.
 * Používá to Profile tab (badge case) a později gym systém (výhra nad leaderem
 * přidá `id` do `state.progress.badges`; `unlock.badge` gatuje oblasti).
 *
 * `id` = zároveň jméno souboru ikony → `assets/badges/<id>.png`.
 * `cityId` odkazuje na uzel města v data/areas.js.
 */

/**
 * @typedef {Object} Badge
 * @property {string} id      id odznaku (= jméno souboru ikony)
 * @property {string} name    zobrazované jméno
 * @property {string} leader  jméno gym leadera
 * @property {string} cityId  id města (uzel v data/areas.js), kde se odznak získá
 * @property {string} type    typ gymu (téma týmu leadera)
 */

/** @type {Badge[]} Kanonické pořadí odznaků Kanta. */
export const BADGES = [
  { id: "boulder-badge", name: "Boulder Badge", leader: "Brock", cityId: "pewter-city", type: "rock" },
  { id: "cascade-badge", name: "Cascade Badge", leader: "Misty", cityId: "cerulean-city", type: "water" },
  { id: "thunder-badge", name: "Thunder Badge", leader: "Lt. Surge", cityId: "vermilion-city", type: "electric" },
  { id: "rainbow-badge", name: "Rainbow Badge", leader: "Erika", cityId: "celadon-city", type: "grass" },
  { id: "soul-badge", name: "Soul Badge", leader: "Koga", cityId: "fuchsia-city", type: "poison" },
  { id: "marsh-badge", name: "Marsh Badge", leader: "Sabrina", cityId: "saffron-city", type: "psychic" },
  { id: "volcano-badge", name: "Volcano Badge", leader: "Blaine", cityId: "cinnabar-island", type: "fire" },
  { id: "earth-badge", name: "Earth Badge", leader: "Giovanni", cityId: "viridian-city", type: "ground" },
];

/** Badge podle id, nebo null. */
export function getBadge(id) {
  return BADGES.find((b) => b.id === id) ?? null;
}
