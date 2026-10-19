/**
 * progression.js – XP a levelování (zadání sekce 6: Progression system).
 */

import { learnLevelUpMoves } from "./pokemonSystem.js";
import { gainFriendship, FRIENDSHIP_PER_LEVEL } from "./evolutionSystem.js";
import { getState, commit } from "../core/state.js";
import { bus, EVENTS } from "../core/events.js";
import { GYMS } from "../../data/gyms.js";
import { getTrainer, LEAGUE } from "../../data/trainers.js";
import { generationByRegion } from "../../data/generations.js";
import { xpBoostMult } from "./buildingSystem.js";

/** Nejvyšší dosažitelný level jedince. Evoluce je dobrovolná (viz
 *  evolutionSystem) – i nevyvinutý druh může dorůst až sem. */
export const MAX_LEVEL = 100;

/** Nejvyšší level v týmu daného trenéra (ace), 0 když trenér/tým chybí. */
function trainerAceLevel(id) {
  const t = getTrainer(id);
  if (!t?.team?.length) return 0;
  return t.team.reduce((m, mon) => Math.max(m, mon.level ?? 0), 0);
}

/**
 * Aktuální strop levelu (level cap) dle postupu příběhem. Vypnutý (rule off) =
 * MAX_LEVEL. Zapnutý = ace level DALŠÍHO neporaženého gym leadera AKTIVNÍHO
 * REGIONU (podle získaných odznaků, kanonické pořadí); po všech 8 odznacích
 * regionu strop dle nejsilnějšího člena tamní Ligy; po zisku titulu daného
 * regionu (clearStoryFlag ligy – kanto isChampion / johto isJohtoChampion)
 * už bez limitu.
 *
 * REGION-AWARE: GYMS/LEAGUE jsou po per-gen splitu agregát přes generace, takže
 * globální iterace by kantskému hráči se 4/8 odznaky (ale bez titulu) propadla
 * na johtský gym a dala nesmyslně nízký strop. Scope-ujeme na region hráče.
 *
 * Drží tempo hry blíž kánonu (proti přelevelování v idle režimu). Je to
 * volitelné pravidlo (settings.rules.levelCap), defaultně vypnuté.
 * @returns {number}
 */
export function currentLevelCap() {
  const state = getState();
  if (state?.settings?.rules?.levelCap !== true) return MAX_LEVEL;
  const badges = state.progress?.badges ?? [];
  const region = state.progress?.region ?? "kanto";
  const gen = generationByRegion(region);
  const gyms = gen?.gyms ?? GYMS; // fallback: neznámý region → globální agregát
  // Strop = ace prvního gymu DANÉHO REGIONU, jehož odznak ještě nemám.
  for (const gym of gyms) {
    if (!badges.includes(gym.badge)) {
      return trainerAceLevel(gym.leaderId) || MAX_LEVEL;
    }
  }
  // Všech 8 odznaků regionu: po zisku titulu regionu bez limitu, jinak liga.
  const league = gen?.league ?? LEAGUE;
  const championFlag = league?.clearStoryFlag; // kanto: isChampion / johto: isJohtoChampion
  if (championFlag && state.story?.[championFlag]) return MAX_LEVEL;
  const leagueMax = (league?.order ?? []).reduce(
    (m, id) => Math.max(m, trainerAceLevel(id)),
    0
  );
  return leagueMax || MAX_LEVEL;
}

/**
 * Kolik XP je potřeba k postupu z daného levelu na další.
 * @param {number} level
 * @returns {number}
 */
export function xpForNextLevel(level) {
  return level * level * 10;
}

/**
 * Přidá jedinci XP a případně ho zleveluje (i vícekrát najednou). Při level-upu
 * se z learnsetu naučí nové tahy (viz learnLevelUpMoves). Mutuje předaného jedince.
 *
 * `auto` řídí chování při PLNÝCH 4 slotech: v automatickém režimu (auto battle,
 * offline idle, Školka) se nový tah rovnou naučí přepsáním nejslabšího tahu; v
 * manuálním souboji (auto=false) se místo toho zařadí do fronty a hráč se dozeptá
 * přes vyskakovací okno (moveLearnView).
 * @param {import("../core/state.js").OwnedPokemon} pokemon
 * @param {number} amount
 * @param {{ auto?: boolean }} [opts]
 * @returns {boolean} true, pokud došlo aspoň k jednomu level-upu
 */
export function grantXp(pokemon, amount, { auto = false } = {}) {
  const prevLevel = pokemon.level;
  // Efektivní strop: nikdy víc než MAX_LEVEL, ale zapnutý level cap ho může
  // stáhnout níž (dle postupu příběhem). Na stropu už jedinec XP nesbírá.
  const cap = Math.max(1, Math.min(MAX_LEVEL, currentLevelCap()));
  // ⭐ Boost linka „XP" z Trainer Boost Center (Celadon) násobí VŠECHEN zisk XP
  // (souboj i idle). Bez budovy = ×1.
  amount = Math.round(amount * xpBoostMult());
  pokemon.xp += amount;
  let leveledUp = false;
  while (pokemon.level < cap && pokemon.xp >= xpForNextLevel(pokemon.level)) {
    pokemon.xp -= xpForNextLevel(pokemon.level);
    pokemon.level += 1;
    leveledUp = true;
    gainFriendship(pokemon, FRIENDSHIP_PER_LEVEL); // level-up ⇒ roste přátelství (happiness evoluce)
  }
  if (pokemon.level >= cap) pokemon.xp = 0; // na stropu už XP nesbírá
  if (leveledUp) learnLevelUpMoves(pokemon, prevLevel, { auto });
  // Emit event pro achievement systém (až po learnLevelUpMoves)
  if (leveledUp) bus.emit(EVENTS.LEVEL_UP, { pokemon, level: pokemon.level });
  return leveledUp;
}

/**
 * Rare Candy: okamžitý +1 level. Respektuje efektivní strop (MAX_LEVEL i zapnutý
 * level cap dle postupu). XP se nastaví na začátek nového levelu (zbytek se
 * zahodí, jako v kánonu). Nové tahy z learnsetu se nabídnou přes frontu
 * (auto=false → moveLearnView vyskočí i mimo souboj, viz initMoveLearnPrompts).
 * Mutuje jedince. Vrací true při úspěchu, false když je už na stropu.
 * @param {import("../core/state.js").OwnedPokemon} pokemon
 * @returns {boolean}
 */
export function rareCandyLevelUp(pokemon) {
  const cap = Math.max(1, Math.min(MAX_LEVEL, currentLevelCap()));
  if (pokemon.level >= cap) return false;
  const prevLevel = pokemon.level;
  pokemon.level += 1;
  pokemon.xp = 0;
  gainFriendship(pokemon, FRIENDSHIP_PER_LEVEL); // Rare Candy level-up ⇒ přátelství
  learnLevelUpMoves(pokemon, prevLevel, { auto: false });
  return true;
}
