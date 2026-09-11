/**
 * battleSystem.js – automatický souboj (zadání sekce 10).
 *
 * Souboj je běhový (transient) stav – neukládá se do save. Do herního stavu
 * se promítá jen výsledek (XP, level, gold), přes commit() → autosave.
 *
 * Kolo (tick) = jedna výměna úderů v pořadí podle rychlosti. Interval kola je
 * napevno 1 s (volba rychlosti odebrána). Po poražení nepřítele se hned objeví další;
 * po vyřazení hráčova Pokémona nastupuje další z týmu, jinak prohra.
 */

import { getState, commit } from "../core/state.js";
import { bus, EVENTS } from "../core/events.js";
import { getTeamPokemon, ownsSpecies, acquirePokemon, releasePokemon, getStarterSpeciesId } from "./team.js";
import { getPokeball, POKEBALLS } from "../../data/pokeballs.js";
import { ballMultiplier } from "./pokeballSystem.js";
import { createPokemon, computeStats, grantEvYield, STAT_KEYS, SHINY_CHANCE, SHINY_CHARM_MULT } from "./pokemonSystem.js";
import { getSpecies } from "../../data/pokemon.js";
import { getMove, MOVES } from "../../data/moves.js";
import { TMS, TM_BY_BADGE, getTm } from "../../data/tms.js";
import { grantTm } from "./tmSystem.js";
import { typeMultiplier } from "../../data/types.js";
import { grantXp } from "./progression.js";
import { rollLoot } from "./loot.js";
import { rollEggDrop } from "./eggSystem.js";
import { healPercent, ppRegenPercent, goldBoostMult, shinyBoostMult } from "./buildingSystem.js";
import { useItem, canUseItem, itemCount, heldItemOf } from "./itemSystem.js";
import { getItem, ITEMS } from "../../data/items.js";
import { markSeen, dexCounts } from "./pokedex.js";
import { AREAS, getArea, isAreaUnlocked, areaEncounters, rollAreaLevel } from "../../data/areas.js";
import { biomeBackgrounds } from "../../data/backgrounds.js";
import {
  getTrainer,
  routeTrainersFor,
  ROUTE_TRAINER_CHANCE,
  trainerDifficulty,
  resolveTrainerTeam,
  randomTrainerVariant,
  COUNTER_STARTER,
  COUNTER_STARTER_MID,
  COUNTER_STARTER_FINAL,
  rocketGauntletForArea,
  leagueForArea,
} from "../../data/trainers.js";
import { getBadge } from "../../data/badges.js";
import { NATURES } from "../../data/natures.js";

/** Záložní druhy nepřátel, kdyby oblast neměla vlastní species pool. */
const FALLBACK_SPECIES = ["pidgey", "rattata"];

/**
 * Šance na chycení podle HP nepřítele: při plném HP CATCH_MIN, při HP→0
 * CATCH_MAX (klasický princip – nepřítele je třeba nejdřív oslabit).
 * Poké Ball typy a rarita druhu šanci upraví později (viz docs/BACKLOG.md).
 */
const CATCH_MIN = 0.15;
const CATCH_MAX = 0.85;

/** Čitelný název zdroje pro log a přehledy. */
export function lootLabel(resource) {
  if (resource === "gold") return "gold";
  return getPokeball(resource)?.name ?? resource;
}

/**
 * Aktivní herní pravidla / režimy (No items / No potions / Nuzlocke).
 * Vždy vrací kompletní objekt, i pro staré save bez `settings.rules`.
 * @returns {{ noItems: boolean, noPotions: boolean, nuzlocke: boolean }}
 */
export function getRules() {
  const r = getState().settings?.rules;
  return {
    noItems: r?.noItems === true,
    noPotions: r?.noPotions === true,
    nuzlocke: r?.nuzlocke === true,
  };
}

/**
 * Smí hráč v souboji použít daný předmět? Režim No items zakáže vše,
 * No potions zakáže jen léčivé (HP) předměty; ostatní zůstávají povolené.
 * @param {string} itemId
 * @returns {boolean}
 */
export function itemsAllowed(itemId) {
  const rules = getRules();
  if (rules.noItems) return false;
  if (rules.noPotions) {
    const def = getItem(itemId);
    if (def?.category === "hp") return false;
  }
  return true;
}

/** Nuzlocke: už hráč na této oblasti čerpal svůj (jediný) úlovek? */
function nuzlockeAreaUsed(areaId) {
  return getState().nuzlockeCaught?.[areaId] === true;
}

/**
 * Nuzlocke: smí hráč teď chytat? Vrací důvod zákazu (string) nebo null (smí).
 * Když je Nuzlocke vypnutý, vždy null.
 */
function nuzlockeCatchBlock() {
  if (!getRules().nuzlocke) return null;
  if (!battle?.area) return null;
  if (nuzlockeAreaUsed(battle.area.id)) {
    return "Nuzlocke: you already caught your one Pokémon in this area.";
  }
  return null;
}

/** Nuzlocke: označí oblast jako „vyčerpanou" (po úspěšném chycení). */
function markNuzlockeCaught(areaId) {
  if (!areaId) return;
  const st = getState();
  if (!st.nuzlockeCaught || typeof st.nuzlockeCaught !== "object") st.nuzlockeCaught = {};
  st.nuzlockeCaught[areaId] = true;
}

/** @type {any} */
let battle = null;
let timer = null;
/** Timer pro krokové (sekvenční) odehrání manuálního kola – útoky po sobě. */
let stepTimer = null;

/** Aktuální běhový stav souboje (nebo null). */
export function getBattle() {
  return battle;
}

/** Aktuální HP jedince (trvalé pole `hp`; fallback = plné max HP). */
export function hpOf(owned) {
  return owned.hp ?? computeStats(owned).maxHp;
}

/**
 * Sestaví bojovníka z jedince. HP je TRVALÉ na jedinci (`owned.hp`) – bojovník
 * ho jen zpřístupní přes `combatant.hp`, takže zranění se promítá do týmu a
 * přežije swap i konec souboje. Setter clampuje do [0, aktuální maxHp].
 */
export function makeCombatant(owned) {
  const species = getSpecies(owned.speciesId);
  const stats = computeStats(owned);
  if (owned.hp == null) owned.hp = stats.maxHp;
  else if (owned.hp > stats.maxHp) owned.hp = stats.maxHp;
  const c = { ref: owned, name: species.name, types: species.types, stats };
  Object.defineProperty(c, "hp", {
    get() {
      return owned.hp;
    },
    set(v) {
      // Full Auto: hráčův aktuální bojovník NESMÍ přijít o HP (bezpečný idling).
      // Blokujeme jen SNÍŽENÍ – léčení projde. Pokrývá to VŠECHNY zdroje poškození
      // (útok, recoil, zmatení, jed/popálení – vše jde přes tenhle setter).
      if (getFullAuto() && battle && c === battle.player && v < owned.hp) return;
      // clamp vůči AKTUÁLNÍM statům bojovníka (po level-upu se c.stats mění)
      owned.hp = Math.max(0, Math.min(c.stats.maxHp, v));
    },
    enumerable: true,
    configurable: true,
  });
  // Status je TRVALÝ na jedinci (`owned.status`) – bojovník ho jen zpřístupní,
  // takže otrava/popálení/paralýza přežije výměnu i konec souboje (čistí ji
  // až léčení). U divokého nepřítele je `owned` běhový, proto se stav zvlášť
  // (de)serializuje v serialize()/restore().
  Object.defineProperty(c, "status", {
    get() {
      return owned.status ?? null;
    },
    set(v) {
      owned.status = v;
    },
    enumerable: true,
    configurable: true,
  });
  // Běhové (transientní) bojové stavy – NEUKLÁDAJÍ se do save, jen inicializace.
  // stages: dočasné stupně statů (−6..+6), volatile: pomíjivé stavy (flinch,
  // confusion, seeded, trapped, charging, locked, biding (Bide), rageActive, substitute,
  // moveOverride/transformed pro Transform+Mimic, lastMoveId pro Mimic,
  // lastHitDmg/lastHitPhysical pro Counter). Spánek/zmrznutí jsou naopak TRVALÝ
  // status (owned.status). critStages: navýšená šance na krit (Focus Energy).
  c.stages = { attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0, accuracy: 0, evasion: 0 };
  c.volatile = {};
  c.critStages = 0;
  return c;
}

/**
 * Náhodně vybere pozadí souboje.
 *
 * Per-area override: speciální oblasti (Seafoam apod.) můžou mít vlastní pozadí
 * v `area.background` (string nebo pole souborů v assets/backgrounds/), které má
 * přednost před sdíleným poolem prostředí (`area.biome`). Bez override se vrátí
 * náhodná varianta z biome poolu, nebo null (pak prosvítá fallback).
 */
function pickBackground(area) {
  if (area?.background) {
    const files = Array.isArray(area.background) ? area.background : [area.background];
    if (files.length) {
      const f = files[Math.floor(Math.random() * files.length)];
      return `assets/backgrounds/${f}`;
    }
  }
  const urls = biomeBackgrounds(area?.biome);
  if (!urls.length) return null;
  return urls[Math.floor(Math.random() * urls.length)];
}

/** Násobič odměn (gold i XP) v režimu Full Auto – cena za idling bez úbytku HP/PP. */
const FULL_AUTO_REWARD_MULT = 0.1;

/** Odměna za poražení nepřítele daného levelu (sdíleno s idle systémem). */
export function battleRewards(level) {
  // Gold je záměrně skromný (~½ oproti staré 3+lvl*2), aby měly nákupy váhu a
  // gold sinky nebyly triviální – ale early game zůstává jemné (lvl5≈7, ne 3).
  // XP necháváme štědré: leveling na 100 je poctivý grind sám o sobě.
  return { xp: 10 + level * 5, gold: 2 + level };
}

/**
 * Deterministický průměrný damage (bez náhody) nejlepšího tahu útočníka –
 * pro odhad rychlosti zabíjení v idle systému. Vybere stejný tah jako auto
 * politika (nejvyšší očekávaný damage) a spočítá ho se středem rozptylu (0.925).
 */
export function avgDamage(attacker, defender) {
  const action = chooseAction(attacker, defender);
  return calcMoveDamage(attacker, defender, action.move, true).dmg;
}

/**
 * Vážený náhodný výběr z [{id, weight}] – vrátí id, nebo null když prázdné.
 * Nulové/záporné váhy se ignorují; když je součet ≤ 0, vezme první položku.
 */
function pickWeighted(list) {
  const total = list.reduce((s, e) => s + (e.weight > 0 ? e.weight : 0), 0);
  if (total <= 0) return list[0]?.id ?? null;
  let r = Math.random() * total;
  for (const e of list) {
    r -= e.weight > 0 ? e.weight : 0;
    if (r < 0) return e.id;
  }
  return list[list.length - 1]?.id ?? null;
}

/** Vytvoří nového divokého nepřítele podle oblasti (druhy + rarita z area.species). */
function spawnEnemy(area) {
  // Vážený seznam druhů dle rarity (viz areas.js). Prázdná oblast → fallback.
  let enc = areaEncounters(area);
  if (!enc.length) enc = FALLBACK_SPECIES.map((id) => ({ id, weight: 1 }));
  let id = pickWeighted(enc);
  // Guard: pokud vylosovaný druh neexistuje, zkus další platný z poolu, jinak fallback
  let sp = getSpecies(id);
  if (!sp) {
    for (const e of enc) {
      if (getSpecies(e.id)) {
        id = e.id;
        sp = getSpecies(id);
        break;
      }
    }
  }
  // Pokud pořád nic, use first fallback
  if (!sp) {
    id = FALLBACK_SPECIES[0];
    sp = getSpecies(id);
  }
  if (!sp) return null; // bezpečný fallback – nepřítel se nezadá
  // Level z per-oblast pásma (AREA_LEVELS v areas.js); fallback = recommendedLevel..+1.
  const level = rollAreaLevel(area);
  markSeen(id); // do Pokédexu jako „viděno" (chycené se odvozují z kolekce)
  // Shiny Charm (odměna za kompletní dex) násobí šanci na divokého shiny.
  // Musí být vlastněný A zapnutý v horní liště (settings.shinyCharmActive).
  const st = getState();
  const charmOn = st.story?.shinyCharm && st.settings?.shinyCharmActive !== false;
  // ✨ Fortune linka z Trainer Boost Center násobí shiny šanci (max ×1,2 při
  // plné lince) – záměrně mrňavé, ať se to nesčítá s Charmem do OP hodnot.
  const shinyChance = SHINY_CHANCE * (charmOn ? SHINY_CHARM_MULT : 1) * shinyBoostMult();
  return makeCombatant(createPokemon(id, level, { shinyChance }));
}

/**
 * Přidá řádek do logu (drží se posledních pár). Uloží se jako objekt
 * `{ text, side }`, aby UI mohlo řádky barevně rozlišit: `side` je
 * "player" (naše akce), "enemy" (soupeřovy), nebo "neutral" (ostatní).
 * @param {string} msg
 * @param {"player"|"enemy"|"neutral"} [side]
 */
function pushLog(msg, side = "neutral") {
  battle.log.push({ text: msg, side });
  if (battle.log.length > 30) battle.log.shift();
}

/** Uloží aktuální souboj do herního stavu (aby přežil refresh). */
function persist() {
  getState().battle = serialize();
}

function emit() {
  persist();
  bus.emit(EVENTS.BATTLE_UPDATE);
}

/** Serializuje běhový souboj do prostého objektu (nebo null). */
export function serialize() {
  if (!battle) return null;
  // Trenérské souboje jsou čistě běhové – neserializujeme je (po refreshi se
  // prostě neobnoví; defeatedTrainers se zapisuje až po plné výhře, takže se nic
  // neztratí a nic nerozbije). Divoké souboje se ukládají normálně.
  if (battle.trainer) return null;
  // Tutoriálový DEMO-souboj se také NEserializuje (izolace onboardingu).
  if (battle.demo) return null;
  return {
    areaId: battle.area.id,
    running: battle.running,
    result: battle.result,
    teamCursor: battle.teamCursor,
    turn: battle.turn ?? 0,
    background: battle.background,
    forceManual: battle.forceManual ?? false, // legendární static souboj musí zůstat manuál i po refreshi
    interlude: battle.interlude ?? null, // výherní/chytací okno (manuální mód) přežije refresh
    log: battle.log.slice(-30),
    playerUid: battle.player.ref.uid,
    playerHp: battle.player.hp,
    playerStatus: battle.player.status ?? null, // status hráče (redundantní se save collection, ale robustní)
    enemy: {
      speciesId: battle.enemy.ref.speciesId,
      level: battle.enemy.ref.level,
      hp: battle.enemy.hp,
      status: battle.enemy.status ?? null, // nepřítel není v kolekci → jeho status uložíme sem
    },
  };
}

/**
 * Obnoví souboj z uloženého stavu (po načtení hry). Souboj se obnoví
 * v pauze – hráč ho znovu rozběhne tlačítkem. Vrací true při úspěchu.
 * @param {*} saved
 * @returns {boolean}
 */
export function restore(saved) {
  clearTimeout(timer);
  clearTimeout(stepTimer);
  if (!saved) {
    battle = null;
    return false;
  }
  const owned = getState().collection.find((p) => p.uid === saved.playerUid);
  if (!owned) {
    battle = null;
    return false;
  }
  const area = AREAS.find((a) => a.id === saved.areaId) ?? AREAS[0];

  const player = makeCombatant(owned);
  player.hp = Math.min(saved.playerHp ?? player.stats.maxHp, player.stats.maxHp);
  if (saved.playerStatus !== undefined) player.status = saved.playerStatus; // obnov status hráče

  const enemyOwned = createPokemon(saved.enemy.speciesId, saved.enemy.level);
  const enemy = makeCombatant(enemyOwned);
  enemy.hp = Math.min(saved.enemy.hp ?? enemy.stats.maxHp, enemy.stats.maxHp);
  enemy.status = saved.enemy.status ?? null; // obnov status nepřítele (není v kolekci)

  battle = {
    // Zachovej stav běhu ze save (pauza přežije refresh). Automatické tiky se
    // stejně rozběhnou jen v Auto battle módu (viz schedule()).
    running: saved.result ? false : (saved.running ?? true),
    // Log může být ze staršího save polem řetězců – normalizuj na { text, side }.
    log: (saved.log ?? []).map((l) =>
      typeof l === "string" ? { text: l, side: "neutral" } : l
    ),
    area,
    teamCursor: saved.teamCursor ?? 0,
    turn: saved.turn ?? 0,
    result: saved.result ?? null,
    background: saved.background ?? pickBackground(area),
    forceManual: saved.forceManual ?? false, // obnov manuál-only (legendární static souboj)
    interlude: saved.interlude ?? null,
    player,
    enemy,
  };
  emit();
  schedule(); // rozběhne kola, pokud běží a je Auto battle mód
  return true;
}

/* ------------------------------ Turn engine ------------------------------ */

/**
 * Náhradní útok, když Pokémonovi dojdou PP na všech tazích. Typeless (bez STAB
 * i typové efektivity), slabý. Recoil (zpětné poškození) přidáme později.
 */
const STRUGGLE = {
  id: "struggle",
  name: "Struggle",
  type: null,
  category: "physical",
  power: 40,
  accuracy: 100,
  priority: 0,
};

/** Typová efektivita tahu vůči obránci (typeless tah → 1). */
function moveTypeMult(move, defender) {
  if (!move.type) return 1;
  return typeMultiplier(move.type, defender.types);
}

/** Šance na kritický zásah (~1/16) a jeho násobek poškození. */
const CRIT_CHANCE = 1 / 16;
const CRIT_MULT = 1.5;

/** Paralýza: šance, že tah v daném kole úplně vypadne, a násobek Speed. */
const PARALYSIS_FIZZLE = 0.25;
const PARALYSIS_SPEED_MULT = 0.5;

/** Zmrznutí: šance, že bojovník na začátku svého tahu roztaje (jinak tah vypadne). */
const FREEZE_THAW = 0.2;

/**
 * Efektivní rychlost bojovníka pro pořadí tahů: základ ze Speed × modifikátor
 * stupně (Speed stage), paralýza půlí, aktivní Tailwind na dané straně zdvojuje.
 */
function effSpeed(c) {
  let spd = c.stats.speed * stageMult(c.stages?.speed ?? 0);
  if (c.status?.kind === "paralysis") spd *= PARALYSIS_SPEED_MULT;
  const side = c === battle.player ? "player" : "enemy";
  if ((battle.tailwind?.[side] ?? 0) > 0) spd *= 2;
  return spd;
}

/* --- Helpery pro běhové bojové efekty (stat stupně, kritika, zmatení, lock) --- */

/** Násobek statu podle stupně (−6..+6): +n → (2+n)/2, −n → 2/(2+n). */
function stageMult(s) {
  s = Math.max(-6, Math.min(6, s));
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}

/** Násobek accuracy/evasion podle stupně (−6..+6): jiná tabulka než staty. */
function accStageMult(s) {
  s = Math.max(-6, Math.min(6, s));
  return s >= 0 ? (3 + s) / 3 : 3 / (3 - s);
}

/** Šance na kritický zásah podle crit stupně útočníka a highCrit tahu. */
function critChanceFor(attacker, move) {
  const stage = (attacker.critStages || 0) + (move.effect?.kind === "highCrit" ? 1 : 0);
  const table = [1 / 16, 1 / 8, 1 / 4, 1 / 2];
  return table[Math.min(stage, 3)];
}

/** Čitelné názvy statů do logu při změně stupňů. */
const STAT_LABEL = {
  attack: "Attack",
  defense: "Defense",
  spAttack: "Sp. Atk",
  spDefense: "Sp. Def",
  speed: "Speed",
  accuracy: "accuracy",
  evasion: "evasiveness",
};

/**
 * Změní stupeň statu bojovníka o `delta` (clamp −6..+6) a zaloguje odpovídající
 * hlášku. Když už je na hraně, oznámí, že stat výš/níž nejde.
 */
function applyStatStage(c, stat, delta, side) {
  if (!c || c.hp <= 0) return;
  const cur = c.stages[stat] || 0;
  const next = Math.max(-6, Math.min(6, cur + delta));
  if (next === cur) {
    pushLog(`${c.name}'s ${STAT_LABEL[stat]} won't go ${delta > 0 ? "higher" : "lower"}!`, side);
    return;
  }
  c.stages[stat] = next;
  const word = delta >= 2 ? "sharply rose" : delta === 1 ? "rose" : delta === -1 ? "fell" : "harshly fell";
  pushLog(`${c.name}'s ${STAT_LABEL[stat]} ${word}!`, side);
}

/** Poškození, které si bojovník způsobí sám ve zmatení (typeless 40 power). */
function confusionSelfDamage(c) {
  const lvl = c.ref.level;
  const atk = c.stats.attack * stageMult(c.stages.attack);
  const def = c.stats.defense * stageMult(c.stages.defense);
  const base = Math.floor((((2 * lvl) / 5 + 2) * 40 * (atk / def)) / 50) + 2;
  return Math.max(1, Math.floor(base));
}

/**
 * Vrátí vynucenou akci bojovníka, když je uprostřed dvoukolového tahu (charging)
 * nebo zamčený v thrash smyčce (locked); jinak null.
 */
function lockedAction(c) {
  if (c.volatile?.biding) {
    // Bide sbírá poškození několik kol – bojovník je zamčený a opakuje Bide,
    // dokud ho neuvolní (řeší useMove). _release → nespotřebuje znovu PP.
    const mv = getMove("bide");
    if (mv) return { slot: c.volatile.biding.slot ?? null, move: mv, _release: true };
  }
  if (c.volatile?.charging) {
    const mv = getMove(c.volatile.charging.moveId);
    if (mv) return { slot: c.volatile.charging.slot, move: mv, _release: true };
  }
  if (c.volatile?.locked) {
    const mv = getMove(c.volatile.locked.moveId);
    if (mv) return { slot: c.volatile.locked.slot ?? null, move: mv };
  }
  return null;
}

/** Akce nepřítele: vynucená (charge/lock), jinak normální auto volba. */
function enemyAction() {
  return lockedAction(battle.enemy) ?? chooseAction(battle.enemy, battle.player);
}

/**
 * Aktuálně použitelné tahy bojovníka: dočasný override z Transform/Mimic
 * (`volatile.moveOverride`), jinak jeho vlastní `ref.moves`. Override je
 * transientní (nedeserializuje se) – po konci souboje/výměně mizí.
 */
function activeMoves(c) {
  return c.volatile?.moveOverride ?? c.ref.moves ?? [];
}

/**
 * Auto mód: vybere akci pro hráčovu stranu v auto tiku (move / switch / item / heal).
 * Priorita (první splněná vyhrává):
 *   1. Auto-heal: když je HP < 30% maxHp a vlastní léčivý potion
 *   2. Auto-switch: když soupeř má výraznou typovou výhodu (≥2×) a na lavičce je lepší člen
 *   3. Jinak: vrátí move (normální útok)
 *
 * BEZPEČNOST: Guardy proti nekonečným smyčkám (switch limit), proti chybě při chybějících itemy/členech.
 * @returns {{ kind: "move" } | { kind: "item", itemId: string, targetUid: string } | { kind: "switch", uid: string }}
 */
function chooseAutoPlayerTurn() {
  if (!battle || !battle.player || battle.player.hp <= 0) {
    return { kind: "move" };
  }

  // Priorita 1: Auto-heal (jen když režim předmětů dovoluje léčení)
  const playerMaxHp = battle.player.stats.maxHp;
  const healThreshold = 0.3 * playerMaxHp;
  const canHeal = !getRules().noItems && !getRules().noPotions;
  if (canHeal && battle.player.hp < healThreshold) {
    // Hledej nejmenší potion, který stačí na chybějící HP, jinak největší
    const missingHp = playerMaxHp - battle.player.hp;
    let bestPotion = null;
    let bestPotionId = null;

    for (const itemDef of ITEMS) {
      if (itemDef.category !== "hp" || !itemDef.effect || itemDef.effect.kind !== "heal") continue;
      if (itemCount(itemDef.id) <= 0) continue;

      const canUse = canUseItem(itemDef.id, battle.player.ref);
      if (!canUse.ok) continue;

      const healAmount = itemDef.effect.amount === "full" ? playerMaxHp : itemDef.effect.amount;
      if (healAmount >= missingHp && (!bestPotion || healAmount < bestPotion.effect.amount)) {
        bestPotion = itemDef;
        bestPotionId = itemDef.id;
      } else if (!bestPotion || healAmount > bestPotion.effect.amount) {
        bestPotion = itemDef;
        bestPotionId = itemDef.id;
      }
    }

    if (bestPotionId) {
      pushLog(`${battle.player.name} uses ${bestPotion.name}!`, "player");
      return { kind: "item", itemId: bestPotionId, targetUid: battle.player.ref.uid };
    }
  }

  // Priorita 2: Auto-switch
  // Kontrola: již jsme switchli v poslední řadě? (guard proti zacyklení)
  if (!battle._lastAutoSwitchTurn) battle._lastAutoSwitchTurn = -2;
  const turnsSinceLastSwitch = (battle.turn ?? 0) - battle._lastAutoSwitchTurn;

  if (turnsSinceLastSwitch > 1) {
    // Najdi nejlepší útok nepřítele proti aktivnímu hráči
    const enemyBestAction = chooseAction(battle.enemy, battle.player);
    const enemyBestMove = enemyBestAction.move;
    const enemyEffectiveness = moveTypeMult(enemyBestMove, battle.player);

    if (enemyEffectiveness >= 2) {
      // Nepřítel má výraznou výhodu – zkus switch na někoho s lepší efektivitou
      const team = getTeamPokemon();
      let bestSwitch = null;
      let bestSwitchUid = null;
      let bestScore = -1; // nižší je lepší (menší efektivita = lepší)

      for (const member of team) {
        const uid = member.uid;
        if (uid === battle.player.ref.uid) continue; // aktivní, přeskočit
        if (hpOf(member) <= 0) continue; // vyřazený, přeskočit

        const candidate = makeCombatant(member);
        const candidateEff = moveTypeMult(enemyBestMove, candidate);
        if (candidateEff < enemyEffectiveness && candidateEff < 2) {
          // Kandidát má lepší efektivitu než aktivní a není si roven nebezpečí
          if (bestScore < 0 || candidateEff < bestScore) {
            bestScore = candidateEff;
            bestSwitch = candidate;
            bestSwitchUid = uid;
          }
        }
      }

      if (bestSwitchUid) {
        battle._lastAutoSwitchTurn = battle.turn ?? 0;
        pushLog(`${battle.player.name} switches out! ${bestSwitch.name}, go!`, "player");
        return { kind: "switch", uid: bestSwitchUid };
      }
    }
  }

  // Priorita 3: Normální útok
  return { kind: "move" };
}

/**
 * Poškození daným tahem vč. kategorie (physical/special), STAB a typové
 * efektivity. `avg=true` použije střed rozptylu (0.925) pro deterministický
 * odhad (a NEkritizuje – slouží auto-politice); jinak náhodu 0.85–1.0 a šanci
 * na kritický zásah. Popálený útočník dává jen poloviční FYZICKÝ damage.
 * Status tah (power 0) vrací dmg 0.
 * @returns {{ dmg: number, eff: number, crit: boolean }}
 */
function calcMoveDamage(attacker, defender, move, avg = false) {
  if (!move.power) return { dmg: 0, eff: 1, crit: false };
  const eff = moveTypeMult(move, defender);
  const lvl = attacker.ref.level;
  const special = move.category === "special";
  // Krit nejdřív – ovlivní, které stupně statů se zohlední (klasické pravidlo:
  // krit ignoruje snížený útok útočníka a zvýšenou obranu obránce).
  const crit = !avg && Math.random() < critChanceFor(attacker, move);
  const atkKey = special ? "spAttack" : "attack";
  const defKey = special ? "spDefense" : "defense";
  let atkStage = attacker.stages?.[atkKey] ?? 0;
  let defStage = defender.stages?.[defKey] ?? 0;
  if (crit) {
    atkStage = Math.max(0, atkStage);
    defStage = Math.min(0, defStage);
  }
  const atk = (special ? attacker.stats.spAttack : attacker.stats.attack) * stageMult(atkStage);
  const def = (special ? defender.stats.spDefense : defender.stats.defense) * stageMult(defStage);
  const stab = move.type && attacker.types.includes(move.type) ? 1.5 : 1;
  // Popálenina půlí fyzický útok (klasika); speciální tahy neovlivňuje.
  const burn = !special && attacker.status?.kind === "burn" ? 0.5 : 1;
  // Počasí (déšť): Water ×1.5, Fire ×0.5.
  const w = battle?.weather?.kind;
  let weatherMult = 1;
  if (w === "rain") {
    if (move.type === "Water") weatherMult = 1.5;
    else if (move.type === "Fire") weatherMult = 0.5;
  }
  // Reflect (fyzické) / Light Screen (speciální) půlí příchozí damage na straně
  // obránce; kritický zásah screeny ignoruje (klasické pravidlo).
  const dSide = defender === battle?.player ? "player" : "enemy";
  const scr = battle?.screens?.[dSide];
  let screenMult = 1;
  if (scr && !crit) {
    if (!special && scr.reflect > 0) screenMult = 0.5;
    else if (special && scr.lightScreen > 0) screenMult = 0.5;
  }
  const base = Math.floor((((2 * lvl) / 5 + 2) * move.power * (atk / def)) / 50) + 2;
  const rand = avg ? 0.925 : 0.85 + Math.random() * 0.15;
  const critMult = crit ? CRIT_MULT : 1;
  return {
    dmg: Math.max(1, Math.floor(base * eff * stab * rand * burn * critMult * weatherMult * screenMult)),
    eff,
    crit,
  };
}

/**
 * Vybere akci (tah) pro bojovníka: z tahů s PP>0 ten s NEJVYŠŠÍM score.
 * Scoring (auto politika, používá se pro obě strany i pro `avgDamage`):
 *   - Damage tah (power > 0): score = dmg(avg) * (accuracy/100)          ← přesnost
 *   - Bonus za status: pokud tah může způsobit status (`ailment`) a cíl je
 *     zdravý (HP > 60 %) a zatím bez statusu, score * (1 + 0.25*ailmentChance)
 *     → AI upřednostní např. Body Slam (paralýza) před obyčejným Tackle.
 *   - Čistý status tah (power 0): zatím ve hře NEJSOU (status je jen vedlejší
 *     efekt damage tahů), ale je připravená minimální větev pro budoucí přidání.
 * Fallback Struggle, když NEexistuje žádný tah s PP.
 * @returns {{ slot: import("../core/state.js").MoveSlot | null, move: object }}
 */
function chooseAction(attacker, defender) {
  const slots = activeMoves(attacker).filter((m) => (m.pp ?? 0) > 0);
  let best = null;
  let bestScore = -1;
  // Sebe-poškozující (recoil) tahy drží stranou jako KRAJNÍ fallback – auto je
  // nikdy nevybere, když existuje jakýkoli jiný tah (lepší recoil než Struggle).
  let fallback = null;
  let fallbackScore = -1;
  // Cíl je "zdravý" (vhodný na uštědření statusu), když nemá status a má > 60 % HP.
  const targetHealthy = !defender.status && defender.hp > 0.6 * defender.stats.maxHp;

  for (const slot of slots) {
    const mv = getMove(slot.id);
    if (!mv) continue;
    const acc = mv.accuracy != null ? mv.accuracy : 100;
    let score;

    if (mv.power > 0) {
      // Damage tah: očekávaný damage vážený přesností.
      const { dmg } = calcMoveDamage(attacker, defender, mv, true);
      score = dmg * (acc / 100);
      // Bonus, když tah může uštědřit status a soupeř je na to vhodný.
      if (mv.ailment && targetHealthy) {
        const chance = (mv.ailmentChance ?? 100) / 100;
        score *= 1 + 0.25 * chance;
      }
    } else {
      // Čistý status tah (power 0) – ve hře zatím žádný. Užitečný jen na zdravém
      // soupeři bez statusu; malé skóre, aby ho nikdy nepřebilo damage.
      score = mv.ailment && targetHealthy ? 1 : 0;
    }

    // Recoil (take-down, double-edge…) auto NIKDY nevybere jako první volbu –
    // ubližoval by sám sobě. Nech ho jen jako fallback, kdyby nebylo čím útočit.
    if (mv.effect?.kind === "recoil") {
      if (score > fallbackScore) {
        fallbackScore = score;
        fallback = { slot, move: mv };
      }
      continue;
    }

    if (score > bestScore) {
      bestScore = score;
      best = { slot, move: mv };
    }
  }

  return best ?? fallback ?? { slot: null, move: STRUGGLE };
}

/** Hláška při nabíjení dvoukolového tahu (první kolo). */
const TWO_TURN_MSG = {
  "solar-beam": "took in sunlight",
  "skull-bash": "tucked in its head",
  dig: "burrowed its way underground",
  bounce: "sprang up high",
  fly: "flew up high",
  dive: "hid underwater",
};

/** Dvoukolové tahy, u kterých je nabíjecí kolo POLOnezranitelné (útok mine).
 *  Ostatní dvoukola (Solar Beam, Skull Bash, Hyper Beam release…) sem NEPATŘÍ. */
const INVULN_CHARGE_MOVES = new Set(["dig", "bounce", "fly", "dive"]);

// ── Metronome: náhodný tah ────────────────────────────────────────────────────
/** Tahy, které Metronome nikdy nevybere (id). */
const METRONOME_BLOCK_IDS = new Set(["metronome", "struggle", "mirror-move", "mimic"]);
/** Efekty se speciálním enginovým tokem, které přes Metronome nedávají smysl. */
const METRONOME_BLOCK_EFFECTS = new Set([
  "metronome", "twoTurn", "copyMove", "transform", "forceSwitch",
  "counter", "fixedDamageHalf", "thrash", "substitute", "rage", "bide", "rest",
]);

/** Náhodný tah pro Metronome (útočné i jednoduché statusové; blokované vynechány). */
function randomMetronomeMove() {
  const pool = MOVES.filter(
    (m) =>
      !METRONOME_BLOCK_IDS.has(m.id) &&
      !METRONOME_BLOCK_EFFECTS.has(m.effect?.kind) &&
      (m.power > 0 || m.ailment || m.effect)
  );
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

/**
 * Provede Metronome-vybraný tah bez „can't act" bran a bez spotřeby PP (ty už
 * proběhly u samotného Metronome). Replikuje jádro useMove od accuracy dál:
 * accuracy → power0 status / damage → substitute → HP → ailment → efekty.
 * Faint řeší round loop po návratu z useMove (kontroluje hp<=0).
 */
function resolveMetronomeMove(attacker, defender, move, side) {
  const accMult = accStageMult((attacker.stages?.accuracy ?? 0) - (defender.stages?.evasion ?? 0));
  if (move.accuracy != null && Math.random() * 100 >= move.accuracy * accMult) {
    pushLog(`But it missed!`, side);
    return;
  }
  const action = { slot: null, move };
  if (!move.power) {
    if (move.ailment) maybeInflict(move, defender, side);
    if (move.effect) applyMoveEffects(attacker, defender, action, side, 0);
    return;
  }
  const { dmg, eff, crit } = calcMoveDamage(attacker, defender, move);
  if (defender.volatile?.substitute > 0) {
    const before = defender.volatile.substitute;
    defender.volatile.substitute = Math.max(0, before - dmg);
    const absorbed = before - defender.volatile.substitute;
    pushLog(`The substitute took the hit! (-${absorbed})`, side);
    if (defender.volatile.substitute <= 0) pushLog(`${defender.name}'s substitute faded!`, side);
    return;
  }
  defender.hp = Math.max(0, defender.hp - dmg);
  const note = eff > 1 ? " (super effective!)" : eff < 1 ? " (not very effective)" : "";
  pushLog(`${defender.name} took ${dmg}${note}${crit ? " A critical hit!" : ""}`, side);
  if (dmg > 0 && defender.volatile) {
    defender.volatile.lastHitDmg = dmg;
    defender.volatile.lastHitPhysical = move.category === "physical";
  }
  maybeInflict(move, defender, side);
  applyMoveEffects(attacker, defender, action, side, dmg);
}

/**
 * Provede jeden tah útočníka na obránce: „can't act" brány (flinch/spánek/zmatení/
 * paralýza), spotřeba PP, dvoukolo, accuracy (minutí), poškození/status a běhové
 * efekty tahu (move.effect). Faint řeší volající.
 * @param {*} attacker  bojovník
 * @param {*} defender  bojovník
 * @param {{ slot: object|null, move: object, _release?: boolean }} action
 * @returns {{ dmg: number, crit: boolean }} způsobené poškození a zda šlo o krit
 */
function useMove(attacker, defender, action) {
  const move = action.move;
  const side = attacker === battle.player ? "player" : "enemy"; // naše zeleně, soupeř červeně

  // --- „Can't act" brány – žádná NEspotřebuje PP (útočník nezaútočil) ---
  // Flinch: leknutí (platí jen do konce tohoto kola).
  if (attacker.volatile?.flinch) {
    attacker.volatile.flinch = false;
    pushLog(`${attacker.name} flinched and couldn't move!`, side);
    return { dmg: 0, crit: false };
  }
  // Spánek (trvalý status): odtikej kolo; když ještě spí, tah vypadne; jinak se
  // probudí a POKRAČUJE. Počet kol se drží na status objektu (přežije serializaci).
  if (attacker.status?.kind === "sleep") {
    const st = attacker.status;
    st.turns = (st.turns ?? 1) - 1;
    if (st.turns > 0) {
      pushLog(`${attacker.name} is fast asleep.`, side);
      return { dmg: 0, crit: false };
    }
    attacker.status = null;
    pushLog(`${attacker.name} woke up!`, side);
  }
  // Zmrznutí (trvalý status): šance na roztátí; jinak tah v tomto kole vypadne.
  if (attacker.status?.kind === "freeze") {
    if (Math.random() < FREEZE_THAW) {
      attacker.status = null;
      pushLog(`${attacker.name} thawed out!`, side);
    } else {
      pushLog(`${attacker.name} is frozen solid!`, side);
      return { dmg: 0, crit: false };
    }
  }
  // Zmatení: odtikej; buď se probere, nebo si 1/3 šancí ublíží místo útoku.
  if (attacker.volatile?.confusion > 0) {
    attacker.volatile.confusion--;
    if (attacker.volatile.confusion <= 0) {
      pushLog(`${attacker.name} snapped out of confusion!`, side);
    } else if (Math.random() < 1 / 3) {
      const dmg = confusionSelfDamage(attacker);
      attacker.hp = Math.max(0, attacker.hp - dmg);
      pushLog(`${attacker.name} is confused! It hurt itself in its confusion. (-${dmg})`, side);
      return { dmg: 0, crit: false };
    }
  }

  // Paralýza: tah může v tomto kole úplně vypadnout (PP se přitom NEspotřebuje).
  if (attacker.status?.kind === "paralysis" && Math.random() < PARALYSIS_FIZZLE) {
    pushLog(`${attacker.name} is paralyzed! It can't move!`, side);
    return { dmg: 0, crit: false };
  }

  // Rage: pokud útočník tentokrát nepoužil Rage, jeho „vztek" opadne.
  if (attacker.volatile && move.id !== "rage") attacker.volatile.rageActive = false;

  // Zapamatuj poslední použitý tah (pro Mimic/Mirror Move kopírující tah soupeře).
  if (attacker.volatile) attacker.volatile.lastMoveId = move.id;

  // Spotřeba PP – release tah dvoukola PP NEspotřebuje (spotřeboval se při nabíjení).
  // Full Auto: hráčovo PP se nespotřebovává (bezpečný idling); PP nepřítele je stejně
  // jen běhové (neukládá se), takže na něm nezáleží.
  if (action.slot && !action._release && !(getFullAuto() && side === "player"))
    action.slot.pp = Math.max(0, (action.slot.pp ?? 0) - 1);

  // Dvoukolový tah: v prvním kole se jen nabíjí, samotný úder přijde příště (release).
  if (move.effect?.kind === "twoTurn" && !action._release) {
    attacker.volatile.charging = { moveId: move.id, slot: action.slot };
    pushLog(`${attacker.name} ${TWO_TURN_MSG[move.id] ?? "began charging up"}!`, side);
    return { dmg: 0, crit: false };
  }
  if (action._release) attacker.volatile.charging = null;

  // Bide: bojovník 2 kola sbírá utržené poškození (je zamčený přes lockedAction),
  // pak ho vrátí ×2. Poškození se načítá při zásazích do bidera (viz dále, kde se
  // aplikuje damage do obránce). Řešeno tady, protože Bide má power 0.
  if (move.effect?.kind === "bide") {
    const v = attacker.volatile;
    if (!v.biding) {
      // Start sbírání – toto kolo se počítá, proto rovnou dekrement.
      v.biding = { turns: 2, dmg: 0, slot: action.slot };
      pushLog(`${attacker.name} is storing energy!`, side);
      v.biding.turns -= 1;
      return { dmg: 0, crit: false };
    }
    if (v.biding.turns > 0) {
      v.biding.turns -= 1;
      pushLog(`${attacker.name} is storing energy!`, side);
      return { dmg: 0, crit: false };
    }
    // Uvolnění: vrať 2× nasbíraného poškození.
    const stored = v.biding.dmg;
    v.biding = null;
    if (stored <= 0 || defender.hp <= 0) {
      pushLog(`${attacker.name} unleashed its stored energy, but it failed!`, side);
      return { dmg: 0, crit: false };
    }
    const dmg = stored * 2;
    defender.hp = Math.max(0, defender.hp - dmg);
    pushLog(`${attacker.name} unleashed its stored energy! ${defender.name} took ${dmg}`, side);
    if (defender.volatile) {
      defender.volatile.lastHitDmg = dmg;
      defender.volatile.lastHitPhysical = true;
    }
    return { dmg, crit: false };
  }

  // Polonezranitelnost: obránce právě nabíjí Dig/Fly/Bounce/Dive (je pod zemí /
  // ve vzduchu / pod vodou) → útok ho mine. Swift (accuracy 101) trefí vždy.
  const defCharge = defender.volatile?.charging;
  if (
    defCharge &&
    INVULN_CHARGE_MOVES.has(defCharge.moveId) &&
    move.accuracy != null
  ) {
    pushLog(`${attacker.name} used ${move.name} — but ${defender.name} avoided the attack!`, side);
    return { dmg: 0, crit: false };
  }

  // Accuracy → minutí. Zohledni stupně accuracy útočníka a evasion obránce.
  const accMult = accStageMult((attacker.stages?.accuracy ?? 0) - (defender.stages?.evasion ?? 0));
  if (move.accuracy != null && Math.random() * 100 >= move.accuracy * accMult) {
    pushLog(`${attacker.name} used ${move.name} — but it missed!`, side);
    return { dmg: 0, crit: false };
  }

  // Fixní poškození poloviny HP (Super Fang – power 0, ale dělá damage). Řešeno
  // zvlášť před status/damage větví, aby fungovalo i s power 0.
  if (move.effect?.kind === "fixedDamageHalf") {
    const dmg = Math.max(1, Math.floor(defender.hp / 2));
    defender.hp = Math.max(0, defender.hp - dmg);
    pushLog(`${attacker.name} used ${move.name}! ${defender.name} took ${dmg}`, side);
    return { dmg, crit: false };
  }

  // Counter: vrátí dvojnásobek FYZICKÉHO poškození, které útočník utrpěl v tomto
  // kole (Counter má nízkou prioritu → soupeř už udeřil). Jinak selže. Řešeno před
  // power0 větví, protože Counter má power 0, ale dělá damage.
  if (move.effect?.kind === "counter") {
    const taken = attacker.volatile?.lastHitDmg ?? 0;
    if (attacker.volatile?.lastHitPhysical && taken > 0 && defender.hp > 0) {
      const dmg = taken * 2;
      defender.hp = Math.max(0, defender.hp - dmg);
      pushLog(`${attacker.name} used ${move.name}! ${defender.name} took ${dmg}`, side);
      return { dmg, crit: false };
    }
    pushLog(`${attacker.name} used ${move.name}, but it failed!`, side);
    return { dmg: 0, crit: false };
  }

  // Status tah bez přímého poškození (power 0) – navěsí ailment a/nebo effect.
  if (!move.power) {
    pushLog(`${attacker.name} used ${move.name}!`, side);
    if (move.ailment) maybeInflict(move, defender, side);
    if (move.effect) applyMoveEffects(attacker, defender, action, side, 0);
    if (!move.ailment && !move.effect) pushLog(`${attacker.name} used ${move.name} — but nothing happened.`, side);
    return { dmg: 0, crit: false };
  }

  const { dmg, eff, crit } = calcMoveDamage(attacker, defender, move);
  // Substitute: dokud krycí panák stojí, pohltí poškození místo obránce a blokuje
  // status i vedlejší efekty. Zmizí, když mu dojde HP.
  if (defender.volatile?.substitute > 0) {
    const before = defender.volatile.substitute;
    defender.volatile.substitute = Math.max(0, before - dmg);
    const absorbed = before - defender.volatile.substitute;
    pushLog(`${attacker.name} used ${move.name}! The substitute took the hit! (-${absorbed})`, side);
    if (defender.volatile.substitute <= 0) pushLog(`${defender.name}'s substitute faded!`, side);
    return { dmg: absorbed, crit };
  }
  const defHpBefore = defender.hp;
  defender.hp = Math.max(0, defender.hp - dmg);
  // Bide: pokud obránce právě sbírá energii, přičti utržené poškození (vrátí ×2).
  if (dmg > 0 && defender.volatile?.biding) defender.volatile.biding.dmg += dmg;
  // Focus Sash: z PLNÉHO HP přežije jinak smrtící zásah s 1 HP (jednorázově).
  if (defender.hp <= 0 && defHpBefore >= defender.stats.maxHp) {
    const sash = heldItemOf(defender.ref);
    if (sash?.held?.kind === "focusSash") {
      defender.hp = 1;
      defender.ref.heldItem = null; // spotřebuje se
      pushLog(`${defender.name} hung on using its ${sash.name}!`, side);
    }
  }
  const note = eff > 1 ? " (super effective!)" : eff < 1 ? " (not very effective)" : "";
  const critNote = crit ? " A critical hit!" : "";
  pushLog(`${attacker.name} used ${move.name}! ${defender.name} took ${dmg}${note}${critNote}`, side);
  // Counter: zapamatuj poslední zásah obránce (typ + hodnota) pro jeho pozdější Counter.
  if (dmg > 0 && defender.volatile) {
    defender.volatile.lastHitDmg = dmg;
    defender.volatile.lastHitPhysical = move.category === "physical";
  }
  // Oheň roztaje zmrzlého obránce.
  if (move.type === "Fire" && defender.status?.kind === "freeze" && defender.hp > 0) {
    defender.status = null;
    pushLog(`${defender.name} thawed out!`, side);
  }
  // Status: zásah může způsobit otravu/popálení (pokud obránce žije a je vnímavý).
  maybeInflict(move, defender, side);

  // Oran Berry: pokud obránce drží Oran Berry a po poškození klesne hp pod 50%,
  // obnov 10 HP (jedenkrát, pak se item spotřebuje).
  if (defender.hp > 0 && dmg > 0) {
    const heldItem = heldItemOf(defender.ref);
    if (heldItem?.held?.kind === "lowHpHeal") {
      const threshold = heldItem.held.threshold;
      const maxHp = defender.stats.maxHp;
      if (defender.hp <= threshold * maxHp && defender.hp > 0) {
        const restore = Math.min(heldItem.held.amount, maxHp - defender.hp);
        defender.hp += restore;
        defender.ref.heldItem = null; // spotřebi se
        pushLog(`${defender.name} restored HP with ${heldItem.name}! (+${restore})`, side);
      }
    }
  }

  // Rage: obránce s aktivním Rage, který dostal zásah, zvedne Attack.
  if (defender.hp > 0 && dmg > 0 && defender.volatile?.rageActive) {
    applyStatStage(defender, "attack", 1, defender === battle.player ? "player" : "enemy");
  }
  // Vedlejší efekty damage tahu (recoil, drain, flinch, confuse, statChange…).
  applyMoveEffects(attacker, defender, action, side, dmg);

  return { dmg, crit };
}

/**
 * Aplikuje `move.effect` (běhový vedlejší efekt tahu). Volá se z power0 větve
 * (s dmgDealt=0) i z damage větve (s reálným dmgDealt). Efekty jsou transientní.
 * @param {*} attacker
 * @param {*} defender
 * @param {{ slot: object|null, move: object, _release?: boolean }} action
 * @param {"player"|"enemy"} side
 * @param {number} dmgDealt
 */
function applyMoveEffects(attacker, defender, action, side, dmgDealt) {
  const move = action.move;
  const eff = move.effect;
  if (!eff) return;
  const enemySide = side === "player" ? "enemy" : "player";
  // Šance efektu (u vedlejších efektů damage tahů, např. Bite flinch 30 %).
  if (eff.chance != null && Math.random() * 100 >= eff.chance) return;

  switch (eff.kind) {
    case "statChange": {
      // Tah může měnit JEDEN stat (starý formát) NEBO VÍCE statů (pole objektů).
      // Pokud je eff.stat (single), iteruj s tím; jinak iteruj eff.changes (pole).
      const changes = eff.stat ? [{ stat: eff.stat, stages: eff.stages, target: eff.target }] : (eff.changes ?? []);
      for (const change of changes) {
        const tgt = change.target === "self" ? attacker : defender;
        const tgtSide = change.target === "self" ? side : enemySide;
        if (tgt.hp > 0) applyStatStage(tgt, change.stat, change.stages, tgtSide);
      }
      break;
    }
    case "recoil": {
      if (dmgDealt > 0) {
        const r = Math.max(1, Math.floor(dmgDealt * (eff.frac ?? 0.25)));
        attacker.hp = Math.max(0, attacker.hp - r);
        pushLog(`${attacker.name} is hit by recoil! (-${r})`, side);
      }
      break;
    }
    case "drain": {
      if (dmgDealt > 0) {
        const h = Math.max(1, Math.floor(dmgDealt * (eff.frac ?? 0.5)));
        const gain = Math.min(h, attacker.stats.maxHp - attacker.hp);
        if (gain > 0) {
          attacker.hp += gain;
          pushLog(`${attacker.name} drained HP! (+${gain})`, side);
        }
      }
      break;
    }
    case "heal": {
      const h = Math.floor(attacker.stats.maxHp * (eff.frac ?? 0.5));
      const gain = Math.min(h, attacker.stats.maxHp - attacker.hp);
      if (gain > 0) {
        attacker.hp += gain;
        pushLog(`${attacker.name} restored HP! (+${gain})`, side);
      } else {
        pushLog(`${attacker.name}'s HP is already full!`, side);
      }
      break;
    }
    case "flinch": {
      if (defender.hp > 0) defender.volatile.flinch = true;
      break;
    }
    case "confuse": {
      if (defender.hp > 0 && !(defender.volatile.confusion > 0)) {
        defender.volatile.confusion = 2 + Math.floor(Math.random() * 4);
        pushLog(`${defender.name} became confused!`, side);
      }
      break;
    }
    case "sleep": {
      // Spánek je trvalý status (nikoli volatile) – vzájemně se vylučuje s jiným
      // statusem a Substitute ho blokuje.
      if (defender.hp > 0 && !defender.status && !(defender.volatile?.substitute > 0)) {
        defender.status = { kind: "sleep", turns: 1 + Math.floor(Math.random() * 3) };
        pushLog(`${defender.name} fell asleep!`, side);
      }
      break;
    }
    case "leechSeed": {
      if (defender.hp > 0) {
        if ((defender.types ?? []).includes("Grass")) {
          pushLog(`It doesn't affect ${defender.name}...`, side);
        } else if (defender.volatile.seeded) {
          pushLog(`${defender.name} is already seeded.`, side);
        } else {
          defender.volatile.seeded = true;
          pushLog(`${defender.name} was seeded!`, side);
        }
      }
      break;
    }
    case "trap": {
      if (defender.hp > 0 && !(defender.volatile.trapped > 0)) {
        defender.volatile.trapped = 4 + Math.floor(Math.random() * 2);
        pushLog(`${defender.name} was trapped!`, side);
      }
      break;
    }
    case "rapidSpin": {
      let freed = false;
      if (attacker.volatile.seeded) {
        attacker.volatile.seeded = false;
        freed = true;
      }
      if (attacker.volatile.trapped > 0) {
        attacker.volatile.trapped = 0;
        freed = true;
      }
      if (freed) pushLog(`${attacker.name} broke free!`, side);
      break;
    }
    case "critUp": {
      attacker.critStages = Math.min(3, (attacker.critStages || 0) + 2);
      pushLog(`${attacker.name} is getting pumped!`, side);
      break;
    }
    case "weather": {
      battle.weather = { kind: eff.weather ?? "rain", turns: 5 };
      pushLog(`It started to rain!`);
      break;
    }
    case "tailwind": {
      if (!battle.tailwind) battle.tailwind = { player: 0, enemy: 0 };
      battle.tailwind[side] = 4;
      pushLog(`Tailwind blew behind ${attacker.name}!`, side);
      break;
    }
    case "rage": {
      attacker.volatile.rageActive = true;
      break;
    }
    case "thrash": {
      const v = attacker.volatile;
      if (!v.locked) {
        v.locked = { moveId: move.id, slot: action.slot, turns: 1 + Math.floor(Math.random() * 2) };
      } else {
        v.locked.turns--;
        if (v.locked.turns <= 0) {
          v.locked = null;
          if (!(attacker.volatile.confusion > 0)) {
            attacker.volatile.confusion = 2 + Math.floor(Math.random() * 4);
            pushLog(`${attacker.name} became confused due to fatigue!`, side);
          }
        }
      }
      break;
    }
    case "reflect":
    case "lightScreen": {
      if (!battle.screens) battle.screens = { player: {}, enemy: {} };
      const scr = battle.screens[side];
      if (scr[eff.kind] > 0) {
        pushLog(`But it failed!`, side);
      } else {
        scr[eff.kind] = 5; // vydrží 5 kol
        pushLog(
          eff.kind === "reflect"
            ? `Reflect made ${attacker.name}'s team stronger against physical moves!`
            : `Light Screen made ${attacker.name}'s team stronger against special moves!`,
          side
        );
      }
      break;
    }
    case "rest": {
      // Rest: plné vyléčení + vyčistí předchozí status, ale usne na 2 kola.
      if (attacker.hp >= attacker.stats.maxHp) {
        pushLog(`${attacker.name}'s HP is already full!`, side);
        break;
      }
      attacker.hp = attacker.stats.maxHp;
      attacker.status = { kind: "sleep", turns: 2 };
      pushLog(`${attacker.name} went to sleep and became healthy!`, side);
      break;
    }
    case "substitute": {
      // Substitute: obětuje 1/4 max HP a postaví krycího panáka s tímto HP.
      const cost = Math.floor(attacker.stats.maxHp / 4);
      if (attacker.volatile.substitute > 0) {
        pushLog(`${attacker.name} already has a substitute!`, side);
      } else if (cost <= 0 || attacker.hp <= cost) {
        pushLog(`But it does not have enough HP left to make a substitute!`, side);
      } else {
        attacker.hp -= cost;
        attacker.volatile.substitute = cost;
        pushLog(`${attacker.name} put up a substitute!`, side);
      }
      break;
    }
    case "forceSwitch": {
      // Whirlwind/Roar. U divokého nepřítele = „vyfouknutí" → nové setkání bez
      // odměny. U hráče = vytažení náhodného živého člena z lavičky.
      if (defender.hp <= 0) break;
      if (defender.volatile?.substitute > 0) {
        pushLog(`But it failed!`, side);
        break;
      }
      if (defender === battle.enemy) {
        pushLog(`The wild ${defender.name} was blown away!`, side);
        battle._blowAway = true; // zpracuje round loop po návratu z useMove
      } else {
        const team = getTeamPokemon();
        const bench = [];
        for (let i = 0; i < team.length; i++) {
          if (i !== battle.teamCursor && hpOf(team[i]) > 0) bench.push(i);
        }
        if (bench.length) {
          const pick = bench[Math.floor(Math.random() * bench.length)];
          battle.teamCursor = pick;
          battle.player = makeCombatant(team[pick]);
          pushLog(`${battle.player.name} was dragged out!`, side);
        } else {
          pushLog(`But it failed!`, side);
        }
      }
      break;
    }
    case "copyMove": {
      // Mimic/Mirror Move: zkopíruje poslední tah cíle do dočasného override
      // (přepíše slot použitého tahu). Override je transientní (mizí po souboji).
      const lastId = defender.volatile?.lastMoveId;
      const copied = lastId ? getMove(lastId) : null;
      if (!copied || lastId === move.id || copied.effect?.kind === "copyMove") {
        pushLog(`${attacker.name}'s ${move.name} failed!`, side);
        break;
      }
      const base = activeMoves(attacker).map((m) => ({ ...m }));
      let idx = action.slot ? base.findIndex((m) => m.id === action.slot.id) : -1;
      if (idx < 0) idx = base.findIndex((m) => m.id === move.id);
      if (idx >= 0) {
        base[idx] = { id: copied.id, pp: copied.pp ?? 5, maxPp: copied.pp ?? 5 };
        attacker.volatile.moveOverride = base;
        pushLog(`${attacker.name} learned ${copied.name}!`, side);
      } else {
        pushLog(`${attacker.name}'s ${move.name} failed!`, side);
      }
      break;
    }
    case "transform": {
      // Transform: zkopíruje typy, staty (kromě max HP), stupně a tahy cíle.
      // Vše transientní přes bojovníka/volatile – po souboji mizí.
      if (defender.hp <= 0 || attacker.volatile?.transformed) {
        pushLog(`${attacker.name}'s ${move.name} failed!`, side);
        break;
      }
      const origName = attacker.name;
      attacker.types = [...(defender.types ?? [])];
      attacker.stats = { ...defender.stats, maxHp: attacker.stats.maxHp };
      attacker.stages = { ...defender.stages };
      attacker.name = defender.name;
      attacker.volatile.moveOverride = activeMoves(defender).map((m) => ({ id: m.id, pp: 5, maxPp: 5 }));
      attacker.volatile.transformed = true;
      pushLog(`${origName} transformed into ${defender.name}!`, side);
      break;
    }
    case "haze": {
      // Vynuluje VŠECHNY stupně statů (i accuracy/evasion) a crit stupně u OBOU
      // bojovníků – jako klasický Haze.
      for (const c of [attacker, defender]) {
        if (c?.stages) for (const k of Object.keys(c.stages)) c.stages[k] = 0;
        if (c) c.critStages = 0;
      }
      pushLog(`All stat changes were eliminated!`, side);
      break;
    }
    case "metronome": {
      // Zamává prstem a použije náhodný tah (mimo blokovaných). Provede se rovnou.
      const pick = randomMetronomeMove();
      if (!pick) {
        pushLog(`But it failed!`, side);
        break;
      }
      pushLog(`Waggling a finger let it use ${pick.name}!`, side);
      resolveMetronomeMove(attacker, defender, pick, side);
      break;
    }
    // highCrit/twoTurn/fixedDamageHalf/pursuit/suckerPunch: řešeno jinde nebo
    // jen plný damage – tady nic.
    default:
      break;
  }
}

/** DoT frakce max HP za kolo podle statusu. */
const STATUS_DOT = { poison: 1 / 8, burn: 1 / 16 };

/**
 * Leftovers efekt: pokud bojovník drží Leftovers, obnov mu 1/16 max HP
 * na konci kola (jen pokud žije).
 */
function applyLeftoversEffect(combatant) {
  if (!combatant || combatant.hp <= 0) return;
  const heldItem = heldItemOf(combatant.ref);
  if (heldItem?.held?.kind === "endTurnHeal") {
    const heal = Math.floor(combatant.stats.maxHp * heldItem.held.fraction);
    if (heal > 0) {
      const restore = Math.min(heal, combatant.stats.maxHp - combatant.hp);
      combatant.hp += restore;
      const who = combatant === battle.player ? "player" : "enemy";
      pushLog(`${combatant.name} restored HP with ${heldItem.name}!`, who);
    }
  }
}

/** Je obránce imunní vůči danému statusu? (typová imunita jako v klasice) */
function isImmuneTo(status, defender) {
  const t = defender.types ?? [];
  if (status === "burn") return t.includes("Fire");
  if (status === "poison") return t.includes("Poison") || t.includes("Steel");
  if (status === "paralysis") return t.includes("Electric");
  if (status === "freeze") return t.includes("Ice");
  return false;
}

/** Hláška do logu při navěšení statusu. */
const AILMENT_VERB = {
  burn: "was burned",
  poison: "was poisoned",
  paralysis: "was paralyzed",
  sleep: "fell asleep",
  freeze: "was frozen solid",
};

/**
 * Zkusí navěsit status z tahu na obránce. Jen když tah status má, obránce žije,
 * ještě žádný status nemá a není imunní. Status je trvalý (`owned.status` přes
 * accessor bojovníka) – přežije výměnu i refresh, čistí ho až léčení.
 */
function maybeInflict(move, defender, attackerSide) {
  if (!move.ailment || defender.hp <= 0 || defender.status) return;
  if (defender.volatile?.substitute > 0) return; // Substitute blokuje status
  if (isImmuneTo(move.ailment, defender)) return;
  if (Math.random() * 100 >= (move.ailmentChance ?? 100)) return;
  const st = { kind: move.ailment };
  if (move.ailment === "sleep") st.turns = 1 + Math.floor(Math.random() * 3); // 1–3 kola
  defender.status = st;
  pushLog(`${defender.name} ${AILMENT_VERB[move.ailment] ?? "was afflicted"}!`, attackerSide);
}

/**
 * Pořadí tahů v kole: nejdřív vyšší priority zvoleného tahu (Quick Attack +1),
 * pak vyšší Speed; při úplné shodě náhoda.
 * @param {{ player: {move: object}, enemy: {move: object} }} actions
 * @returns {("player"|"enemy")[]}
 */
function turnOrder(actions) {
  const pPri = actions.player.move.priority ?? 0;
  const ePri = actions.enemy.move.priority ?? 0;
  if (pPri !== ePri) return pPri > ePri ? ["player", "enemy"] : ["enemy", "player"];
  const pSpd = effSpeed(battle.player); // paralýza půlí Speed
  const eSpd = effSpeed(battle.enemy);
  if (pSpd !== eSpd) return pSpd > eSpd ? ["player", "enemy"] : ["enemy", "player"];
  return Math.random() < 0.5 ? ["player", "enemy"] : ["enemy", "player"];
}

/**
 * Naplánuje další kolo. Automatická kola běží JEN v Auto battle módu; když je
 * vypnutý (manuální mód – doděláme později), souboj se sám neposouvá, i když
 * „běží" (running). Rychlost je globální nastavení.
 */
function schedule() {
  clearTimeout(timer);
  if (!battle || !battle.running || !autoLoopActive()) return;
  timer = setTimeout(tick, 1000 / getSpeed());
}

/** Jedno kolo souboje. */
function tick() {
  if (!battle || !battle.running) return;

  battle.turn = (battle.turn ?? 0) + 1; // číslo kola proti aktuálnímu nepříteli

  // Autocatch: na začátku kola zkus chytit nepřítele (má-li smysl a jsou balls).
  // Používá vybraný typ ballu. Při úspěchu je nepřítel nahrazen novým a kolo
  // (výměna úderů) se přeskočí; při neúspěchu se normálně bojuje – hráč ho může
  // zabít dřív, než ho chytí.
  const ac = getAutocatch();
  // Autocatch drží jeden vybraný typ ballu; když ten dojde, NESAHÁ po jiném –
  // rovnou se sám vypne (viditelně v UI), ať nespotřebuje prémiové míčky.
  if (ac.enabled && autocatchActive(ac) && ballCount(ac.ball) <= 0) {
    setAutocatch({ enabled: false });
    pushLog(`Auto catch off — out of ${getPokeball(ac.ball)?.name ?? "balls"}.`);
  }
  // Vybraný autocatch ball (null = došel → nechytáme, žádný fallback).
  const ballId = resolveAutocatchBall();
  if (
    getAutocatch().enabled &&
    !battle.trainer && // trenérovy Pokémony nelze chytat
    ballId &&
    battle.enemy &&
    battle.enemy.hp > 0 &&
    ballCount(ballId) > 0 &&
    !nuzlockeCatchBlock() &&
    shouldAutocatch(battle.enemy.ref, ac)
  ) {
    const r = doCatch(ballId);
    if (r.caught) {
      emit();
      schedule();
      return;
    }
  }

  // Hráč: auto-decision engine (heal/switch/move); nepřítel: normální chooseAction.
  // Když je ale hráč zamčený vynuceným tahem (charge/thrash), nevybírá – hraje ho.
  let playerAction = null;
  const _lp = lockedAction(battle.player);
  if (_lp) {
    playerAction = _lp;
  } else {
  const playerAutoDecision = chooseAutoPlayerTurn();

  if (playerAutoDecision.kind === "move") {
    // Normální útok
    playerAction = chooseAction(battle.player, battle.enemy);
  } else if (playerAutoDecision.kind === "item") {
    // Auto-heal: hráč neútočí, enemy zaútočí
    const { itemId, targetUid } = playerAutoDecision;
    const itemDef = getItem(itemId);
    if (itemDef && itemCount(itemId) > 0) {
      // Spotřebuj item a postup jako switch/catch (player: null)
      useItem(targetUid, itemId); // commit + emit
      playerAction = null;
    } else {
      // Item odstraněn/nejde → fallback na útok
      playerAction = chooseAction(battle.player, battle.enemy);
    }
  } else if (playerAutoDecision.kind === "switch") {
    // Auto-switch: hráč neútočí, enemy zaútočí
    const { uid } = playerAutoDecision;
    const team = getTeamPokemon();
    const idx = team.findIndex((p) => p.uid === uid);
    if (idx >= 0) {
      // Provedeme switch
      battle.teamCursor = idx;
      battle.player = makeCombatant(team[idx]);
      playerAction = null;
    } else {
      // Chyba → fallback na útok
      playerAction = chooseAction(battle.player, battle.enemy);
    }
  } else {
    // Fallback
    playerAction = chooseAction(battle.player, battle.enemy);
  }
  } // konec větve „hráč není zamčený"

  // Odehraje se kolo
  const hits = runActions({
    player: playerAction,
    enemy: enemyAction(), // respektuje vynucený tah (charge/thrash)
  });

  // Konec kola: otrava/popálení uberou HP (v auto módu synchronně, bez animace).
  applyStatusDotAuto();

  emit();
  flushHits(hits);
  schedule();
}

/**
 * Posbírá residuální poškození konce kola pro obě strany: otrava/popálení (DoT),
 * trap (svírající tah) a Leech Seed (odsává do druhé strany). Vrací pole eventů
 * v pořadí player → enemy. `drainTo` = strana, které se odsáté HP připíše.
 * @returns {{ who: "player"|"enemy", dmg: number, label: string, drainTo?: "player"|"enemy" }[]}
 */
function collectResiduals() {
  const events = [];
  for (const who of ["player", "enemy"]) {
    const c = who === "player" ? battle.player : battle.enemy;
    if (!c || c.hp <= 0) continue;
    const maxHp = c.stats.maxHp;
    // Otrava / popálení (dle statusu).
    const frac = c.status ? STATUS_DOT[c.status.kind] : 0;
    if (frac) events.push({ who, dmg: Math.max(1, Math.floor(maxHp * frac)), label: c.status.kind });
    // Svírající tah (Fire Spin apod.).
    if (c.volatile?.trapped > 0) events.push({ who, dmg: Math.max(1, Math.floor(maxHp / 8)), label: "trap" });
    // Leech Seed – odsává HP do druhé strany.
    if (c.volatile?.seeded) {
      events.push({
        who,
        dmg: Math.max(1, Math.floor(maxHp / 8)),
        label: "leechseed",
        drainTo: who === "player" ? "enemy" : "player",
      });
    }
  }
  return events;
}

/** Text do logu k residuálnímu eventu (vč. hodnoty poškození). */
function residualMsg(c, ev) {
  if (ev.label === "leechseed") return `${c.name}'s health is sapped by Leech Seed! (-${ev.dmg})`;
  if (ev.label === "trap") return `${c.name} is hurt by the trap! (-${ev.dmg})`;
  return `${c.name} is hurt by ${ev.label}! (-${ev.dmg})`;
}

/**
 * Odtiká polní časovače konce kola: počasí, tailwind, flinch (vyprší vždy),
 * a svírající tah (trap). Voláno po vyhodnocení residuálních poškození.
 */
function tickFieldTimers() {
  // Počasí.
  if (battle.weather) {
    battle.weather.turns--;
    if (battle.weather.turns <= 0) {
      pushLog(`The rain stopped.`);
      battle.weather = null;
    }
  }
  // Tailwind na obou stranách.
  for (const side of ["player", "enemy"]) {
    if (battle.tailwind?.[side] > 0) {
      battle.tailwind[side]--;
      if (battle.tailwind[side] === 0) pushLog(`Your team's Tailwind petered out!`, side);
    }
  }
  // Reflect / Light Screen odtikají na obou stranách.
  if (battle.screens) {
    for (const side of ["player", "enemy"]) {
      const scr = battle.screens[side];
      if (!scr) continue;
      if (scr.reflect > 0 && --scr.reflect === 0) pushLog(`Reflect wore off.`, side);
      if (scr.lightScreen > 0 && --scr.lightScreen === 0) pushLog(`Light Screen wore off.`, side);
    }
  }
  // Flinch platí jen jedno kolo – vždy smaž.
  if (battle.player?.volatile) battle.player.volatile.flinch = false;
  if (battle.enemy?.volatile) battle.enemy.volatile.flinch = false;
  // Counter: zapamatovaný poslední zásah platí jen v rámci kola – vynuluj.
  if (battle.player?.volatile) { battle.player.volatile.lastHitDmg = 0; battle.player.volatile.lastHitPhysical = false; }
  if (battle.enemy?.volatile) { battle.enemy.volatile.lastHitDmg = 0; battle.enemy.volatile.lastHitPhysical = false; }
  // Svírající tah odtiká; když doběhne, osvobodí.
  for (const who of ["player", "enemy"]) {
    const c = who === "player" ? battle.player : battle.enemy;
    if (c?.volatile?.trapped > 0) {
      c.volatile.trapped--;
      if (c.volatile.trapped === 0) pushLog(`${c.name} was freed from the trap.`, who === "player" ? "enemy" : "player");
    }
  }
}

/**
 * Auto mód: konec kola synchronně (bez animace). Nejdřív Leftovers, pak residuální
 * poškození (otrava/popálení + trap + Leech Seed), nakonec odtikání polních
 * časovačů. Když někdo padne, rovnou to vyřeší přes handleFaint.
 */
function applyStatusDotAuto() {
  if (!battle || battle.result) return;
  // Nejdřív Leftovers efekt na obě strany.
  applyLeftoversEffect(battle.player);
  applyLeftoversEffect(battle.enemy);
  const events = collectResiduals();
  for (const ev of events) {
    const c = ev.who === "player" ? battle.player : battle.enemy;
    if (!c || c.hp <= 0) continue;
    c.hp = Math.max(0, c.hp - ev.dmg);
    pushLog(residualMsg(c, ev), ev.who === "player" ? "enemy" : "player");
    // Leech Seed: odsáté HP připiš druhé straně.
    if (ev.drainTo) {
      const healer = ev.drainTo === "player" ? battle.player : battle.enemy;
      if (healer && healer.hp > 0) {
        const heal = Math.min(ev.dmg, healer.stats.maxHp - healer.hp);
        if (heal > 0) healer.hp += heal;
      }
    }
    if (c.hp <= 0) {
      handleFaint(ev.who === "player" ? "enemy" : "player");
      break;
    }
  }
  tickFieldTimers();
}

/**
 * Odehraje jedno kolo z hotových akcí obou stran. Akce může být `null` (daná
 * strana v tomto kole neútočí – např. hráč místo útoku prohodil Pokémona nebo
 * hodil ball). Pořadí řeší priority tahu a rychlost; zásahy se vrací volajícímu,
 * který je po překreslení scény vydá jako BATTLE_HIT (plovoucí „-N").
 * @param {{ player: object|null, enemy: object|null }} actions
 * @returns {{ side: "enemy"|"player", dmg: number }[]}
 */
function runActions(actions) {
  const order =
    actions.player && actions.enemy
      ? turnOrder(actions)
      : actions.player
        ? ["player"]
        : ["enemy"];

  const hits = [];
  for (const who of order) {
    if (battle.result) break;
    if (!actions[who]) continue;
    const attacker = who === "player" ? battle.player : battle.enemy;
    const defender = who === "player" ? battle.enemy : battle.player;
    if (attacker.hp <= 0) continue; // padl v první půlce kola – druhou už neodehraje
    const { dmg, crit } = useMove(attacker, defender, actions[who]);
    if (dmg > 0)
      hits.push({
        side: who === "player" ? "enemy" : "player",
        dmg,
        crit,
        category: actions[who].move?.category ?? "physical",
      });
    // Whirlwind/Roar vyfoukl divokého nepřítele – nové setkání, konec kola.
    if (battle._blowAway) {
      battle._blowAway = false;
      replaceEnemyBlownAway();
      break;
    }
    if (defender.hp <= 0) {
      handleFaint(who); // obránce padl – vítěz je útočník
      break;
    } else if (attacker.hp <= 0) {
      // Útočník se sám sundal (recoil / zásah ve zmatení) → vítěz je obránce.
      handleFaint(who === "player" ? "enemy" : "player");
      break;
    }
  }
  return hits;
}

/** Vydá posbírané zásahy kola jako BATTLE_HIT (po překreslení scény). */
function flushHits(hits) {
  for (const h of hits) bus.emit(EVENTS.BATTLE_HIT, h);
}

/* --- Sekvenční (krokové) odehrání manuálního kola --------------------------
 * Na rozdíl od auto tiku, kde obě strany udeří naráz, chceme v manuálu vidět
 * nejdřív tah rychlejšího (dle turnOrder) i s jeho animací, po pauze teprve
 * druhého. Faint řešíme AŽ po animaci úderu, aby zabíjecí rána stihla doskok,
 * než scéna přejde na výsledkové okno. Po dobu odehrávání je `battle.resolving`
 * true, takže hráč nemůže vpálit další akci doprostřed kola. */

/** Pauza (ms) po úderu, ať doběhne animace útoku/zásahu, než přijde druhý tah. */
const MANUAL_STEP_HIT_MS = 650;
/** Kratší pauza, když se nic netrefilo (minutí / bez efektu). */
const MANUAL_STEP_MISS_MS = 350;
/** Doba faint animace (padlý klesne a zmizí), než se scéna přepne dál. */
const FAINT_ANIM_MS = 620;

/**
 * Spustí krokové odehrání manuálního kola z hotových akcí obou stran.
 * @param {{ player: object|null, enemy: object|null }} actions
 */
function resolveManualRound(actions) {
  const order =
    actions.player && actions.enemy
      ? turnOrder(actions)
      : actions.player
        ? ["player"]
        : ["enemy"];
  battle.resolving = true;
  runManualStep(order, 0, actions);
}

/**
 * Odehraje jeden tah v pořadí a naplánuje další (rekurzivně přes setTimeout).
 * @param {("player"|"enemy")[]} order
 * @param {number} i
 * @param {{ player: object|null, enemy: object|null }} actions
 */
function runManualStep(order, i, actions) {
  if (!battle) return;
  if (battle.result || battle.interlude) {
    battle.resolving = false;
    emit();
    return;
  }
  if (i >= order.length) {
    // Oba tahy odehrány – ještě konec kola (otrava/popálení), pak dořeš.
    runEndOfRound();
    return;
  }
  const who = order[i];
  if (!actions[who]) return runManualStep(order, i + 1, actions);
  const attacker = who === "player" ? battle.player : battle.enemy;
  const defender = who === "player" ? battle.enemy : battle.player;
  if (attacker.hp <= 0) return runManualStep(order, i + 1, actions); // padl v první půlce kola

  const { dmg, crit } = useMove(attacker, defender, actions[who]);
  const hit =
    dmg > 0
      ? {
          side: who === "player" ? "enemy" : "player",
          dmg,
          crit,
          category: actions[who].move?.category ?? "physical",
        }
      : null;
  emit(); // překreslí HP – sprity jsou pořád ve scéně
  if (hit) flushHits([hit]); // animace útoku/zásahu na čerstvém DOM

  // Whirlwind/Roar vyfoukl divokého nepřítele – nové setkání, konec kola.
  if (battle._blowAway) {
    battle._blowAway = false;
    replaceEnemyBlownAway();
    clearTimeout(stepTimer);
    stepTimer = setTimeout(() => {
      if (!battle) return;
      battle.resolving = false;
      emit();
    }, MANUAL_STEP_HIT_MS);
    return;
  }

  clearTimeout(stepTimer);
  stepTimer = setTimeout(() => {
    if (!battle) return;
    const defenderFainted = defender.hp <= 0;
    const attackerFainted = attacker.hp <= 0; // sebe-KO (recoil / zmatení)
    if (defenderFainted || attackerFainted) {
      // Padlý ještě je ve scéně – nejdřív přehraj faint animaci, teprve pak
      // vyhodnoť následek (výherní okno / nástup dalšího / porážka). Obránce má
      // přednost (zabíjecí rána); jinak padl sám útočník a vyhrává obránce.
      const faintSide = defenderFainted ? (who === "player" ? "enemy" : "player") : who;
      const winnerSide = defenderFainted ? who : who === "player" ? "enemy" : "player";
      bus.emit(EVENTS.BATTLE_FAINT, { side: faintSide });
      clearTimeout(stepTimer);
      stepTimer = setTimeout(() => {
        if (!battle) return;
        handleFaint(winnerSide); // manuál → nastaví interlude / nasadí dalšího / porážka
        battle.resolving = false;
        emit(); // teď se přepne scéna (výherní okno / nový bojovník)
      }, FAINT_ANIM_MS);
      return;
    }
    runManualStep(order, i + 1, actions);
  }, hit ? MANUAL_STEP_HIT_MS : MANUAL_STEP_MISS_MS);
}

/**
 * Konec manuálního kola: nejdřív Leftovers efekt, pak bojovníci se statusem (otrava/popálení) dostanou DoT.
 * Řeší se krokově (s plovoucím číslem a případnou faint animací), pak se kolo
 * uzavře (`resolving=false`).
 */
function runEndOfRound() {
  if (!battle) return;
  // Leftovers: obnov malou část HP na konci kola oběma stranám.
  applyLeftoversEffect(battle.player);
  applyLeftoversEffect(battle.enemy);
  // Residuální poškození (otrava/popálení + trap + Leech Seed) posbírej PŘED
  // odtikáním polních časovačů, ať se trap projeví ještě naposledy.
  const events = collectResiduals();
  tickFieldTimers();
  processResiduals(events, 0);
}

/**
 * Ubere residuální poškození jednomu eventu, přehraje číslo, a když cíl padne,
 * faint animaci + následek. Pak pokračuje na další; po vyřešení všech kolo uzavře.
 * @param {{ who: "player"|"enemy", dmg: number, label: string, drainTo?: string }[]} events
 * @param {number} k
 */
function processResiduals(events, k) {
  if (!battle) return;
  if (k >= events.length || battle.result || battle.interlude) {
    battle.resolving = false;
    emit();
    return;
  }
  const ev = events[k];
  const c = ev.who === "player" ? battle.player : battle.enemy;
  if (!c || c.hp <= 0) return processResiduals(events, k + 1);

  c.hp = Math.max(0, c.hp - ev.dmg);
  pushLog(residualMsg(c, ev), ev.who === "player" ? "enemy" : "player");
  // Leech Seed: odsáté HP připiš druhé straně.
  if (ev.drainTo) {
    const healer = ev.drainTo === "player" ? battle.player : battle.enemy;
    if (healer && healer.hp > 0) {
      const heal = Math.min(ev.dmg, healer.stats.maxHp - healer.hp);
      if (heal > 0) healer.hp += heal;
    }
  }
  emit();
  bus.emit(EVENTS.BATTLE_HIT, { side: ev.who, dmg: ev.dmg, category: "status", status: ev.label });

  clearTimeout(stepTimer);
  stepTimer = setTimeout(() => {
    if (!battle) return;
    if (c.hp <= 0) {
      bus.emit(EVENTS.BATTLE_FAINT, { side: ev.who });
      clearTimeout(stepTimer);
      stepTimer = setTimeout(() => {
        if (!battle) return;
        handleFaint(ev.who === "player" ? "enemy" : "player"); // vítěz = druhá strana
        battle.resolving = false;
        emit();
      }, FAINT_ANIM_MS);
      return;
    }
    processResiduals(events, k + 1);
  }, MANUAL_STEP_HIT_MS);
}

/**
 * Doplní PP tahů bojovníka podle upgradu PP regen v Poké Centru (auto battle,
 * po výhře). Každý neplný tah dostane aspoň 1 PP, nejvýš do maxPp.
 */
function restorePpAfterWin(combatant) {
  const pct = ppRegenPercent();
  if (pct <= 0) return;
  for (const m of combatant.ref.moves ?? []) {
    if (m.pp >= m.maxPp) continue;
    const restore = Math.max(1, Math.floor((m.maxPp * pct) / 100));
    m.pp = Math.min(m.maxPp, m.pp + restore);
  }
}

/**
 * Divoký nepřítel je vyfouknut (Whirlwind/Roar) → nové setkání BEZ odměny.
 * Na rozdíl od spawnNext() zachovává log (ať je „blown away" hláška vidět).
 */
function replaceEnemyBlownAway() {
  battle.enemy = spawnEnemy(battle.area);
  battle.background = pickBackground(battle.area);
  battle.turn = 0;
  pushLog(`A wild ${battle.enemy.name} appeared! (Lv ${battle.enemy.ref.level})`);
}

/** Nasadí dalšího divokého nepřítele (nové setkání) a zaloguje ho. */
function spawnNext() {
  battle.log = []; // log drží jen aktuální souboj – nové setkání začíná načisto
  // ~15 % šance, že místo divokého naskočí route trenér (jen na routách,
  // jen neporažený). battle.trainer už tu není (finish ho vynuloval).
  const routeTrainer = pickRouteTrainer(battle.area);
  if (routeTrainer) {
    beginRouteTrainer(routeTrainer);
    return;
  }
  battle.enemy = spawnEnemy(battle.area);
  battle.background = pickBackground(battle.area); // pozadí se mění souboj od souboje
  battle.turn = 0; // nové setkání (kvůli Quick/Timer Ball)
  pushLog(`A wild ${battle.enemy.name} appeared (Lv ${battle.enemy.ref.level})`);
}

/** Lehký snímek nepřítele pro výherní/chytací okno (přežije nasazení dalšího). */
function enemySnapshot(c) {
  return {
    speciesId: c.ref.speciesId,
    name: c.name,
    level: c.ref.level,
    shiny: !!c.ref.shiny,
    gender: c.ref.gender ?? null,
  };
}

/**
 * Po vítězství/chycení v MANUÁLNÍM módu nespouštíme rovnou další setkání:
 * souboj se pozastaví a UI ukáže „výherní okno" (interlude). Další soupeř
 * naskočí až tlačítkem Next (viz {@link nextEncounter}). V Auto módu (idle)
 * pokračujeme plynule dál. Vrací true, když jsme přešli do pauzy.
 */
function pauseForInterlude(interlude) {
  if (getAutoBattle()) {
    spawnNext();
    return false;
  }
  battle.interlude = interlude;
  battle.running = false;
  return true;
}

/** Zpracuje vyřazení – „winner“ je ten, kdo zasadil poslední ránu. */
function handleFaint(winner) {
  if (winner === "player") {
    // Trenérský souboj má vlastní tok (fronta soupeřů, odměna po posledním).
    if (battle.trainer) {
      handleTrainerEnemyDown();
      return;
    }
    const enemy = battle.enemy;
    let { xp, gold } = battleRewards(enemy.ref.level);
    // Full Auto = bezpečný idling (bez úbytku HP/PP) výměnou za jen zlomek odměn.
    if (getFullAuto()) {
      xp = Math.max(1, Math.floor(xp * FULL_AUTO_REWARD_MULT));
      gold = Math.max(1, Math.floor(gold * FULL_AUTO_REWARD_MULT));
    }
    // 💰 Yield linka z Trainer Boost Center násobí gold z opakovatelných soubojů
    // (i ve Full Auto). XP boost řeší centrálně grantXp. Bez budovy = ×1.
    gold = Math.max(1, Math.floor(gold * goldBoostMult()));
    // Auto battle → tahy se při plných slotech přepíšou samy; manuál → dozeptá se.
    const leveled = grantXp(battle.player.ref, xp, { auto: autoLoopActive() });
    // EV: aktivní jedinec dostane kanonický EV yield poraženého druhu (jako v hrách).
    // Platí i pro Auto/Full Auto (v plné výši – yieldy jsou malé a strop 252/510 je konečný).
    grantEvYield(battle.player.ref, enemy.ref.speciesId);
    const res = getState().resources;
    res.gold += gold;
    // Loot: datově řízené dropy z oblasti.
    const loot = rollLoot(battle.area);
    for (const d of loot) res[d.resource] = (res[d.resource] ?? 0) + d.amount;
    // TM drop: velmi malá šance (~1,5 %), že divoký souboj upustí náhodný TM
    // (jakýkoli z TM01–TM50). Uloží se jako item do res.items (viz tmSystem.js).
    let tmDrop = null;
    if (Math.random() < 0.015) {
      const tm = TMS[Math.floor(Math.random() * TMS.length)];
      if (tm) { grantTm(tm.num); tmDrop = tm; }
    }
    // Vejce: malá šance najít vejce druhu z oblasti (líhne se ve Školce).
    const egg = rollEggDrop(battle.area);
    commit();
    const lootMsg = loot.length ? `, ${loot.map((d) => `+${d.amount} ${lootLabel(d.resource)}`).join(", ")}` : "";
    pushLog(`${enemy.name} defeated! +${xp} XP, +${gold} gold${lootMsg}`, "player");
    if (egg) {
      const eggName = getSpecies(egg.speciesId)?.name ?? egg.speciesId;
      pushLog(`🥚 You found a ${eggName} Egg! Hatch it at the Day Care.`);
    }
    if (tmDrop) {
      pushLog(`💿 ${enemy.name} dropped TM${String(tmDrop.num).padStart(2, "0")} ${tmDrop.name}!`, "player");
    }
    if (leveled) {
      battle.player.stats = computeStats(battle.player.ref);
      battle.player.hp = battle.player.stats.maxHp;
      pushLog(`${battle.player.name} reached Lv ${battle.player.ref.level}!`, "player");
    } else if (getAutoBattle()) {
      // Auto battle mód: Poké Centrum doléčí část max HP po výhře (dle levelu).
      // V manuálním módu se NEléčí – HP se ztrácí a léčí se ručně v Poké Centru.
      const pct = healPercent();
      if (pct > 0 && battle.player.hp < battle.player.stats.maxHp) {
        const heal = Math.floor((battle.player.stats.maxHp * pct) / 100);
        if (heal > 0) {
          const before = battle.player.hp;
          battle.player.hp = Math.min(battle.player.stats.maxHp, battle.player.hp + heal);
          const gained = battle.player.hp - before;
          if (gained > 0) pushLog(`Center healed ${battle.player.name} for ${gained} HP`, "player");
        }
      }
    }
    // Auto battle: Centrum po výhře doplní i PP tahů (dle upgradu PP regen).
    // V manuálním módu se PP neobnovuje – léčí se ručně (Heal team).
    if (getAutoBattle()) restorePpAfterWin(battle.player);
    // Auto: rovnou další soupeř. Manuál: pauza a „výherní okno" s odměnou.
    pauseForInterlude({
      kind: "win",
      enemy: enemySnapshot(enemy),
      rewards: {
        xp,
        gold,
        loot, // [{ resource, amount }]
        egg: egg ? { speciesId: egg.speciesId } : null,
        leveled: !!leveled,
        newLevel: battle.player.ref.level,
      },
    });
  } else {
    pushLog(`${battle.player.name} fainted!`, "enemy");
    const faintedUid = battle.player.ref.uid;
    if (getRules().nuzlocke) {
      // Nuzlocke: permadeath – omdlelý jedinec navždy opouští tým i kolekci.
      const lostName = battle.player.name;
      releasePokemon(faintedUid); // odebere z týmu i kolekce (commit)
      pushLog(`💀 ${lostName} was lost forever (Nuzlocke).`, "enemy");
    }
    const team = getTeamPokemon();
    // Nastupuje další ŽIVÝ člen týmu. V Nuzlocke byl omdlelý odebrán, jinak ho
    // (hp=0) přeskočíme spolu s ostatními vyřazenými. Hledáme od začátku, ať to
    // funguje i po odebrání (indexy se posunou).
    let next = -1;
    for (let i = 0; i < team.length; i++) {
      if (team[i].uid === faintedUid) continue; // pro jistotu (non-nuzlocke)
      if (hpOf(team[i]) > 0) { next = i; break; }
    }
    if (next >= 0) {
      battle.teamCursor = next;
      battle.player = makeCombatant(team[next]);
      pushLog(`${battle.player.name} steps in`);
    } else {
      battle.result = "defeat";
      battle.running = false;
      pushLog("Your whole team has fainted. Defeat.", "enemy");
      // Věrný Kanto (Krok 10): prohra kdekoli v Lize = konec běhu a restart od
      // Lorelei. Vypnutím leagueActive se zase odemkne léčení v Poké Centru.
      if (battle.trainer && (battle.trainer.kind === "elite-four" || battle.trainer.kind === "champion")) {
        const p = getState().progress;
        if (p.leagueActive) {
          p.leagueActive = false;
          p.leagueStep = 0;
          commit();
          bus.emit(EVENTS.STORY_POPUP, {
            title: "The League bests you...",
            body: `<p class="story-text">Your team is spent. The League challenge ends here.</p>
              <p class="story-text">In the Pokémon League there is no second wind — the run <strong>resets to the very first challenger</strong>. Heal up at the Poké Center, restock your Bag with Potions and Revives, and come back to face the Elite Four again from the start.</p>`,
            okLabel: "Regroup",
          });
        }
      }
      // Story-gate trenér (např. první rival): stačí souboj ODEHRÁT, takže i
      // prohra odemkne návaznou oblast. Bez odměny – zapíšeme „prošlo" a navíc
      // story-flag „gateLost:<id>", ať UI (rivalView) ukáže prohru, ne výhru.
      if (battle.trainer?.gateOnFight) {
        const s = getState();
        if (!Array.isArray(s.progress.defeatedTrainers)) s.progress.defeatedTrainers = [];
        const wasNew = !s.progress.defeatedTrainers.includes(battle.trainer.id);
        if (wasNew) {
          s.progress.defeatedTrainers.push(battle.trainer.id);
        }
        if (!s.story) s.story = {};
        s.story[`gateLost:${battle.trainer.id}`] = true;
        commit();
        const rname = s.player?.rivalName?.trim() || battle.trainer.name;
        pushLog(`${rname} smirked at you and set off on their own journey...`, "enemy");
        // Jednorázový popup (jako u výhry, jen bez „porazil jsi ho") – navede hráče
        // pokračovat dál po mapě na sever. Prohra první rivala tě nezastaví.
        if (wasNew) {
          bus.emit(EVENTS.STORY_POPUP, {
            title: "The battle is lost...",
            body: `<p class="story-text">${rname}: "Heh, is that all you've got? Smell ya later!"</p>
              <p class="story-text">${rname} dashes off north, out of Pallet Town — you'll surely cross paths again somewhere down the road.</p>
              <p class="placeholder">➜ Head north on the map to continue your journey.</p>`,
          });
        }
      }
    }
  }
}

/* ----------------------------- Trenéři ----------------------------- */
/*
 * Trenérský souboj používá STEJNÝ engine jako divoký – jen `battle.trainer` drží
 * frontu soupeřů. Po každém KO nastupuje další Pokémon trenéra (žádné divoké
 * setkání), po posledním se trenér označí za poraženého (jednorázová odměna +
 * případný odznak). U trenérů NEJDE chytat. Gym trenéři se spouští z gym tabu
 * (startTrainerBattle), route trenéři naskočí ~15 % místo divokého (spawnNext).
 */

/** Druh Pokémona trenéra (vyřeší counter-startera dle hráčova startera). */
function resolveTrainerSpecies(mon) {
  if (mon?.counterStarterFinal) {
    const starter = getStarterSpeciesId();
    return COUNTER_STARTER_FINAL[starter] ?? "pidgeot"; // fallback, kdyby starter chyběl
  }
  if (mon?.counterStarterMid) {
    const starter = getStarterSpeciesId();
    return COUNTER_STARTER_MID[starter] ?? "pidgeotto"; // fallback, kdyby starter chyběl
  }
  if (mon?.counterStarter) {
    const starter = getStarterSpeciesId();
    return COUNTER_STARTER[starter] ?? "pidgey"; // fallback, kdyby starter chyběl
  }
  return mon.speciesId;
}

/** Hlavní útočný stat druhu (physical vs special) dle base statů. */
function offenseStatOf(speciesId) {
  const bs = getSpecies(speciesId)?.baseStats ?? {};
  return (bs.attack ?? 0) >= (bs.spAttack ?? 0) ? "attack" : "spAttack";
}

/** Sestaví opts pro createPokemon dle odstupňované obtížnosti trenéra. */
function buildTrainerOpts(trainer, speciesId) {
  const diff = trainerDifficulty(trainer);
  const opts = {};
  if (diff.ivFixed != null) {
    opts.ivs = {};
    for (const k of STAT_KEYS) opts.ivs[k] = diff.ivFixed;
  }
  if (diff.evOffense || diff.evSpeed) {
    const offenseKey = offenseStatOf(speciesId);
    const evs = {};
    for (const k of STAT_KEYS) evs[k] = 0;
    evs[offenseKey] = Math.min(252, diff.evOffense);
    evs.speed = Math.min(252, diff.evSpeed);
    opts.evs = evs;
  }
  if (diff.optimizeNature) {
    const offenseKey = offenseStatOf(speciesId);
    const nat = NATURES.find(
      (n) => n.up === offenseKey && n.down && n.down !== offenseKey && n.down !== "hp"
    );
    if (nat) opts.nature = nat.id;
  }
  return opts;
}

/** Vytvoří combatanta pro Pokémona trenéra na dané pozici fronty. */
function spawnTrainerMon(trainer, index) {
  const mon = trainer.team[index];
  const speciesId = resolveTrainerSpecies(mon);
  const opts = buildTrainerOpts(trainer, speciesId);
  markSeen(speciesId);
  const owned = createPokemon(speciesId, mon.level, opts);
  // Volitelné konkrétní tahy trenéra (jinak defaultMovesFor z createPokemon).
  if (Array.isArray(mon.moves) && mon.moves.length) {
    const set = mon.moves
      .map((id) => {
        const mv = getMove(id);
        return mv ? { id, pp: mv.pp ?? 0, maxPp: mv.pp ?? 0 } : null;
      })
      .filter(Boolean);
    if (set.length) {
      owned.moves = set;
      owned.hp = computeStats(owned).maxHp;
    }
  }
  return makeCombatant(owned);
}

/** Runtime kopie trenéra do battle.trainer (drží frontu + kurzor). U procedurálních
 * (route) trenérů se tým vygeneruje ČERSTVĚ teď (resolveTrainerTeam) a odměna se
 * dopočítá z něj; fixní trenéři (gym/leader/rival) mají tým i odměnu napevno. */
function makeTrainerState(trainer, { gymId = null, returnToWild = false } = {}) {
  const { team, reward } = resolveTrainerTeam(trainer);
  return {
    id: trainer.id,
    name: trainer.name,
    class: trainer.class,
    kind: trainer.kind,
    // Sprite se losuje JEDNOU tady (per-battle kopie), aby byl stálý napříč tiky
    // a nový každý souboj (leader má 1 sprite → varianta se nepoužije).
    spriteVariant: randomTrainerVariant(trainer.class),
    reward,
    badge: trainer.badge ?? null,
    // Story-gate: odemyká cílovou oblast už odehráním souboje (výhra i prohra).
    gateOnFight: !!trainer.gateOnFight,
    team,
    cursor: 0,
    gymId,
    returnToWild,
  };
}

/**
 * Spustí souboj proti konkrétnímu trenérovi (gym tab). Manuální i auto mód
 * ho zvládnou; chytání je vypnuté. `gymId` = kontext gymu (návrat do gym tabu).
 * @param {string} trainerId
 * @param {{ gymId?: string|null }} [opts]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function startTrainerBattle(trainerId, { gymId = null, forceManual = false } = {}) {
  const trainer = getTrainer(trainerId);
  if (!trainer) return { ok: false, reason: "Unknown trainer." };
  const team = getTeamPokemon();
  if (team.length === 0) return { ok: false, reason: "You have no Pokémon in your team." };
  const firstAlive = team.findIndex((p) => hpOf(p) > 0);
  if (firstAlive < 0) {
    return { ok: false, reason: "Your whole team has fainted — heal at the Poké Center." };
  }
  const area = getActiveArea();
  battle = {
    running: true,
    log: [],
    area,
    teamCursor: firstAlive,
    turn: 0,
    result: null,
    background: pickBackground(area),
    interlude: null,
    resolving: false,
    weather: null,
    tailwind: { player: 0, enemy: 0 },
    player: makeCombatant(team[firstAlive]),
    enemy: null,
    trainer: makeTrainerState(trainer, { gymId, returnToWild: false }),
    // Gym i Rocket gauntlet souboje jsou POVINNĚ manuální – auto battle je v nich zakázané.
    forceManual: !!gymId || forceManual,
  };
  battle.enemy = spawnTrainerMon(battle.trainer, 0);
  if (trainer.quote) pushLog(`${trainer.name}: ${trainer.quote}`);
  pushLog(`${trainer.name} sent out ${battle.enemy.name}!`, "enemy");
  emit();
  schedule();
  return { ok: true };
}

/* ----------------------------- Pokémon League ----------------------------- */
/*
 * Liga (Elite Four + Champion) = zvláštní gauntlet na Indigo Plateau: souboje
 * jdou JEDEN ZA DRUHÝM, mezi nimi se NELZE léčit v Poké Centru (healTeam je
 * během běhu zablokovaný – jen bag itemy), HP se přenáší (owned.hp je trvalé).
 * Prohra kdekoli v sekvenci = konec běhu a restart od Lorelei. Běh drží
 * progress.leagueActive + progress.leagueStep; postup a payoff řeší
 * finishTrainerBattle / handleFaint. UI = src/ui/leagueView.js.
 */

/** Stav Ligy pro aktuální oblast (nebo null, když tu Liga není). */
export function leagueState() {
  const league = leagueForArea(getActiveArea()?.id);
  if (!league) return null;
  const p = getState().progress;
  return {
    league,
    active: !!p.leagueActive,
    step: p.leagueStep ?? 0,
    cleared: !!getState().story?.[league.clearFlag],
  };
}

/** Zahájí nový běh Ligy (od Lorelei). Ověří živý tým. */
export function startLeagueRun() {
  const st = leagueState();
  if (!st) return { ok: false, reason: "There is no League here." };
  const team = getTeamPokemon();
  if (!team.some((p) => hpOf(p) > 0)) {
    return { ok: false, reason: "Your whole team has fainted — heal before the League." };
  }
  const p = getState().progress;
  p.leagueActive = true;
  p.leagueStep = 0;
  commit();
  return startTrainerBattle(st.league.order[0], { forceManual: true });
}

/** Pokračuje v běžícím běhu Ligy dalším soupeřem v pořadí. */
export function continueLeagueRun() {
  const st = leagueState();
  if (!st || !st.active) return { ok: false, reason: "No League challenge is in progress." };
  const id = st.league.order[st.step];
  if (!id) return { ok: false, reason: "The League has already been cleared." };
  return startTrainerBattle(id, { forceManual: true });
}

/** Vzdá běh Ligy (umožní zase léčení v Centru). Postup se zahodí. */
export function forfeitLeagueRun() {
  const p = getState().progress;
  p.leagueActive = false;
  p.leagueStep = 0;
  commit();
  return { ok: true };
}

/** Vybere route trenéra pro oblast (~15 %, jen neporažené, jen na routách). */
function pickRouteTrainer(area) {
  if (!area || area.type !== "route") return null;
  if (Math.random() >= ROUTE_TRAINER_CHANCE) return null;
  const defeated = getState().progress?.defeatedTrainers ?? [];
  const pool = routeTrainersFor(area.id).filter((t) => !defeated.includes(t.id));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Nasadí route trenéra místo divokého setkání (v rámci wild loopu). */
function beginRouteTrainer(trainer) {
  battle.trainer = makeTrainerState(trainer, { returnToWild: true });
  battle.enemy = spawnTrainerMon(battle.trainer, 0);
  battle.background = pickBackground(battle.area);
  battle.turn = 0;
  if (trainer.quote) pushLog(`${trainer.name}: ${trainer.quote}`);
  pushLog(`Trainer ${trainer.name} wants to battle! Sent out ${battle.enemy.name}!`, "enemy");
}

/**
 * Padl Pokémon trenéra (hráč vyhrál kolo). Udělí XP za KO (bez wild loot/gold),
 * a buď nasadí dalšího z fronty, nebo trenéra dokončí. Volá se z handleFaint.
 */
function handleTrainerEnemyDown() {
  const t = battle.trainer;
  const enemy = battle.enemy;
  const { xp } = battleRewards(enemy.ref.level);
  const leveled = grantXp(battle.player.ref, xp, { auto: getAutoBattle() });
  // EV yield i z trenérových Pokémonů (kanonicky se počítají stejně jako divocí).
  grantEvYield(battle.player.ref, enemy.ref.speciesId);
  commit();
  pushLog(`${enemy.name} fainted! +${xp} XP`, "player");
  if (leveled) {
    // Recompute statů, ale BEZ full-healu uprostřed trenérského souboje (obtížnost).
    battle.player.stats = computeStats(battle.player.ref);
    battle.player.hp = Math.min(battle.player.hp, battle.player.stats.maxHp);
    pushLog(`${battle.player.name} reached Lv ${battle.player.ref.level}!`, "player");
  }
  if (t.cursor + 1 < t.team.length) {
    t.cursor++;
    battle.enemy = spawnTrainerMon(t, t.cursor);
    battle.turn = 0;
    pushLog(`${t.name} sent out ${battle.enemy.name}!`, "enemy");
    // Pokračuje se dál: manuál ukáže povelové menu (running, bez interlude),
    // auto navazuje dalším tikem. Caller po návratu udělá emit().
  } else {
    finishTrainerBattle(t, enemy);
  }
}

/** Trenér poražen: jednorázová odměna (gold + odznak), evidence, interlude/konec. */
function finishTrainerBattle(t, lastEnemy) {
  const s = getState();
  if (!Array.isArray(s.progress.defeatedTrainers)) s.progress.defeatedTrainers = [];
  const already = s.progress.defeatedTrainers.includes(t.id);
  let goldGain = 0;
  let badgeGain = null;
  if (!already) {
    s.progress.defeatedTrainers.push(t.id);
    goldGain = t.reward ?? 0;
    if (goldGain) s.resources.gold += goldGain;
    if (t.badge) {
      if (!Array.isArray(s.progress.badges)) s.progress.badges = [];
      if (!s.progress.badges.includes(t.badge)) {
        s.progress.badges.push(t.badge);
        badgeGain = t.badge;
      }
    }
    // Kanonická TM odměna od gym leadera (jednorázově se ziskem odznaku).
    // Např. Brock → TM34 Bide, Misty → TM11 Bubble Beam, Surge → TM24 Thunderbolt.
    if (badgeGain && TM_BY_BADGE[badgeGain] != null) {
      const tmNum = TM_BY_BADGE[badgeGain];
      grantTm(tmNum);
      const tmObj = getTm(tmNum);
      if (tmObj) {
        pushLog(`${t.name} gave you TM${String(tmNum).padStart(2, "0")} ${tmObj.name}!`, "player");
      }
    }
    // Věrný Kanto (Krok 1): první rival poražen v Pallet Townu → uteče na sever
    // z města; popup navádí hráče pokračovat dál po mapě. Jednorázově (!already).
    if (t.id === "rival-pallet") {
      const rname = s.player?.rivalName?.trim() || t.name;
      bus.emit(EVENTS.STORY_POPUP, {
        title: "🔥 You beat your Rival!",
        body: `<p class="story-text">${rname}: "...Heh! Not bad at all. But I'm still gonna be the world's greatest Pokémon trainer — you'll see!"</p>
          <p class="story-text">${rname} dashes off north, out of Pallet Town. You'll surely cross paths again somewhere down the road...</p>
          <p class="placeholder">➜ Head north on the map to continue your journey.</p>`,
      });
    }
    // Věrný Kanto: první zisk Boulder Badge (Brock) = drobná odměna + gratulace
    // v samostatném okně (info o otevřené Route 3). Jednorázově (story flag).
    if (badgeGain === "boulder-badge") {
      if (!s.story) s.story = {};
      if (!s.story.brockCleared) {
        s.story.brockCleared = true;
        const BROCK_GOLD = 500;
        const BROCK_BALLS = 5;
        s.resources.gold += BROCK_GOLD;
        goldGain += BROCK_GOLD; // ať se objeví i v přehledu výhry
        if (!s.resources.balls) s.resources.balls = {};
        s.resources.balls.poke = (s.resources.balls.poke ?? 0) + BROCK_BALLS;
        pushLog(`Brock's gift: +${BROCK_BALLS}× Poké Ball!`, "player");
        bus.emit(EVENTS.STORY_POPUP, {
          title: "🥇 Boulder Badge!",
          body: `<p class="story-text">Brock: "I took you for granted... As proof of your victory, here is the <strong>Boulder Badge</strong>!"</p>
            <p class="story-text">He also hands you a small reward — <strong>${BROCK_BALLS}× Poké Ball</strong> and some prize money.</p>
            <p class="story-text">The path <strong>east to Route 3</strong> (toward Mt. Moon) is open now. Good luck out there!</p>`,
          okLabel: "Onward!",
        });
      }
    }
    // Věrný Kanto (Krok 6): první zisk Thunder Badge (Lt. Surge) = drobná odměna
    // + gratulace v okně (rozcestí Route 11/Diglett's vs Route 9 → Lavender).
    if (badgeGain === "thunder-badge") {
      if (!s.story) s.story = {};
      if (!s.story.surgeCleared) {
        s.story.surgeCleared = true;
        const SURGE_GOLD = 800;
        s.resources.gold += SURGE_GOLD;
        goldGain += SURGE_GOLD; // ať se objeví i v přehledu výhry
        bus.emit(EVENTS.STORY_POPUP, {
          title: "⚡ Thunder Badge!",
          body: `<p class="story-text">Lt. Surge grins and slaps you on the back. "Whew! You're the real deal, kid. Take the <strong>Thunder Badge</strong> — you earned it!"</p>
            <p class="story-text">It boosts your Pokémon's Speed, and even traded Pokémon up to Lv. 50 will now obey you.</p>
            <p class="story-text">From here the road forks: <strong>Route 11</strong> and <strong>Diglett's Cave</strong> lead west, while <strong>Route 9</strong> heads toward <strong>Rock Tunnel</strong> and on to <strong>Lavender Town</strong>.</p>`,
          okLabel: "Onward!",
        });
      }
    }
    // Věrný Kanto (Krok 7): první zisk Rainbow Badge (Erika, Celadon Gym) = odměna
    // + navedení na Game Corner, za nímž se skrývá Team Rocket (Silph Scope).
    if (badgeGain === "rainbow-badge") {
      if (!s.story) s.story = {};
      if (!s.story.erikaCleared) {
        s.story.erikaCleared = true;
        const ERIKA_GOLD = 1000;
        s.resources.gold += ERIKA_GOLD;
        goldGain += ERIKA_GOLD; // ať se objeví i v přehledu výhry
        bus.emit(EVENTS.STORY_POPUP, {
          title: "🌈 Rainbow Badge!",
          body: `<p class="story-text">Erika smiles serenely. "Oh! I concede defeat. You are quite skilled — please accept the <strong>Rainbow Badge</strong>."</p>
            <p class="story-text">It lets even traded Pokémon up to Lv. 70 obey you.</p>
            <p class="story-text">Word around Celadon is that shady <strong>Team Rocket</strong> members lurk behind the <strong>Game Corner</strong>. Something's not right there...</p>`,
          okLabel: "Investigate",
        });
      }
    }
    // Věrný Kanto (Krok 11): první zisk Marsh Badge (Sabrina, Saffron Gym) = odměna
    // + gratulace. Gym se otevřel až po osvobození Silph Co od Team Rocket (silphCleared).
    if (badgeGain === "marsh-badge") {
      if (!s.story) s.story = {};
      if (!s.story.sabrinaCleared) {
        s.story.sabrinaCleared = true;
        const SABRINA_GOLD = 1800;
        s.resources.gold += SABRINA_GOLD;
        goldGain += SABRINA_GOLD; // ať se objeví i v přehledu výhry
        bus.emit(EVENTS.STORY_POPUP, {
          title: "🔮 Marsh Badge!",
          body: `<p class="story-text">Sabrina's stern gaze softens. "I foresaw my own defeat... and yet you still surprised me. Take the <strong>Marsh Badge</strong> — you have more than earned it."</p>
            <p class="story-text">It makes even traded Pokémon obey you and lets you use HM Flash outside of battle.</p>
            <p class="story-text">With Team Rocket driven from Silph Co. and Saffron at peace, the rest of Kanto's Gyms await. Press on toward your eighth and final badge!</p>`,
          okLabel: "Onward!",
        });
      }
    }
    // Věrný Kanto (Krok 8): první zisk Soul Badge (Koga, Fuchsia Gym) = odměna
    // + navedení do Safari Zone (za HM03 Surf) a k Wardenovi (Gold Teeth → Strength).
    if (badgeGain === "soul-badge") {
      if (!s.story) s.story = {};
      if (!s.story.kogaCleared) {
        s.story.kogaCleared = true;
        const KOGA_GOLD = 1500;
        s.resources.gold += KOGA_GOLD;
        goldGain += KOGA_GOLD; // ať se objeví i v přehledu výhry
        bus.emit(EVENTS.STORY_POPUP, {
          title: "🥷 Soul Badge!",
          body: `<p class="story-text">Koga vanishes in a puff of smoke, then reappears behind you. "A ninja must withstand a barrage of poison. You have proven your worth — take the <strong>Soul Badge</strong>."</p>
            <p class="story-text">It boosts your Pokémon's Defense and lets traded Pokémon up to Lv. 70 obey you.</p>
            <p class="story-text">The nearby <strong>Safari Zone</strong> teems with rare Pokémon — and rumor says a valuable <strong>HM</strong> is hidden inside. Next door, the <strong>Warden</strong> keeps mumbling about his lost <strong>Gold Teeth</strong>...</p>`,
          okLabel: "To the Safari Zone!",
        });
      }
    }
    // Věrný Kanto (Krok 9): první zisk Volcano Badge (Blaine, Cinnabar Gym) = odměna
    // + navedení zpět do Viridian Gymu (poslední, 8. odznak – Giovanni) a k Victory Road.
    if (badgeGain === "volcano-badge") {
      if (!s.story) s.story = {};
      if (!s.story.blaineCleared) {
        s.story.blaineCleared = true;
        const BLAINE_GOLD = 2000;
        s.resources.gold += BLAINE_GOLD;
        goldGain += BLAINE_GOLD; // ať se objeví i v přehledu výhry
        bus.emit(EVENTS.STORY_POPUP, {
          title: "🌋 Volcano Badge!",
          body: `<p class="story-text">Blaine wipes his brow, beaming. "Hah! You've quenched my fire! You've more than earned the <strong>Volcano Badge</strong>!"</p>
            <p class="story-text">It raises your Pokémon's Special stat. Just one badge to go!</p>
            <p class="story-text">The <strong>Viridian City Gym</strong> has finally reopened — its mysterious Leader awaits your challenge for the eighth and final Kanto badge.</p>`,
          okLabel: "Onward!",
        });
      }
    }
    // Věrný Kanto (Krok 10): první zisk Earth Badge (Giovanni, Viridian Gym) =
    // 8. a poslední odznak. Giovanni se odhalí jako šéf Team Rocket, rozpustí gang
    // a odejde – otevře se cesta Route 22 → Victory Road → Indigo Plateau (Liga).
    if (badgeGain === "earth-badge") {
      if (!s.story) s.story = {};
      if (!s.story.giovanniCleared) {
        s.story.giovanniCleared = true;
        const GIO_GOLD = 3000;
        s.resources.gold += GIO_GOLD;
        goldGain += GIO_GOLD; // ať se objeví i v přehledu výhry
        bus.emit(EVENTS.STORY_POPUP, {
          title: "🌍 Earth Badge!",
          body: `<p class="story-text">Giovanni stares in disbelief. "Ha! That was a truly intense fight. You have won. As proof, here is the <strong>Earth Badge</strong>."</p>
            <p class="story-text">Then he laughs coldly. "I am also the leader of <strong>Team Rocket</strong>. But you have beaten me... so I disband Team Rocket forever! I must become a true Pokémon trainer once more." With that, he vanishes — and the Gym stands empty.</p>
            <p class="story-text">That's all <strong>8 Kanto badges</strong>! The road west through <strong>Route 22</strong> and <strong>Victory Road</strong> to the <strong>Indigo Plateau</strong> — home of the <strong>Pokémon League</strong> — is finally open. This is it. Give it everything!</p>`,
          okLabel: "To the League!",
        });
      }
    }
    // Věrný Kanto: gauntlet (fronta soupeřů vázaná na oblast) – poražení VŠECH
    // členů odemkne postup (clearFlag) + jednorázový bonus/item/flag a payoff popup.
    // Členství řešíme přes trainerIds (ne přes t.kind), ať to platí i pro Hikery.
    {
      if (!s.story) s.story = {};
      const gaunt = rocketGauntletForArea(getActiveArea()?.id);
      if (gaunt && gaunt.trainerIds.includes(t.id) && !s.story[gaunt.clearFlag]) {
        const allBeaten = gaunt.trainerIds.every((id) => s.progress.defeatedTrainers.includes(id));
        if (allBeaten) {
          s.story[gaunt.clearFlag] = true;
          const bonus = gaunt.clearReward?.gold ?? 0;
          if (bonus) {
            s.resources.gold += bonus;
            goldGain += bonus; // ať se objeví i v přehledu výhry
          }
          if (gaunt.clearItem) {
            if (!s.resources.items) s.resources.items = {};
            s.resources.items[gaunt.clearItem] = (s.resources.items[gaunt.clearItem] ?? 0) + 1;
          }
          if (gaunt.clearStoryFlag) s.story[gaunt.clearStoryFlag] = true;

          if (gaunt.id === "mt-moon-rockets") {
            bus.emit(EVENTS.STORY_POPUP, {
              title: "🚫 Team Rocket driven out!",
              body: `<p class="story-text">The last grunt scrambles away into the dark: "You haven't seen the last of Team Rocket!"</p>
                <p class="story-text">With the thugs gone, the tunnel deeper into Mt. Moon is clear at last.</p>
                ${bonus ? `<p class="story-text">You recover <strong>${bonus}₽</strong> the grunts had stolen.</p>` : ""}
                <p class="story-text">The path onward to <strong>Route 4</strong> and Cerulean City is open now.</p>`,
              okLabel: "Onward!",
            });
          } else if (gaunt.id === "route-09-hikers") {
            // Věrný Kanto (Krok 7): Flash dá Oakův pomocník až po poražení Hikerů
            // A po registraci 10 druhů. Když druhů zatím není dost, Flash dostaneš
            // až při návratu na Route 9 (viz setActiveArea) – žádný soft-lock.
            const caught = dexCounts().caught;
            if (caught >= 10 && !s.story.hasFlash) {
              s.story.hasFlash = true;
              if (!s.resources.items) s.resources.items = {};
              s.resources.items["hm05-flash"] = (s.resources.items["hm05-flash"] ?? 0) + 1;
              pushLog("Oak's aide gave you HM05 Flash!", "player");
              bus.emit(EVENTS.STORY_POPUP, {
                title: "🔦 HM05 Flash!",
                body: `<p class="story-text">As the last Hiker yields, one of <strong>Professor Oak's aides</strong> steps out from the nearby rest house. "You beat the Route 9 Hikers AND registered 10 kinds of Pokémon — impressive!"</p>
                  <p class="story-text">He rewards your dedication with <strong>HM05 Flash</strong>. It lights up pitch-dark caves like <strong>Rock Tunnel</strong>.</p>
                  <p class="story-text">The way through Rock Tunnel toward <strong>Lavender Town</strong> is open now.</p>`,
                okLabel: "Onward!",
              });
            } else {
              bus.emit(EVENTS.STORY_POPUP, {
                title: "⛏️ Hikers defeated!",
                body: `<p class="story-text">You've cleared out the tough Route 9 Hikers! Oak's aide is impressed — but crosses his arms.</p>
                  <p class="story-text">"HM05 Flash is for serious trainers. Come back once you've caught <strong>10 kinds</strong> of Pokémon."</p>
                  <p class="story-text">You've registered <strong>${caught}/10</strong> so far. Return to <strong>Route 9</strong> when you're ready.</p>
                  ${bonus ? `<p class="story-text">Prize money: <strong>${bonus}₽</strong>.</p>` : ""}`,
                okLabel: "Got it",
              });
            }
          } else if (gaunt.id === "rocket-hideout") {
            bus.emit(EVENTS.STORY_POPUP, {
              title: "👁️ Silph Scope!",
              body: `<p class="story-text">Giovanni retreats: "So you're the meddler who keeps interfering... We <em>will</em> meet again." Team Rocket abandons the Celadon hideout.</p>
                <p class="story-text">Among the loot you find the <strong>Silph Scope</strong> — a device that reveals unidentified ghosts.</p>
                <p class="story-text">Now head to <strong>Lavender Town's Pokémon Tower</strong> and face whatever haunts its top floors.</p>
                ${bonus ? `<p class="story-text">You recover <strong>${bonus}₽</strong>.</p>` : ""}`,
              okLabel: "To the Tower!",
            });
          } else if (gaunt.id === "cinnabar-mansion") {
            // Věrný Kanto (Krok 9): po vyčištění gauntletu (Burglaři + boss Volk) v
            // trezoru najdeš Secret Key (clearItem/clearStoryFlag už udělily výše).
            bus.emit(EVENTS.STORY_POPUP, {
              title: "🔑 Secret Key!",
              body: `<p class="story-text">Scientist Volk collapses beside a scorched terminal: "The Mewtwo data... gone... it was never meant to leave this place."</p>
                <p class="story-text">In the cracked vault behind him glints the <strong>Secret Key</strong> — the very key that unlocks the Cinnabar Island Gym.</p>
                <p class="story-text">Head to the <strong>Cinnabar Gym</strong> and challenge <strong>Blaine</strong> for the Volcano Badge!</p>
                ${bonus ? `<p class="story-text">You also pocket <strong>${bonus}₽</strong> from the labs.</p>` : ""}`,
              okLabel: "To the Gym!",
            });
          } else if (gaunt.id === "silph-co") {
            // Věrný Kanto (Krok 11): po vyčištění Silph Co (grunti → rival →
            // Giovanni) osvobodíš prezidenta Silph Co, který ti věnuje MASTER BALL
            // (je to Poké Ball, ne item → sype se do resources.balls, ne clearItem).
            // Team Rocket opouští Saffron → Sabrinin gym se otevře (silphCleared).
            if (!s.resources.balls) s.resources.balls = {};
            s.resources.balls.master = (s.resources.balls.master ?? 0) + 1;
            pushLog("The Silph Co. president gave you a Master Ball!", "player");
            bus.emit(EVENTS.STORY_POPUP, {
              title: "🟣 Master Ball!",
              body: `<p class="story-text">On the top floor Giovanni retreats once more: "Rrgh! Team Rocket... falls back — for now. We <em>will</em> rise again!" The Rockets flee Silph Co. and abandon Saffron City.</p>
                <p class="story-text">The grateful <strong>president of Silph Co.</strong> emerges from hiding. "You saved my company! Please — take our finest creation." He hands you a <strong>Master Ball</strong> — the one ball that catches <em>any</em> Pokémon without fail. Spend it wisely.</p>
                <p class="story-text">With the Rockets gone, <strong>Sabrina's Gym</strong> has reopened. Challenge her for the <strong>Marsh Badge</strong>!</p>
                ${bonus ? `<p class="story-text">You also recover <strong>${bonus}₽</strong> from the offices.</p>` : ""}`,
              okLabel: "To the Gym!",
            });
          }
        }
      }
    }
    // Věrný Kanto: souboj s rivalem na S.S. Anne – výhra dá HM01 Cut (od kapitána)
    // a odemkne kácení stromu před Vermilion Gymem. Jednorázově (story flag).
    if (t.id === "rival-ss-anne") {
      if (!s.story) s.story = {};
      if (!s.story.ssAnneCleared) {
        s.story.ssAnneCleared = true;
        s.story.hasCut = true;
        s.story.hasFly = true;
        if (!s.resources.items) s.resources.items = {};
        s.resources.items["hm01-cut"] = (s.resources.items["hm01-cut"] ?? 0) + 1;
        // HM02 Fly: kapitán (téma cestování) přidá i letecký HM. HM je znovupoužitelný
        // (nespotřebuje se), Fly je čistě bojový dvoutahový Flying útok – ne cestování.
        if ((s.resources.items["hm02-fly"] ?? 0) < 1) s.resources.items["hm02-fly"] = 1;
        pushLog("The S.S. Anne captain gave you HM01 Cut and HM02 Fly!", "player");
        bus.emit(EVENTS.STORY_POPUP, {
          title: "🌿 HM01 Cut & 🕊️ HM02 Fly!",
          body: `<p class="story-text">With the rival gone, you help the ship's seasick captain feel better. Grateful, he hands you two Hidden Machines.</p>
            <p class="story-text">You received <strong>HM01 Cut</strong>! It can slice down small trees blocking the way.</p>
            <p class="story-text">You also received <strong>HM02 Fly</strong>! A powerful two-turn Flying-type attack that compatible Pokémon can learn.</p>
            <p class="story-text">A leafy tree was blocking the <strong>Vermilion Gym</strong> — now you can cut it down and challenge <strong>Lt. Surge</strong>!</p>`,
          okLabel: "Onward!",
        });
      }
    }
    // Věrný Kanto (Krok 7): duch v Pokémon Tower je rozzuřená Marowak. Se Silph
    // Scope ji odhalíš a uklidníš (souboj) → uvolní se cesta výš k Mr. Fujimu.
    if (t.id === "lavender-marowak") {
      if (!s.story) s.story = {};
      if (!s.story.marowakCalmed) {
        s.story.marowakCalmed = true;
        bus.emit(EVENTS.STORY_POPUP, {
          title: "👻 The ghost is calmed",
          body: `<p class="story-text">With the Silph Scope, the ghost is revealed at last: the spirit of a <strong>Marowak</strong>, slain by Team Rocket while protecting her child.</p>
            <p class="story-text">You lay her restless spirit to rest. The way up Pokémon Tower is clear.</p>
            <p class="story-text">Climb to the top floor — the Rockets are holding an old man, <strong>Mr. Fuji</strong>, captive up there.</p>`,
          okLabel: "Climb up",
        });
      }
    }
    // Věrný Kanto (Krok 7): obří spící Snorlax na Route 12. Poké Flute ho probudí
    // a po souboji uvolní cestu dál na jih (story.snorlaxCleared).
    if (t.id === "lavender-snorlax") {
      if (!s.story) s.story = {};
      if (!s.story.snorlaxCleared) {
        s.story.snorlaxCleared = true;
        bus.emit(EVENTS.STORY_POPUP, {
          title: "😴 Snorlax awakened!",
          body: `<p class="story-text">The Poké Flute's melody rouses the enormous <strong>Snorlax</strong> — and after a fierce battle, it lumbers off the road.</p>
            <p class="story-text">The southern path from <strong>Route 12</strong> is open at last, leading deeper into Kanto.</p>`,
          okLabel: "Onward!",
        });
      }
    }
  }
  // Věrný Kanto (Krok 10): postup Ligou (Elite Four → Champion). Běží MIMO blok
  // `!already`, ať funguje i při odvetě. Posune leagueStep jen když je běh aktivní
  // a padl právě očekávaný soupeř (order[step]). Po Championovi Liga končí titulem.
  {
    const league = leagueForArea(getActiveArea()?.id);
    if (league && s.progress.leagueActive) {
      const step = s.progress.leagueStep ?? 0;
      if (league.order[step] === t.id) {
        s.progress.leagueStep = step + 1;
        if (s.progress.leagueStep >= league.order.length) {
          // Champion poražen → konec běhu, zisk titulu.
          s.progress.leagueActive = false;
          s.progress.leagueStep = league.order.length;
          if (!s.story) s.story = {};
          const firstTime = !s.story[league.clearFlag];
          s.story[league.clearFlag] = true; // leagueCleared
          if (league.clearStoryFlag) s.story[league.clearStoryFlag] = true; // isChampion
          if (firstTime) {
            const bonus = league.clearReward?.gold ?? 0;
            if (bonus) {
              s.resources.gold += bonus;
              goldGain += bonus; // ať se objeví i v přehledu výhry
            }
            bus.emit(EVENTS.STORY_POPUP, {
              title: "🏆 Pokémon League Champion!",
              body: `<p class="story-text">The final Pokémon falls. Blue sinks to his knees. "...No! Why?! I never lost to you before... What went wrong?"</p>
                <p class="story-text">Professor Oak steps into the Hall of Fame. "Blue! I'm disappointed in you. And you —" he turns to you, beaming, "— you understand that the bond of trust between you and your Pokémon is what makes them strong. You are the new <strong>Pokémon League Champion</strong>!"</p>
                <p class="story-text">Your team is recorded in the <strong>Hall of Fame</strong>. And with the League conquered, the sealed <strong>Cerulean Cave</strong> is said to open at last — home to the strongest Pokémon of all, <strong>Mewtwo</strong>. Your legend has only begun.</p>`,
              okLabel: "Hall of Fame ✦",
            });
          } else {
            bus.emit(EVENTS.STORY_POPUP, {
              title: "🏆 Title defended!",
              body: `<p class="story-text">Once more you climb through the Elite Four and stand victorious over the Champion. Your place in the <strong>Hall of Fame</strong> is secure.</p>`,
              okLabel: "Onward!",
            });
          }
        }
      }
    }
  }
  commit();
  pushLog(`${t.name} was defeated!`, "player");
  if (goldGain) pushLog(`You received ${goldGain} gold!`, "player");
  if (badgeGain) {
    const bname = getBadge(badgeGain)?.name ?? badgeGain;
    pushLog(`🏅 You earned the ${bname}!`, "player");
  }
  const interlude = {
    kind: "trainer-win",
    trainer: { id: t.id, name: t.name, class: t.class, kind: t.kind, spriteVariant: t.spriteVariant },
    enemy: enemySnapshot(lastEnemy),
    rewards: { gold: goldGain, badge: badgeGain, alreadyBeaten: already },
    gymId: t.gymId ?? null,
    endAfter: !t.returnToWild, // gym trenér → po zavření okna souboj skončí
  };
  battle.trainer = null;
  if (t.returnToWild && getAutoBattle()) {
    // Auto route grind: rovnou pokračuj dalším divokým setkáním.
    spawnNext();
  } else {
    battle.interlude = interlude;
    battle.running = false;
  }
}

/* ----------------------------- Chytání ----------------------------- */

/** Násobek base šance na chycení podle vzácnosti druhu (vzácnější = těžší). */
const RARITY_CATCH_MULT = {
  common: 1,
  uncommon: 0.85,
  rare: 0.6,
  epic: 0.45,
  legendary: 0.3,
};

/**
 * Základní šance na chycení bojovníka: podle jeho aktuálního HP (čím míň HP,
 * tím snazší) a zeslabená podle vzácnosti druhu (rare/epic/legendary hůř).
 */
function catchChanceFor(combatant) {
  const frac = Math.max(0, Math.min(1, combatant.hp / combatant.stats.maxHp));
  const byHp = CATCH_MIN + (CATCH_MAX - CATCH_MIN) * (1 - frac);
  const rarity = getSpecies(combatant.ref.speciesId)?.rarity ?? "common";
  return byHp * (RARITY_CATCH_MULT[rarity] ?? 1);
}

/** Kontext souboje pro vyhodnocení bonusů ballů. */
function catchContext() {
  return {
    enemy: battle.enemy,
    player: battle.player,
    turn: battle.turn ?? 1,
    owns: ownsSpecies(battle.enemy.ref.speciesId),
    biome: battle.area?.biome ?? null,
  };
}

/** Kolik kusů daného typu ballu má hráč. */
function ballCount(ballId) {
  return getState().resources.balls?.[ballId] ?? 0;
}

/** Aktuálně vybraný typ ballu (výchozí „poke"). */
export function getSelectedBall() {
  return getState().settings?.selectedBall ?? "poke";
}

/**
 * Ball pro autocatch: VÝHRADNĚ typ zvolený pro autocatch (autocatch.ball).
 * ŽÁDNÝ fallback na jiný typ – hráč nechce, aby autocatch po dojití sáhl po jiných
 * (dražších) míčcích. Když vybraný typ došel, vrací null → autocatch nechytá
 * (a v tick loopu se navíc sám vypne, viz runAutoTurn).
 * @returns {string|null}
 */
function resolveAutocatchBall() {
  const ball = getAutocatch().ball;
  return ballCount(ball) > 0 ? ball : null;
}

/** Nastaví vybraný typ ballu (pro chytání) a překreslí UI souboje. */
export function setSelectedBall(ballId) {
  const s = getState();
  if (!s.settings) s.settings = {};
  s.settings.selectedBall = ballId;
  commit();
  bus.emit(EVENTS.BATTLE_UPDATE);
}

/**
 * Finální šance (0–1) na chycení AKTUÁLNÍHO nepřítele daným typem ballu
 * (základ dle HP × násobek ballu). Pro UI. 0 když není koho chytat.
 * @param {string} [ballId]  výchozí = vybraný ball
 */
export function getCatchChance(ballId = getSelectedBall()) {
  if (!battle || !battle.enemy || battle.enemy.hp <= 0) return 0;
  const ball = getPokeball(ballId);
  if (!ball) return 0;
  if (ball.guaranteed) return 1;
  return Math.min(1, catchChanceFor(battle.enemy) * ballMultiplier(ball, catchContext()));
}

/**
 * Nastavení autocatch z herního stavu (normalizované, s bezpečným výchozím).
 * Tři NEZÁVISLÉ přepínače (sčítají se logickým NEBO):
 *   - `catchAll`   = chytat všechny divoké
 *   - `catchNew`   = chytat druhy, které ještě nemáš (kompletace dexu)
 *   - `catchShiny` = chytat shiny
 * Žádný zapnutý filtr = nechytat nic (výchozí, ať zapnutí samo nezačne chytat).
 * Zpětná kompat se starým modelem `mode` ("none"/"all"/"shiny"): když nové klíče
 * chybí, odvodíme je z něj (all→catchAll, shiny→catchShiny).
 */
export function getAutocatch() {
  const s = getState().settings?.autocatch;
  const hasNew =
    s &&
    (typeof s.catchAll === "boolean" ||
      typeof s.catchNew === "boolean" ||
      typeof s.catchShiny === "boolean");
  return {
    enabled: s?.enabled ?? false,
    // Typ ballu vyhrazený pro autocatch (nezávislý na ručně vybraném selectedBall).
    ball: s?.ball ?? "poke",
    catchAll: hasNew ? !!s.catchAll : s?.mode === "all",
    catchNew: hasNew ? !!s.catchNew : false,
    catchShiny: hasNew ? !!s.catchShiny : s?.mode === "shiny",
  };
}

/** Je aktivní aspoň jeden autocatch filtr? Bez něj autocatch nemá co chytat. */
function autocatchActive(ac) {
  return ac.catchAll || ac.catchNew || ac.catchShiny;
}

/** Změní nastavení autocatch (částečný patch), uloží a překreslí UI souboje. */
export function setAutocatch(patch) {
  const s = getState();
  if (!s.settings) s.settings = {};
  s.settings.autocatch = { ...getAutocatch(), ...patch };
  commit();
  bus.emit(EVENTS.BATTLE_UPDATE);
  return s.settings.autocatch;
}

/**
 * Má se hra pokusit tohoto nepřítele automaticky chytit? Filtry se sčítají přes
 * NEBO: All = vše; Shiny = shiny; New = druh, který ještě nemáš. Takže New+Shiny
 * chytá nové, shiny i „nové shiny". Žádný filtr = nechytat.
 */
function shouldAutocatch(ref, ac) {
  if (ac.catchAll) return true;
  if (ac.catchShiny && ref.shiny) return true;
  if (ac.catchNew && !ownsSpecies(ref.speciesId)) return true;
  return false;
}

/**
 * Provede jeden pokus o chycení aktuálního nepřítele daným ballem. Spotřebuje
 * 1 kus. Předpoklad: běží souboj, nepřítel žije, je aspoň 1 ball daného typu.
 * NEEMITuje událost (to řeší volající). Úspěch = nepřítel je získán (přes
 * acquirePokemon) a nahrazen novým; žádné XP/gold.
 * @param {string} ballId
 * @returns {{ caught: boolean, outcome?: any }}
 */
function doCatch(ballId) {
  const res = getState().resources;
  if (!res.balls) res.balls = {};
  res.balls[ballId] = (res.balls[ballId] ?? 0) - 1;
  const ball = getPokeball(ballId);
  const enemy = battle.enemy;
  const chance = ball?.guaranteed
    ? 1
    : Math.min(1, catchChanceFor(enemy) * ballMultiplier(ball, catchContext()));
  if (Math.random() >= chance) {
    commit(); // ulož spotřebovaný ball
    pushLog(`${enemy.name} broke free!`, "enemy");
    return { caught: false };
  }

  const shinyTag = enemy.ref.shiny ? " ✨" : "";
  enemy.ref.caughtBall = ballId; // zaznamenej ball, ve kterém byl chycen
  // Nuzlocke: úspěšné chycení „spotřebuje" oblast – další úlovek už tu nebude.
  if (getRules().nuzlocke) markNuzlockeCaught(battle.area?.id);
  const outcome = acquirePokemon(enemy.ref); // volá commit() (uloží i ball)
  if (outcome.added) {
    pushLog(`Caught ${enemy.name}${shinyTag}!`, "player");
  } else if (outcome.improvements.length) {
    pushLog(`Caught a better ${enemy.name}${shinyTag} — improved ${outcome.improvements.join(", ")} (released)`, "player");
  } else {
    pushLog(`Caught ${enemy.name}, but your own was better — released`, "player");
  }
  // Auto: rovnou další soupeř. Manuál: pauza a „chytací okno" s hozeným ballem.
  pauseForInterlude({
    kind: "catch",
    enemy: enemySnapshot(enemy),
    ball: ballId,
    outcome: {
      added: !!outcome.added,
      released: !outcome.added,
      improvements: outcome.improvements ?? [],
    },
  });
  return { caught: true, outcome };
}

/**
 * Ruční pokus o chycení aktuálního nepřítele vybraným ballem (tlačítko v Battle Area).
 * @param {string} [ballId]  výchozí = vybraný ball
 * @returns {{ ok: boolean, reason?: string, caught?: boolean, outcome?: any }}
 */
export function attemptCatch(ballId = getSelectedBall()) {
  if (!battle || battle.result) return { ok: false, reason: "No active battle." };
  if (battle.trainer) return { ok: false, reason: "You can't catch another Trainer's Pokémon!" };
  if (!battle.enemy || battle.enemy.hp <= 0) return { ok: false, reason: "No enemy to catch." };
  const nzBlock = nuzlockeCatchBlock();
  if (nzBlock) return { ok: false, reason: nzBlock };
  if (ballCount(ballId) <= 0) {
    return { ok: false, reason: `No ${getPokeball(ballId)?.name ?? "balls"} left` };
  }
  const r = doCatch(ballId);
  emit();
  return { ok: true, ...r };
}

/**
 * Spustí nový souboj s aktuálním týmem na první oblasti.
 * @returns {{ ok: boolean, reason?: string }}
 */
/* ------------------------------ Aktivní oblast ----------------------------- */

/** Získané odznaky (id) – gatují oblasti mapy s unlock.badge (viz areas.js). */
function earnedBadges() {
  return getState().progress?.badges ?? [];
}

/** Id aktuálně vybrané oblasti (kde se bojuje). */
export function getActiveAreaId() {
  return getState().progress?.activeAreaId ?? AREAS[0].id;
}

/** Aktuálně vybraná oblast (fallback = první oblast, ať se nikdy nevrátí null). */
export function getActiveArea() {
  return getArea(getActiveAreaId()) ?? AREAS[0];
}

/**
 * Přepne aktivní oblast (klik na mapě). Respektuje odemčení (odznaky).
 * Když právě běží souboj a nová oblast je bojová (má species), plynule přehodí
 * na nového nepřítele z nové oblasti; když je to město (bez species), souboj ukončí.
 * @param {string} areaId
 * @returns {{ ok: boolean, reason?: string }}
 */
export function setActiveArea(areaId) {
  const area = getArea(areaId);
  if (!area) return { ok: false, reason: "Unknown area." };
  const s = getState();
  if (!s.progress) s.progress = { tier: 1, visited: [], badges: [] };
  if (!Array.isArray(s.progress.visited)) s.progress.visited = [];
  if (!isAreaUnlocked(area, s.progress.visited, earnedBadges(), s.progress.defeatedTrainers ?? [], s.story ?? {})) {
    return { ok: false, reason: "This area is locked — reach it through the previous area first." };
  }
  s.progress.activeAreaId = areaId;
  // Návštěva uzlu odemyká navazující uzly (viz data/areas.js unlock.visited).
  if (!s.progress.visited.includes(areaId)) s.progress.visited.push(areaId);

  // Story event (Oak's Parcel): balíček se NEPŘEDÁVÁ automaticky ani se nic
  // nepíše pod mapu. Když hráč dorazí do Viridianu a ještě nemá/nedoručil balíček,
  // vrátíme jen signál `event`, na který UI (mapView) ukáže vyskakovací okno
  // navádějící do Poké Martu. Samotné předání questu řeší až klik na Mart
  // (viz cityView → clerk popup), doručení pak Oak's Lab v Pallet Townu.
  let event = null;
  if (!s.story) s.story = {};
  const story = s.story;
  const beaten = s.progress.defeatedTrainers ?? [];
  if (areaId === "viridian-city" && !story.oakParcelDelivered && !story.oakParcelGiven) {
    event = "viridian-parcel-hint";
  } else if (areaId === "pewter-city" && !beaten.includes("brock")) {
    // Příchod do Pewteru s dosud neporaženým Brockem → navedeme hráče do Gymu.
    event = "pewter-gym-hint";
  } else if (areaId === "viridian-forest" && !story.viridianForestItem) {
    // Věrný Kanto: v lese leží na zemi Potion a Antidote – jednorázový pickup.
    story.viridianForestItem = true;
    if (!s.resources.items) s.resources.items = {};
    s.resources.items.potion = (s.resources.items.potion ?? 0) + 1;
    s.resources.items.antidote = (s.resources.items.antidote ?? 0) + 1;
    event = "viridian-forest-item";
  } else if (areaId === "mt-moon" && !story.mtMoonEntered) {
    // Věrný Kanto: Mt. Moon obsadil Team Rocket – flavour popup při vstupu.
    story.mtMoonEntered = true;
    event = "mt-moon-rocket";
  } else if (areaId === "route-04" && !story.fossilChosen) {
    // Vynořil ses z Mt. Moon → jednorázová volba fosílie (Helix/Dome).
    // Samotné předání itemu řeší až klik na volbu (viz mapView → applyFossilChoice).
    event = "mt-moon-fossil";
  } else if (areaId === "cerulean-city" && !beaten.includes("misty")) {
    // Příchod do Cerulean s dosud neporaženou Misty → navedeme hráče do Gymu.
    event = "cerulean-arrival";
  } else if (areaId === "route-24" && !story.nuggetBridge) {
    // Nugget Bridge: trenér ti dá Nugget – rovnou ho zpeněžíme (žádný mrtvý item).
    story.nuggetBridge = true;
    const NUGGET_GOLD = 1000;
    s.resources.gold = (s.resources.gold ?? 0) + NUGGET_GOLD;
    event = "nugget-bridge";
  } else if (areaId === "route-25" && !story.billHelped) {
    // Věrný Kanto: na konci Route 25 bydlí Bill. Pomůžeš mu z jeho teleportéru
    // a on ti dá lodní lístek na S.S. Anne. Jednorázově (story flag).
    story.billHelped = true;
    if (!s.resources.items) s.resources.items = {};
    s.resources.items["ss-anne-ticket"] = (s.resources.items["ss-anne-ticket"] ?? 0) + 1;
    event = "bill-route-25";
  } else if (areaId === "vermilion-city" && !story.vermilionArrival) {
    // Příchod do Vermilion → navedeme hráče na S.S. Anne (a k Lt. Surgeovi).
    story.vermilionArrival = true;
    event = "vermilion-arrival";
  } else if (areaId === "route-11" && !story.route11Arrival) {
    // Věrný Kanto (Krok 6): východní route od Vermilionu, vede k Diglett's Cave.
    story.route11Arrival = true;
    event = "route-11-arrival";
  } else if (areaId === "digletts-cave" && !story.diglettsArrival) {
    // Věrný Kanto (Krok 6): úzká jeskyně plná Digletta/Dugtria, zkratka pod Kantem.
    story.diglettsArrival = true;
    event = "digletts-arrival";
  } else if (areaId === "route-09" && !story.hasFlash && !story.route9HikersCleared && !story.route9Arrival) {
    // Věrný Kanto (Krok 7): HM05 Flash už není zadarmo. Route 9 hlídá parta
    // Hikerů (gauntlet) a Oakův pomocník dá Flash až po jejich poražení A po
    // registraci 10 druhů v Pokédexu. Tady jen jednorázově navedeme hráče.
    story.route9Arrival = true;
    event = "route-09-arrival";
  } else if (areaId === "route-09" && !story.hasFlash && story.route9HikersCleared && dexCounts().caught >= 10) {
    // Návrat na Route 9 – Hikeři poražení a teď už máš 10 druhů → Flash konečně.
    story.hasFlash = true;
    if (!s.resources.items) s.resources.items = {};
    s.resources.items["hm05-flash"] = (s.resources.items["hm05-flash"] ?? 0) + 1;
    event = "flash-gift";
  } else if (areaId === "lavender-town" && !story.lavenderArrival) {
    // Věrný Kanto (Krok 6): ponuré město s Pokémon Tower a duchy.
    story.lavenderArrival = true;
    event = "lavender-arrival";
  } else if (areaId === "celadon-city" && !story.celadonArrival) {
    // Věrný Kanto (Krok 7): největší město Kanta – Dept Store, Game Corner (za nímž
    // je Rocket hideout) a Erika v Celadon Gymu (Rainbow Badge).
    story.celadonArrival = true;
    event = "celadon-arrival";
  } else if (areaId === "saffron-city" && !story.saffronArrival) {
    // Věrný Kanto (Krok 11): Saffron obsazen Team Rocketem – zabrali Silph Co.
    // Vyčerpaný strážce u Silph Co nepustí dál, dokud mu nepřineseš pití (koupíš
    // v Celadon Dept Store). Sabrinin gym je do osvobození Silph Co zavřený.
    story.saffronArrival = true;
    event = "saffron-arrival";
  } else if (areaId === "route-12" && story.hasPokeFlute && !story.snorlaxCleared) {
    // Máš Poké Flute a Snorlax ještě spí → nabídni probuzení (souboj).
    event = "snorlax-block";
  } else if (areaId === "route-12" && !story.hasPokeFlute && !story.snorlaxCleared) {
    // Snorlax blokuje jih a Poké Flute zatím nemáš → flavour (potřebuješ Flute).
    event = "snorlax-asleep";
  } else if (areaId === "fuchsia-city" && !story.fuchsiaArrival) {
    // Věrný Kanto (Krok 8): jižní město s Koga Gymem (Soul Badge), Safari Zone
    // (uvnitř HM03 Surf + Gold Teeth) a domem Wardena (Gold Teeth → HM04 Strength).
    story.fuchsiaArrival = true;
    event = "fuchsia-arrival";
  } else if (areaId === "route-19" && !story.route19Arrival) {
    // Věrný Kanto (Krok 9): první nasednutí na Surf – moře na jih od Fuchsie
    // vede přes Seafoam Islands na Cinnabar Island.
    story.route19Arrival = true;
    event = "route-19-arrival";
  } else if (areaId === "seafoam-islands" && !story.seafoamArrival) {
    // Věrný Kanto (Krok 9): ledové jeskynní ostrovy v mlze na cestě k Cinnabaru.
    // Jednorázový flavour popup (jen poprvé). Legendární Articuno už NENÍ popup –
    // žije ve vlastním tabu „Legendary" (data/legendaries.js + legendaryView),
    // který se odemkne po Strength a zmizí po chycení (jednorázovost = vlastnictví).
    story.seafoamArrival = true;
    event = "seafoam-arrival";
  } else if (areaId === "cinnabar-island" && !story.cinnabarArrival) {
    // Věrný Kanto (Krok 9): sopečný ostrov – Blaineův Gym (Volcano Badge),
    // vyhořelý Pokémon Mansion (Secret Key + lore o Mewtwovi) a Pokémon Lab.
    story.cinnabarArrival = true;
    event = "cinnabar-arrival";
  } else if (areaId === "safari-zone" && !story.safariArrival) {
    // Věrný Kanto (Krok 8): Safari Zone NEDÁVÁ nic zadarmo. Odměny (Gold Teeth
    // v oblasti 3, HM03 Surf v Secret House oblasti 4) jsou až za expedici –
    // řídí ji samostatný safariSystem (viz ui/safariView tab). Tady jen
    // jednorázově vysvětlíme pravidla. Žádné itemy ani story flagy odměn.
    story.safariArrival = true;
    event = "safari-arrival";
  } else if (areaId === "victory-road" && !story.victoryRoadArrival) {
    // Věrný Kanto (Krok 10): poslední jeskyně před Ligou. Silní divocí Pokémoni,
    // balvanové hádanky (Strength) a hluboko uvnitř hnízdí legendární Moltres.
    story.victoryRoadArrival = true;
    event = "victory-road-arrival";
  } else if (areaId === "indigo-plateau" && !story.indigoArrival) {
    // Věrný Kanto (Krok 10): vrchol cesty – Pokémon League. Elite Four + Champion
    // v jednom nepřerušeném řetězci soubojů (viz League tab).
    story.indigoArrival = true;
    event = "indigo-arrival";
  } else if (areaId === "cerulean-cave" && !story.ceruleanCaveArrival) {
    // Věrný Kanto (endgame dojezd): Unknown Dungeon (Cerulean Cave) se otevřel
    // jen Championovi. Hluboko uvnitř dřímá nejmocnější Pokémon – Mewtwo (Legendary tab).
    story.ceruleanCaveArrival = true;
    event = "cerulean-cave-arrival";
  }

  // Běžící souboj přizpůsobit nové oblasti.
  if (battle && battle.running) {
    if (areaId === "safari-zone") {
      // V Safari Zone se nebojuje (má vlastní tab/engine) – běžící souboj ukončit.
      stopBattle();
    } else if (battle.trainer) {
      // Odchod z trenérského souboje = útěk; trenér zůstane neporažený.
      // Věrný Kanto (Krok 10): útěk uprostřed Ligy (Elite Four / Champion)
      // resetuje celý běh – stejně jako prohra jede od prvního vyzyvatele.
      if (
        (battle.trainer.kind === "elite-four" || battle.trainer.kind === "champion") &&
        getState().progress?.leagueActive
      ) {
        const p = getState().progress;
        p.leagueActive = false;
        p.leagueStep = 0;
      }
      stopBattle();
    } else if (area.species?.length) {
      battle.area = area;
      battle.enemy = spawnEnemy(area);
      battle.background = pickBackground(area);
      pushLog(`Moved to ${area.name}.`);
    } else {
      // Ve městě se nebojuje – souboj ukončit.
      stopBattle();
    }
  }
  commit(); // → STATE_CHANGED (překreslí mapu = zvýrazní aktivní oblast)
  bus.emit(EVENTS.BATTLE_UPDATE);
  return { ok: true, event };
}

/**
 * Věrný Kanto (upraveno pro cíl „celý dex na 1 průchod"): v Mt. Moon hráč získá
 * VŠECHNY TŘI fosílie najednou (Helix→Omanyte, Dome→Kabuto, Old Amber→Aerodactyl).
 * Žádná nevratná volba – jinak by se zamkl druh (viz pravidlo single-playthrough dex).
 * Oživení řeší Museum of Science (viz storyBuildingView FOSSIL_TO_SPECIES).
 * @returns {{ ok: boolean, items?: string[] }}
 */
export function applyFossilChoice() {
  const s = getState();
  if (!s.story) s.story = {};
  if (s.story.fossilChosen) return { ok: false };
  if (!s.resources.items) s.resources.items = {};
  const items = ["helix-fossil", "dome-fossil", "old-amber"];
  for (const itemId of items) {
    s.resources.items[itemId] = (s.resources.items[itemId] ?? 0) + 1;
  }
  s.story.fossilChosen = "all";
  commit();
  return { ok: true, items };
}

/**
 * Level dárkového Pokémona škálovaný podle aktuálního týmu hráče, aby dárek vždy
 * seděl bez ohledu na to, kdy ho vyzvedneš (i při pozdějším návratu na route).
 * = level nejsilnějšího člena týmu (min. 5). Když je tým prázdný, vrátí 5.
 * @returns {number}
 */
export function giftLevel() {
  const team = getTeamPokemon();
  let max = 0;
  for (const p of team) {
    const lvl = p?.level ?? 0;
    if (lvl > max) max = lvl;
  }
  return Math.max(5, max);
}

/**
 * Kanonická městská VÝMĚNA (in-game trade): hráč odevzdá jednoho jedince druhu
 * `wantId` a dostane `giveId` na STEJNÉ úrovni (věrné originálu → level se škáluje
 * sám). Jednorázově dle `flag`. Odevzdaný druh zůstává znovu chytatelný (žádný
 * trvalý lockout dexu; viz [[single-playthrough-full-dex]]).
 * @param {string} wantId   druh, kterého hráč musí vlastnit (odevzdá ho)
 * @param {string} giveId   druh, kterého hráč dostane
 * @param {string} flag     story flag hlídající jednorázovost
 * @returns {{ ok: boolean, reason?: string, level?: number }}
 */
export function tradePokemon(wantId, giveId, flag) {
  const s = getState();
  if (!s.story) s.story = {};
  if (flag && s.story[flag]) return { ok: false, reason: "done" };
  if (!getSpecies(wantId) || !getSpecies(giveId)) return { ok: false, reason: "invalid" };
  const owned = (s.collection ?? []).find((p) => p.speciesId === wantId);
  if (!owned) return { ok: false, reason: "missing" };
  // Pojistka proti soft-locku: nedovol odevzdat svého jediného Pokémona.
  if ((s.collection?.length ?? 0) <= 1) return { ok: false, reason: "only" };
  const level = owned.level ?? 5;
  releasePokemon(owned.uid); // commit uvnitř – odebere z týmu/kolekce/boxu
  const mon = createPokemon(giveId, level);
  acquirePokemon(mon); // commit uvnitř (R-018)
  if (flag) {
    s.story[flag] = true;
    commit();
  }
  return { ok: true, level };
}

/**
 * Udělí hráči dárkového/statického Pokémona (Eevee, Lapras, Hitmony…).
 * Jednorázově dle story-flagu (aby se dárek nedal opakovat).
 * Používá acquirePokemon (platí R-018: nový druh přidá, duplikát slije lepší).
 * @param {string} speciesId
 * @param {number} level
 * @param {string} flag  story flag hlídající jednorázovost
 * @returns {{ ok: boolean }}
 */
export function grantGiftPokemon(speciesId, level, flag) {
  const s = getState();
  if (!s.story) s.story = {};
  if (flag && s.story[flag]) return { ok: false };
  if (!getSpecies(speciesId)) return { ok: false };
  const mon = createPokemon(speciesId, level);
  acquirePokemon(mon); // commit uvnitř
  if (flag) {
    s.story[flag] = true;
    commit();
  }
  return { ok: true };
}

export function startBattle() {
  const team = getTeamPokemon();
  if (team.length === 0) return { ok: false, reason: "You have no Pokémon in your team." };
  // Do boje jde první ŽIVÝ člen; když jsou všichni vyřazení, je třeba léčit.
  const firstAlive = team.findIndex((p) => hpOf(p) > 0);
  if (firstAlive < 0) {
    return { ok: false, reason: "Your whole team has fainted — heal at the Poké Center." };
  }

  const activeArea = getActiveArea();
  if (!activeArea.species?.length) {
    // Města (a jiné oblasti bez divokých druhů) nemají koho spawnovat.
    return { ok: false, reason: `No wild Pokémon at ${activeArea.name} — pick a route on the map.` };
  }

  battle = {
    running: true,
    log: [],
    area: activeArea,
    teamCursor: firstAlive,
    turn: 0,
    result: null,
    background: pickBackground(activeArea),
    interlude: null,
    resolving: false, // právě se krokově odehrává manuální kolo?
    weather: null, // běhové počasí (déšť) – transientní, neukládá se
    tailwind: { player: 0, enemy: 0 }, // zbývající kola Tailwindu per strana
    player: makeCombatant(team[firstAlive]),
    enemy: null,
  };
  battle.enemy = spawnEnemy(battle.area);
  pushLog(`Battle at ${battle.area.name}: ${battle.player.name} vs ${battle.enemy.name}`);
  emit();
  schedule();
  return { ok: true };
}

/**
 * Spustí STATICKÝ (skriptovaný) divoký souboj s konkrétním druhem a levelem –
 * pro legendární/jednorázová setkání (Krok 9: Articuno na Seafoam). Chová se
 * jako běžný divoký souboj: NEMÁ `battle.trainer`, takže je CHYTATELNÝ i se
 * (de)serializuje přes speciesId+level (přežije refresh). Jednorázovost neřešíme
 * flagem tady, ale u volajícího (kontrola vlastnictví druhu / arrival event).
 * @param {string} speciesId
 * @param {number} level
 * @returns {{ ok: boolean, reason?: string }}
 */
export function startStaticEncounter(speciesId, level) {
  const team = getTeamPokemon();
  if (team.length === 0) return { ok: false, reason: "You have no Pokémon in your team." };
  const firstAlive = team.findIndex((p) => hpOf(p) > 0);
  if (firstAlive < 0) {
    return { ok: false, reason: "Your whole team has fainted — heal at the Poké Center." };
  }
  const sp = getSpecies(speciesId);
  if (!sp) return { ok: false, reason: `Unknown species: ${speciesId}` };

  const activeArea = getActiveArea();
  markSeen(speciesId); // do Pokédexu jako „viděno"
  battle = {
    running: true,
    log: [],
    area: activeArea,
    teamCursor: firstAlive,
    turn: 0,
    result: null,
    background: pickBackground(activeArea),
    interlude: null,
    resolving: false,
    // Legendární setkání = VŽDY manuál (jako gym/boss). Bez toho by Auto battle
    // Pokémona automaticky ubilo k smrti a hráč by neměl šanci hodit ball – a
    // legendární musí jít chytit (celý dex 151). Útěk/prohra/KO ho nezablokují:
    // jednorázovost = vlastnictví druhu, takže se objeví znovu, dokud nechytíš.
    forceManual: true,
    weather: null,
    tailwind: { player: 0, enemy: 0 },
    player: makeCombatant(team[firstAlive]),
    enemy: makeCombatant(createPokemon(speciesId, level)),
  };
  pushLog(`A wild ${battle.enemy.name} appeared!`, "enemy");
  pushLog(`Go, ${battle.player.name}!`, "player");
  emit();
  schedule();
  return { ok: true };
}

/**
 * Spustí izolovaný TUTORIÁLOVÝ DEMO-souboj mezi dvěma konkrétními jedinci.
 * Používá ho jen onboarding (src/ui/tutorial.js). `demo:true` zajistí, že se
 * souboj NIKDY neukládá (serialize() u něj vrací null), takže nešahne na reálný
 * postup. Volající si celý stav zálohuje/obnovuje snapshotem – tady jen boj
 * postavíme z dodaných jedinců (klidně dočasně vložených do collection/team).
 * @param {object} playerOwned  hráčův jedinec (objekt z createPokemon)
 * @param {object} enemyOwned   soupeř (objekt z createPokemon)
 * @returns {{ ok: boolean }}
 */
export function startDemoBattle(playerOwned, enemyOwned) {
  const activeArea = getActiveArea();
  battle = {
    running: true,
    log: [],
    area: activeArea,
    teamCursor: 0,
    turn: 0,
    result: null,
    background: pickBackground(activeArea),
    interlude: null,
    resolving: false,
    demo: true, // izolovaný tutoriálový souboj – NEUKLÁDÁ se (viz serialize)
    weather: null,
    tailwind: { player: 0, enemy: 0 },
    player: makeCombatant(playerOwned),
    enemy: makeCombatant(enemyOwned),
  };
  pushLog(`A wild ${battle.enemy.name} appeared!`, "enemy");
  pushLog(`Go, ${battle.player.name}!`, "player");
  emit();
  schedule();
  return { ok: true };
}

export function pauseBattle() {
  if (battle) {
    battle.running = false;
    battle.resolving = false;
    clearTimeout(timer);
    clearTimeout(stepTimer);
    emit();
  }
}

export function resumeBattle() {
  if (battle && !battle.running && !battle.result) {
    battle.running = true;
    emit();
    schedule();
  }
}

/** Start / pauza / pokračovat / nový souboj podle stavu. */
export function toggleBattle() {
  if (!battle || battle.result) return startBattle();
  if (battle.running) pauseBattle();
  else resumeBattle();
  return { ok: true };
}

/* --------------------------- Manuální souboj --------------------------- */

/** Může hráč teď zadat manuální akci? (jen manuál mód, běžící souboj, živý soupeř) */
function canManualAct() {
  if (getAutoBattle()) return { ok: false, reason: "Turn off Auto battle to fight manually." };
  if (!battle || battle.result) return { ok: false, reason: "No active battle." };
  if (!battle.running) return { ok: false, reason: "The battle is paused." };
  if (battle.resolving) return { ok: false, reason: "Hold on — the round is still playing out." };
  if (!battle.enemy || battle.enemy.hp <= 0) return { ok: false, reason: "No enemy to act on." };
  return { ok: true };
}

/**
 * Hráč použije svůj tah (index slotu 0–3). Soupeř zvolí tah auto politikou a
 * kolo se odehraje. Když je zvolený slot bez PP, akce se odmítne; když nemá PP
 * ANI jeden tah, použije se Struggle.
 * @param {number} index
 * @returns {{ ok: boolean, reason?: string }}
 */
export function playerMove(index) {
  const guard = canManualAct();
  if (!guard.ok) return guard;

  // Hráč je zamčený vynuceným tahem (nabíjí dvoukolo / thrash) – nemůže volit.
  const forced = lockedAction(battle.player);
  if (forced) {
    battle.turn = (battle.turn ?? 0) + 1;
    resolveManualRound({ player: forced, enemy: enemyAction() });
    return { ok: true };
  }

  const moves = activeMoves(battle.player);
  const anyPp = moves.some((m) => (m.pp ?? 0) > 0);
  let playerAction;
  if (!anyPp) {
    playerAction = { slot: null, move: STRUGGLE }; // došly PP všem tahům
  } else {
    const slot = moves[index];
    const mv = slot && getMove(slot.id);
    if (!slot || !mv) return { ok: false, reason: "No such move." };
    if ((slot.pp ?? 0) <= 0) return { ok: false, reason: "No PP left for that move." };
    playerAction = { slot, move: mv };
  }

  battle.turn = (battle.turn ?? 0) + 1;
  resolveManualRound({ player: playerAction, enemy: enemyAction() });
  return { ok: true };
}

/**
 * Hráč prohodí aktivního Pokémona za jiného živého z týmu. Výměna spotřebuje
 * kolo – soupeř dostane volný útok na nově nasazeného Pokémona.
 * @param {string} uid
 * @returns {{ ok: boolean, reason?: string }}
 */
export function playerSwitch(uid) {
  const guard = canManualAct();
  if (!guard.ok) return guard;

  const team = getTeamPokemon();
  const idx = team.findIndex((p) => p.uid === uid);
  if (idx < 0) return { ok: false, reason: "That Pokémon isn't in your team." };
  if (idx === battle.teamCursor) return { ok: false, reason: "That Pokémon is already battling." };
  if (hpOf(team[idx]) <= 0) return { ok: false, reason: "That Pokémon has fainted." };

  battle.teamCursor = idx;
  battle.player = makeCombatant(team[idx]);
  pushLog(`${battle.player.name}, go!`, "player");

  battle.turn = (battle.turn ?? 0) + 1;
  resolveManualRound({ player: null, enemy: enemyAction() });
  return { ok: true };
}

/**
 * Hráč hodí ball (z batohu). Spotřebuje kolo: při neúspěchu soupeř zaútočí.
 * Při úspěchu je soupeř získán a nahrazen novým (bez útoku).
 * @param {string} [ballId]  výchozí = vybraný ball
 * @returns {{ ok: boolean, reason?: string, caught?: boolean, outcome?: any }}
 */
export function playerCatch(ballId = getSelectedBall()) {
  const guard = canManualAct();
  if (!guard.ok) return guard;
  if (battle.trainer) return { ok: false, reason: "You can't catch another Trainer's Pokémon!" };
  const nzBlock = nuzlockeCatchBlock();
  if (nzBlock) return { ok: false, reason: nzBlock };
  if (ballCount(ballId) <= 0) {
    return { ok: false, reason: `No ${getPokeball(ballId)?.name ?? "balls"} left` };
  }

  battle.turn = (battle.turn ?? 0) + 1;
  const r = doCatch(ballId); // spotřebuje ball; při úspěchu nastaví interlude / nahradí soupeře
  if (r.caught) {
    emit(); // úspěch: rovnou překreslit (chytací okno / další soupeř)
  } else {
    // Neúspěšný hod = soupeř dostane volný útok (krokově, s animací).
    resolveManualRound({ player: null, enemy: enemyAction() });
  }
  return { ok: true, ...r };
}

/**
 * Hráč použije léčivý item z batohu na daného člena týmu (nebo aktivního když
 * targetUid chybí). HP potion / léčení statusu / revive. Spotřebuje kolo –
 * soupeř dostane volný útok. Ověří canUseItem a canManualAct.
 * @param {string} itemId
 * @param {string} [targetUid]  uid cíle; když chybí, použije aktivního hráče
 * @returns {{ ok: boolean, reason?: string }}
 */
export function playerUseItem(itemId, targetUid) {
  const guard = canManualAct();
  if (!guard.ok) return guard;

  const def = getItem(itemId);
  if (!def) return { ok: false, reason: "Unknown item." };
  if (!itemsAllowed(itemId)) {
    return { ok: false, reason: getRules().noItems ? "No items allowed (game rule)." : "No potions allowed (game rule)." };
  }
  if (itemCount(itemId) <= 0) return { ok: false, reason: `No ${def.name} left.` };

  // Výchozí cíl: aktivní bojovník
  let target;
  if (targetUid) {
    target = getState().collection.find((p) => p.uid === targetUid);
    if (!target) return { ok: false, reason: "Unknown Pokémon." };
  } else {
    target = battle.player.ref;
  }

  const check = canUseItem(itemId, target);
  if (!check.ok) return check;

  const r = useItem(target.uid, itemId); // spotřebuje item, commit + emit
  if (!r.ok) return r;

  const targetName = target === battle.player.ref ? battle.player.name : getSpecies(target.speciesId)?.name ?? target.speciesId;
  pushLog(`Used ${def.name} on ${targetName}. ${r.msg}.`, "player");

  battle.turn = (battle.turn ?? 0) + 1;
  // Použití itemu = kolo hráče: soupeř zaútočí (krokově, s animací).
  resolveManualRound({ player: null, enemy: enemyAction() });
  return { ok: true };
}

/**
 * Manuální mód: zavře „výherní/chytací okno" (interlude) a nasadí dalšího
 * divokého soupeře (tlačítko „Next battle"). V Auto módu se nepoužívá.
 * @returns {{ ok: boolean, reason?: string }}
 */
export function nextEncounter() {
  if (!battle || battle.result) return { ok: false, reason: "No active battle." };
  if (!battle.interlude) return { ok: false, reason: "No pending result." };
  // Gym trenér/leader: po zavření okna souboj skončí (návrat do gym tabu),
  // nespouští se žádné divoké setkání.
  if (battle.interlude.endAfter) {
    battle.interlude = null;
    stopBattle();
    return { ok: true };
  }
  battle.interlude = null;
  spawnNext();
  battle.running = true;
  emit();
  schedule(); // v manuálu jen překreslí; automatická kola se nespustí
  return { ok: true };
}

/** Hráč uteče ze souboje (u divokých vždy úspěšné). Souboj se ukončí. */
export function playerRun() {
  if (!battle || battle.result) return { ok: false, reason: "No active battle." };
  stopBattle();
  return { ok: true };
}

/* --------------------------- Globální nastavení --------------------------- */

/**
 * Herní rychlost je napevno 1× (jedno kolo za sekundu). Volba rychlosti byla
 * odebrána – necháváme funkci kvůli `schedule()`/idle, ať je interval na jednom
 * místě. (`settings.speed` ve starých savech se ignoruje.)
 */
export function getSpeed() {
  return 1;
}

/**
 * Auto battle mód: Pokémoni bojují SAMI (automatické tiky). Je to samostatná
 * entita od pauzy – pauza (running) jen pozastaví souboj, tohle přepíná režim.
 * Opak (manuální boj) doděláme později.
 */
export function getAutoBattle() {
  // Gym souboj = jen manuál: auto je zakázané bez ohledu na uložené nastavení
  // (hráčova preference zůstane netknutá, po gymu se auto zas řídí nastavením).
  if (battle && battle.forceManual) return false;
  // Výchozí je MANUÁLNÍ (normální) souboj – Auto battle si hráč zapíná sám.
  return getState().settings?.autoBattle ?? false;
}

/**
 * Zapne/vypne Auto battle mód. NEpauzuje souboj (to dělá Pause/Resume) – jen
 * (ne)spouští automatická kola. Vrací aktuální hodnotu.
 * @param {boolean} on
 */
export function setAutoBattle(on) {
  const s = getState();
  if (!s.settings) s.settings = {};
  s.settings.autoBattle = !!on;
  commit();
  if (on) schedule(); // rozběhne automatická kola (schedule si ověří running)
  else clearTimeout(timer); // manuální mód: žádné automatické tiky
  bus.emit(EVENTS.BATTLE_UPDATE);
  return s.settings.autoBattle;
}

/**
 * Full Auto mód: chová se jako Auto battle (automatická kola), ale hráčovým
 * Pokémonům NEUBÝVÁ HP ani PP – nekonečný bezpečný idling výměnou za jen ~1/10
 * odměn (viz FULL_AUTO_REWARD_MULT). Stejně jako Auto battle je zakázaný v gymu.
 */
export function getFullAuto() {
  if (battle && battle.forceManual) return false;
  return getState().settings?.fullAuto ?? false;
}

/** Zapne/vypne Full Auto. Rozbíhá/zastavuje automatická kola stejně jako Auto battle. */
export function setFullAuto(on) {
  const s = getState();
  if (!s.settings) s.settings = {};
  s.settings.fullAuto = !!on;
  commit();
  if (on) schedule();
  else if (!getAutoBattle()) clearTimeout(timer); // zastav tiky, jen když neběží ani Auto battle
  bus.emit(EVENTS.BATTLE_UPDATE);
  return s.settings.fullAuto;
}

/** Běží některý z automatických režimů (Auto battle nebo Full Auto)? Řídí smyčku schedule(). */
function autoLoopActive() {
  return getAutoBattle() || getFullAuto();
}

/**
 * Ruční vyléčení celého týmu na plné HP (Poké Centrum). Toto je zdroj léčení
 * pro manuální mód i záchrana po wipu. Vrací počet skutečně vyléčených jedinců.
 */
export function healTeam() {
  // Liga (Elite Four): během běhu se v Poké Centru NELÉČÍ – jen bag itemy.
  // Vrací -1 jako signál pro UI (Poké Center / máma), ať ukáže vysvětlení.
  if (getState().progress?.leagueActive) return -1;
  const team = getTeamPokemon();
  let healed = 0;
  for (const p of team) {
    let changed = false;
    const max = computeStats(p).maxHp;
    if ((p.hp ?? max) < max) {
      p.hp = max;
      changed = true;
    }
    // Plné doléčení sundá i stavový efekt (otrava/popálení/paralýza).
    if (p.status) {
      p.status = null;
      changed = true;
    }
    // Doléčení obnoví i PP všech tahů na maximum.
    if (Array.isArray(p.moves)) {
      for (const m of p.moves) {
        const mx = m.maxPp ?? m.pp;
        if (m.pp < mx) {
          m.pp = mx;
          changed = true;
        }
      }
    }
    if (changed) healed++;
  }
  if (healed) {
    commit();
    bus.emit(EVENTS.BATTLE_UPDATE); // aby se překreslil i případný běžící souboj
  }
  return healed;
}

/** Potřebuje aspoň jeden člen týmu vyléčit (chybí HP nebo PP, nebo má status)? Pro UI. */
export function teamNeedsHeal() {
  return getTeamPokemon().some((p) => {
    const max = computeStats(p).maxHp;
    if ((p.hp ?? max) < max) return true;
    if (p.status) return true;
    if (Array.isArray(p.moves)) return p.moves.some((m) => m.pp < (m.maxPp ?? m.pp));
    return false;
  });
}

/**
 * Vyléčí POUZE stavový efekt jednoho jedince (otrava/popálení/paralýza), bez
 * doplnění HP/PP. Slouží jako „léčivý předmět proti statusu" (tlačítko Cure
 * v týmu). Vrací true, když se něco vyléčilo.
 * @param {string} uid
 */
export function healStatus(uid) {
  const p = getState().collection.find((x) => x.uid === uid);
  if (!p || !p.status) return false;
  p.status = null;
  commit();
  bus.emit(EVENTS.BATTLE_UPDATE); // může jít o právě nasazeného bojovníka → překresli i souboj
  return true;
}

/** Úplně ukončí souboj (např. při nové hře / importu). */
export function stopBattle() {
  battle = null;
  clearTimeout(timer);
  clearTimeout(stepTimer);
  emit();
}
