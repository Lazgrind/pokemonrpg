/**
 * trainers.js – definice trenérů (route trenéři, gym trenéři, gym leadeři, rival).
 *
 * Trenér = předdefinovaná FRONTA konkrétních Pokémonů pro STÁVAJÍCÍ bojový engine
 * (žádný nový režim). Battle engine (src/systems/battleSystem.js) proti nim postaví
 * combatanty přes createPokemon(speciesId, level) a prochází je popořadě. U trenérů
 * NEJDE chytat cizí Pokémony. Výhra zapíše `trainer.id` do
 * `state.progress.defeatedTrainers` (jednorázová odměna + gating).
 *
 * Dva druhy trenérů:
 *  1) FIXNÍ (gym trenéři, gym leadeři, rival) – mají pevný `team` (kánon FRLG).
 *     Signature soupeři musí mít přesné rostery → hardcoded v registru TRAINERS.
 *  2) PROCEDURÁLNÍ (route trenéři) – mají `gen` spec místo `team`. Tým se vyrolí
 *     ČERSTVĚ při startu souboje (viz resolveTrainerTeam / generateRouteTeam):
 *       - druhy: preferenčně z dané routy (area.species), občas z NIŽŠÍCH rout
 *         (order <), a každý kus se VYVINE NAHORU, kam vylosovaný level dovolí;
 *       - level band + velikost týmu + počet trenérů = ROUTE_TRAINER_PLAN;
 *       - třída trenéra se odvodí z biomu routy (cave→hiker, water→swimmer…).
 *     `id` route trenéra je STABILNÍ (kvůli defeatedTrainers) – rolí se jen tým.
 *
 * Sprity (zatím chybí → fallback): odvozují se z `class` / `id`, viz
 * `trainerSpriteUrl()`. `kind === "gym-leader"` → assets/gym-leaders/<id>/front.png,
 * ostatní → assets/trainers/<class>/front.png. Konvence viz docs/SPRITES-TODO.md.
 *
 * ⚠️ ROZSAH: celé Kanto (BASIC). Gymy = 8 leaderů + pár gym trenérů (kánon FRLG,
 * přibližně). Route trenéři = procedurální, na všech routách kromě zón bez trenérů
 * dle kánonu (Diglett's Cave, Power Plant, Safari Zone, Seafoam Islands, Cerulean Cave).
 */

import { AREAS, getArea } from "./areas.js";
import { getSpecies } from "./pokemon.js";

/**
 * @typedef {Object} TrainerMon
 * @property {?string} speciesId  id druhu (data/pokemon.js); null jen když counterStarter
 * @property {number} level      úroveň
 * @property {string[]} [moves]  volitelně konkrétní tahy; jinak defaultMovesFor()
 * @property {boolean} [counterStarter]  true = druh dopočítá engine tak, aby COUNTROVAL
 *   hráčova startera (Charmander→Squirtle, Squirtle→Bulbasaur, Bulbasaur→Charmander),
 *   jako v originále. speciesId se ignoruje. Viz battleSystem.
 * @property {boolean} [counterStarterFinal]  jako counterStarter, ale FINÁLNÍ evoluce
 *   (endgame rival: Bulbasaur→Charizard, Charmander→Blastoise, Squirtle→Venusaur).
 */

/**
 * @typedef {Object} RouteGen  procedurální spec route trenéra (místo pevného team).
 * @property {string} areaId    routa (species pool + order pro nižší routy)
 * @property {[number,number]} level  level band (min–max) pro každý kus týmu
 * @property {[number,number]} size   velikost týmu (min–max)
 */

/**
 * @typedef {Object} Trainer
 * @property {string} id        unikátní id (klíč do state.progress.defeatedTrainers)
 * @property {"route"|"gym"|"gym-leader"|"rival"} kind  druh trenéra
 * @property {string} class     trenérská třída (složka spritu, viz trainerSpriteUrl)
 * @property {string} name      zobrazované jméno (vč. třídy, např. "Bug Catcher Rick")
 * @property {TrainerMon[]} [team]  fronta Pokémonů (fixní trenéři); u route trenérů chybí
 * @property {RouteGen} [gen]   procedurální spec (route trenéři); u fixních chybí
 * @property {number} reward    odměna ve zlatě za první výhru
 * @property {string} [quote]   volitelná hláška před soubojem (do logu/UI)
 * @property {string} [badge]   jen u gym-leadera: id odznaku, který výhra udělí
 */

/** @type {Trainer[]} FIXNÍ trenéři (rival + gym trenéři + leadeři). Route trenéři
 * se generují níže z ROUTE_TRAINER_PLAN a připojí do registru. */
const FIXED_TRAINERS = [
  // ═══════════════════════════════════════════════════════════════════════════
  //  RIVAL (kind "rival") – klikací gateway tab, PŘEDLIGOVÝ endgame soupeř.
  // ═══════════════════════════════════════════════════════════════════════════
  // kind "rival" = speciální gate-mini-boss. Route 22 vede k Victory Road / Lize,
  // takže tenhle souboj je ENDGAME (ne progrese k Pewteru) → PLNÝ tým na vysokém
  // levelu, counter-starter je FINÁLNÍ evoluce.
  {
    id: "rival-route-22",
    kind: "rival",
    class: "rival",
    name: "Rival",
    team: [
      { speciesId: "pidgeot", level: 47 },
      { speciesId: "alakazam", level: 47 },
      { speciesId: "rhydon", level: 45 },
      { speciesId: "gyarados", level: 45 },
      { speciesId: "arcanine", level: 47 },
      { speciesId: null, level: 50, counterStarterFinal: true },
    ],
    reward: 5000,
    quote: "Smell ya later! ...Just kidding. Let's see if you're ready for the League!",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  GYM TRENÉŘI + LEADEŘI (kind "gym" / "gym-leader") – spouští se z Gym tabu.
  //  Sekvence gymu určuje data/gyms.js (trainerOrder), tady jen definice.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Pewter Gym (Brock, Rock) ──────────────────────────────────────────────
  {
    id: "pewter-gym-camper-liam",
    kind: "gym",
    class: "camper",
    name: "Camper Liam",
    team: [
      { speciesId: "diglett", level: 10 },
      { speciesId: "sandshrew", level: 10 },
    ],
    reward: 200,
    quote: "Stop right there! You can't reach Brock without beating me first!",
  },
  {
    id: "brock",
    kind: "gym-leader",
    class: "brock",
    name: "Leader Brock",
    team: [
      { speciesId: "geodude", level: 12 },
      { speciesId: "onix", level: 14 },
    ],
    reward: 1400,
    badge: "boulder-badge",
    quote:
      "I'm Brock! I'm Pewter's Gym Leader! My rock-hard willpower is evident even in my Pokémon. Let's battle!",
  },

  // ── Cerulean Gym (Misty, Water) ───────────────────────────────────────────
  {
    id: "cerulean-gym-swimmer-luis",
    kind: "gym",
    class: "swimmer-m",
    name: "Swimmer Luis",
    team: [
      { speciesId: "horsea", level: 16 },
      { speciesId: "shellder", level: 17 },
    ],
    reward: 85,
    quote: "The water in this Gym is deep. Don't drown!",
  },
  {
    id: "cerulean-gym-jr-diana",
    kind: "gym",
    class: "jr-trainer-f",
    name: "Jr. Trainer Diana",
    team: [{ speciesId: "goldeen", level: 19 }],
    reward: 456,
  },
  {
    id: "misty",
    kind: "gym-leader",
    class: "misty",
    name: "Leader Misty",
    team: [
      { speciesId: "staryu", level: 18 },
      { speciesId: "starmie", level: 21 },
    ],
    reward: 2100,
    badge: "cascade-badge",
    quote:
      "I'm Misty, Cerulean's Gym Leader! My policy is an all-out offensive with Water-type Pokémon!",
  },

  // ── Vermilion Gym (Lt. Surge, Electric) ───────────────────────────────────
  {
    id: "vermilion-gym-sailor-dwayne",
    kind: "gym",
    class: "sailor",
    name: "Sailor Dwayne",
    team: [
      { speciesId: "magnemite", level: 21 },
      { speciesId: "pikachu", level: 21 },
    ],
    reward: 462,
  },
  {
    id: "vermilion-gym-gentleman-gregory",
    kind: "gym",
    class: "gentleman",
    name: "Gentleman Gregory",
    team: [
      { speciesId: "voltorb", level: 21 },
      { speciesId: "voltorb", level: 21 },
    ],
    reward: 2100,
  },
  {
    id: "lt-surge",
    kind: "gym-leader",
    class: "lt-surge",
    name: "Leader Lt. Surge",
    team: [
      { speciesId: "voltorb", level: 21 },
      { speciesId: "pikachu", level: 18 },
      { speciesId: "raichu", level: 24 },
    ],
    reward: 2400,
    badge: "thunder-badge",
    quote:
      "Ten-hut! I'm Lt. Surge! My Electric Pokémon will fry you. This is the difference in our experience!",
  },

  // ── Celadon Gym (Erika, Grass) ────────────────────────────────────────────
  {
    id: "celadon-gym-beauty-tamia",
    kind: "gym",
    class: "beauty",
    name: "Beauty Tamia",
    team: [
      { speciesId: "bellsprout", level: 23 },
      { speciesId: "weepinbell", level: 24 },
    ],
    reward: 1560,
  },
  {
    id: "celadon-gym-lass-michelle",
    kind: "gym",
    class: "lass",
    name: "Lass Michelle",
    team: [
      { speciesId: "oddish", level: 24 },
      { speciesId: "gloom", level: 24 },
    ],
    reward: 384,
  },
  {
    id: "erika",
    kind: "gym-leader",
    class: "erika",
    name: "Leader Erika",
    team: [
      { speciesId: "victreebel", level: 29 },
      { speciesId: "tangela", level: 24 },
      { speciesId: "vileplume", level: 29 },
    ],
    reward: 2900,
    badge: "rainbow-badge",
    quote:
      "Hello. Lovely weather, isn't it? I am Erika. I teach the art of flower arranging. My Pokémon are Grass-type.",
  },

  // ── Fuchsia Gym (Koga, Poison) ────────────────────────────────────────────
  {
    id: "fuchsia-gym-tamer-edgar",
    kind: "gym",
    class: "tamer",
    name: "Tamer Edgar",
    team: [
      { speciesId: "arbok", level: 33 },
      { speciesId: "sandslash", level: 33 },
    ],
    reward: 1584,
  },
  {
    id: "fuchsia-gym-juggler-nelson",
    kind: "gym",
    class: "juggler",
    name: "Juggler Nelson",
    team: [
      { speciesId: "drowzee", level: 31 },
      { speciesId: "kadabra", level: 34 },
    ],
    reward: 1088,
  },
  {
    id: "koga",
    kind: "gym-leader",
    class: "koga",
    name: "Leader Koga",
    team: [
      { speciesId: "koffing", level: 37 },
      { speciesId: "muk", level: 39 },
      { speciesId: "koffing", level: 37 },
      { speciesId: "weezing", level: 43 },
    ],
    reward: 4300,
    badge: "soul-badge",
    quote:
      "Fwahahaha! A mere child like you dares to challenge me? I am Koga, master of Poison-type Pokémon!",
  },

  // ── Saffron Gym (Sabrina, Psychic) ────────────────────────────────────────
  {
    id: "saffron-gym-psychic-johan",
    kind: "gym",
    class: "psychic",
    name: "Psychic Johan",
    team: [
      { speciesId: "slowpoke", level: 34 },
      { speciesId: "kadabra", level: 34 },
    ],
    reward: 680,
  },
  {
    id: "saffron-gym-channeler-preston",
    kind: "gym",
    class: "channeler",
    name: "Channeler Preston",
    team: [
      { speciesId: "gastly", level: 31 },
      { speciesId: "haunter", level: 34 },
    ],
    reward: 748,
  },
  {
    id: "sabrina",
    kind: "gym-leader",
    class: "sabrina",
    name: "Leader Sabrina",
    team: [
      { speciesId: "kadabra", level: 38 },
      { speciesId: "mr-mime", level: 37 },
      { speciesId: "venomoth", level: 38 },
      { speciesId: "alakazam", level: 43 },
    ],
    reward: 4300,
    badge: "marsh-badge",
    quote:
      "I am Sabrina. I had a feeling you would come. My psychic power lets me see the future. You will lose.",
  },

  // ── Cinnabar Gym (Blaine, Fire) ───────────────────────────────────────────
  {
    id: "cinnabar-gym-burglar-quinn",
    kind: "gym",
    class: "burglar",
    name: "Burglar Quinn",
    team: [
      { speciesId: "growlithe", level: 38 },
      { speciesId: "ponyta", level: 40 },
    ],
    reward: 3520,
  },
  {
    id: "cinnabar-gym-supernerd-erik",
    kind: "gym",
    class: "super-nerd",
    name: "Super Nerd Erik",
    team: [
      { speciesId: "vulpix", level: 40 },
      { speciesId: "growlithe", level: 40 },
    ],
    reward: 1440,
  },
  {
    id: "blaine",
    kind: "gym-leader",
    class: "blaine",
    name: "Leader Blaine",
    team: [
      { speciesId: "growlithe", level: 42 },
      { speciesId: "ponyta", level: 40 },
      { speciesId: "rapidash", level: 42 },
      { speciesId: "arcanine", level: 47 },
    ],
    reward: 4700,
    badge: "volcano-badge",
    quote:
      "Hah! I'm Blaine! I'm the Cinnabar Gym Leader! My fiery Pokémon will incinerate all challengers! Hah!",
  },

  // ── Viridian Gym (Giovanni, Ground) ───────────────────────────────────────
  {
    id: "viridian-gym-cooltrainer-samson",
    kind: "gym",
    class: "cooltrainer-m",
    name: "Cool Trainer Samson",
    team: [
      { speciesId: "rhyhorn", level: 43 },
      { speciesId: "persian", level: 44 },
    ],
    reward: 1760,
  },
  {
    id: "viridian-gym-toughguy-nick",
    kind: "gym",
    class: "black-belt",
    name: "Black Belt Nick",
    team: [
      { speciesId: "machoke", level: 42 },
      { speciesId: "golem", level: 43 },
    ],
    reward: 1720,
  },
  {
    id: "giovanni",
    kind: "gym-leader",
    class: "giovanni",
    name: "Leader Giovanni",
    team: [
      { speciesId: "rhyhorn", level: 45 },
      { speciesId: "dugtrio", level: 42 },
      { speciesId: "nidoqueen", level: 44 },
      { speciesId: "nidoking", level: 45 },
      { speciesId: "rhydon", level: 50 },
    ],
    reward: 5000,
    badge: "earth-badge",
    quote:
      "So! I must say, I am impressed you got here. I am Giovanni, Viridian's Gym Leader. This is our final battle!",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  PROCEDURÁLNÍ ROUTE TRENÉŘI
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Plán route trenérů: pro každou routu level band + počet trenérů + velikost týmu.
 * Vynechány zóny, které dle kánonu trenéry nemají (Diglett's Cave, Power Plant,
 * Safari Zone, Seafoam Islands, Cerulean Cave) – ty tu prostě nejsou.
 * `level`/`size` = [min,max]. Trenéři se z toho vygenerují níže.
 */
export const ROUTE_TRAINER_PLAN = {
  "route-01": { level: [3, 6], count: 3, size: [2, 2] },
  "route-22": { level: [5, 8], count: 3, size: [2, 3] },
  "route-02": { level: [4, 7], count: 3, size: [2, 2] },
  "viridian-forest": { level: [5, 8], count: 4, size: [2, 3] },
  "route-03": { level: [9, 13], count: 4, size: [2, 3] },
  "mt-moon": { level: [11, 14], count: 5, size: [2, 3] },
  "route-04": { level: [10, 13], count: 3, size: [2, 3] },
  "route-24": { level: [11, 15], count: 5, size: [2, 3] },
  "route-25": { level: [12, 16], count: 5, size: [2, 4] },
  "route-05": { level: [14, 17], count: 3, size: [2, 3] },
  "route-06": { level: [15, 18], count: 4, size: [2, 3] },
  "route-11": { level: [17, 21], count: 5, size: [2, 4] },
  "route-09": { level: [14, 18], count: 5, size: [2, 4] },
  "rock-tunnel": { level: [15, 20], count: 5, size: [3, 4] },
  "route-10": { level: [16, 20], count: 4, size: [2, 4] },
  "route-08": { level: [18, 23], count: 5, size: [3, 4] },
  "route-07": { level: [18, 22], count: 4, size: [2, 4] },
  "route-16": { level: [24, 28], count: 4, size: [3, 4] },
  "route-17": { level: [26, 30], count: 5, size: [3, 5] },
  "route-18": { level: [28, 31], count: 4, size: [3, 4] },
  "route-12": { level: [28, 33], count: 5, size: [3, 5] },
  "route-13": { level: [29, 34], count: 5, size: [3, 5] },
  "route-14": { level: [30, 34], count: 5, size: [3, 5] },
  "route-15": { level: [30, 34], count: 5, size: [3, 5] },
  "route-19": { level: [28, 32], count: 4, size: [3, 4] },
  "route-20": { level: [30, 34], count: 5, size: [3, 4] },
  "route-21": { level: [32, 36], count: 4, size: [3, 5] },
  "route-23": { level: [40, 45], count: 5, size: [4, 5] },
  "victory-road": { level: [42, 47], count: 5, size: [4, 5] },
};

/** Trenérské třídy podle biomu routy (folder spritu, viz trainerSpriteUrl).
 * Názvy MUSÍ odpovídat složkám v assets/trainers/ (vč. genderových -m/-f variant). */
const BIOME_CLASSES = {
  grassland: ["youngster", "lass", "bug-catcher", "camper", "picnicker", "cooltrainer-m", "cooltrainer-f", "bird-keeper"],
  forest: ["bug-catcher", "camper", "lass", "picnicker"],
  cave: ["hiker", "pokemaniac", "super-nerd"],
  water: ["swimmer-m", "swimmer-f", "fisherman", "sailor"],
  mountain: ["hiker", "cooltrainer-m", "cooltrainer-f", "pokemaniac", "bird-keeper"],
  building: ["engineer", "super-nerd", "rocket-grunt"],
};

/** Hezké zobrazované popisky pro třídy, kde by auto-titlecase byl ošklivý. */
const CLASS_LABELS = {
  "cooltrainer-m": "Cool Trainer",
  "cooltrainer-f": "Cool Trainer",
  "swimmer-m": "Swimmer",
  "swimmer-f": "Swimmer",
  "jr-trainer-m": "Jr. Trainer",
  "jr-trainer-f": "Jr. Trainer",
  "super-nerd": "Super Nerd",
  "bug-catcher": "Bug Catcher",
  "bird-keeper": "Bird Keeper",
  "black-belt": "Black Belt",
  pokemaniac: "Poké Maniac",
};

/** Pool křestních jmen route trenérů (stabilně přiřazeno dle indexu). */
const ROUTE_NAMES = [
  "Rick", "Sam", "Ben", "Colton", "Janice", "Jovan", "Kent", "Marcus", "Cindy",
  "Cale", "Ali", "Frank", "Franklin", "Shane", "Lois", "Dawn", "Tommy", "Dan",
  "Hugo", "Bernie", "Alan", "Anthony", "Eric", "Ashton", "Winston", "Stan",
  "Brooke", "Jared", "Paxton", "Ruben", "Grover", "Boris", "Ned", "Robert",
  "Jaren", "Chester", "Denise", "Roland", "Arnold", "Naomi", "Rolando", "Miguel",
  "Dana", "Kirk", "Nolan", "Wade", "Quinby", "Perry", "Trent", "Odell",
];

/** Deterministický hash řetězce (stabilní přiřazení jmen napříč sezeními). */
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** "bug-catcher" → "Bug Catcher" (s override z CLASS_LABELS). */
function classLabel(cls) {
  if (CLASS_LABELS[cls]) return CLASS_LABELS[cls];
  return cls
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Vygeneruje STABILNÍ stuby route trenérů (id/class/name/gen) z ROUTE_TRAINER_PLAN.
 * Team se u nich NEDÁVÁ – rolí se čerstvě v generateRouteTeam() při startu souboje.
 */
function buildRouteTrainerStubs() {
  /** @type {Trainer[]} */
  const stubs = [];
  /** @type {Record<string,string[]>} areaId → id trenérů */
  const byArea = {};
  for (const [areaId, plan] of Object.entries(ROUTE_TRAINER_PLAN)) {
    const area = getArea(areaId);
    const biome = area?.biome ?? "grassland";
    const classes = BIOME_CLASSES[biome] ?? BIOME_CLASSES.grassland;
    const ids = [];
    for (let i = 0; i < plan.count; i++) {
      const cls = classes[i % classes.length];
      const name = ROUTE_NAMES[(hashStr(areaId) + i) % ROUTE_NAMES.length];
      const id = `${areaId}-t${i + 1}`;
      stubs.push({
        id,
        kind: "route",
        class: cls,
        name: `${classLabel(cls)} ${name}`,
        gen: { areaId, level: plan.level, size: plan.size },
        reward: 0, // dopočítá se dle vygenerovaného týmu (viz resolveTrainerTeam)
      });
      ids.push(id);
    }
    byArea[areaId] = ids;
  }
  return { stubs, byArea };
}

const { stubs: ROUTE_TRAINER_STUBS, byArea: ROUTE_TRAINERS_MAP } = buildRouteTrainerStubs();

/** @type {Trainer[]} Kompletní registr trenérů (fixní + procedurální route stuby). */
export const TRAINERS = [...FIXED_TRAINERS, ...ROUTE_TRAINER_STUBS];

// ── Species pool pro procedurální týmy ─────────────────────────────────────────

/** Route-type oblasti seřazené dle order (pro kumulativní pool nižších rout). */
const ROUTE_AREAS_BY_ORDER = AREAS.filter((a) => a.type === "route").sort(
  (a, b) => (a.order ?? 0) - (b.order ?? 0)
);

/**
 * Species pool pro routu: {local, lower}. `local` = druhy dané routy; `lower` =
 * druhy VŠECH route-oblastí s menším order (dedup), mimo local. Generátor pak
 * preferuje local (70 %), občas sáhne do lower (30 %).
 */
function poolForArea(areaId) {
  const area = getArea(areaId);
  const local = Array.isArray(area?.species) ? area.species.slice() : [];
  const order = area?.order ?? 0;
  const localSet = new Set(local);
  const lower = [];
  const seen = new Set(local);
  for (const a of ROUTE_AREAS_BY_ORDER) {
    if ((a.order ?? 0) >= order) break;
    for (const sp of a.species ?? []) {
      if (!seen.has(sp)) {
        seen.add(sp);
        lower.push(sp);
      }
    }
  }
  return { local: local.length ? local : ["rattata"], lower, localSet };
}

/** Vyvine druh NAHORU, kam vylosovaný level dovolí (jen level-evoluce). */
function evolveByLevel(baseId, level) {
  let cur = baseId;
  for (let guard = 0; guard < 5; guard++) {
    const sp = getSpecies(cur);
    if (sp && sp.evolvesTo && sp.evolutionLevel != null && level >= sp.evolutionLevel) {
      cur = sp.evolvesTo;
    } else break;
  }
  return cur;
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Vygeneruje ČERSTVÝ tým route trenéra z jeho gen specu (volá battleSystem přes
 * resolveTrainerTeam při startu souboje). Preferuje druhy dané routy, občas sáhne
 * do nižších rout, a každý kus vyvine nahoru dle levelu.
 * @param {RouteGen} gen
 * @returns {TrainerMon[]}
 */
export function generateRouteTeam(gen) {
  const { local, lower } = poolForArea(gen.areaId);
  const size = randInt(gen.size[0], gen.size[1]);
  const team = [];
  for (let i = 0; i < size; i++) {
    const level = randInt(gen.level[0], gen.level[1]);
    const useLower = lower.length && Math.random() < 0.3;
    const src = useLower ? lower : local;
    const base = src[randInt(0, src.length - 1)];
    team.push({ speciesId: evolveByLevel(base, level), level });
  }
  return team;
}

/**
 * Odměna route trenéra dle vygenerovaného týmu (kánonicky ~ top level × faktor).
 * Fixní trenéři mají `reward` napevno; tohle je jen pro procedurální.
 */
function rewardForTeam(team) {
  const top = team.reduce((m, x) => Math.max(m, x.level), 0);
  return top * 16;
}

/**
 * Vrátí konkrétní tým trenéra pro battle engine. Fixní → jeho `team`; procedurální
 * (route, s `gen`) → čerstvě vygenerovaný. Vrací i dopočítanou `reward` (procedurální).
 * @param {Trainer} trainer
 * @returns {{ team: TrainerMon[], reward: number }}
 */
export function resolveTrainerTeam(trainer) {
  if (trainer?.gen) {
    const team = generateRouteTeam(trainer.gen);
    return { team, reward: rewardForTeam(team) };
  }
  return { team: trainer?.team ?? [], reward: trainer?.reward ?? 0 };
}

/**
 * Counter-starter: rival si bere druh, který má TYPOVOU VÝHODU nad hráčovým
 * starterem (jako v originále). Mapa: hráčův starter → druh, kterého vezme rival.
 */
export const COUNTER_STARTER = {
  bulbasaur: "charmander",
  charmander: "squirtle",
  squirtle: "bulbasaur",
};

/**
 * Counter-starter ve FINÁLNÍ evoluci (endgame rival před Ligou).
 *  - Bulbasaur → Charizard, Charmander → Blastoise, Squirtle → Venusaur
 */
export const COUNTER_STARTER_FINAL = {
  bulbasaur: "charizard",
  charmander: "blastoise",
  squirtle: "venusaur",
};

/**
 * Odstupňovaná obtížnost trenérů (podle `trainer.kind`). Engine z toho staví opts
 * pro createPokemon – čím důležitější soupeř, tím lepší staty:
 *  - route  = kánon (náhodné IV, 0 EV, náhodná povaha)
 *  - gym / rival = slušné IV + část EV do hlavního útoku a rychlosti + vhodná povaha
 *  - gym-leader  = vysoké IV + plné EV do hlavního útoku a rychlosti + vhodná povaha
 */
export const TRAINER_DIFFICULTY = {
  route: { ivFixed: null, evOffense: 0, evSpeed: 0, optimizeNature: false },
  gym: { ivFixed: 22, evOffense: 128, evSpeed: 128, optimizeNature: true },
  rival: { ivFixed: 24, evOffense: 128, evSpeed: 128, optimizeNature: true },
  "gym-leader": { ivFixed: 30, evOffense: 252, evSpeed: 252, optimizeNature: true },
};

/** Obtížnostní profil pro daného trenéra (fallback = kánon/route). */
export function trainerDifficulty(trainer) {
  return TRAINER_DIFFICULTY[trainer?.kind] ?? TRAINER_DIFFICULTY.route;
}

/** Rychlé vyhledání trenéra podle id (Map kvůli O(1) v enginu). */
const TRAINER_BY_ID = new Map(TRAINERS.map((t) => [t.id, t]));

/** Trenér podle id, nebo null. */
export function getTrainer(id) {
  return TRAINER_BY_ID.get(id) ?? null;
}

/**
 * Pool route trenérů podle oblasti (id oblasti v data/areas.js → id trenérů).
 * Generováno z ROUTE_TRAINER_PLAN. Gym trenéři ani rival sem NEPATŘÍ.
 */
export const ROUTE_TRAINERS = ROUTE_TRAINERS_MAP;

/**
 * Rival gate na oblasti (id oblasti → id rivala v TRAINERS). Rival NENÍ náhodné
 * setkání – je to samostatný klikací tab „Rival" (jen když jsi na dané oblasti).
 */
export const RIVAL_GATES = {
  "route-22": "rival-route-22",
};

/** Rival (objekt) navázaný na oblast, nebo null. */
export function rivalForArea(areaId) {
  const id = RIVAL_GATES[areaId];
  return id ? getTrainer(id) : null;
}

/** Šance, že se při novém setkání na routě objeví route trenér místo divokého. */
export const ROUTE_TRAINER_CHANCE = 0.15;

/** Trenéři (objekty) navázaní na danou oblast; prázdné pole, když žádní. */
export function routeTrainersFor(areaId) {
  return (ROUTE_TRAINERS[areaId] ?? []).map((id) => getTrainer(id)).filter(Boolean);
}

/**
 * Cesta ke spritu trenéra (fallback řeší UI přes onerror).
 * Leader → assets/gym-leaders/<id>/front.png; ostatní → assets/trainers/<class>/front.png.
 */
export function trainerSpriteUrl(trainer) {
  if (!trainer) return "";
  if (trainer.kind === "gym-leader") {
    return `assets/gym-leaders/${trainer.id}/front.png`;
  }
  return `assets/trainers/${trainer.class}/front.png`;
}
