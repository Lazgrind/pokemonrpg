/**
 * DATA: 8 gymů Johta (gen 2). Čistá data (sekvence trenérů); typedef, helpery a
 * sloučení generací viz ../gyms.js. Rostery trenérů žijí v data/gen2/trainers.js
 * (přes id v trainerOrder). Pořadí = kánon (Gold/Silver/Crystal).
 *
 * cityId odkazuje na uzel města v data/gen2/areas.js.
 */

/** @type {import("../gyms.js").Gym[]} */
export const GYMS_GEN2 = [
  {
    id: "violet-gym",
    cityId: "violet-city",
    name: "Violet City Gym",
    type: "flying",
    badge: "zephyr-badge",
    leaderId: "falkner",
    trainerOrder: ["violet-gym-bird-keeper-rod", "falkner"],
  },
  {
    id: "azalea-gym",
    cityId: "azalea-town",
    name: "Azalea Town Gym",
    type: "bug",
    badge: "hive-badge",
    leaderId: "bugsy",
    trainerOrder: ["azalea-gym-bug-catcher-benny", "azalea-gym-bug-catcher-al", "bugsy"],
  },
  {
    id: "goldenrod-gym",
    cityId: "goldenrod-city",
    name: "Goldenrod City Gym",
    type: "normal",
    badge: "plain-badge",
    leaderId: "whitney",
    trainerOrder: ["goldenrod-gym-lass-carrie", "goldenrod-gym-beauty-victoria", "whitney"],
  },
  {
    id: "ecruteak-gym",
    cityId: "ecruteak-city",
    name: "Ecruteak City Gym",
    type: "ghost",
    badge: "fog-badge",
    leaderId: "morty",
    trainerOrder: ["ecruteak-gym-medium-martha", "ecruteak-gym-sage-jeffrey", "morty"],
  },
  {
    id: "cianwood-gym",
    cityId: "cianwood-city",
    name: "Cianwood City Gym",
    type: "fighting",
    badge: "storm-badge",
    leaderId: "chuck",
    trainerOrder: ["cianwood-gym-black-belt-yoshi", "cianwood-gym-black-belt-lao", "chuck"],
  },
  {
    id: "olivine-gym",
    cityId: "olivine-city",
    name: "Olivine City Gym",
    type: "steel",
    badge: "mineral-badge",
    leaderId: "jasmine",
    // Kánon: Jasmine se do gymu vrátí, až vyléčíš nemocného Ampharose (Amphy) v
    // olivinském majáku lékem z Cianwoodu → flag "amphyHealed". Dokud lék
    // nedoručíš, je Jasmine v majáku a gym zavřený. Viz storyBuildingView
    // "olivine-lighthouse" + "cianwood-pharmacy".
    requiresStory: "amphyHealed",
    trainerOrder: ["jasmine"],
  },
  {
    id: "mahogany-gym",
    cityId: "mahogany-town",
    name: "Mahogany Town Gym",
    type: "ice",
    badge: "glacier-badge",
    leaderId: "pryce",
    // Kánon GSC: mahoganský gym je zavřený, dokud nevyčistíš tajnou základnu Team
    // Rocket pod obchodem se suvenýry (u Lake of Rage) → flag "mahoganyHideoutCleared".
    // Do té doby je gym zamčený (gate text viz gymView GYM_GATES "mahogany-gym").
    requiresStory: "mahoganyHideoutCleared",
    trainerOrder: ["mahogany-gym-skier-diana", "mahogany-gym-boarder-ronald", "pryce"],
  },
  {
    id: "blackthorn-gym",
    cityId: "blackthorn-city",
    name: "Blackthorn City Gym",
    type: "dragon",
    badge: "rising-badge",
    leaderId: "clair",
    trainerOrder: ["blackthorn-gym-cooltrainer-paul", "blackthorn-gym-cooltrainer-lola", "clair"],
  },
];
