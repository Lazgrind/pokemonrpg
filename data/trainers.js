/**
 * trainers.js – trenéři (aggregator přes generace + generická logika).
 *
 * Trenér = předdefinovaná FRONTA konkrétních Pokémonů pro STÁVAJÍCÍ bojový engine
 * (žádný nový režim). Battle engine (src/systems/battleSystem.js) proti nim postaví
 * combatanty přes createPokemon(speciesId, level) a prochází je popořadě. U trenérů
 * NEJDE chytat cizí Pokémony. Výhra zapíše `trainer.id` do
 * `state.progress.defeatedTrainers` (jednorázová odměna + gating).
 *
 * Dva druhy trenérů:
 *  1) FIXNÍ (gym trenéři, gym leadeři, rival, Liga) – mají pevný `team` (kánon).
 *  2) PROCEDURÁLNÍ (route trenéři) – mají `gen` spec místo `team`. Tým se vyrolí
 *     ČERSTVĚ při startu souboje (viz resolveTrainerTeam / generateRouteTeam):
 *       - druhy: preferenčně z dané routy (area.species), občas z NIŽŠÍCH rout
 *         STEJNÉHO regionu (order <), a každý kus se VYVINE NAHORU dle levelu;
 *       - level band + velikost týmu + počet trenérů = routeTrainerPlan generace;
 *       - třída trenéra se odvodí z biomu routy (cave→hiker, water→swimmer…).
 *     `id` route trenéra je STABILNÍ (kvůli defeatedTrainers) – rolí se jen tým.
 *
 * DATA jsou po generacích ve složkách data/genN/trainers.js (FIXNÍ trenéři, plán
 * route trenérů, Liga, Rocket gauntlety, rival gate); tady se jen sloučí přes
 * ../generations.js a přidá logika. Route pool je REGION-SCOPED: johtský trenér
 * nikdy nelosuje kantské druhy (a naopak), i když oba regiony číslují order od 0.
 *
 * Sprity: odvozují se z `class` / `id`, viz `trainerSpriteUrl()` (cesty per generace
 * dle aktuálního regionu).
 *
 * @typedef {Object} TrainerMon
 * @property {?string} speciesId  id druhu (data/pokemon.js); null jen když counterStarter
 * @property {number} level      úroveň
 * @property {string[]} [moves]  volitelně konkrétní tahy; jinak defaultMovesFor()
 * @property {boolean} [counterStarter]  true = druh dopočítá engine tak, aby COUNTROVAL
 *   hráčova startera (Charmander→Squirtle…), jako v originále. speciesId se ignoruje.
 * @property {boolean} [counterStarterMid]  jako counterStarter, ale PROSTŘEDNÍ evoluce.
 * @property {boolean} [counterStarterFinal]  jako counterStarter, ale FINÁLNÍ evoluce.
 *
 * @typedef {Object} RouteGen  procedurální spec route trenéra (místo pevného team).
 * @property {string} areaId    routa (species pool + order pro nižší routy)
 * @property {[number,number]} level  level band (min–max) pro každý kus týmu
 * @property {[number,number]} size   velikost týmu (min–max)
 *
 * @typedef {Object} Trainer
 * @property {string} id        unikátní id (klíč do state.progress.defeatedTrainers)
 * @property {"route"|"gym"|"gym-leader"|"rival"|"rocket"|"boss"|"hiker"|"elite-four"|"champion"} kind  druh trenéra
 * @property {string} class     trenérská třída (složka spritu, viz trainerSpriteUrl)
 * @property {number} [spriteVariant] pevná varianta spritu třídy (`<n>.png`) pro jmenovanou postavu
 *                    ve sdílené třídě; bez ní se varianta losuje každý souboj
 * @property {string} name      zobrazované jméno (vč. třídy, např. "Bug Catcher Rick")
 * @property {TrainerMon[]} [team]  fronta Pokémonů (fixní trenéři); u route trenérů chybí
 * @property {RouteGen} [gen]   procedurální spec (route trenéři); u fixních chybí
 * @property {number} reward    odměna ve zlatě za první výhru
 * @property {string} [quote]   volitelná hláška před soubojem (do logu/UI)
 * @property {string} [badge]   jen u gym-leadera: id odznaku, který výhra udělí
 */

import { GENERATIONS } from "./generations.js";
import { getArea, areaSpeciesIds } from "./areas.js";
import { getSpecies } from "./pokemon.js";
import { TRAINER_SPRITE_COUNTS } from "./spriteVariants.js";
import { gymLeaderSpriteUrl, trainerClassSpriteUrl, currentGen } from "../src/core/assets.js";

// ═══════════════════════════════════════════════════════════════════════════════
//  SLOUČENÍ DAT PŘES GENERACE
// ═══════════════════════════════════════════════════════════════════════════════

/** @type {Trainer[]} FIXNÍ trenéři všech aktivních generací. */
const FIXED_TRAINERS = GENERATIONS.flatMap((g) => g.trainers ?? []);

/**
 * Plán route trenérů všech generací (areaId → {level,count,size}). Klíče (areaId)
 * jsou unikátní napříč generacemi (route-01 vs route-29…), takže merge je bezpečný.
 * @type {Record<string, {level:[number,number], count:number, size:[number,number]}>}
 */
export const ROUTE_TRAINER_PLAN = Object.assign(
  {},
  ...GENERATIONS.map((g) => g.routeTrainerPlan ?? {})
);

/** @type {Object[]} Pokémon League každé generace (Kanto, Johto…). */
const LEAGUES = GENERATIONS.map((g) => g.league).filter(Boolean);

/**
 * POKÉMON LEAGUE první generace (Kanto). Ponecháno kvůli zpětné kompatibilitě
 * (progression.js level cap před ziskem titulu). Ostatní kód pracuje přes
 * leagueForArea / leagueForRegion (region-aware).
 */
export const LEAGUE = LEAGUES[0] ?? null;

// ═══════════════════════════════════════════════════════════════════════════════
//  REGION-SCOPED SPECIES POOL PRO PROCEDURÁLNÍ TÝMY
// ═══════════════════════════════════════════════════════════════════════════════

/** areaId → region (slug generace). Route pool nesmí míchat regiony. */
const AREA_REGION = new Map();
for (const g of GENERATIONS) {
  for (const a of g.areas ?? []) AREA_REGION.set(a.id, g.region);
}

/**
 * Route-type oblasti seřazené dle order, ROZDĚLENÉ PODLE REGIONU. Oba regiony
 * číslují order od 0, takže „nižší pool" se musí brát jen v rámci téhož regionu.
 * @type {Map<string, import("./areas.js").Area[]>}
 */
const ROUTE_AREAS_BY_REGION = new Map();
for (const g of GENERATIONS) {
  const routes = (g.areas ?? [])
    .filter((a) => a.type === "route")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  ROUTE_AREAS_BY_REGION.set(g.region, routes);
}

/**
 * Species pool pro routu: {local, lower}. `local` = druhy dané routy; `lower` =
 * druhy VŠECH route-oblastí STEJNÉHO regionu s menším order (dedup), mimo local.
 * Generátor pak preferuje local (70 %), občas sáhne do lower (30 %).
 */
function poolForArea(areaId) {
  const area = getArea(areaId);
  const local = areaSpeciesIds(area);
  const order = area?.order ?? 0;
  const region = AREA_REGION.get(areaId);
  const routes = ROUTE_AREAS_BY_REGION.get(region) ?? [];
  const lower = [];
  const seen = new Set(local);
  for (const a of routes) {
    if ((a.order ?? 0) >= order) break;
    for (const sp of areaSpeciesIds(a)) {
      if (!seen.has(sp)) {
        seen.add(sp);
        lower.push(sp);
      }
    }
  }
  // Oblast bez divokých druhů (např. Sprout Tower v gen2-locked Johtu) → trenéři berou
  // druhy z nižších rout téhož regionu; "rattata" jen jako poslední pojistka.
  return { local: local.length ? local : lower.length ? lower : ["rattata"], lower, localSet: new Set(local) };
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
 * do nižších rout téhož regionu, a každý kus vyvine nahoru dle levelu.
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

/** Odměna route trenéra dle vygenerovaného týmu (kánonicky ~ top level × faktor). */
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

// ═══════════════════════════════════════════════════════════════════════════════
//  PROCEDURÁLNÍ ROUTE TRENÉŘI – STUBY
// ═══════════════════════════════════════════════════════════════════════════════

/** Trenérské třídy podle biomu routy (folder spritu). Sdílené napříč generacemi. */
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

// ═══════════════════════════════════════════════════════════════════════════════
//  COUNTER-STARTER MAPY (rival) + OBTÍŽNOST
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Counter-starter: rival si bere druh, který má TYPOVOU VÝHODU nad hráčovým
 * starterem (jako v originále). Mapa: hráčův starter → druh, kterého vezme rival.
 * Platí pro OBA regiony: Kanto rival i Johto Silver (Silver v GSC také ukradne
 * startéra silného proti tvému). Johto startér se bere region-aware – viz
 * resolveTrainerSpecies v battleSystem (johtoStarterId, ne kantský player.starterId).
 */
export const COUNTER_STARTER = {
  bulbasaur: "charmander",
  charmander: "squirtle",
  squirtle: "bulbasaur",
  // Skrytý 4. startér (Pikachu): rival vezme Eevee (kánon Pokémon Yellow).
  pikachu: "eevee",
  // Johto (GSC): Chikorita(Grass)→Cyndaquil(Fire), Cyndaquil(Fire)→Totodile(Water),
  // Totodile(Water)→Chikorita(Grass) – vždy typový counter.
  chikorita: "cyndaquil",
  cyndaquil: "totodile",
  totodile: "chikorita",
};

/** Counter-starter v PROSTŘEDNÍ evoluci (mid-game rival, např. S.S. Anne / Silver). */
export const COUNTER_STARTER_MID = {
  bulbasaur: "charmeleon",
  charmander: "wartortle",
  squirtle: "ivysaur",
  // Johto 2. stupeň.
  chikorita: "quilava",
  cyndaquil: "croconaw",
  totodile: "bayleef",
};

/** Counter-starter ve FINÁLNÍ evoluci (endgame rival před Ligou). */
export const COUNTER_STARTER_FINAL = {
  bulbasaur: "charizard",
  charmander: "blastoise",
  squirtle: "venusaur",
  // Johto finální evoluce.
  chikorita: "typhlosion",
  cyndaquil: "feraligatr",
  totodile: "meganium",
};

/**
 * Odstupňovaná obtížnost trenérů (podle `trainer.kind`). Engine z toho staví opts
 * pro createPokemon – čím důležitější soupeř, tím lepší staty.
 */
export const TRAINER_DIFFICULTY = {
  route: { ivFixed: null, evOffense: 0, evSpeed: 0, optimizeNature: false },
  gym: { ivFixed: 22, evOffense: 128, evSpeed: 128, optimizeNature: true },
  rival: { ivFixed: 24, evOffense: 128, evSpeed: 128, optimizeNature: true },
  "gym-leader": { ivFixed: 30, evOffense: 252, evSpeed: 252, optimizeNature: true },
  "elite-four": { ivFixed: 30, evOffense: 252, evSpeed: 252, optimizeNature: true },
  champion: { ivFixed: 31, evOffense: 252, evSpeed: 252, optimizeNature: true },
};

/**
 * Obtížnostní profil pro daného trenéra. Per-trenér override `trainer.difficulty`
 * (částečný objekt) má přednost před profilem podle `kind`. Fallback = kánon/route.
 */
export function trainerDifficulty(trainer) {
  const base = TRAINER_DIFFICULTY[trainer?.kind] ?? TRAINER_DIFFICULTY.route;
  return trainer?.difficulty ? { ...base, ...trainer.difficulty } : base;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LOOKUPY + HELPERY
// ═══════════════════════════════════════════════════════════════════════════════

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
 * Rival gate na oblasti (id oblasti → id rivala, NEBO {id, requiresStory}). Rival
 * NENÍ náhodné setkání – je to samostatný klikací tab „Rival" (jen když jsi na dané
 * oblasti). Objektová forma s `requiresStory` zpozdí objevení rivala, dokud není
 * nastavený story flag (kánon: Silver u Azaley se ukáže až po vyčištění Slowpoke
 * Well). Story-podmínka se vyhodnocuje v UI (mainPanel), stejně jako u gauntletů –
 * data/trainers.js schválně nečte state (vyhnutí se cyklu). Sloučeno přes generace.
 * @type {Record<string, string | {id:string, requiresStory?:string}>}
 */
export const RIVAL_GATES = Object.assign(
  {},
  ...GENERATIONS.map((g) => g.rivalGates ?? {})
);

/** Rival (objekt trenéra) navázaný na oblast, nebo null. Ignoruje requiresStory. */
export function rivalForArea(areaId) {
  const gate = RIVAL_GATES[areaId];
  if (!gate) return null;
  const id = typeof gate === "string" ? gate : gate.id;
  return id ? getTrainer(id) : null;
}

/** Story flag, který musí být splněn, aby se rival na oblasti objevil (nebo null). */
export function rivalRequiresStory(areaId) {
  const gate = RIVAL_GATES[areaId];
  return gate && typeof gate === "object" ? gate.requiresStory ?? null : null;
}

/**
 * POVINNÉ gauntlety (fronta trenérů jako gym, ale bez odznaku). Klikací tab
 * „Rockets" (rocketView). Poražení VŠECH `trainerIds` v pořadí nastaví `clearFlag`
 * ve `state.story`. Sloučeno přes generace (areaId → gauntlet; klíče unikátní).
 */
export const ROCKET_GAUNTLETS = Object.assign(
  {},
  ...GENERATIONS.map((g) => g.rocketGauntlets ?? {})
);

/** Gauntlet (objekt) navázaný na oblast, nebo null. */
export function rocketGauntletForArea(areaId) {
  return ROCKET_GAUNTLETS[areaId] ?? null;
}

/** Trenéři (objekty) gauntletu dané oblasti; prázdné pole, když žádný gauntlet. */
export function rocketTrainers(gauntlet) {
  if (!gauntlet) return [];
  return gauntlet.trainerIds.map((id) => getTrainer(id)).filter(Boolean);
}

/**
 * Vrátí Ligu na dané oblasti, nebo null. Prohledá Ligy všech generací (Kanto na
 * "indigo-plateau", Johto na "indigo-plateau-johto").
 */
export function leagueForArea(areaId) {
  return LEAGUES.find((l) => l.areaId === areaId) ?? null;
}

/** Vrátí Ligu daného regionu (dle generace), nebo null. */
export function leagueForRegion(region) {
  const gen = GENERATIONS.find((g) => g.region === region);
  return gen?.league ?? null;
}

/** Region (slug generace) dané oblasti, nebo undefined. */
export function regionForArea(areaId) {
  return AREA_REGION.get(areaId);
}

/** Šance, že se při novém setkání na routě objeví route trenér místo divokého. */
export const ROUTE_TRAINER_CHANCE = 0.15;

/** Trenéři (objekty) navázaní na danou oblast; prázdné pole, když žádní. */
export function routeTrainersFor(areaId) {
  return (ROUTE_TRAINERS[areaId] ?? []).map((id) => getTrainer(id)).filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SPRITY TRENÉRŮ
// ═══════════════════════════════════════════════════════════════════════════════

/** Počet spritů dané trenérské třídy v generaci (default = aktuální region; 0 = žádný). */
export function trainerSpriteCount(cls, gen = currentGen()) {
  return TRAINER_SPRITE_COUNTS[gen]?.[cls] ?? 0;
}

/**
 * Náhodná varianta spritu (1..count) pro trenérskou třídu. Vybírá se JEDNOU
 * při vzniku soupeře (makeTrainerState), ne při každém renderu.
 */
export function randomTrainerVariant(cls) {
  const n = trainerSpriteCount(cls);
  return n > 0 ? 1 + Math.floor(Math.random() * n) : 1;
}

/**
 * Cesta ke spritu trenéra (fallback řeší UI přes onerror). Cesty jsou per
 * generace (assets/gen<N>/…) – generaci bere z aktuálního regionu (default),
 * lze ji přebít parametrem `gen`.
 * Leader + Liga → assets/gen<N>/gym-leaders/<id>/front.png (1 sprite).
 * Ostatní → assets/gen<N>/trainers/<class>/<n>.png.
 * @param {number} [gen] override generace (default = aktuální region)
 */
export function trainerSpriteUrl(trainer, gen) {
  if (!trainer) return "";
  if (trainer.kind === "gym-leader" || trainer.kind === "elite-four" || trainer.kind === "champion") {
    return gen == null ? gymLeaderSpriteUrl(trainer.id) : gymLeaderSpriteUrl(trainer.id, gen);
  }
  const n = trainer.spriteVariant > 0 ? trainer.spriteVariant : 1;
  return gen == null ? trainerClassSpriteUrl(trainer.class, n) : trainerClassSpriteUrl(trainer.class, n, gen);
}
