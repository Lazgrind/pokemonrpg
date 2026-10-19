/**
 * Generace 2 – Johto. Samostatný modul (descriptor), který čte registr
 * ../generations.js. Zatím KOSTRA: prázdná mapa, žádné druhy – sem se postupně
 * „vyšívá" celý Johto obsah, aniž by se sáhlo na gen 1.
 *
 * Přechod do Johto: hráč připluje ze S.S. Anne (Kanto) až po zisku titulu
 * Champion. Vstupní uzel `startAreaId` se doplní, až vznikne první Johto oblast
 * (viz areas.js zde). Art mapy je `mapImage` (assets/gen2/map/johto.webp).
 */

import { SPECIES_GEN2 } from "./pokemon.js";
import { LEARNSETS_GEN2 } from "./learnsets.js";
import { EV_YIELDS_GEN2 } from "./evYields.js";
import { AREAS_GEN2 } from "./areas.js";
import { LEGENDARY_GEN2 } from "./legendaries.js";
import { EVOLUTION_PATCHES_GEN2 } from "./evolutions.js";
import { BADGES_GEN2 } from "./badges.js";
import { GYMS_GEN2 } from "./gyms.js";
import {
  FIXED_TRAINERS_GEN2,
  ROUTE_TRAINER_PLAN_GEN2,
  LEAGUE_GEN2,
  ROCKET_GAUNTLETS_GEN2,
  RIVAL_GATES_GEN2,
} from "./trainers.js";

/** @type {import("../generations.js").Generation} */
export const GEN2 = {
  gen: 2,
  region: "johto",
  regionName: "Johto",
  mapImage: "assets/gen2/map/johto.webp",
  startAreaId: "new-bark-town", // vstupní uzel Johta (placeholder město)
  species: SPECIES_GEN2,
  learnsets: LEARNSETS_GEN2,
  evYields: EV_YIELDS_GEN2,
  areas: AREAS_GEN2,
  legendaries: LEGENDARY_GEN2,
  // Cross-gen evoluce: gen-1 rodič → gen-2 forma (Golbat→Crobat…). Aggregator je
  // přimerguje do evolutions[] rodiče jen když je gen 2 aktivní (viz evolutions.js).
  evolutionPatches: EVOLUTION_PATCHES_GEN2,
  badges: BADGES_GEN2,
  gyms: GYMS_GEN2,
  trainers: FIXED_TRAINERS_GEN2,
  routeTrainerPlan: ROUTE_TRAINER_PLAN_GEN2,
  league: LEAGUE_GEN2,
  rocketGauntlets: ROCKET_GAUNTLETS_GEN2,
  rivalGates: RIVAL_GATES_GEN2,
  // Gen-1 evoluční větve znovu chytatelné v Johtu (kánon Johto dexu). Díky
  // region-locku (tým z Kanta tu nebojuje) musí jít celá větev získat čerstvě
  // tady, aby dosáhla gen-2 formy (Steelix, Crobat, Espeon…). Johto je gen2-locked:
  // jiné gen-1 druhy (Pidgey, Rattata…) se v johtských encounterech NEsmí objevit –
  // jen Gen 2 + tento seznam, a to tam, kde byly v HGSS. Viz region-model / evolutions.js.
  dexImports: [
    "zubat", "golbat", // → crobat
    "onix", // → steelix
    "eevee", // → espeon / umbreon (dárek v Goldenrodu)
    "horsea", "seadra", // → kingdra
    "oddish", "gloom", // → bellossom
    "poliwag", "poliwhirl", // → politoed
    "slowpoke", // → slowking
    "scyther", // → scizor
    "chansey", // → blissey
    "porygon", // → porygon2 (herna v Goldenrodu)
  ],
};
