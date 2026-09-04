/**
 * battleSystem.js – automatický souboj (zadání sekce 10).
 *
 * Souboj je běhový (transient) stav – neukládá se do save. Do herního stavu
 * se promítá jen výsledek (XP, level, gold), přes commit() → autosave.
 *
 * Kolo (tick) = jedna výměna úderů v pořadí podle rychlosti. Rychlost hry
 * (1×/2×/4×) mění interval kol. Po poražení nepřítele se hned objeví další;
 * po vyřazení hráčova Pokémona nastupuje další z týmu, jinak prohra.
 */

import { getState, commit } from "../core/state.js";
import { bus, EVENTS } from "../core/events.js";
import { getTeamPokemon, ownsSpecies, acquirePokemon, releasePokemon } from "./team.js";
import { getPokeball, POKEBALLS } from "../../data/pokeballs.js";
import { ballMultiplier } from "./pokeballSystem.js";
import { createPokemon, computeStats } from "./pokemonSystem.js";
import { getSpecies } from "../../data/pokemon.js";
import { getMove } from "../../data/moves.js";
import { typeMultiplier } from "../../data/types.js";
import { grantXp } from "./progression.js";
import { rollLoot } from "./loot.js";
import { rollEggDrop } from "./eggSystem.js";
import { healPercent, ppRegenPercent } from "./buildingSystem.js";
import { useItem, canUseItem, itemCount, heldItemOf } from "./itemSystem.js";
import { getItem, ITEMS } from "../../data/items.js";
import { markSeen } from "./pokedex.js";
import { AREAS, getArea, isAreaUnlocked } from "../../data/areas.js";
import { biomeBackgrounds } from "../../data/backgrounds.js";

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
  // confusion, seeded, trapped, charging, locked, rageActive, substitute,
  // moveOverride/transformed pro Transform+Mimic, lastMoveId pro Mimic,
  // lastHitDmg/lastHitPhysical pro Counter). Spánek/zmrznutí jsou naopak TRVALÝ
  // status (owned.status). critStages: navýšená šance na krit (Focus Energy).
  c.stages = { attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0, accuracy: 0, evasion: 0 };
  c.volatile = {};
  c.critStages = 0;
  return c;
}

/**
 * Náhodně vybere pozadí souboje z poolu prostředí oblasti (`area.biome`).
 * Vrací URL, nebo null když prostředí nemá obrázky (pak prosvítá fallback).
 */
function pickBackground(area) {
  const urls = biomeBackgrounds(area?.biome);
  if (!urls.length) return null;
  return urls[Math.floor(Math.random() * urls.length)];
}

/** Odměna za poražení nepřítele daného levelu (sdíleno s idle systémem). */
export function battleRewards(level) {
  return { xp: 10 + level * 5, gold: 3 + level * 2 };
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

/** Vytvoří nového divokého nepřítele podle oblasti (druhy z area.species). */
function spawnEnemy(area) {
  const pool = area?.species?.length ? area.species : FALLBACK_SPECIES;
  let id = pool[Math.floor(Math.random() * pool.length)];
  // Guard: pokud druh neexistuje, zkus další platný z poolu, jinak fallback
  let sp = getSpecies(id);
  if (!sp && pool.length > 1) {
    for (const candidate of pool) {
      if (getSpecies(candidate)) {
        id = candidate;
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
  const level = Math.max(1, area.recommendedLevel) + Math.floor(Math.random() * 2);
  markSeen(id); // do Pokédexu jako „viděno" (chycené se odvozují z kolekce)
  return makeCombatant(createPokemon(id, level));
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
  return {
    areaId: battle.area.id,
    running: battle.running,
    result: battle.result,
    teamCursor: battle.teamCursor,
    turn: battle.turn ?? 0,
    background: battle.background,
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
const TWO_TURN_MSG = { "solar-beam": "took in sunlight", "skull-bash": "tucked in its head" };

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
  if (action.slot && !action._release) action.slot.pp = Math.max(0, (action.slot.pp ?? 0) - 1);

  // Dvoukolový tah: v prvním kole se jen nabíjí, samotný úder přijde příště (release).
  if (move.effect?.kind === "twoTurn" && !action._release) {
    attacker.volatile.charging = { moveId: move.id, slot: action.slot };
    pushLog(`${attacker.name} ${TWO_TURN_MSG[move.id] ?? "began charging up"}!`, side);
    return { dmg: 0, crit: false };
  }
  if (action._release) attacker.volatile.charging = null;

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
  defender.hp = Math.max(0, defender.hp - dmg);
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
  if (!battle || !battle.running || !getAutoBattle()) return;
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
  if (ac.enabled && ac.mode !== "none" && ballCount(ac.ball) <= 0) {
    setAutocatch({ enabled: false });
    pushLog(`Auto catch off — out of ${getPokeball(ac.ball)?.name ?? "balls"}.`);
  }
  // Vybraný autocatch ball (null = došel → nechytáme, žádný fallback).
  const ballId = resolveAutocatchBall();
  if (
    getAutocatch().enabled &&
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
    const enemy = battle.enemy;
    const { xp, gold } = battleRewards(enemy.ref.level);
    // Auto battle → tahy se při plných slotech přepíšou samy; manuál → dozeptá se.
    const leveled = grantXp(battle.player.ref, xp, { auto: getAutoBattle() });
    const res = getState().resources;
    res.gold += gold;
    // Loot: datově řízené dropy z oblasti.
    const loot = rollLoot(battle.area);
    for (const d of loot) res[d.resource] = (res[d.resource] ?? 0) + d.amount;
    // Vejce: malá šance najít vejce druhu z oblasti (líhne se ve Školce).
    const egg = rollEggDrop(battle.area);
    commit();
    const lootMsg = loot.length ? `, ${loot.map((d) => `+${d.amount} ${lootLabel(d.resource)}`).join(", ")}` : "";
    pushLog(`${enemy.name} defeated! +${xp} XP, +${gold} gold${lootMsg}`, "player");
    if (egg) {
      const eggName = getSpecies(egg.speciesId)?.name ?? egg.speciesId;
      pushLog(`🥚 You found a ${eggName} Egg! Hatch it at the Day Care.`);
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
    }
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
 * `mode`: "none" = nechytat nic (výchozí – ať zapnutí samo nezačne chytat),
 * "all" = chytat všechny, "shiny" = jen shiny.
 */
export function getAutocatch() {
  const s = getState().settings?.autocatch;
  return {
    enabled: s?.enabled ?? false,
    mode: s?.mode ?? "none",
    // Typ ballu vyhrazený pro autocatch (nezávislý na ručně vybraném selectedBall).
    ball: s?.ball ?? "poke",
  };
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

/** Má se hra pokusit tohoto nepřítele automaticky chytit? (dle módu) */
function shouldAutocatch(ref, ac) {
  if (ac.mode === "none") return false; // nic – dokud si hráč nevybere co chytat
  if (ac.mode === "shiny") return !!ref.shiny; // jen shiny
  return true; // "all" – chytat všechny
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
  if (!isAreaUnlocked(area, s.progress.visited, earnedBadges())) {
    return { ok: false, reason: "This area is locked — reach it through the previous area first." };
  }
  s.progress.activeAreaId = areaId;
  // Návštěva uzlu odemyká navazující uzly (viz data/areas.js unlock.visited).
  if (!s.progress.visited.includes(areaId)) s.progress.visited.push(areaId);

  // Běžící souboj přizpůsobit nové oblasti.
  if (battle && battle.running) {
    if (area.species?.length) {
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

/** Herní rychlost (1/2/4) – GLOBÁLNÍ nastavení (ovládá se v horní liště, ne v boji). */
export function getSpeed() {
  return getState().settings?.speed ?? 1;
}

/** Nastaví globální rychlost (1/2/4), uloží a přeplánuje případný běžící souboj. */
export function setSpeed(mult) {
  const s = getState();
  if (!s.settings) s.settings = {};
  s.settings.speed = mult;
  commit(); // → STATE_CHANGED (překreslí nastavení v liště)
  bus.emit(EVENTS.BATTLE_UPDATE);
  if (battle && battle.running) schedule();
}

/**
 * Auto battle mód: Pokémoni bojují SAMI (automatické tiky). Je to samostatná
 * entita od pauzy – pauza (running) jen pozastaví souboj, tohle přepíná režim.
 * Opak (manuální boj) doděláme později.
 */
export function getAutoBattle() {
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
 * Ruční vyléčení celého týmu na plné HP (Poké Centrum). Toto je zdroj léčení
 * pro manuální mód i záchrana po wipu. Vrací počet skutečně vyléčených jedinců.
 */
export function healTeam() {
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
