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
import { getTeamPokemon } from "./team.js";
import { createPokemon, computeStats } from "./pokemonSystem.js";
import { getSpecies } from "../../data/pokemon.js";
import { typeMultiplier } from "../../data/types.js";
import { grantXp } from "./progression.js";
import { AREAS } from "../../data/areas.js";

/** Druhy nepřátel pro první oblast. Později se přesune do dat oblastí. */
const ENEMY_POOL = ["pidgey", "rattata"];

/** @type {any} */
let battle = null;
let timer = null;

/** Aktuální běhový stav souboje (nebo null). */
export function getBattle() {
  return battle;
}

/** Sestaví bojovníka z jedince (staty + plné HP). */
function makeCombatant(owned) {
  const species = getSpecies(owned.speciesId);
  const stats = computeStats(owned);
  return { ref: owned, name: species.name, types: species.types, stats, hp: stats.maxHp };
}

/** Vytvoří nového divokého nepřítele podle oblasti. */
function spawnEnemy(area) {
  const id = ENEMY_POOL[Math.floor(Math.random() * ENEMY_POOL.length)];
  const level = Math.max(1, area.recommendedLevel) + Math.floor(Math.random() * 2);
  return makeCombatant(createPokemon(id, level));
}

/** Přidá řádek do logu (drží se posledních pár). */
function pushLog(msg) {
  battle.log.push(msg);
  if (battle.log.length > 30) battle.log.shift();
}

function emit() {
  bus.emit(EVENTS.BATTLE_UPDATE);
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
    const note = eff > 1 ? " (super efektivní!)" : eff < 1 ? " (slabé)" : "";
    pushLog(`${attacker.name} zasáhl za ${dmg}${note}`);
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
    const xp = 10 + enemy.ref.level * 5;
    const gold = 3 + enemy.ref.level * 2;
    const leveled = grantXp(battle.player.ref, xp);
    getState().resources.gold += gold;
    commit();
    pushLog(`${enemy.name} poražen! +${xp} XP, +${gold} gold`);
    if (leveled) {
      battle.player.stats = computeStats(battle.player.ref);
      battle.player.hp = battle.player.stats.maxHp;
      pushLog(`${battle.player.name} postoupil na Lv ${battle.player.ref.level}!`);
    }
    battle.enemy = spawnEnemy(battle.area);
    pushLog(`Objevil se divoký ${battle.enemy.name} (Lv ${battle.enemy.ref.level})`);
  } else {
    pushLog(`${battle.player.name} byl vyřazen!`);
    battle.teamCursor += 1;
    const team = getTeamPokemon();
    if (battle.teamCursor < team.length) {
      battle.player = makeCombatant(team[battle.teamCursor]);
      pushLog(`Nastupuje ${battle.player.name}`);
    } else {
      battle.result = "defeat";
      battle.running = false;
      pushLog("Celý tým je vyřazen. Prohra.");
    }
  }
}

/**
 * Spustí nový souboj s aktuálním týmem na první oblasti.
 * @returns {{ ok: boolean, reason?: string }}
 */
export function startBattle() {
  const team = getTeamPokemon();
  if (team.length === 0) return { ok: false, reason: "Nemáš žádného Pokémona v týmu." };

  battle = {
    running: true,
    speed: 1,
    log: [],
    area: AREAS[0],
    teamCursor: 0,
    result: null,
    player: makeCombatant(team[0]),
    enemy: null,
  };
  battle.enemy = spawnEnemy(battle.area);
  pushLog(`Souboj na ${battle.area.name}: ${battle.player.name} vs ${battle.enemy.name}`);
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
