/**
 * DATA: 8 gymů Kanta (gen 1). Čistá data (sekvence trenérů); typedef, helpery a
 * sloučení generací viz ../gyms.js. Rostery trenérů žijí v data/gen1/trainers.js
 * (přes id v trainerOrder).
 */

/** @type {import("../gyms.js").Gym[]} */
export const GYMS_GEN1 = [
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
    // Věrné kánonu: Team Rocket obsadil Saffron a zabral i gym, dokud nevyčistíš
    // Silph Co (viz storyBuildingView silph-co → silphCleared).
    requiresStory: "silphCleared",
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
    // Věrné kánonu: dveře gymu jsou zamčené, dokud nenajdeš Secret Key ve
    // vyhořelém Pokémon Mansionu (viz storyBuildingView pokemon-mansion).
    requiresStory: "hasSecretKey",
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
