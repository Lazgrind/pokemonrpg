/**
 * evolutionSystem.js – DOBROVOLNÁ evoluce jedince (R-023).
 *
 * Druh může mít v datech (data/pokemon.js) pole `evolvesTo` (id dalšího druhu)
 * a `evolutionLevel` (level, od kterého evoluce jde spustit). Evoluce NENÍ
 * automatická: jedinec může klidně dorůst až na level 100 ve své základní formě.
 * Když dosáhne `evolutionLevel`, nabídne UI (tým / karta / Pokédex) tlačítko
 * „Evolve" a hráč se sám rozhodne, zda ho vyvine.
 *
 * Evoluce mění jedince IN-PLACE: zůstává tentýž jedinec (uid, level, XP, IV, EV,
 * povaha, pohlaví, shiny), jen se mu změní `speciesId` na další formu, přepočítá
 * max HP a doučí tahy nové formy. Provádí se JEDEN krok za kliknutí (další stupeň
 * půjde vyvinout po dosažení jeho vlastního evolutionLevel). Drží-li jedinec
 * **Everstone**, evoluce je zablokovaná (kámen je i v breedingu – předává povahu).
 *
 * Pravidlo „1 kus na druh" (R-018) se týká ZÍSKÁVÁNÍ jedinců (chytání/líhnutí),
 * ne evoluce – vyvinutý jedinec je pořád tvůj vylevelovaný mazlíček, takže ho
 * nikdy „nepustíme" ani neslijeme, i kdyby vznikl duplicitní druh.
 */

import { getState, commit } from "../core/state.js";
import { bus, EVENTS } from "../core/events.js";
import { getSpecies } from "../../data/pokemon.js";
import { computeStats, learnLevelUpMoves, defaultMovesFor } from "./pokemonSystem.js";
import { MAX_LEVEL } from "./progression.js";

/** Id drženého itemu, který blokuje evoluci (a v breedingu předává povahu). */
export const EVERSTONE_ID = "everstone";

/** Drží jedinec Everstone (a tím blokuje evoluci)? */
export function holdsEverstone(pokemon) {
  return pokemon?.heldItem === EVERSTONE_ID;
}

/**
 * Na jaký druh a na jakém levelu se jedinec vyvine (jeho AKTUÁLNÍ krok).
 * Slouží UI (karta) k zobrazení „Evolves into X at Lv Y". Nezohledňuje, zda už
 * level má – to zjistíš porovnáním s pokemon.level.
 * GUARD: Jen stringové `evolvesTo` s numerickým `evolutionLevel` a BEZ stone/trade metody.
 * @param {import("../core/state.js").OwnedPokemon} pokemon
 * @returns {{ toId: string, toName: string, level: number, blocked: boolean } | null}
 */
export function evolutionInfo(pokemon) {
  const sp = getSpecies(pokemon?.speciesId);
  if (!sp || !sp.evolvesTo || sp.evolutionLevel == null) return null;
  // Guard: jen string evolvesTo, numeric evolutionLevel, bez stone/trade metody
  if (typeof sp.evolvesTo !== "string" || typeof sp.evolutionLevel !== "number" || sp.method === "stone" || sp.method === "trade") {
    return null;
  }
  const to = getSpecies(sp.evolvesTo);
  return {
    toId: sp.evolvesTo,
    toName: to?.name ?? sp.evolvesTo,
    level: sp.evolutionLevel,
    blocked: holdsEverstone(pokemon),
  };
}

/** Může se jedinec PRÁVĚ TEĎ vyvinout (má další formu, dost levelu, bez Everstonu)?
 *  UI podle toho zobrazí/schová tlačítko „Evolve". */
export function canEvolveNow(pokemon) {
  const info = evolutionInfo(pokemon);
  return !!info && !info.blocked && pokemon.level >= info.level;
}

/**
 * INTERNÍ: Vykoná samotnou evoluci (změnu speciesId, přepočet HP, doučení tahů).
 * Mutuje jedince IN-PLACE. Vrací jména pro report.
 * @param {import("../core/state.js").OwnedPokemon} owned
 * @param {string} toId nový druh
 * @returns {{ fromId: string, toId: string, fromName: string, toName: string }}
 */
function applyEvolution(owned, toId) {
  const fromId = owned.speciesId;
  const fromSp = getSpecies(fromId);
  const fromName = fromSp?.name ?? fromId;
  const oldMax = computeStats(owned).maxHp;

  owned.speciesId = toId;
  const newMax = computeStats(owned).maxHp;
  // Přírůstek max HP přidej k aktuálnímu HP (klasika: evoluce „přiroste"), ať se
  // nová forma nezraní ani neplní úplně, když byla nakřáplá.
  const cur = owned.hp ?? oldMax;
  owned.hp = Math.max(1, Math.min(newMax, cur + Math.max(0, newMax - oldMax)));

  // Doučí tahy nové formy (od levelu 0 do aktuálního) do volných slotů; při
  // plných slotech se stejně jako u level-upu nabídne nahrazení přes frontu.
  learnLevelUpMoves(owned, 0);

  const toSp = getSpecies(toId);
  return {
    fromId,
    toId,
    fromName,
    toName: toSp?.name ?? toId,
  };
}

/**
 * Na které druhy se může evolučním kamenem vyvinou (pro UI: zjištění vhodných cílů).
 * @param {string} speciesId
 * @param {string} itemId
 * @returns {string[]} pole toId
 */
export function itemEvolutionTargets(speciesId, itemId) {
  const sp = getSpecies(speciesId);
  if (!sp?.evolutions || !Array.isArray(sp.evolutions)) return [];
  return sp.evolutions
    .filter((evo) => evo.method === "item" && evo.item === itemId)
    .map((evo) => evo.toId)
    .filter(Boolean);
}

/**
 * Na který druh se může vyvinout trade metodou (Linking Cord).
 * @param {string} speciesId
 * @returns {string|null}
 */
export function tradeEvolutionTarget(speciesId) {
  const sp = getSpecies(speciesId);
  if (!sp?.evolutions || !Array.isArray(sp.evolutions)) return null;
  const evo = sp.evolutions.find((e) => e.method === "trade");
  return evo?.toId ?? null;
}

/**
 * Ručně vyvine jedince o JEDEN stupeň (na kliknutí tlačítka). Ověří podmínky
 * (existuje další forma, dost levelu, nedrží Everstone). Mutuje jedince
 * IN-PLACE: mění `speciesId`, přepočítá max HP (přírůstek se přičte k aktuálnímu
 * HP) a doučí tahy nové formy do volných slotů. Commituje a emituje
 * EVENTS.POKEMON_EVOLVED. Další stupeň půjde vyvinout po dosažení jeho levelu.
 * @param {string} uid
 * @returns {{ ok: boolean, reason?: string, fromId?: string, toId?: string, fromName?: string, toName?: string }}
 */
export function evolvePokemon(uid) {
  const owned = getState().collection.find((p) => p.uid === uid);
  if (!owned) return { ok: false, reason: "Unknown Pokémon." };
  if (holdsEverstone(owned)) return { ok: false, reason: "It's holding an Everstone." };
  const sp = getSpecies(owned.speciesId);
  if (!sp || !sp.evolvesTo || sp.evolutionLevel == null) {
    return { ok: false, reason: "This Pokémon can't evolve." };
  }
  // Guard: jen string evolvesTo, numeric evolutionLevel, bez stone/trade metody
  if (typeof sp.evolvesTo !== "string" || typeof sp.evolutionLevel !== "number" || sp.method === "stone" || sp.method === "trade") {
    return { ok: false, reason: "This Pokémon can't evolve." };
  }
  if (owned.level < sp.evolutionLevel) {
    return { ok: false, reason: `Needs to reach Lv ${sp.evolutionLevel} to evolve.` };
  }

  const evt = applyEvolution(owned, sp.evolvesTo);
  commit();
  bus.emit(EVENTS.POKEMON_EVOLVED, { uid, ...evt });
  return { ok: true, uid, ...evt };
}

/**
 * Evolve pokémon s evoluční kamenem. Vrací {ok, reason?, fromName, toName}.
 * @param {string} uid
 * @param {string} itemId
 * @returns {{ ok: boolean, reason?: string, fromName?: string, toName?: string }}
 */
export function evolveWithItem(uid, itemId) {
  const owned = getState().collection.find((p) => p.uid === uid);
  if (!owned) return { ok: false, reason: "Unknown Pokémon." };

  if (holdsEverstone(owned)) return { ok: false, reason: "It's holding an Everstone." };

  const targets = itemEvolutionTargets(owned.speciesId, itemId);
  if (targets.length === 0) {
    return { ok: false, reason: "This Pokémon can't evolve with that item." };
  }

  // Vezmi první cílový druh (obvykle jen jeden).
  const toId = targets[0];

  const res = getState().resources;
  if (!res.items || (res.items[itemId] ?? 0) <= 0) {
    return { ok: false, reason: "You don't have that item." };
  }

  // Odečti item a vyvolej evoluci.
  res.items[itemId] = (res.items[itemId] ?? 0) - 1;
  const evt = applyEvolution(owned, toId);
  commit();
  bus.emit(EVENTS.POKEMON_EVOLVED, { uid, ...evt });
  return { ok: true, ...evt };
}

/**
 * Evolve pokémon pomocí trade (Linking Cord). Vrací {ok, reason?, fromName, toName}.
 * @param {string} uid
 * @param {string} [itemId="linking-cord"]
 * @returns {{ ok: boolean, reason?: string, fromName?: string, toName?: string }}
 */
export function evolveByTrade(uid, itemId = "linking-cord") {
  const owned = getState().collection.find((p) => p.uid === uid);
  if (!owned) return { ok: false, reason: "Unknown Pokémon." };

  if (holdsEverstone(owned)) return { ok: false, reason: "It's holding an Everstone." };

  const toId = tradeEvolutionTarget(owned.speciesId);
  if (!toId) {
    return { ok: false, reason: "This Pokémon can't evolve by trade." };
  }

  const res = getState().resources;
  if (!res.items || (res.items[itemId] ?? 0) <= 0) {
    return { ok: false, reason: "You don't have a Linking Cord." };
  }

  // Odečti item a vyvolej evoluci.
  res.items[itemId] = (res.items[itemId] ?? 0) - 1;
  const evt = applyEvolution(owned, toId);
  commit();
  bus.emit(EVENTS.POKEMON_EVOLVED, { uid, ...evt });
  return { ok: true, ...evt };
}

/**
 * DEV/TEST: natvrdo nastaví jedinci level (1–MAX_LEVEL), aby šlo pohodlně testovat
 * evoluce, learnsety apod. Vynuluje XP, přenastaví tahy na výchozí sadu daného
 * levelu (`defaultMovesFor`) a dorovná HP na plné max. Commituje. NENÍ součást
 * běžné hry – jen debug tlačítka na kartě Pokémona.
 * @param {string} uid
 * @param {number} level
 * @returns {{ ok: boolean, level?: number }}
 */
export function devSetLevel(uid, level) {
  const owned = getState().collection.find((p) => p.uid === uid);
  if (!owned) return { ok: false };
  const lvl = Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(level) || 1)));
  owned.level = lvl;
  owned.xp = 0;
  owned.moves = defaultMovesFor(owned.speciesId, lvl); // čistá sada tahů pro daný level
  owned.hp = computeStats(owned).maxHp;
  commit();
  return { ok: true, level: lvl };
}

/**
 * DEV/TEST: přepne jedinci shiny stav, aby šlo pohodlně testovat shiny sprity
 * (vč. zachování shiny při evoluci). Commituje. NENÍ součást běžné hry.
 * @param {string} uid
 * @returns {{ ok: boolean, shiny?: boolean }}
 */
export function devToggleShiny(uid) {
  const owned = getState().collection.find((p) => p.uid === uid);
  if (!owned) return { ok: false };
  owned.shiny = !owned.shiny;
  commit();
  return { ok: true, shiny: owned.shiny };
}
