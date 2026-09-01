/**
 * pokemonCard.js – „karta Pokémona": modal se všemi informacemi o druhu/jedinci.
 *
 * Dva režimy:
 *  - CHYCENÝ JEDINEC (`openPokemonCard({ uid })`): sprite, level + XP bar,
 *    bojové staty s rozpadem na IV/EV, shiny, poměr pohlaví druhu, kde ho chytit.
 *  - JEN VIDĚNÝ DRUH (`openPokemonCard({ speciesId })`): silueta + base staty
 *    druhu (bez individuálních hodnot), poměr pohlaví, egg groups, kde ho chytit.
 *
 * Pozn.: u chyceného jedince ukazujeme jeho KONKRÉTNÍ pohlaví (♂/♀), u jen
 * viděného druhu jen poměr pohlaví druhu (individuální pohlaví ještě neznáme).
 */

import { getState } from "../core/state.js";
import { getSpecies } from "../../data/pokemon.js";
import { getPokeball } from "../../data/pokeballs.js";
import { getMove } from "../../data/moves.js";
import {
  STAT_KEYS,
  IV_MAX,
  EV_MAX_PER_STAT,
  EV_MAX_TOTAL,
  computeStats,
  ivTotal,
  ivPercent,
  evTotal,
} from "../systems/pokemonSystem.js";
import { getNature, isNeutralNature } from "../../data/natures.js";
import { xpForNextLevel } from "../systems/progression.js";
import { areasForSpecies } from "../systems/pokedex.js";
import { spriteImg, silhouetteHtml } from "./sprites.js";
import { ballIconHtml } from "./ballIcon.js";
import { genderSymbolHtml } from "./gender.js";
import { statusBadge } from "./statusBadge.js";

/** Čitelné popisky statů (v pořadí STAT_KEYS). */
const STAT_LABELS = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  spAttack: "Sp. Atk",
  spDefense: "Sp. Def",
  speed: "Speed",
};

/** Escapuje HTML. */
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Číslo procent bez zbytečných nul (87.5, 12.5, 50). */
function pct(n) {
  return `${+(n * 100).toFixed(1)}`;
}

/** Řádek s poměrem pohlaví druhu. */
function genderRatioLabel(species) {
  const g = species.genderRatio;
  if (g === "genderless") return "Genderless";
  return `♂ ${pct(g.m)}% · ♀ ${pct(g.f)}%`;
}

/** Odznaky typů druhu. */
function typeBadges(species) {
  return species.types.map((t) => `<span class="type">${esc(t)}</span>`).join("");
}

/** Malý vodorovný ukazatel (hodnota/max) s CSS třídou. */
function bar(value, max, cls) {
  const pctW = Math.max(0, Math.min(100, (value / max) * 100));
  return `<span class="mc-bar ${cls}"><span style="width:${pctW}%"></span></span>`;
}

/** Sekce „kde chytit" – jen skutečné oblasti z area.species. */
function whereToCatch(speciesId) {
  const areas = areasForSpecies(speciesId);
  if (areas.length === 0) {
    return `<p class="placeholder">Not currently found in the wild.</p>`;
  }
  return `<ul class="mc-areas">
    ${areas
      .map(
        (a) =>
          `<li><strong>${esc(a.name)}</strong> <span class="placeholder">· ${esc(a.region)} · Lv ${a.recommendedLevel}+</span></li>`
      )
      .join("")}
  </ul>`;
}

/** Krátký popisek povahy: „Adamant (+Atk / −SpA)" nebo „Hardy (neutral)". */
function natureLabel(natureId) {
  const n = getNature(natureId);
  if (isNeutralNature(natureId)) return `${n.name} <span class="placeholder">(neutral)</span>`;
  const up = STAT_LABELS[n.up] ?? n.up;
  const down = STAT_LABELS[n.down] ?? n.down;
  return `${n.name} <span class="nat-up">+${up}</span> <span class="nat-down">−${down}</span>`;
}

/**
 * Hexagonální radar staty (Value) jedince. Jedna „série" (jeden Pokémon) → jedna
 * barva, bez legendy (titul karty ji pojmenovává). Hodnoty se normalizují na
 * nejsilnější stat jedince, aby byl vidět relativní tvar bez ohledu na level.
 * Osy v pořadí STAT_KEYS; povahou zvednutý/snížený stat se barevně odliší.
 * @param {import("../core/state.js").OwnedPokemon} owned
 */
function statRadar(owned) {
  const stats = computeStats(owned);
  const values = STAT_KEYS.map((k) => (k === "hp" ? stats.maxHp : stats[k]));
  const maxVal = Math.max(1, ...values);
  const nat = getNature(owned.nature);

  const cx = 100;
  const cy = 100;
  const R = 62; // poloměr vnějšího hexagonu
  const n = STAT_KEYS.length;
  // Vrchol i: úhel od -90° (HP nahoře) po směru hodinových ručiček.
  const angle = (i) => (-90 + (360 / n) * i) * (Math.PI / 180);
  const pointAt = (i, r) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];

  // Mřížka: dva soustředné hexagony (0.5 a 1.0) + osy z centra.
  const ring = (frac) =>
    STAT_KEYS.map((_, i) => pointAt(i, R * frac).map((v) => v.toFixed(1)).join(","))
      .join(" ");
  const axes = STAT_KEYS.map((_, i) => {
    const [x, y] = pointAt(i, R);
    return `<line class="mc-radar-axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" />`;
  }).join("");

  // Datový polygon (Value normalizovaný na nejsilnější stat).
  const dataPts = STAT_KEYS.map((k, i) => {
    const frac = values[i] / maxVal;
    return pointAt(i, R * frac).map((v) => v.toFixed(1)).join(",");
  }).join(" ");

  // Popisky statů na vrcholech (název + hodnota); povaha barevně odliší.
  const labels = STAT_KEYS.map((k, i) => {
    const [x, y] = pointAt(i, R + 13);
    const anchor = x < cx - 5 ? "end" : x > cx + 5 ? "start" : "middle";
    let cls = "mc-radar-label";
    if (nat.up === k && nat.down !== k) cls += " nat-up";
    else if (nat.down === k && nat.up !== k) cls += " nat-down";
    return `<text class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}">
      <tspan>${STAT_LABELS[k]}</tspan><tspan class="mc-radar-val" x="${x.toFixed(1)}" dy="11">${values[i]}</tspan>
    </text>`;
  }).join("");

  return `<div class="mc-radar-wrap">
    <svg class="mc-radar" viewBox="0 0 200 200" role="img" aria-label="Stat radar">
      <polygon class="mc-radar-grid" points="${ring(1)}" />
      <polygon class="mc-radar-grid" points="${ring(0.5)}" />
      ${axes}
      <polygon class="mc-radar-area" points="${dataPts}" />
      ${STAT_KEYS.map((k, i) => {
        const frac = values[i] / maxVal;
        const [x, y] = pointAt(i, R * frac);
        return `<circle class="mc-radar-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" />`;
      }).join("")}
      ${labels}
    </svg>
  </div>`;
}

/** Tabulka statů chyceného jedince (base / hodnota / IV / EV s grafem). */
function ownedStatsTable(owned, species) {
  const stats = computeStats(owned);
  const iv = owned.ivs ?? {};
  const ev = owned.evs ?? {};
  const rows = STAT_KEYS.map((k) => {
    const value = k === "hp" ? stats.maxHp : stats[k];
    const base = species.baseStats[k];
    const ivv = iv[k] ?? 0;
    const evv = ev[k] ?? 0;
    return `<tr>
      <td class="mc-stat-name">${STAT_LABELS[k]}</td>
      <td class="mc-base">${base}</td>
      <td class="mc-value">${value}</td>
      <td class="mc-iv">${ivv}${bar(ivv, IV_MAX, "iv")}</td>
      <td class="mc-ev">${evv}${bar(evv, EV_MAX_PER_STAT, "ev")}</td>
    </tr>`;
  }).join("");
  return `<table class="mc-stats">
    <thead><tr><th>Stat</th><th title="Species base stat">Base</th><th>Value</th><th title="Individual Value (0–31)">IV</th><th title="Effort Value (0–252)">EV</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td class="mc-stat-name">Total</td>
      <td></td><td></td>
      <td class="mc-iv">${ivTotal(owned)}/${IV_MAX * STAT_KEYS.length} · ${ivPercent(owned)}%</td>
      <td class="mc-ev">${evTotal(owned)}/${EV_MAX_TOTAL}</td>
    </tr></tfoot>
  </table>`;
}

/** Tabulka base statů druhu (jen viděný, bez jedince). */
function baseStatsTable(species) {
  const rows = STAT_KEYS.map(
    (k) => `<tr>
      <td class="mc-stat-name">${STAT_LABELS[k]}</td>
      <td class="mc-value">${species.baseStats[k]}</td>
      <td>${bar(species.baseStats[k], 200, "base")}</td>
    </tr>`
  ).join("");
  return `<table class="mc-stats">
    <thead><tr><th>Stat</th><th>Base</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/** Seznam naučených tahů jedince (jméno, typ, kategorie, PP). */
function movesList(owned) {
  const moves = Array.isArray(owned.moves) ? owned.moves : [];
  if (moves.length === 0) {
    return `<p class="placeholder">No moves.</p>`;
  }
  const catIcon = { physical: "💥", special: "✨", status: "🌀" };
  const rows = moves
    .map((slot) => {
      const mv = getMove(slot.id);
      const name = mv?.name ?? slot.id;
      const type = mv?.type ?? "—";
      const icon = catIcon[mv?.category] ?? "";
      const max = slot.maxPp ?? mv?.pp ?? 0;
      return `<li class="mc-move">
        <span class="mc-move-main">${icon} <strong>${esc(name)}</strong> <span class="type">${esc(type)}</span></span>
        <span class="mc-move-pp placeholder">PP ${slot.pp}/${max}</span>
      </li>`;
    })
    .join("");
  return `<ul class="mc-moves">${rows}</ul>`;
}

/** Vnitřek karty chyceného jedince. */
function ownedBody(owned) {
  const species = getSpecies(owned.speciesId);
  const dexNo = `#${String(species.dexNo).padStart(3, "0")}`;
  const name = `${owned.shiny ? "✨ " : ""}${species.name}`;
  const need = xpForNextLevel(owned.level);
  const xpPctW = Math.max(0, Math.min(100, (owned.xp / need) * 100));
  return `
    <div class="mc-head">
      ${spriteImg(species.id, { shiny: !!owned.shiny, gender: owned.gender, alt: species.name, extraClass: "mc-sprite" })}
      <div class="mc-title">
        <div class="mc-name">${esc(name)} ${genderSymbolHtml(owned.gender, { size: 18 })}${statusBadge(owned.status)} <span class="mc-dex">${dexNo}</span></div>
        <div class="mc-types">${typeBadges(species)}<span class="mc-rarity">${esc(species.rarity)}</span></div>
        <div class="mc-lvl">Lv ${owned.level}</div>
      </div>
    </div>
    <div class="mc-xp">
      <div class="mc-xp-label">EXP <span>${owned.xp} / ${need}</span></div>
      <span class="mc-bar xp"><span style="width:${xpPctW}%"></span></span>
    </div>
    <h4 class="mc-section">Stats</h4>
    ${statRadar(owned)}
    ${ownedStatsTable(owned, species)}
    <h4 class="mc-section">Moves</h4>
    ${movesList(owned)}
    <dl class="mc-meta">
      <dt>Caught in</dt><dd>${
        owned.caughtBall
          ? `${ballIconHtml(owned.caughtBall, { size: 16 })} ${esc(getPokeball(owned.caughtBall)?.name ?? owned.caughtBall)}`
          : `<span class="placeholder">— (gift / hatched)</span>`
      }</dd>
      <dt>Gender</dt><dd>${
        owned.gender === "genderless"
          ? `<span class="placeholder">Genderless</span>`
          : `${genderSymbolHtml(owned.gender)} ${owned.gender === "m" ? "Samec" : "Samice"}`
      }</dd>
      <dt>Nature</dt><dd>${natureLabel(owned.nature)}</dd>
      <dt>Gender ratio</dt><dd>${genderRatioLabel(species)}</dd>
      <dt>Egg groups</dt><dd>${species.eggGroups.map(esc).join(", ")}</dd>
      <dt>Generation</dt><dd>Gen ${species.gen}</dd>
      ${owned.shiny ? `<dt>Variant</dt><dd>✨ Shiny</dd>` : ""}
    </dl>
    <h4 class="mc-section">Where to catch</h4>
    ${whereToCatch(species.id)}
  `;
}

/** Vnitřek karty jen viděného druhu. */
function seenBody(species) {
  const dexNo = `#${String(species.dexNo).padStart(3, "0")}`;
  return `
    <div class="mc-head">
      ${silhouetteHtml("mc-sprite")}
      <div class="mc-title">
        <div class="mc-name">${esc(species.name)} <span class="mc-dex">${dexNo}</span></div>
        <div class="mc-types">${typeBadges(species)}<span class="mc-rarity">${esc(species.rarity)}</span></div>
        <div class="mc-lvl"><span class="dex-tag">Seen — not caught yet</span></div>
      </div>
    </div>
    ${baseStatsTable(species)}
    <dl class="mc-meta">
      <dt>Gender ratio</dt><dd>${genderRatioLabel(species)}</dd>
      <dt>Egg groups</dt><dd>${species.eggGroups.map(esc).join(", ")}</dd>
      <dt>Generation</dt><dd>Gen ${species.gen}</dd>
    </dl>
    <h4 class="mc-section">Where to catch</h4>
    ${whereToCatch(species.id)}
  `;
}

/**
 * Otevře kartu Pokémona.
 * @param {{ uid?: string, speciesId?: string }} arg
 *   `uid` → chycený jedinec; jinak `speciesId` → druh (viděný).
 */
export function openPokemonCard(arg = {}) {
  let inner = "";
  if (arg.uid) {
    const owned = getState().collection.find((p) => p.uid === arg.uid);
    if (!owned) return;
    inner = ownedBody(owned);
  } else if (arg.speciesId) {
    const species = getSpecies(arg.speciesId);
    if (!species) return;
    inner = seenBody(species);
  } else {
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal mon-card">
      <div class="mon-card-body">${inner}</div>
      <button class="btn btn-close" data-act="close">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);

  function close() {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  }
  function onKey(e) {
    if (e.key === "Escape") close();
  }
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('[data-act="close"]').addEventListener("click", close);
}
