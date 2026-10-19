/**
 * team.js – správa kolekce a aktivního týmu (max 6, zadání sekce 9).
 *
 * Kolekce = všichni vlastnění Pokémoni. Tým = pole uid odkazujících do kolekce.
 * Každá změna volá commit(), aby se aktualizovalo UI.
 */

import { getState, commit, MAX_TEAM_SIZE } from "../core/state.js";
import { createPokemon, STAT_KEYS, emptyEvs } from "./pokemonSystem.js";
import { pokemonEngagement } from "./buildingSystem.js";
import { ensureStartersSeen, dexCountsByGen, markSeen } from "./pokedex.js";
import { STARTER_IDS, getSpecies } from "../../data/pokemon.js";
import { generationByRegion } from "../../data/generations.js";
import { recordRelease } from "./achievementSystem.js";

/**
 * Výběr startovního Pokémona – jen dokud je kolekce prázdná.
 * @param {string} speciesId
 * @returns {boolean}
 */
export function chooseStarter(speciesId) {
  const s = getState();
  if (s.collection.length > 0) return false;
  const p = createPokemon(speciesId, 5, { caughtBall: "poke" }); // startér přichází v Poké Ballu
  s.collection.push(p);
  s.team.push(p.uid);
  // Zapamatuj volbu startera explicitně (rival si podle ní bere counter-startera).
  if (s.player) s.player.starterId = speciesId;
  ensureStartersSeen(); // všechny startéry jsme viděli na výběrové obrazovce
  commit();
  return true;
}

/**
 * Druh hráčova startera. Primárně z `state.player.starterId` (ukládá chooseStarter);
 * fallback pro starší save = první jedinec v kolekci, jehož druh je mezi startéry.
 * @returns {string|null}
 */
export function getStarterSpeciesId() {
  const s = getState();
  if (s.player?.starterId) return s.player.starterId;
  const starter = (s.collection ?? []).find((p) => STARTER_IDS.includes(p.speciesId));
  return starter?.speciesId ?? null;
}

/**
 * Region, kde se právě hraje (fallback „kanto"). Uniqueness kolekce i catch-flow
 * jsou region-aware: „1 kus na druh" platí PER REGION, protože gen-1 druhy jdou
 * znovu chytit v Johtu (region-lock v boji + kánon Johto dexu). Viz acquirePokemon.
 */
function activeRegion() {
  return getState().progress?.region ?? "kanto";
}

/** Region chycení jedince (staré save bez pole → „kanto"). */
function regionOf(p) {
  return p?.caughtRegion ?? "kanto";
}

/**
 * Máš tento druh v kolekci KDEKOLI (napříč regiony)? Používá se pro GLOBÁLNÍ
 * sémantiku – Pokédex je národní a jednorázové story-dárky (Mew, výměny…) se
 * nemají spouštět znovu jen proto, že jsi v jiném regionu. Pro catch/merge, kde
 * jde o „1 kus na druh v TOMHLE regionu", použij ownsSpeciesInRegion.
 */
export function ownsSpecies(speciesId) {
  return getState().collection.some((p) => p.speciesId === speciesId);
}

/**
 * Máš tento druh chycený v daném regionu? (Default = aktuální region.) Klíč
 * unikátnosti kolekce je `druh + region`: kantského Golbata a johtského Golbata
 * lze vlastnit současně (kantský je v Johtu zamčený, johtský je čerstvý).
 * @param {string} speciesId
 * @param {string} [region] default = aktuální region
 */
export function ownsSpeciesInRegion(speciesId, region = activeRegion()) {
  return getState().collection.some(
    (p) => p.speciesId === speciesId && regionOf(p) === region
  );
}

/**
 * Zlepšil by tento (nově získaný) jedinec IV existujícího jedince téhož druhu
 * V TOMTÉŽ REGIONU? Používá autocatch filtr „lepší IV" i UI. Nemutuje. Když
 * druh v daném regionu nemáš, vrací false (to je „nový druh", řeší se zvlášť).
 * @param {import("../core/state.js").OwnedPokemon} pokemon
 * @returns {boolean}
 */
export function ivWouldImprove(pokemon) {
  const region = regionOf(pokemon);
  const existing = getState().collection.find(
    (p) => p.speciesId === pokemon.speciesId && regionOf(p) === region
  );
  if (!existing) return false;
  return STAT_KEYS.some((k) => (pokemon.ivs?.[k] ?? 0) > (existing.ivs?.[k] ?? 0));
}

/**
 * Získá jedince do kolekce podle pravidla „1 kus na druh PER REGION, sluč lepší
 * hodnoty":
 *  - když druh v regionu chycení ještě nemáš → přidá se do kolekce,
 *  - když už ho v tom regionu máš → do stávajícího jedince se přepíšou LEPŠÍ
 *    hodnoty (per-stat vyšší IV/EV, shiny), level a XP zůstávají stávajícímu;
 *    nově získaný jedinec se „pustí" (nepřidává se). Zdroj: rozhodnutí R-018.
 * Region se bere z `pokemon.caughtRegion` (stampuje createPokemon), takže
 * kantský Golbat v PC NEbrání chytit čerstvého johtského Golbata – vznikne
 * druhá, samostatná instance. Národní Pokédex je tím nedotčen (počítá po druzích).
 * @param {import("../core/state.js").OwnedPokemon} pokemon nově získaný jedinec
 * @returns {{ added: boolean, released: boolean, pokemon: import("../core/state.js").OwnedPokemon, improvements: string[] }}
 */
export function acquirePokemon(pokemon) {
  const s = getState();
  // Living dex: „chyceno" = aktuální kolekce (po evoluci/prodeji druh zmizí = mezera).
  // Ale „viděno" si držíme NATRVALO, aby i evolvený/puštěný druh v Pokédexu dál
  // ukazoval své info (kde se chytá apod.). markSeen je idempotentní.
  markSeen(pokemon.speciesId);
  const region = regionOf(pokemon);
  const existing = s.collection.find(
    (p) => p.speciesId === pokemon.speciesId && regionOf(p) === region
  );
  if (!existing) {
    s.collection.push(pokemon);
    commit();
    return { added: true, released: false, pokemon, improvements: [] };
  }

  // Merge: přenes jen lepší hodnoty do stávajícího jedince.
  if (!existing.ivs) existing.ivs = { ...(pokemon.ivs ?? {}) };
  if (!existing.evs) existing.evs = emptyEvs();
  const improvements = [];
  if (pokemon.shiny && !existing.shiny) {
    existing.shiny = true;
    improvements.push("shiny");
  }
  for (const k of STAT_KEYS) {
    if ((pokemon.ivs?.[k] ?? 0) > (existing.ivs[k] ?? 0)) {
      existing.ivs[k] = pokemon.ivs[k];
      improvements.push(`IV ${k}`);
    }
    if ((pokemon.evs?.[k] ?? 0) > (existing.evs[k] ?? 0)) {
      existing.evs[k] = pokemon.evs[k];
      improvements.push(`EV ${k}`);
    }
  }
  commit();
  return { added: false, released: true, pokemon: existing, improvements };
}

/**
 * Vlastní hráč Shiny Charm pro daný region? Charm je REGIONÁLNÍ (per-gen): uděluje
 * se za kompletní Pokédex DANÉHO regionu a ×3 shiny bonus platí JEN v tom regionu.
 * Po přechodu Kanto→Johto johtský Charm hráč nemá, dokud nedokončí johtský dex;
 * po návratu do Kanta zase platí kantský (pokud ho získal). Zdroj pravdy:
 * `story.shinyCharmByRegion[region]`. Viz grantDexDiploma, battle/breeding spawn.
 * @param {string} [region] default = aktuální region hry
 * @returns {boolean}
 */
export function hasShinyCharm(region = activeRegion()) {
  return !!getState().story?.shinyCharmByRegion?.[region];
}

/**
 * Získal hráč Pokédex Diplom DANÉHO regionu? (regionální, per-gen – každý region
 * má vlastní diplom za kompletní regionální Pokédex). Zdroj: `story.dexDiplomaByRegion`.
 * @param {string} [region] default = aktuální region hry
 * @returns {boolean}
 */
export function hasDexDiploma(region = activeRegion()) {
  return !!getState().story?.dexDiplomaByRegion?.[region];
}

/**
 * Capstone daného regionu: udělí regionální Diplom + regionální Shiny Charm, POKUD
 * má hráč kompletní Pokédex TÉ generace a ještě diplom regionu nemá. NEspouští se
 * automaticky – volá ho lab profesora regionu (Oak/Kanto, Elm/Johto), když si hráč
 * o dexu promluví. Shiny Charm násobí shiny JEN ve svém regionu (viz hasShinyCharm).
 * Idempotentní přes `story.dexDiplomaByRegion[region]`. Vizuální oslavu zobrazí
 * VOLAJÍCÍ přes `ui/diploma.startDiplomaCeremony` – tady jen stav.
 * @param {string} [region] region, pro který se diplom uděluje (default aktuální)
 * @returns {boolean} true, když byl Diplom právě udělen (jinak false)
 */
export function grantDexDiploma(region = activeRegion()) {
  const s = getState();
  if (!s.story || typeof s.story !== "object") s.story = {};
  if (!s.story.dexDiplomaByRegion) s.story.dexDiplomaByRegion = {};
  if (!s.story.shinyCharmByRegion) s.story.shinyCharmByRegion = {};
  if (s.story.dexDiplomaByRegion[region]) return false; // už uděleno pro tento region
  // Kompletní dex TÉTO generace (ne globální národní) – per-region capstone.
  const gen = generationByRegion(region)?.gen ?? 1;
  const byGen = dexCountsByGen()[gen];
  if (!byGen || byGen.total === 0 || byGen.caught < byGen.total) return false;
  s.story.dexDiplomaByRegion[region] = true;
  s.story.shinyCharmByRegion[region] = true;
  // Shiny Charm zapneme (přepínatelný v horní liště přes settings.shinyCharmActive).
  if (!s.settings || typeof s.settings !== "object") s.settings = {};
  s.settings.shinyCharmActive = true;
  commit();
  return true;
}

/**
 * Přidá jedince z kolekce do týmu.
 * @param {string} uid
 * @returns {boolean}
 */
export function addToTeam(uid) {
  const s = getState();
  if (s.team.includes(uid)) return false;
  if (s.team.length >= MAX_TEAM_SIZE) return false;
  const p = s.collection.find((p) => p.uid === uid);
  if (!p) return false;
  if (!canBattleInRegion(p)) return false; // region-lock: cizoregionální kus do týmu nepatří
  // Jedinec může být jen na jednom místě: ve Školce (výcvik) nebo breedingu
  // ho nejdřív musíš vyzvednout. UI ho jako přidatelného ani nenabízí.
  if (pokemonEngagement(uid)) return false;
  s.team.push(uid);
  commit();
  return true;
}

/**
 * Přidá jedince z kolekce do týmu na KONKRÉTNÍ pozici (index). Používá drag &
 * drop z PC boxu na daný slot týmu. Index se ořízne do platného rozsahu
 * (0..délka týmu = vložení na konec). Stejné guardy jako addToTeam.
 * @param {string} uid
 * @param {number} index
 * @returns {boolean}
 */
export function addToTeamAt(uid, index) {
  const s = getState();
  if (s.team.includes(uid)) return false;
  if (s.team.length >= MAX_TEAM_SIZE) return false;
  const p = s.collection.find((p) => p.uid === uid);
  if (!p) return false;
  if (!canBattleInRegion(p)) return false; // region-lock
  if (pokemonEngagement(uid)) return false;
  const i = Math.max(0, Math.min(Number(index) || 0, s.team.length));
  s.team.splice(i, 0, uid);
  commit();
  return true;
}

/**
 * Přetáhne jedince z PC na KONKRÉTNÍ slot týmu s VÝMĚNOU. Když je cílový slot
 * obsazený, nový jedinec ten slot zabere a původní jedinec se z týmu vyhodí
 * (spadne zpět do PC boxu přes reconcile) – takže jde prohodit i do plného týmu.
 * Když je slot prázdný (za koncem týmu), jen se přidá (pokud je v týmu místo).
 * @param {string} uid jedinec z PC
 * @param {number} index cílový slot týmu
 * @returns {boolean}
 */
export function swapIntoTeam(uid, index) {
  const s = getState();
  if (s.team.includes(uid)) return false;
  const p = s.collection.find((p) => p.uid === uid);
  if (!p) return false;
  if (!canBattleInRegion(p)) return false; // region-lock
  if (pokemonEngagement(uid)) return false; // ve Školce/breedingu – nejdřív vyzvednout
  const i = Math.max(0, Math.min(Number(index) || 0, s.team.length));
  if (i < s.team.length) {
    s.team[i] = uid; // výměna: starý jedinec vypadne z týmu → reconcile ho uklidí do PC
  } else {
    if (s.team.length >= MAX_TEAM_SIZE) return false; // prázdný slot, ale tým je plný
    s.team.splice(i, 0, uid);
  }
  commit();
  return true;
}

/**
 * Přeuspořádá tým – přesune jedince na cílový index (drag & drop v rámci týmu).
 * Cíl se ořízne do platného rozsahu. Vrací false, když jedinec není v týmu nebo
 * by se nic nezměnilo.
 * @param {string} uid
 * @param {number} toIndex
 * @returns {boolean}
 */
export function reorderTeam(uid, toIndex) {
  const s = getState();
  const from = s.team.indexOf(uid);
  if (from === -1) return false;
  const to = Math.max(0, Math.min(Number(toIndex) || 0, s.team.length - 1));
  if (from === to) return false;
  s.team.splice(from, 1);
  s.team.splice(to, 0, uid);
  commit();
  return true;
}

/**
 * Odebere jedince z týmu (zůstává v kolekci).
 * @param {string} uid
 * @returns {boolean}
 */
export function removeFromTeam(uid) {
  const s = getState();
  const i = s.team.indexOf(uid);
  if (i === -1) return false;
  s.team.splice(i, 1);
  commit();
  return true;
}

/**
 * Posune jedince v týmu doleva (-1) nebo doprava (+1).
 * @param {string} uid
 * @param {number} dir
 * @returns {boolean}
 */
export function moveInTeam(uid, dir) {
  const s = getState();
  const i = s.team.indexOf(uid);
  if (i === -1) return false;
  const j = i + dir;
  if (j < 0 || j >= s.team.length) return false;
  [s.team[i], s.team[j]] = [s.team[j], s.team[i]];
  commit();
  return true;
}

/**
 * Nadobro odebere jedince ze hry – z týmu, z kolekce i z PC boxů. Používá
 * Nuzlocke permadeath (omdlelý jedinec navždy padne). Vrací true, když někoho
 * skutečně odebral.
 * @param {string} uid
 * @returns {boolean}
 */
export function releasePokemon(uid) {
  const s = getState();
  let removed = false;
  const ti = s.team.indexOf(uid);
  if (ti !== -1) {
    s.team.splice(ti, 1);
    removed = true;
  }
  const ci = s.collection.findIndex((p) => p.uid === uid);
  if (ci !== -1) {
    s.collection.splice(ci, 1);
    removed = true;
  }
  // Pro jistotu i z PC boxů (jedinec mohl být uložený mimo tým).
  for (const box of s.pcBoxes ?? []) {
    if (!Array.isArray(box.slots)) continue;
    for (let i = 0; i < box.slots.length; i++) {
      if (box.slots[i] === uid) {
        box.slots[i] = null;
        removed = true;
      }
    }
  }
  if (removed) {
    recordRelease(); // achievement: puštění Pokémona (self-commit uvnitř)
    commit();
  }
  return removed;
}

/**
 * Vrátí jedince aktivního týmu ve správném pořadí.
 * @returns {import("../core/state.js").OwnedPokemon[]}
 */
export function getTeamPokemon() {
  const s = getState();
  return s.team
    .map((uid) => s.collection.find((p) => p.uid === uid))
    .filter(Boolean);
}

/** Je daný jedinec v týmu? */
export function isInTeam(uid) {
  return getState().team.includes(uid);
}

/* --------------------------- Region-lock týmu ---------------------------- *
 * Pokédex i kolekce se mezi regiony přenášejí, ALE bojovat v daném regionu
 * smí jen Pokémoni jeho generace (gen 1 v Kantu, gen 2 v Johtu…). Tým se
 * nefiltruje (indexy/teamCursor zůstávají stabilní) – jen se přidá predikát
 * „smí tu bojovat", který používají alive-checky v battleSystem a switch UI.
 */

/** Číslo generace aktivního regionu (fallback 1 = Kanto). */
export function currentRegionGen() {
  const region = getState().progress?.region ?? "kanto";
  return generationByRegion(region)?.gen ?? 1;
}

/**
 * Smí tenhle jedinec bojovat v aktuálním regionu? Region-lock je podle MÍSTA
 * CHYCENÍ, ne podle generace druhu: v Johtu smí bojovat jen jedinci chycení
 * v Johtu – a to i gen-1 druhy (Onix, Eevee…), které tam hráč znovu chytí a
 * teprve tam vyvine na gen-2 formu (Steelix, Espeon…). Starý tým z Kanta tak
 * zůstane odříznutý, ale evoluční linky gen 2 jsou plně získatelné.
 *
 * Staré save (jedinci bez `caughtRegion`) padnou na „kanto" – všichni vznikli
 * před příchodem Johta, takže to sedí. (Neřeší HP – to je zvlášť.)
 * @param {import("../core/state.js").OwnedPokemon} p
 */
export function canBattleInRegion(p) {
  if (!p) return false;
  const region = getState().progress?.region ?? "kanto";
  const caught = p.caughtRegion ?? "kanto";
  return caught === region;
}

/** Má hráč v týmu aspoň jednoho živého Pokémona způsobilého pro tento region? */
export function hasBattleEligiblePokemon() {
  return getTeamPokemon().some(
    (p) => canBattleInRegion(p) && (p.hp ?? Infinity) > 0
  );
}
