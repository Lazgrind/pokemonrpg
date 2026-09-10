/**
 * tms.js – DATA vrstva Technical Machines (TM), Gen 1 (v0.93.0).
 *
 * Čistá data: kanonické mapování TM01–TM50 → tah (id z data/moves.js), plus
 * metadata odkud se TM dá získat (gym leader / Poké Mart / Game Corner). Herní
 * logiku (naučení tahu, spotřeba, kompatibilita) řeší src/systems/tmSystem.js,
 * kompatibilitu druhů data/tmCompat.js.
 *
 * TM je jednorázový (po naučení se spotřebuje) – jako v Gen 1. HM (Cut/Surf/…)
 * jsou samostatné klíčové itemy (data/items.js), ne TM.
 *
 * @typedef {Object} TmDef
 * @property {number} num         číslo TM (1–50)
 * @property {string} move        id tahu (data/moves.js)
 * @property {string} name        zobrazované jméno tahu (bez „TMxx")
 * @property {number} [price]     cena v goldu (kupitelný v Poké Martu) – jinak nekupitelný
 * @property {number} [coins]     cena v coinech (prize v Game Corneru) – jinak není prize
 * @property {string} [leaderBadge]  odznak, jehož gym leader tento TM dává jako odměnu
 */

/** @type {TmDef[]} */
export const TMS = [
  { num: 1,  move: "mega-punch",   name: "Mega Punch",   price: 3000 },
  { num: 2,  move: "razor-wind",   name: "Razor Wind" },
  { num: 3,  move: "swords-dance", name: "Swords Dance", price: 2000 },
  { num: 4,  move: "whirlwind",    name: "Whirlwind" },
  { num: 5,  move: "mega-kick",    name: "Mega Kick",    price: 3000 },
  { num: 6,  move: "toxic",        name: "Toxic",        leaderBadge: "soul-badge" },
  { num: 7,  move: "horn-drill",   name: "Horn Drill" },
  { num: 8,  move: "body-slam",    name: "Body Slam" },
  { num: 9,  move: "take-down",    name: "Take Down",    price: 3000 },
  { num: 10, move: "double-edge",  name: "Double-Edge",  price: 4000 },
  { num: 11, move: "bubble-beam",  name: "Bubble Beam",  leaderBadge: "cascade-badge" },
  { num: 12, move: "water-gun",    name: "Water Gun" },
  { num: 13, move: "ice-beam",     name: "Ice Beam",     coins: 4400 },
  { num: 14, move: "blizzard",     name: "Blizzard" },
  { num: 15, move: "hyper-beam",   name: "Hyper Beam",   price: 7500 },
  { num: 16, move: "pay-day",      name: "Pay Day" },
  { num: 17, move: "submission",   name: "Submission",   price: 3000 },
  { num: 18, move: "counter",      name: "Counter" },
  { num: 19, move: "seismic-toss", name: "Seismic Toss" },
  { num: 20, move: "rage",         name: "Rage" },
  { num: 21, move: "mega-drain",   name: "Mega Drain",   leaderBadge: "rainbow-badge" },
  { num: 22, move: "solar-beam",   name: "Solar Beam" },
  { num: 23, move: "dragon-rage",  name: "Dragon Rage",  coins: 3300 },
  { num: 24, move: "thunderbolt",  name: "Thunderbolt",  leaderBadge: "thunder-badge" },
  { num: 25, move: "thunder",      name: "Thunder" },
  { num: 26, move: "earthquake",   name: "Earthquake",   price: 5000 },
  { num: 27, move: "fissure",      name: "Fissure",      leaderBadge: "earth-badge" },
  { num: 28, move: "dig",          name: "Dig" },
  { num: 29, move: "psychic",      name: "Psychic" },
  { num: 30, move: "teleport",     name: "Teleport" },
  { num: 31, move: "mimic",        name: "Mimic" },
  { num: 32, move: "double-team",  name: "Double Team",  price: 1000 },
  { num: 33, move: "reflect",      name: "Reflect",      price: 1000 },
  { num: 34, move: "bide",         name: "Bide",         leaderBadge: "boulder-badge" },
  { num: 35, move: "metronome",    name: "Metronome" },
  { num: 36, move: "self-destruct",name: "Self-Destruct" },
  { num: 37, move: "egg-bomb",     name: "Egg Bomb" },
  { num: 38, move: "fire-blast",   name: "Fire Blast",   leaderBadge: "volcano-badge" },
  { num: 39, move: "swift",        name: "Swift",        price: 2000 },
  { num: 40, move: "skull-bash",   name: "Skull Bash" },
  { num: 41, move: "soft-boiled",  name: "Soft-Boiled" },
  { num: 42, move: "dream-eater",  name: "Dream Eater" },
  { num: 43, move: "sky-attack",   name: "Sky Attack" },
  { num: 44, move: "rest",         name: "Rest",         price: 1000 },
  { num: 45, move: "thunder-wave", name: "Thunder Wave", price: 2000 },
  { num: 46, move: "psywave",      name: "Psywave",      leaderBadge: "marsh-badge" },
  { num: 47, move: "explosion",    name: "Explosion" },
  { num: 48, move: "rock-slide",   name: "Rock Slide",   coins: 5500 },
  { num: 49, move: "tri-attack",   name: "Tri Attack" },
  { num: 50, move: "substitute",   name: "Substitute",   price: 2000 },
];

/** Padding čísla TM → item id (např. 1 → "tm01", 34 → "tm34"). */
export function tmItemId(num) {
  return `tm${String(num).padStart(2, "0")}`;
}

/** Zobrazované jméno TM itemu, např. „TM24 Thunderbolt". */
export function tmDisplayName(tm) {
  return `TM${String(tm.num).padStart(2, "0")} ${tm.name}`;
}

/** TmDef podle čísla (nebo null). */
export function getTm(num) {
  return TMS.find((t) => t.num === num) ?? null;
}

/** TmDef podle item id („tm24") (nebo null). */
export function getTmByItemId(id) {
  const m = /^tm(\d{2})$/.exec(id ?? "");
  return m ? getTm(Number(m[1])) : null;
}

/** Je toto item id TM? */
export function isTmItemId(id) {
  return /^tm\d{2}$/.test(id ?? "");
}

/** Mapa odznak → číslo TM, který dá jeho gym leader (odměna za souboj). */
export const TM_BY_BADGE = Object.fromEntries(
  TMS.filter((t) => t.leaderBadge).map((t) => [t.leaderBadge, t.num])
);
