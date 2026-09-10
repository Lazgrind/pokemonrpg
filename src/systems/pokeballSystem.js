/**
 * pokeballSystem.js – logika Poké Ballů: vyhodnocení jejich násobitele šance na
 * chycení (podle deklarativního bonusu z dat) a odemykání typů podle postupu.
 *
 * Data ballů žijí v `data/pokeballs.js`. Zde se z nich a z kontextu souboje
 * počítá výsledný násobek. Finální šanci (base × násobek) skládá battleSystem.
 */

import { getPokeball } from "../../data/pokeballs.js";
import { getSpecies } from "../../data/pokemon.js";
import { getState } from "../core/state.js";

/** Base speed druhu, od které se ball „Fast" počítá jako rychlý. */
const FAST_SPEED_THRESHOLD = 100;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Aktuálně dosažená úroveň odemčení ballů. Řídí se REÁLNÝM postupem = počtem
 * získaných odznaků (`progress.badges`): 0–1 → tier 1, 2–4 → tier 2, 5+ → tier 3.
 * Případný explicitní `progress.tier` (dev/budoucí postup) smí tier už jen zvýšit.
 */
export function unlockedBallTier() {
  const p = getState().progress ?? {};
  const badges = Array.isArray(p.badges) ? p.badges.length : 0;
  const byBadges = badges >= 5 ? 3 : badges >= 2 ? 2 : 1;
  const explicit = p.tier ?? 0;
  return Math.max(byBadges, explicit);
}

/** Je ball k dispozici v obchodě podle postupu? (Neprodejné = false.) */
export function isBallUnlocked(ball) {
  if (!ball || ball.tier == null || ball.price == null) return false;
  return ball.tier <= unlockedBallTier();
}

/** Kolik odznaků je potřeba pro daný ball tier (pro náhled zamčených v obchodě). */
export function badgesForBallTier(tier) {
  return tier >= 3 ? 5 : tier >= 2 ? 2 : 0;
}

/**
 * Násobek šance na chycení daného ballu v daném kontextu souboje.
 * @param {import("../../data/pokeballs.js").Pokeball} ball
 * @param {{ enemy:any, player:any, turn:number, owns:boolean }} ctx
 * @returns {number}
 */
export function ballMultiplier(ball, ctx) {
  const b = ball?.bonus;
  let m = ball?.mult ?? 1;
  if (!b) return m;
  switch (b.type) {
    case "types": {
      const set = b.value.map((t) => String(t).toLowerCase());
      const enemyTypes = (ctx.enemy.types ?? []).map((t) => String(t).toLowerCase());
      if (enemyTypes.some((t) => set.includes(t))) m = b.mult;
      break;
    }
    case "lowLevel":
      // Klasika: (41 - level) / 10, omezeno na 1–4.
      m = clamp((41 - ctx.enemy.ref.level) / 10, 1, 4);
      break;
    case "firstTurn":
      if (ctx.turn <= 1) m = b.mult;
      break;
    case "timer":
      m = clamp(1 + ctx.turn * 0.3, 1, 4);
      break;
    case "owned":
      if (ctx.owns) m = b.mult;
      break;
    case "levelRatio": {
      const r = ctx.player.ref.level / Math.max(1, ctx.enemy.ref.level);
      m = r >= 4 ? 8 : r >= 2 ? 4 : r > 1 ? 2 : 1;
      break;
    }
    case "fastSpecies": {
      const sp = getSpecies(ctx.enemy.ref.speciesId);
      if ((sp?.baseStats.speed ?? 0) >= FAST_SPEED_THRESHOLD) m = b.mult;
      break;
    }
    case "loveMatch": {
      const playerRef = ctx.player?.ref;
      const enemyRef = ctx.enemy?.ref;
      // Obě pole existují, stejný druh a opačná pohlaví (m/f nebo f/m)?
      if (playerRef && enemyRef && playerRef.speciesId === enemyRef.speciesId) {
        const pg = playerRef.gender;
        const eg = enemyRef.gender;
        if ((pg === "m" && eg === "f") || (pg === "f" && eg === "m")) {
          m = b.mult;
        }
      }
      break;
    }
    case "heavy": {
      const w = getSpecies(ctx.enemy?.ref?.speciesId)?.weight ?? 0;
      m = w >= 200 ? 4 : w >= 100 ? 3 : w >= 50 ? 2 : 1;
      break;
    }
    case "statusEnemy": {
      const st = ctx.enemy?.ref?.status;
      if (st) {
        m = st.kind === "sleep" ? b.mult * 1.5 : b.mult;
      }
      break;
    }
    case "moonStone": {
      const sp = getSpecies(ctx.enemy?.ref?.speciesId);
      if (sp?.evolutions?.some((e) => e.item === "moon-stone")) {
        m = b.mult;
      }
      break;
    }
    case "darkPlace":
      // Dusk Ball: lepší v jeskyních (v kánonu i v noci; denní dobu nemáme).
      if (ctx.biome === "cave") m = b.mult;
      break;
    case "waterPlace":
      // Dive Ball: lepší ve vodních oblastech (surf/moře; potápění nemáme).
      if (ctx.biome === "water") m = b.mult;
      break;
  }
  return m;
}
