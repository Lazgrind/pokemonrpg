/**
 * devTools.js – ladicí (dev) akce mimo kartu jedince.
 *
 * Slouží k rychlému testování mechanik bez normálního průběhu hry (výhry,
 * chytání, líhnutí). Napojeno na Dev sekci v Nastavení (⚙). Per-jedincové dev
 * nástroje (level, shiny) zůstávají na Kartě Pokémona (`pokemonCard.js`).
 */

import { POKEMON_SPECIES, getSpecies } from "../../data/pokemon.js";
import { getState, commit } from "../core/state.js";
import { createPokemon } from "./pokemonSystem.js";
import { acquirePokemon, getStarterSpeciesId } from "./team.js";
import { ensureStartersSeen } from "./pokedex.js";
import { addEgg } from "./eggSystem.js";

/** Náhodný druh z celého Dexu (pro „přidej něco na zkoušku"). */
function randomSpeciesId() {
  const list = POKEMON_SPECIES;
  return list[Math.floor(Math.random() * list.length)].id;
}

/**
 * Přidá do inventáře vejce – daného druhu, jinak náhodného. Pak se dá vložit do
 * inkubace ve Školce a nechat vylíhnout.
 * @param {string} [speciesId]
 * @returns {{ id: string, speciesId: string, name: string }}
 */
export function devAddEgg(speciesId) {
  const id = speciesId ?? randomSpeciesId();
  const egg = addEgg(id);
  return { ...egg, name: getSpecies(id)?.name ?? id };
}

/**
 * Přidá jedince daného druhu do kolekce (přes acquirePokemon → platí R-018:
 * nový druh se přidá, duplikát slije lepší hodnoty). Výchozí druh je Ditto.
 * @param {string} [speciesId="ditto"]
 * @param {number} [level=5]
 * @returns {{ ok: boolean, name: string, outcome: any }}
 */
export function devAddPokemon(speciesId = "ditto", level = 5) {
  if (!getSpecies(speciesId)) return { ok: false, name: speciesId, outcome: null };
  const poke = createPokemon(speciesId, level);
  const outcome = acquirePokemon(poke); // commit uvnitř
  return { ok: true, name: getSpecies(speciesId)?.name ?? speciesId, outcome };
}

/**
 * Přidá hráči zlato (dev). Kladné i záporné; nikdy nespadne pod 0.
 * @param {number} amount
 * @returns {number} nový stav zlata
 */
export function devAddMoney(amount) {
  const res = getState().resources;
  res.gold = Math.max(0, (res.gold ?? 0) + amount);
  commit();
  return res.gold;
}

/* --------------------------- Dev: Story checkpointy ---------------------------
 * Rychlé „přeskočení" začátku hry na daný bod příběhu, ať nemusí tester pokaždé
 * procházet intro + celý úvod. Milníky jsou KUMULATIVNÍ (zvolený milník aplikuje
 * i všechny předchozí). Přidání dalšího kroku Kanto příběhu = jen další položka
 * do DEV_CHECKPOINTS + větev v applyOne(). */

/** Výchozí startér, když si hráč ještě žádného nevybral (dev skok). */
const DEV_DEFAULT_STARTER = "bulbasaur";
/** Výchozí jméno rivala pro dev skok (přeskočí intro s pojmenováním). */
const DEV_DEFAULT_RIVAL = "Blue";

/** Uspořádané milníky příběhu (index = pořadí; skok je kumulativní). */
export const DEV_CHECKPOINTS = [
  { key: "start", label: "① Pallet Town · máš startéra (po intru)" },
  { key: "route1", label: "② Rival poražen · Route 1 otevřená" },
  { key: "viridian", label: "③ Viridian City · Parcel quest připraven" },
  { key: "parcel", label: "④ Parcel doručen · Route 2 otevřená" },
  { key: "pewter", label: "⑤ Pewter City · u Brocka" },
  { key: "brock", label: "⑥ Brock poražen · Boulder Badge · Route 3" },
  { key: "cerulean", label: "⑦ Cerulean City · u Misty" },
  { key: "vermilion", label: "⑧ Vermilion City · S.S. Anne + HM Cut" },
];

/** Zajistí kontejnery ve stavu (starší/prázdné save). */
function ensureContainers(s) {
  if (!s.player) s.player = {};
  if (!s.progress) s.progress = {};
  if (!Array.isArray(s.progress.visited)) s.progress.visited = [];
  if (!Array.isArray(s.progress.defeatedTrainers)) s.progress.defeatedTrainers = [];
  if (!Array.isArray(s.progress.badges)) s.progress.badges = [];
  if (!s.story || typeof s.story !== "object") s.story = {};
}

/** Přidá hodnotu do pole, když tam ještě není. */
function addUnique(arr, val) {
  if (!arr.includes(val)) arr.push(val);
}

/** Zajistí, že má hráč startéra a pojmenovaného rivala (jinak by naskočilo intro). */
function ensureStarterAndRival(s) {
  if (!s.player.rivalName) s.player.rivalName = DEV_DEFAULT_RIVAL;
  if (!getStarterSpeciesId() && (s.collection?.length ?? 0) === 0) {
    const p = createPokemon(DEV_DEFAULT_STARTER, 5, { caughtBall: "poke" });
    s.collection.push(p);
    s.team.push(p.uid);
    s.player.starterId = DEV_DEFAULT_STARTER;
    ensureStartersSeen();
  }
}

/** Aplikuje JEDEN milník na stav (bez commitu). */
function applyOne(s, key) {
  switch (key) {
    case "start":
      ensureStarterAndRival(s);
      s.progress.activeAreaId = "pallet-town";
      break;
    case "route1":
      // Rival gate „splněn" (vyhráno/prohráno je jedno) → Route 1 odemčená.
      addUnique(s.progress.defeatedTrainers, "rival-pallet");
      break;
    case "viridian":
      // Ve Viridianu, ale balíček ještě nemá → Parcel quest jde otestovat.
      addUnique(s.progress.visited, "route-01");
      addUnique(s.progress.visited, "viridian-city");
      s.progress.activeAreaId = "viridian-city";
      break;
    case "parcel":
      // Balíček převzat i doručen → sever (Route 2) otevřený.
      s.story.oakParcelGiven = true;
      s.story.oakParcelDelivered = true;
      addUnique(s.progress.visited, "route-02");
      break;
    case "pewter":
      addUnique(s.progress.visited, "viridian-forest");
      addUnique(s.progress.visited, "pewter-city");
      s.progress.activeAreaId = "pewter-city";
      break;
    case "brock":
      // Brock poražen → Boulder Badge, otevře se Route 3. brockCleared ať event
      // odměny znovu nevyskočí (dostals ji „už dřív").
      addUnique(s.progress.defeatedTrainers, "brock");
      addUnique(s.progress.badges, "boulder-badge");
      s.story.brockCleared = true;
      break;
    case "cerulean":
      // Prošel jsi Route 3 → Mt. Moon → Route 4 až do Cerulean City (u Misty).
      addUnique(s.progress.visited, "route-03");
      addUnique(s.progress.visited, "mt-moon");
      addUnique(s.progress.visited, "route-04");
      addUnique(s.progress.visited, "cerulean-city");
      // Team Rocket v Mt. Moon poražen → gate Route 4 splněn (jinak by ses do
      // Cerulean nedostal). Grunts označíme za poražené, ať Rockets tab ukáže hotovo.
      for (let i = 1; i <= 5; i++) addUnique(s.progress.defeatedTrainers, `mt-moon-rocket-${i}`);
      s.story.mtMoonRocketsCleared = true;
      s.progress.activeAreaId = "cerulean-city";
      break;
    case "vermilion":
      // Cesta Cerulean → Route 24/25 (Bill) → Route 5/6 → Vermilion; na S.S. Anne
      // poražen rival → HM Cut. Vermilion Gym (Lt. Surge) je tím odemčený.
      addUnique(s.progress.visited, "route-24");
      addUnique(s.progress.visited, "route-25");
      addUnique(s.progress.visited, "route-05");
      addUnique(s.progress.visited, "route-06");
      addUnique(s.progress.visited, "vermilion-city");
      s.story.nuggetBridge = true;
      s.story.billHelped = true;
      addUnique(s.progress.defeatedTrainers, "rival-ss-anne");
      s.story.ssAnneCleared = true;
      s.story.hasCut = true;
      s.story.vermilionArrival = true;
      // HM Cut item do batohu (odpovídá reálné odměně ze S.S. Anne).
      if (!s.resources) s.resources = {};
      if (!s.resources.items) s.resources.items = {};
      s.resources.items["hm01-cut"] = (s.resources.items["hm01-cut"] ?? 0) + 1;
      s.progress.activeAreaId = "vermilion-city";
      break;
  }
}

/**
 * Vynuluje příběhový postup na čistý základ (Pallet, nic navštíveno/poraženo,
 * žádné parcel flagy ani odznaky). Kolekci, tým, zlato a itemy NECHÁVÁ být –
 * maže jen to, co „Skip to" sám staví, aby byl skok DETERMINISTICKÝ (skok na X
 * tě dá přesně na X, ne na „X nebo víc" podle předchozího stavu).
 */
function resetStoryProgress(s) {
  s.progress.visited = [];
  s.progress.defeatedTrainers = [];
  s.progress.badges = [];
  s.progress.activeAreaId = "pallet-town";
  // Všechny příběhové flagy pryč → skok je plně deterministický (skok na X tě
  // dá přesně na X). Pickup/quest/event flagy (parcel, fosílie, nugget…) se tak
  // znovu naabízí, když danou oblastí projdeš.
  s.story = {};
}

/**
 * Skok na daný story milník. Nejdřív vynuluje příběhový postup (deterministické),
 * pak aplikuje zvolený milník i všechny předchozí (kumulativně). Nastaví startéra,
 * rivala, story-flagy, navštívené oblasti a poražené trenéry podle potřeby.
 * @param {string} key  klíč z DEV_CHECKPOINTS
 * @returns {{ ok: boolean, label: string }}
 */
export function devApplyCheckpoint(key) {
  const idx = DEV_CHECKPOINTS.findIndex((c) => c.key === key);
  if (idx < 0) return { ok: false, label: key };
  const s = getState();
  ensureContainers(s);
  resetStoryProgress(s); // čistý základ → skok je deterministický
  for (let i = 0; i <= idx; i++) applyOne(s, DEV_CHECKPOINTS[i].key);
  commit();
  return { ok: true, label: DEV_CHECKPOINTS[idx].label };
}
