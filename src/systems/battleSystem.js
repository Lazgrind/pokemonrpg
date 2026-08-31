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
import { getTeamPokemon, ownsSpecies, ivWouldImprove, acquirePokemon } from "./team.js";
import { getPokeball } from "../../data/pokeballs.js";
import { ballMultiplier } from "./pokeballSystem.js";
import { createPokemon, computeStats } from "./pokemonSystem.js";
import { getSpecies } from "../../data/pokemon.js";
import { typeMultiplier } from "../../data/types.js";
import { grantXp } from "./progression.js";
import { rollLoot } from "./loot.js";
import { rollEggDrop } from "./eggSystem.js";
import { healPercent } from "./buildingSystem.js";
import { AREAS } from "../../data/areas.js";

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

/** @type {any} */
let battle = null;
let timer = null;

/** Aktuální běhový stav souboje (nebo null). */
export function getBattle() {
  return battle;
}

/** Sestaví bojovníka z jedince (staty + plné HP). */
export function makeCombatant(owned) {
  const species = getSpecies(owned.speciesId);
  const stats = computeStats(owned);
  return { ref: owned, name: species.name, types: species.types, stats, hp: stats.maxHp };
}

/** Odměna za poražení nepřítele daného levelu (sdíleno s idle systémem). */
export function battleRewards(level) {
  return { xp: 10 + level * 5, gold: 3 + level * 2 };
}

/**
 * Deterministický průměrný damage (bez náhody) – pro odhad rychlosti
 * zabíjení v idle systému. Používá stejný vzorec jako calcDamage,
 * ale se středem náhodného rozptylu (0.925).
 */
export function avgDamage(attacker, defender) {
  const eff = typeMultiplier(attacker.types[0], defender.types);
  const power = 40;
  const lvl = attacker.ref.level;
  const base =
    Math.floor(((2 * lvl) / 5 + 2) * power * (attacker.stats.attack / defender.stats.defense) / 50) + 2;
  return Math.max(1, Math.floor(base * eff * 0.925));
}

/** Vytvoří nového divokého nepřítele podle oblasti (druhy z area.species). */
function spawnEnemy(area) {
  const pool = area?.species?.length ? area.species : FALLBACK_SPECIES;
  const id = pool[Math.floor(Math.random() * pool.length)];
  const level = Math.max(1, area.recommendedLevel) + Math.floor(Math.random() * 2);
  return makeCombatant(createPokemon(id, level));
}

/** Přidá řádek do logu (drží se posledních pár). */
function pushLog(msg) {
  battle.log.push(msg);
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
    speed: battle.speed,
    running: battle.running,
    result: battle.result,
    teamCursor: battle.teamCursor,
    turn: battle.turn ?? 0,
    log: battle.log.slice(-30),
    playerUid: battle.player.ref.uid,
    playerHp: battle.player.hp,
    enemy: {
      speciesId: battle.enemy.ref.speciesId,
      level: battle.enemy.ref.level,
      hp: battle.enemy.hp,
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

  const enemyOwned = createPokemon(saved.enemy.speciesId, saved.enemy.level);
  const enemy = makeCombatant(enemyOwned);
  enemy.hp = Math.min(saved.enemy.hp ?? enemy.stats.maxHp, enemy.stats.maxHp);

  battle = {
    running: false, // po načtení pozastaveno
    speed: saved.speed ?? 1,
    log: saved.log ?? [],
    area,
    teamCursor: saved.teamCursor ?? 0,
    turn: saved.turn ?? 0,
    result: saved.result ?? null,
    player,
    enemy,
  };
  emit();
  return true;
}

/** Výpočet poškození vč. typové efektivity. */
function calcDamage(attacker, defender) {
  const eff = typeMultiplier(attacker.types[0], defender.types);
  const power = 40;
  const lvl = attacker.ref.level;
  const base =
    Math.floor(((2 * lvl) / 5 + 2) * power * (attacker.stats.attack / defender.stats.defense) / 50) + 2;
  const rand = 0.85 + Math.random() * 0.15;
  return { dmg: Math.max(1, Math.floor(base * eff * rand)), eff };
}

/** Naplánuje další kolo podle rychlosti. */
function schedule() {
  clearTimeout(timer);
  if (!battle || !battle.running) return;
  timer = setTimeout(tick, 1000 / battle.speed);
}

/** Jedno kolo souboje. */
function tick() {
  if (!battle || !battle.running) return;

  battle.turn = (battle.turn ?? 0) + 1; // číslo kola proti aktuálnímu nepříteli

  // Autocatch: na začátku kola zkus chytit nepřítele (má-li smysl a jsou balls).
  // Používá vybraný typ ballu. Při úspěchu je nepřítel nahrazen novým a kolo
  // (výměna úderů) se přeskočí; při neúspěchu se normálně bojuje – hráč ho může
  // zabít dřív, než ho chytí.
  const ac = getState().settings?.autocatch;
  const ballId = getSelectedBall();
  if (
    ac?.enabled &&
    battle.enemy &&
    battle.enemy.hp > 0 &&
    ballCount(ballId) > 0 &&
    shouldAutocatch(battle.enemy.ref, ac)
  ) {
    const r = doCatch(ballId);
    if (r.caught) {
      emit();
      schedule();
      return;
    }
  }

  const order =
    battle.player.stats.speed >= battle.enemy.stats.speed
      ? ["player", "enemy"]
      : ["enemy", "player"];

  for (const who of order) {
    if (battle.result) break;
    const attacker = who === "player" ? battle.player : battle.enemy;
    const defender = who === "player" ? battle.enemy : battle.player;
    const { dmg, eff } = calcDamage(attacker, defender);
    defender.hp = Math.max(0, defender.hp - dmg);
    const note = eff > 1 ? " (super effective!)" : eff < 1 ? " (not very effective)" : "";
    pushLog(`${attacker.name} hit for ${dmg}${note}`);
    if (defender.hp <= 0) {
      handleFaint(who);
      break;
    }
  }

  emit();
  schedule();
}

/** Zpracuje vyřazení – „winner“ je ten, kdo zasadil poslední ránu. */
function handleFaint(winner) {
  if (winner === "player") {
    const enemy = battle.enemy;
    const { xp, gold } = battleRewards(enemy.ref.level);
    const leveled = grantXp(battle.player.ref, xp);
    const res = getState().resources;
    res.gold += gold;
    // Loot: datově řízené dropy z oblasti.
    const loot = rollLoot(battle.area);
    for (const d of loot) res[d.resource] = (res[d.resource] ?? 0) + d.amount;
    // Vejce: malá šance najít vejce druhu z oblasti (líhne se ve Školce).
    const egg = rollEggDrop(battle.area);
    commit();
    const lootMsg = loot.length ? `, ${loot.map((d) => `+${d.amount} ${lootLabel(d.resource)}`).join(", ")}` : "";
    pushLog(`${enemy.name} defeated! +${xp} XP, +${gold} gold${lootMsg}`);
    if (egg) {
      const eggName = getSpecies(egg.speciesId)?.name ?? egg.speciesId;
      pushLog(`🥚 You found a ${eggName} Egg! Hatch it at the Day Care.`);
    }
    if (leveled) {
      battle.player.stats = computeStats(battle.player.ref);
      battle.player.hp = battle.player.stats.maxHp;
      pushLog(`${battle.player.name} reached Lv ${battle.player.ref.level}!`);
    } else {
      // Pokémon Centrum: doléčení části max HP po vítězství.
      const pct = healPercent();
      if (pct > 0 && battle.player.hp < battle.player.stats.maxHp) {
        const heal = Math.floor((battle.player.stats.maxHp * pct) / 100);
        if (heal > 0) {
          const before = battle.player.hp;
          battle.player.hp = Math.min(battle.player.stats.maxHp, battle.player.hp + heal);
          const gained = battle.player.hp - before;
          if (gained > 0) pushLog(`Center healed ${battle.player.name} for ${gained} HP`);
        }
      }
    }
    battle.enemy = spawnEnemy(battle.area);
    battle.turn = 0; // nové setkání (kvůli Quick/Timer Ball)
    pushLog(`A wild ${battle.enemy.name} appeared (Lv ${battle.enemy.ref.level})`);
  } else {
    pushLog(`${battle.player.name} fainted!`);
    battle.teamCursor += 1;
    const team = getTeamPokemon();
    if (battle.teamCursor < team.length) {
      battle.player = makeCombatant(team[battle.teamCursor]);
      pushLog(`${battle.player.name} steps in`);
    } else {
      battle.result = "defeat";
      battle.running = false;
      pushLog("Your whole team has fainted. Defeat.");
    }
  }
}

/* ----------------------------- Chytání ----------------------------- */

/** Základní šance na chycení bojovníka jen podle jeho aktuálního HP. */
function catchChanceFor(combatant) {
  const frac = Math.max(0, Math.min(1, combatant.hp / combatant.stats.maxHp));
  return CATCH_MIN + (CATCH_MAX - CATCH_MIN) * (1 - frac);
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

/** Nastavení autocatch z herního stavu (s bezpečným výchozím). */
export function getAutocatch() {
  return (
    getState().settings?.autocatch ?? {
      enabled: false,
      newSpecies: true,
      betterIvs: true,
      shiny: true,
    }
  );
}

/** Změní nastavení autocatch (částečný patch), uloží a překreslí UI souboje. */
export function setAutocatch(patch) {
  const s = getState();
  if (!s.settings) s.settings = { autoBattle: true };
  s.settings.autocatch = { ...getAutocatch(), ...patch };
  commit();
  bus.emit(EVENTS.BATTLE_UPDATE);
  return s.settings.autocatch;
}

/** Splňuje daný nepřítel autocatch filtry (má se o něj hra pokusit)? */
function shouldAutocatch(ref, ac) {
  const isNew = !ownsSpecies(ref.speciesId);
  if (ac.newSpecies && isNew) return true;
  if (ac.shiny && ref.shiny) return true;
  if (ac.betterIvs && !isNew && ivWouldImprove(ref)) return true;
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
    pushLog(`${enemy.name} broke free!`);
    return { caught: false };
  }

  const shinyTag = enemy.ref.shiny ? " ✨" : "";
  const outcome = acquirePokemon(enemy.ref); // volá commit() (uloží i ball)
  if (outcome.added) {
    pushLog(`Caught ${enemy.name}${shinyTag}!`);
  } else if (outcome.improvements.length) {
    pushLog(`Caught a better ${enemy.name}${shinyTag} — improved ${outcome.improvements.join(", ")} (released)`);
  } else {
    pushLog(`Caught ${enemy.name}, but your own was better — released`);
  }
  battle.enemy = spawnEnemy(battle.area);
  battle.turn = 0; // nové setkání – další kolo bude 1. (kvůli Quick/Timer Ball)
  pushLog(`A wild ${battle.enemy.name} appeared (Lv ${battle.enemy.ref.level})`);
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
export function startBattle() {
  const team = getTeamPokemon();
  if (team.length === 0) return { ok: false, reason: "You have no Pokémon in your team." };

  battle = {
    running: true,
    speed: 1,
    log: [],
    area: AREAS[0],
    teamCursor: 0,
    turn: 0,
    result: null,
    player: makeCombatant(team[0]),
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
    clearTimeout(timer);
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

/** Nastaví rychlost (1/2/4) a případně přeplánuje běžící souboj. */
export function setSpeed(mult) {
  if (!battle) return;
  battle.speed = mult;
  emit();
  if (battle.running) schedule();
}

/** Úplně ukončí souboj (např. při nové hře / importu). */
export function stopBattle() {
  battle = null;
  clearTimeout(timer);
  emit();
}
