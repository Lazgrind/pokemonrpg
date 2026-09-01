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
import { getTeamPokemon, ownsSpecies, acquirePokemon } from "./team.js";
import { getPokeball } from "../../data/pokeballs.js";
import { ballMultiplier } from "./pokeballSystem.js";
import { createPokemon, computeStats } from "./pokemonSystem.js";
import { getSpecies } from "../../data/pokemon.js";
import { getMove } from "../../data/moves.js";
import { typeMultiplier } from "../../data/types.js";
import { grantXp } from "./progression.js";
import { rollLoot } from "./loot.js";
import { rollEggDrop } from "./eggSystem.js";
import { healPercent, ppRegenPercent } from "./buildingSystem.js";
import { markSeen } from "./pokedex.js";
import { AREAS } from "../../data/areas.js";
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

/** @type {any} */
let battle = null;
let timer = null;

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
  const id = pool[Math.floor(Math.random() * pool.length)];
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

/**
 * Poškození daným tahem vč. kategorie (physical/special), STAB a typové
 * efektivity. `avg=true` použije střed rozptylu (0.925) pro deterministický
 * odhad; jinak náhodu 0.85–1.0. Status tah (power 0) vrací dmg 0.
 * @returns {{ dmg: number, eff: number }}
 */
function calcMoveDamage(attacker, defender, move, avg = false) {
  if (!move.power) return { dmg: 0, eff: 1 };
  const eff = moveTypeMult(move, defender);
  const lvl = attacker.ref.level;
  const special = move.category === "special";
  const atk = special ? attacker.stats.spAttack : attacker.stats.attack;
  const def = special ? defender.stats.spDefense : defender.stats.defense;
  const stab = move.type && attacker.types.includes(move.type) ? 1.5 : 1;
  const base = Math.floor((((2 * lvl) / 5 + 2) * move.power * (atk / def)) / 50) + 2;
  const rand = avg ? 0.925 : 0.85 + Math.random() * 0.15;
  return { dmg: Math.max(1, Math.floor(base * eff * stab * rand)), eff };
}

/**
 * Vybere akci (tah) pro bojovníka: z tahů s PP>0 ten s NEJVYŠŠÍM očekávaným
 * poškozením proti obránci (placeholder auto-politika; skutečné auto-AI později).
 * Když nemá použitelný tah, vrátí Struggle. V manuálním módu si tah volí hráč.
 * @returns {{ slot: import("../core/state.js").MoveSlot | null, move: object }}
 */
function chooseAction(attacker, defender) {
  const slots = (attacker.ref.moves ?? []).filter((m) => (m.pp ?? 0) > 0);
  let best = null;
  let bestDmg = -1;
  for (const slot of slots) {
    const mv = getMove(slot.id);
    if (!mv) continue;
    const { dmg } = calcMoveDamage(attacker, defender, mv, true);
    if (dmg > bestDmg) {
      bestDmg = dmg;
      best = { slot, move: mv };
    }
  }
  return best ?? { slot: null, move: STRUGGLE };
}

/**
 * Provede jeden tah útočníka na obránce: spotřebuje PP, vyhodnotí accuracy
 * (minutí), spočítá a odečte poškození, zaloguje. Faint řeší volající.
 * @param {*} attacker  bojovník
 * @param {*} defender  bojovník
 * @param {{ slot: object|null, move: object }} action
 * @returns {number} skutečně způsobené poškození (0 při minutí / bez efektu)
 */
function useMove(attacker, defender, action) {
  const move = action.move;
  const side = attacker === battle.player ? "player" : "enemy"; // naše zeleně, soupeř červeně
  if (action.slot) action.slot.pp = Math.max(0, (action.slot.pp ?? 0) - 1); // spotřeba PP

  // Accuracy → minutí.
  if (move.accuracy != null && Math.random() * 100 >= move.accuracy) {
    pushLog(`${attacker.name} used ${move.name} — but it missed!`, side);
    return 0;
  }

  const { dmg, eff } = calcMoveDamage(attacker, defender, move);
  if (dmg <= 0) {
    pushLog(`${attacker.name} used ${move.name} — but nothing happened.`, side);
    return 0;
  }
  defender.hp = Math.max(0, defender.hp - dmg);
  const note = eff > 1 ? " (super effective!)" : eff < 1 ? " (not very effective)" : "";
  pushLog(`${attacker.name} used ${move.name}! ${defender.name} took ${dmg}${note}`, side);
  return dmg;
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
  const pSpd = battle.player.stats.speed;
  const eSpd = battle.enemy.stats.speed;
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
  const ballId = getSelectedBall();
  if (
    ac.enabled &&
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

  // Oba si zvolí tah (auto politika: nejvyšší očekávaný damage) a odehraje se kolo.
  const hits = runActions({
    player: chooseAction(battle.player, battle.enemy),
    enemy: chooseAction(battle.enemy, battle.player),
  });

  emit();
  flushHits(hits);
  schedule();
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
    const dmg = useMove(attacker, defender, actions[who]);
    if (dmg > 0) hits.push({ side: who === "player" ? "enemy" : "player", dmg });
    if (defender.hp <= 0) {
      handleFaint(who);
      break;
    }
  }
  return hits;
}

/** Vydá posbírané zásahy kola jako BATTLE_HIT (po překreslení scény). */
function flushHits(hits) {
  for (const h of hits) bus.emit(EVENTS.BATTLE_HIT, h);
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
    const team = getTeamPokemon();
    // Nastupuje další ŽIVÝ člen týmu (vyřazené s hp=0 přeskoč).
    let next = battle.teamCursor + 1;
    while (next < team.length && hpOf(team[next]) <= 0) next++;
    if (next < team.length) {
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

/**
 * Nastavení autocatch z herního stavu (normalizované, s bezpečným výchozím).
 * `mode`: "all" = chytat všechny, "shiny" = jen shiny.
 */
export function getAutocatch() {
  const s = getState().settings?.autocatch;
  return {
    enabled: s?.enabled ?? false,
    mode: s?.mode ?? "all",
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
  // Do boje jde první ŽIVÝ člen; když jsou všichni vyřazení, je třeba léčit.
  const firstAlive = team.findIndex((p) => hpOf(p) > 0);
  if (firstAlive < 0) {
    return { ok: false, reason: "Your whole team has fainted — heal at the Poké Center." };
  }

  battle = {
    running: true,
    log: [],
    area: AREAS[0],
    teamCursor: firstAlive,
    turn: 0,
    result: null,
    background: pickBackground(AREAS[0]),
    interlude: null,
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

/* --------------------------- Manuální souboj --------------------------- */

/** Může hráč teď zadat manuální akci? (jen manuál mód, běžící souboj, živý soupeř) */
function canManualAct() {
  if (getAutoBattle()) return { ok: false, reason: "Turn off Auto battle to fight manually." };
  if (!battle || battle.result) return { ok: false, reason: "No active battle." };
  if (!battle.running) return { ok: false, reason: "The battle is paused." };
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

  const moves = battle.player.ref.moves ?? [];
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
  const hits = runActions({ player: playerAction, enemy: chooseAction(battle.enemy, battle.player) });
  emit();
  flushHits(hits);
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
  const hits = runActions({ player: null, enemy: chooseAction(battle.enemy, battle.player) });
  emit();
  flushHits(hits);
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
  if (ballCount(ballId) <= 0) {
    return { ok: false, reason: `No ${getPokeball(ballId)?.name ?? "balls"} left` };
  }

  battle.turn = (battle.turn ?? 0) + 1;
  const r = doCatch(ballId); // spotřebuje ball; při úspěchu nahradí soupeře
  let hits = [];
  if (!r.caught) {
    // Neúspěšný hod = soupeř dostane volný útok.
    hits = runActions({ player: null, enemy: chooseAction(battle.enemy, battle.player) });
  }
  emit();
  flushHits(hits);
  return { ok: true, ...r };
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

/** Potřebuje aspoň jeden člen týmu vyléčit (chybí HP nebo PP)? Pro UI. */
export function teamNeedsHeal() {
  return getTeamPokemon().some((p) => {
    const max = computeStats(p).maxHp;
    if ((p.hp ?? max) < max) return true;
    if (Array.isArray(p.moves)) return p.moves.some((m) => m.pp < (m.maxPp ?? m.pp));
    return false;
  });
}

/** Úplně ukončí souboj (např. při nové hře / importu). */
export function stopBattle() {
  battle = null;
  clearTimeout(timer);
  emit();
}
