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
import { generationByRegion } from "../../data/generations.js";
import { computeStats, learnLevelUpMoves } from "./pokemonSystem.js";
import { markSeen } from "./pokedex.js";

/** Id drženého itemu, který blokuje evoluci (a v breedingu předává povahu). */
export const EVERSTONE_ID = "everstone";

/** Výchozí přátelství nově získaného jedince (0–255, kanon ~70). */
export const BASE_FRIENDSHIP = 70;
/** Strop přátelství. */
export const FRIENDSHIP_MAX = 255;
/** Přátelství potřebné pro happiness evoluci (kanon 220). */
export const FRIENDSHIP_EVOLVE = 220;
/** Přírůstek přátelství za jeden level-up (viz progression.grantXp). */
export const FRIENDSHIP_PER_LEVEL = 8;

/** Aktuální přátelství jedince (s výchozí hodnotou pro staré save). */
export function friendshipOf(pokemon) {
  return pokemon?.friendship ?? BASE_FRIENDSHIP;
}

/** Přidá jedinci přátelství (ořízne na 0–255). Mutuje jedince IN-PLACE. */
export function gainFriendship(pokemon, amount) {
  if (!pokemon) return;
  const cur = friendshipOf(pokemon);
  pokemon.friendship = Math.max(0, Math.min(FRIENDSHIP_MAX, cur + amount));
}

/** Je právě noc? (Odvozeno z reálných systémových hodin.) Noc = 18:00–5:59. */
export function isNightNow() {
  const h = new Date().getHours();
  return h >= 18 || h < 6;
}

/**
 * Generace aktuálního regionu hráče (1 = Kanto, 2 = Johto…). Řídí region-lock
 * evolucí: nelze se vyvinout na druh z POZDĚJŠÍ generace, než je aktuální region
 * (Golbat→Crobat jde jen v Johtu, ne v Kantu). Generické pro gen 3–9.
 */
function currentRegionGen() {
  const region = getState()?.progress?.region ?? "kanto";
  return generationByRegion(region)?.gen ?? 1;
}

/**
 * Je cíl evoluce v tomto běhu dostupný a povolený v aktuálním regionu?
 * false když: druh není načtený (jeho generace je vypnutá) NEBO patří pozdější
 * generaci než aktuální region.
 * @param {string} toId
 */
function targetAllowed(toId) {
  const to = getSpecies(toId);
  if (!to) return false;
  return (to.gen ?? 1) <= currentRegionGen();
}

/** Drží jedinec Everstone (a tím blokuje evoluci)? */
export function holdsEverstone(pokemon) {
  return pokemon?.heldItem === EVERSTONE_ID;
}

/**
 * Splňuje jedinec podmínku happiness metody PRÁVĚ TEĎ (přátelství + denní doba)?
 * @param {string} method "happiness" | "happiness-day" | "happiness-night"
 * @param {import("../core/state.js").OwnedPokemon} pokemon
 */
function happinessMethodReady(method, pokemon) {
  if (friendshipOf(pokemon) < FRIENDSHIP_EVOLVE) return false;
  if (method === "happiness-day") return !isNightNow();
  if (method === "happiness-night") return isNightNow();
  return true; // "happiness" bez ohledu na dobu
}

/**
 * Odpovídá poměr Attack↔Defense jedince dané stat-branch větvi?
 * @param {string} when "atk>def" | "def>atk" | "atk=def"
 * @param {{attack:number, defense:number}} stats spočtené staty jedince
 */
function statBranchMatch(when, stats) {
  if (when === "atk>def") return stats.attack > stats.defense;
  if (when === "def>atk") return stats.defense > stats.attack;
  if (when === "atk=def") return stats.attack === stats.defense;
  return false;
}

/** Lidsky čitelný popis podmínky happiness metody (pro UI). */
function happinessRequirementLabel(method) {
  if (method === "happiness-day") return "high friendship (day)";
  if (method === "happiness-night") return "high friendship (night)";
  return "high friendship";
}

/**
 * SPONTÁNNÍ evoluce jedince, kterou spouští „Evolve" tlačítko (bez itemu) – buď
 * level-up (evolvesTo/evolutionLevel), nebo happiness (evolutions[] s metodou
 * "happiness"/"happiness-day"/"happiness-night"). Region-lock: cíl musí patřit
 * generaci ≤ generaci aktuálního regionu. Item/trade evoluce řeší batoh zvlášť.
 *
 * Slouží UI (karta/tým) k zobrazení „Evolves into X …" a k tlačítku.
 * @param {import("../core/state.js").OwnedPokemon} pokemon
 * @returns {{ toId: string, toName: string, method: string, level: number|null,
 *   requirementLabel: string, ready: boolean, blocked: boolean } | null}
 */
export function evolutionInfo(pokemon) {
  const sp = getSpecies(pokemon?.speciesId);
  if (!sp) return null;
  const blocked = holdsEverstone(pokemon);

  // 1) Level-up model (evolvesTo + evolutionLevel), bez stone/trade metody.
  if (
    typeof sp.evolvesTo === "string" &&
    typeof sp.evolutionLevel === "number" &&
    sp.method !== "stone" &&
    sp.method !== "trade" &&
    targetAllowed(sp.evolvesTo)
  ) {
    const to = getSpecies(sp.evolvesTo);
    return {
      toId: sp.evolvesTo,
      toName: to?.name ?? sp.evolvesTo,
      method: "level",
      level: sp.evolutionLevel,
      requirementLabel: `Lv ${sp.evolutionLevel}`,
      ready: (pokemon.level ?? 1) >= sp.evolutionLevel,
      blocked,
    };
  }

  // 2) Happiness model (evolutions[] – „happiness" / „happiness-day" / „happiness-night").
  if (Array.isArray(sp.evolutions)) {
    const happyEvos = sp.evolutions.filter(
      (e) => typeof e.method === "string" && e.method.startsWith("happiness") && targetAllowed(e.toId),
    );
    if (happyEvos.length) {
      // Víc happiness větví (Eevee → Espeon ve DNE / Umbreon v NOCI): nabídni tu, jejíž
      // denní doba PRÁVĚ TEĎ platí – nezávisle na úrovni friendship. Bez toho by .find
      // vracel vždy první v poli (Espeon) a Umbreon (night) by se nikdy neukázal →
      // nedosažitelný. Mirror stat-branch logiky níže. „happiness" bez day/night
      // (Togepi→Togetic) matchne vždy, takže zůstane první.
      const matchesTime = (m) =>
        m === "happiness-day" ? !isNightNow() : m === "happiness-night" ? isNightNow() : true;
      const evo = happyEvos.find((e) => matchesTime(e.method)) ?? happyEvos[0];
      const to = getSpecies(evo.toId);
      return {
        toId: evo.toId,
        toName: to?.name ?? evo.toId,
        method: evo.method,
        level: null,
        requirementLabel: happinessRequirementLabel(evo.method),
        ready: happinessMethodReady(evo.method, pokemon),
        blocked,
      };
    }
  }

  // 3) Stat-branch model (Tyrogue → Hitmonlee/Hitmonchan/Hitmontop). V datech
  //    `evolutions[]` s method "stats", gatované levelem (`level`) a větví podle
  //    poměru Attack↔Defense jedince (`when`: "atk>def"|"def>atk"|"atk=def").
  //    Nabídneme VŽDY tu větev, která odpovídá AKTUÁLNÍM statům – hráč tak vidí,
  //    čím se jeho jedinec právě teď stane (a poměr může před evolucí doladit EV/IV).
  if (Array.isArray(sp.evolutions)) {
    const statEvos = sp.evolutions.filter((e) => e.method === "stats" && targetAllowed(e.toId));
    if (statEvos.length) {
      const st = computeStats(pokemon);
      const evo = statEvos.find((e) => statBranchMatch(e.when, st)) ?? statEvos[0];
      const level = evo.level ?? 20;
      const to = getSpecies(evo.toId);
      return {
        toId: evo.toId,
        toName: to?.name ?? evo.toId,
        method: "stats",
        level,
        requirementLabel: `Lv ${level} (Atk vs Def)`,
        ready: (pokemon.level ?? 1) >= level,
        blocked,
      };
    }
  }

  return null;
}

/** Může se jedinec PRÁVĚ TEĎ vyvinout (splněná podmínka, bez Everstonu)?
 *  UI podle toho zobrazí/schová tlačítko „Evolve". */
export function canEvolveNow(pokemon) {
  const info = evolutionInfo(pokemon);
  return !!info && !info.blocked && info.ready;
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
  // Living dex: pre-evoluci (fromId) teď v kolekci nemáš → v dexu bude „mezera"
  // (nechycená), ALE zůstává „viděná", takže dál ukazuje info (kde se chytá). Nová
  // forma (toId) je vlastněná → viděná (a chycená se odvodí z kolekce). markSeen idemp.
  markSeen(fromId);
  markSeen(toId);
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
    .filter((toId) => toId && targetAllowed(toId)); // region-lock: gen cíle ≤ gen regionu
}

/**
 * Na který druh se může vyvinout trade metodou (Linking Cord).
 * @param {string} speciesId
 * @returns {string|null}
 */
export function tradeEvolutionTarget(speciesId) {
  const sp = getSpecies(speciesId);
  if (!sp?.evolutions || !Array.isArray(sp.evolutions)) return null;
  const evo = sp.evolutions.find((e) => e.method === "trade" && targetAllowed(e.toId));
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

  // Sjednoceně přes evolutionInfo: pokrývá level-up i happiness a hlídá region-lock.
  const info = evolutionInfo(owned);
  if (!info) return { ok: false, reason: "This Pokémon can't evolve." };
  if (!info.ready) {
    return {
      ok: false,
      reason: info.method === "level" ? `Needs to reach ${info.requirementLabel} to evolve.` : `Needs ${info.requirementLabel} to evolve.`,
    };
  }

  const evt = applyEvolution(owned, info.toId);
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
