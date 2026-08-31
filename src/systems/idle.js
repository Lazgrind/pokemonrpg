/**
 * idle.js – offline (idle) progres (zadání, sekce 13).
 *
 * Když hráč nechá souboj běžet a odejde, po návratu mu dopočítáme odměnu
 * za dobu nepřítomnosti. Používáme odhad podle síly: z uloženého souboje
 * spočítáme, jak rychle hráč zabíjí nepřátele, a z toho odvodíme počet
 * poražených za čas pryč. Vše je násobeno OFFLINE_EFFICIENCY, protože
 * offline má být záměrně slabší než aktivní hraní.
 *
 * Progres se počítá JEN když byl souboj uložen jako běžící (running=true).
 * Když ho hráč pauzl nebo ukončil, hra „neidluje“.
 */

import { getState, commit } from "../core/state.js";
import { createPokemon } from "./pokemonSystem.js";
import { grantXp } from "./progression.js";
import { makeCombatant, avgDamage, battleRewards } from "./battleSystem.js";
import { expectedLoot } from "./loot.js";
import { AREAS } from "../../data/areas.js";

/** Účinnost offline progresu vůči aktivnímu hraní. Laditelné jedním číslem. */
export const OFFLINE_EFFICIENCY = 0.1; // 1/10 – aktivní hraní je jasně výhodnější

/** Strop offline času (delší nepřítomnost se dál nepočítá). */
export const OFFLINE_CAP_HOURS = 8;

/** Kratší nepřítomnost než tohle ignorujeme (běžný refresh). */
const MIN_OFFLINE_SECONDS = 15;

/**
 * Spočítá a rovnou aplikuje offline progres. Vrací přehled pro UI, nebo null,
 * když se nic nezapočítalo.
 * @param {*} savedBattle  snímek souboje ze save (getState().battle před restore)
 * @param {number} elapsedMs  doba od posledního uložení
 * @returns {null | { elapsedSec: number, capped: boolean, kills: number, xp: number, gold: number, loot: Record<string, number> }}
 */
export function applyOfflineProgress(savedBattle, elapsedMs) {
  // Idlujeme jen z běžícího souboje.
  if (!savedBattle || !savedBattle.running || savedBattle.result) return null;

  const elapsedSec = Math.floor(elapsedMs / 1000);
  if (elapsedSec < MIN_OFFLINE_SECONDS) return null;

  const capSec = OFFLINE_CAP_HOURS * 3600;
  const usableSec = Math.min(elapsedSec, capSec);

  // Rekonstrukce hráče z kolekce (podle uid) a reprezentativního nepřítele.
  const owned = getState().collection.find((p) => p.uid === savedBattle.playerUid);
  if (!owned) return null;

  const player = makeCombatant(owned);
  const enemyLevel = savedBattle.enemy.level;
  const enemy = makeCombatant(createPokemon(savedBattle.enemy.speciesId, enemyLevel));

  // Odhad: kolik sekund trvá poražení jednoho nepřítele (rychlost 1×).
  const dmg = avgDamage(player, enemy);
  const roundsToKill = Math.max(1, Math.ceil(enemy.stats.maxHp / dmg));
  const secondsPerKill = roundsToKill; // 1 kolo ≈ 1 s při rychlosti 1×

  // Zlomkový počet poražených (žádný ztracený progres) × účinnost offline.
  const effectiveKills = (usableSec / secondsPerKill) * OFFLINE_EFFICIENCY;

  // Odměny počítáme ze zlomku a teprve pak zaokrouhlíme dolů.
  const { xp, gold } = battleRewards(enemyLevel);
  const totalXp = Math.floor(effectiveKills * xp);
  const totalGold = Math.floor(effectiveKills * gold);
  const area = AREAS.find((a) => a.id === savedBattle.areaId) ?? AREAS[0];
  const loot = expectedLoot(area, effectiveKills);

  // Když by výsledek zaokrouhlil na úplnou nulu, nemá cenu nic hlásit.
  const anyLoot = Object.keys(loot).length > 0;
  if (totalXp <= 0 && totalGold <= 0 && !anyLoot) return null;

  // Aplikace na stav.
  grantXp(owned, totalXp);
  const res = getState().resources;
  res.gold += totalGold;
  for (const [resource, amount] of Object.entries(loot)) {
    res[resource] = (res[resource] ?? 0) + amount;
  }
  commit();

  return {
    elapsedSec,
    capped: elapsedSec > capSec,
    kills: Math.round(effectiveKills),
    xp: totalXp,
    gold: totalGold,
    loot,
  };
}

/** Naformátuje trvání (sekundy) na „Xh Ym“ / „Ym Zs“. */
export function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min ${s} s`;
  return `${s} s`;
}
