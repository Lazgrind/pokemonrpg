/**
 * gyms.js – definice gymů Kanta.
 *
 * Gym = sekvence trenérů, kterou hráč prochází z „Gym" tabu na battle areně (jen
 * když je ve městě s gymem). Postup je striktně po pořadí: odemčený je vždy jen
 * další neporažený trenér; poražením posledního (leadera) hráč získá odznak.
 *
 * Zdroj trenérů je registr v data/trainers.js – tady na ně odkazujeme jen přes id.
 * `trainerOrder` = pořadí gym trenérů + NAKONEC leader. Odznak drží leader
 * (trainer.badge) i tady (gym.badge) pro pohodlí UI.
 *
 * ⚠️ ROZSAH: všech 8 gymů Kanta (BASIC, kanonické pořadí odznaků). Rostery gym
 * trenérů + leaderů žijí v data/trainers.js; tady jen sekvence (trainerOrder).
 */

import { getTrainer } from "./trainers.js";

/**
 * @typedef {Object} Gym
 * @property {string} id            id gymu
 * @property {string} cityId        id města (uzel v data/areas.js), kde gym stojí
 * @property {string} name          zobrazované jméno gymu
 * @property {string} type          typ gymu (téma)
 * @property {string} badge         id odznaku, který se získá poražením leadera
 * @property {string} leaderId      id trenéra-leadera (v data/trainers.js)
 * @property {string[]} trainerOrder  id trenérů v pořadí (poslední = leader)
 */

/** @type {Gym[]} */
export const GYMS = [
  {
    id: "pewter-gym",
    cityId: "pewter-city",
    name: "Pewter City Gym",
    type: "rock",
    badge: "boulder-badge",
    leaderId: "brock",
    trainerOrder: ["pewter-gym-camper-liam", "brock"],
  },
  {
    id: "cerulean-gym",
    cityId: "cerulean-city",
    name: "Cerulean City Gym",
    type: "water",
    badge: "cascade-badge",
    leaderId: "misty",
    trainerOrder: ["cerulean-gym-swimmer-luis", "cerulean-gym-jr-diana", "misty"],
  },
  {
    id: "vermilion-gym",
    cityId: "vermilion-city",
    name: "Vermilion City Gym",
    type: "electric",
    badge: "thunder-badge",
    leaderId: "lt-surge",
    // Věrný Kanto: vchod blokuje strom – hráč potřebuje HM Cut (ze S.S. Anne).
    requiresStory: "hasCut",
    trainerOrder: [
      "vermilion-gym-sailor-dwayne",
      "vermilion-gym-gentleman-gregory",
      "lt-surge",
    ],
  },
  {
    id: "celadon-gym",
    cityId: "celadon-city",
    name: "Celadon City Gym",
    type: "grass",
    badge: "rainbow-badge",
    leaderId: "erika",
    trainerOrder: ["celadon-gym-beauty-tamia", "celadon-gym-lass-michelle", "erika"],
  },
  {
    id: "fuchsia-gym",
    cityId: "fuchsia-city",
    name: "Fuchsia City Gym",
    type: "poison",
    badge: "soul-badge",
    leaderId: "koga",
    trainerOrder: ["fuchsia-gym-tamer-edgar", "fuchsia-gym-juggler-nelson", "koga"],
  },
  {
    id: "saffron-gym",
    cityId: "saffron-city",
    name: "Saffron City Gym",
    type: "psychic",
    badge: "marsh-badge",
    leaderId: "sabrina",
    trainerOrder: [
      "saffron-gym-psychic-johan",
      "saffron-gym-channeler-preston",
      "sabrina",
    ],
  },
  {
    id: "cinnabar-gym",
    cityId: "cinnabar-island",
    name: "Cinnabar Island Gym",
    type: "fire",
    badge: "volcano-badge",
    leaderId: "blaine",
    trainerOrder: [
      "cinnabar-gym-burglar-quinn",
      "cinnabar-gym-supernerd-erik",
      "blaine",
    ],
  },
  {
    id: "viridian-gym",
    cityId: "viridian-city",
    name: "Viridian City Gym",
    type: "ground",
    badge: "earth-badge",
    leaderId: "giovanni",
    // Věrné kánonu: Viridian Gym je zavřený, dokud nemáš ostatních 7 odznaků
    // (Giovanni je poslední). Do té doby se Gym tab nezobrazí a v City tabu je
    // jen zavřená story budova (viz storyBuildingView „viridian-gym").
    requiresBadges: 7,
    trainerOrder: [
      "viridian-gym-cooltrainer-samson",
      "viridian-gym-toughguy-nick",
      "giovanni",
    ],
  },
];

const GYM_BY_ID = new Map(GYMS.map((g) => [g.id, g]));
const GYM_BY_CITY = new Map(GYMS.map((g) => [g.cityId, g]));

/** Gym podle id, nebo null. */
export function getGym(id) {
  return GYM_BY_ID.get(id) ?? null;
}

/** Gym ve městě (podle cityId oblasti), nebo null. */
export function getGymForCity(cityId) {
  return GYM_BY_CITY.get(cityId) ?? null;
}

/**
 * Je gym otevřený? Většina gymů je vždy dostupná; některé (Viridian) vyžadují
 * napřed jiné odznaky (`requiresBadges`). Vlastní odznak gymu se do počtu nepočítá.
 * @param {Gym} gym
 * @param {string[]} badges  získané odznaky (state.progress.badges)
 * @returns {boolean}
 */
export function isGymOpen(gym, badges = []) {
  if (!gym) return false;
  const need = gym.requiresBadges ?? 0;
  if (need <= 0) return true;
  const owned = (badges ?? []).filter((b) => b !== gym.badge).length;
  return owned >= need;
}

/** Trenéři gymu jako objekty v pořadí (poslední = leader). */
export function gymTrainers(gym) {
  if (!gym) return [];
  return gym.trainerOrder.map((id) => getTrainer(id)).filter(Boolean);
}
