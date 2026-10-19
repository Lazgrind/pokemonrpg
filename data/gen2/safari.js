/**
 * DATA: Safari Zone Johta (HeartGold/SoulSilver) – západně od Cianwoodu, za Route 48.
 *
 * Úplně jiná hra než kantská Safari (ta je v systems/safariSystem.js a NEsahá se na ni):
 *  • Safari je rozdělená na oblasti s terénem (louka, les, bažina, hory…).
 *  • Do každé oblasti si hráč rozmístí BLOKY (tráva / stromy / kameny / voda).
 *    Podle počtu bloků a podle toho, kolik DNÍ uběhlo od poslední přestavby oblasti,
 *    se v ní začnou objevovat další Pokémoni – věrně HGSS „Safari Zone object" systému.
 *  • Nebojuje se: Bait / Rock / Safari Ball / Run. Bez limitu kroků (jako HGSS) –
 *    výprava končí, když dojdou Safari Bally, nebo když odejdeš.
 *  • Jen Pokémoni Gen 2 (#152–#251). Po dohrání Johto Ligy tu vzácně spawnují
 *    johtští startéři (zbylé dva jinak nejdou získat) – jako Kanto startéři v kantské Safari.
 *
 * Engine: systems/johtoSafariSystem.js, UI: ui/johtoSafariView.js (tab „Safari").
 * Konfigurace oblastí je tady; druhy mohou mít podmínku `need` na bloky a `days`.
 */

/** Id uzlu mapy (data/gen2/areas.js). */
export const JOHTO_SAFARI_AREA_ID = "safari-zone-johto";

export const JOHTO_SAFARI_FEE = 500; // vstupné (₽), kánon HGSS
export const JOHTO_SAFARI_BALLS = 30; // Safari Bally na výpravu (kánon HGSS, bez limitu kroků)

/** 1 „den" Safari v reálném čase. HGSS počítá skutečné dny – pro idle hru zkráceno na hodinu. */
export const SAFARI_DAY_MS = 60 * 60 * 1000;

/** Bloky, které jde rozmístit (pořadí = pořadí v UI). */
export const SAFARI_BLOCKS = [
  { id: "grass", name: "Grass", icon: "🌿" },
  { id: "tree", name: "Tree", icon: "🌳" },
  { id: "rock", name: "Rock", icon: "🪨" },
  { id: "water", name: "Water", icon: "💧" },
];

/** Počet míst na bloky v každé oblasti: začíná na 3, +1 za každé 2 výpravy, max 6. */
export function blockSlotsFor(visits) {
  return Math.min(6, 3 + Math.floor((visits ?? 0) / 2));
}

/**
 * @typedef {Object} SafariSpecies
 * @property {string} id
 * @property {Partial<Record<"grass"|"tree"|"rock"|"water", number>>} [need]  min. počty bloků
 * @property {number} [days]  min. počet dní od poslední přestavby oblasti
 * @property {[number, number]} [level]  vlastní levely (druhy přilákané bloky jsou v HGSS ~Lv 40)
 * @property {string} [hint]  nápověda, dokud se druh v oblasti neobjevuje
 * @property {boolean} [extra]  NENÍ skutečný spawn HGSS Safari – doplněno, protože druh v Johtu
 *   jinak nejde získat (mimina z chovu Gen 1 rodičů, Sneasel z Mt. Silver, Slugma z Kanta,
 *   Tyrogue = dárek v Mt. Mortar). Rozhodnutí autora 2026-10-19.
 */

/**
 * @typedef {Object} SafariArea
 * @property {string} id
 * @property {string} name
 * @property {string} desc
 * @property {[number, number]} level   rozsah levelů běžných setkání
 * @property {SafariSpecies[]} species  bez `need`/`days` = žije tu vždy
 */

/**
 * Oblasti a druhy = SKUTEČNÉ spawny Safari Zone v HeartGold/SoulSilver (PokeAPI
 * encounters, oblasti 813–824), jen druhy Gen 2 – Johto je gen2-locked.
 * Druhy, které v HGSS chodí jen s bloky (vyšší levely, ~Lv 37–47), mají `need`.
 * Přesné bodové prahy objektů HGSS tu nejsou – bloky (tráva/stromy/kameny/voda)
 * odpovídají kategoriím objektů HGSS (Plains/Forest/Peak/Water), prahy jsou zjednodušené.
 * Desert a Wasteland v HGSS žádného Gen 2 Pokémona nemají, proto tu nejsou.
 * Výjimky: Chansey (dexImports, předchůdce Blissey) – v HGSS Meadow opravdu je; druhy s `extra`
 * – v HGSS tu nejsou, ale v gen2-locked Johtu by jinak nešly získat.
 * @type {SafariArea[]}
 */
export const JOHTO_SAFARI_AREAS = [
  {
    id: "plains",
    name: "Plains",
    desc: "Open grassland where herds roam.",
    level: [15, 17],
    species: [
      { id: "girafarig" },
      { id: "stantler" },
      { id: "smeargle" },
      { id: "houndoom", need: { rock: 3 }, days: 2, level: [43, 44], hint: "comes to a rocky plain after a few days" },
      { id: "pichu", need: { grass: 2 }, days: 1, extra: true, hint: "comes to tall grass after a day" },
      { id: "tyrogue", need: { grass: 1, rock: 2 }, days: 2, extra: true, hint: "comes to rocks in the grass after a few days" },
    ],
  },
  {
    id: "meadow",
    name: "Meadow",
    desc: "Flowers, soft grass and a quiet pond.",
    level: [15, 17],
    species: [
      { id: "hoppip" },
      { id: "sunkern" },
      { id: "marill" },
      { id: "wooper" },
      { id: "skiploom" },
      { id: "chansey", need: { grass: 2, tree: 1 }, days: 2, level: [42, 42], hint: "rare — a peaceful meadow, and patience" },
      { id: "cleffa", need: { grass: 2, rock: 1 }, days: 2, extra: true, hint: "comes on quiet nights after a few days" },
      { id: "igglybuff", need: { grass: 3 }, days: 1, extra: true, hint: "comes to soft grass after a day" },
    ],
  },
  {
    id: "forest",
    name: "Forest",
    desc: "Dense trees and dim light.",
    level: [15, 17],
    species: [{ id: "misdreavus" }],
  },
  {
    id: "swamp",
    name: "Swamp",
    desc: "Murky water and tangled roots.",
    level: [15, 17],
    species: [
      { id: "sentret" },
      { id: "murkrow" },
      { id: "furret", need: { grass: 2, water: 1 }, days: 1, level: [42, 42], hint: "comes to grassy banks after a day" },
    ],
  },
  {
    id: "marshland",
    name: "Marshland",
    desc: "Shallow pools and thick reeds.",
    level: [15, 17],
    species: [
      { id: "wooper" },
      { id: "quagsire", need: { water: 3 }, level: [43, 43], hint: "likes deep water" },
      { id: "jumpluff", need: { grass: 3 }, days: 2, level: [38, 47], hint: "comes to a grassy marsh after a few days" },
      { id: "shuckle", need: { rock: 2 }, days: 2, level: [44, 44], hint: "comes to rocks after a few days" },
    ],
  },
  {
    id: "mountain",
    name: "Mountain",
    desc: "Steep cliffs and cold winds.",
    level: [15, 17],
    species: [
      { id: "larvitar" },
      { id: "sneasel", need: { rock: 3, water: 1 }, days: 2, extra: true, hint: "comes to icy rocks after a few days" },
    ],
  },
  {
    id: "peak",
    name: "Peak",
    desc: "The windswept summit of the reserve.",
    level: [15, 17],
    species: [
      { id: "wobbuffet" },
      { id: "smoochum", need: { rock: 2, water: 2 }, days: 2, extra: true, hint: "comes to cold, wet rocks after a few days" },
      { id: "elekid", need: { rock: 2, tree: 1 }, days: 2, extra: true, hint: "comes when storms hit the rocks, after a few days" },
    ],
  },
  {
    id: "rocky-beach",
    name: "Rocky Beach",
    desc: "Tide pools between sea-worn rocks.",
    level: [15, 17],
    species: [
      { id: "mareep", need: { grass: 2, rock: 1 }, days: 1, level: [43, 43], hint: "comes to grass among the rocks after a day" },
    ],
  },
  {
    id: "savannah",
    name: "Savannah",
    desc: "Dry grass and lone trees.",
    level: [15, 17],
    species: [
      { id: "houndour", need: { rock: 2 }, days: 1, level: [42, 42], hint: "comes to rocks after a day" },
      { id: "magby", need: { rock: 3 }, days: 2, extra: true, hint: "comes to sun-baked rocks after a few days" },
      { id: "slugma", need: { rock: 4 }, days: 1, extra: true, hint: "likes hot rocks" },
    ],
  },
  {
    id: "wetland",
    name: "Wetland",
    desc: "Lush grass around a wide river.",
    level: [15, 17],
    species: [
      { id: "sentret" },
      { id: "wooper" },
      { id: "quagsire" },
      { id: "furret", need: { grass: 2 }, level: [37, 37], hint: "likes tall grass" },
    ],
  },
];

/** Johtští startéři – po dohrání Johto Ligy (isJohtoChampion) tu vzácně spawnují. */
export const JOHTO_SAFARI_STARTERS = ["chikorita", "cyndaquil", "totodile"];
export const JOHTO_SAFARI_STARTER_CHANCE = 0.08;

/** Všechny druhy, které v Safari můžou být (pro mapu / Pokédex). */
export function allJohtoSafariSpecies() {
  const ids = new Set();
  for (const a of JOHTO_SAFARI_AREAS) for (const s of a.species) ids.add(s.id);
  return [...ids];
}
