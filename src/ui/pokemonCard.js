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

import { getState, commit } from "../core/state.js";
import { getSpecies } from "../../data/pokemon.js";
import { getPokeball } from "../../data/pokeballs.js";
import { getMove } from "../../data/moves.js";
import { getItem, isHeldItem } from "../../data/items.js";
import { heldItemOf, equipHeldItem, unequipHeldItem } from "../systems/itemSystem.js";
import { learnableTmsFor, teachTm } from "../systems/tmSystem.js";
import { getTm } from "../../data/tms.js";
import { learnableHmsFor, teachHm } from "../systems/hmSystem.js";
import { getHm } from "../../data/hms.js";
import { bus, EVENTS } from "../core/events.js";
import { saveScroll, restoreScroll, scrollAware } from "./scrollPreserve.js";
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
import { areaLevelRange } from "../../data/areas.js";
import { evolutionInfo, canEvolveNow, evolvePokemon } from "../systems/evolutionSystem.js";
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

/** Pokédex flavor text druhu (jako citace). Prázdné → nic. */
function dexEntryHtml(species) {
  if (!species.dexEntry) return "";
  return `<p class="mc-dexentry">${esc(species.dexEntry)}</p>`;
}

/** Řádky výška + hmotnost do meta seznamu (<dl>). Chybí-li data → nic. */
function heightWeightRows(species) {
  const rows = [];
  if (typeof species.height === "number") {
    rows.push(`<dt>Height</dt><dd>${species.height.toFixed(1)} m</dd>`);
  }
  if (typeof species.weight === "number") {
    rows.push(`<dt>Weight</dt><dd>${species.weight.toFixed(1)} kg</dd>`);
  }
  return rows.join("");
}

/** Druhový popisek (genus) jako malý podtitul. Prázdné → nic. */
function genusHtml(species) {
  if (!species.genus) return "";
  return `<div class="mc-genus">${esc(species.genus)}</div>`;
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
      .map((a) => {
        // Level pásmo oblasti (Lv min–max) místo dřívějšího „Lv X+".
        const [lmin, lmax] = areaLevelRange(a);
        const lvl = lmin === lmax ? `Lv ${lmin}` : `Lv ${lmin}–${lmax}`;
        return `<li><strong>${esc(a.name)}</strong> <span class="placeholder">· ${esc(a.region)} · ${lvl}</span></li>`;
      })
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
 * Osy se mapují na hexagon (pointy-top, vrchol nahoře) v pořadí:
 * 12h=HP, 2h=Atk, 4h=Def, 6h=Spd, 8h=SpDef, 10h=SpAtk.
 * Povahou zvednutý/snížený stat se barevně odliší.
 * @param {import("../core/state.js").OwnedPokemon} owned
 */
function statRadar(owned) {
  const stats = computeStats(owned);
  const nat = getNature(owned.nature);

  // Pořadí statů na hexagonu (12h, 2h, 4h, 6h, 8h, 10h)
  const hexStatOrder = ["hp", "attack", "defense", "speed", "spDefense", "spAttack"];
  const values = hexStatOrder.map((k) => (k === "hp" ? stats.maxHp : stats[k]));
  const maxVal = Math.max(1, ...values);

  const cx = 100;
  const cy = 100;
  const R = 62; // poloměr vnějšího hexagonu
  const n = hexStatOrder.length;
  // Vrchol i: úhel od -90° (HP nahoře) po směru hodinových ručiček.
  const angle = (i) => (-90 + (360 / n) * i) * (Math.PI / 180);
  const pointAt = (i, r) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];

  // Mřížka: dva soustředné hexagony (0.5 a 1.0) + osy z centra.
  const ring = (frac) =>
    hexStatOrder.map((_, i) => pointAt(i, R * frac).map((v) => v.toFixed(1)).join(","))
      .join(" ");
  const axes = hexStatOrder.map((_, i) => {
    const [x, y] = pointAt(i, R);
    return `<line class="mc-radar-axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" />`;
  }).join("");

  // Datový polygon (Value normalizovaný na nejsilnější stat).
  const dataPts = hexStatOrder.map((k, i) => {
    const frac = values[i] / maxVal;
    return pointAt(i, R * frac).map((v) => v.toFixed(1)).join(",");
  }).join(" ");

  // Popisky statů na vrcholech (název + hodnota); povaha barevně odliší.
  const labels = hexStatOrder.map((k, i) => {
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
      ${hexStatOrder.map((k, i) => {
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

// Rozpracované naučení TM, které vyžaduje výběr slotu k přepsání (jedinec má
// plný počet tahů). Drží se na úrovni modulu, ať přežije překreslení karty.
// { uid, num, name } nebo null.
let pendingTm = null;

/**
 * Sekce TM – naučení tahu z Technical Machine (jednorázově, kompatibilní druhy).
 * Když má jedinec plné 4 tahy, přepne se na výběr tahu k přepsání (pendingTm).
 */
function tmSection(owned) {
  // Režim výběru slotu k přepsání (jedinec má plno).
  if (pendingTm && pendingTm.uid === owned.uid) {
    const moves = Array.isArray(owned.moves) ? owned.moves : [];
    const slots = moves
      .map((slot, i) => {
        const mv = getMove(slot.id);
        return `<button class="btn btn-sm" data-act="tm-replace" data-slot="${i}">${esc(mv?.name ?? slot.id)}</button>`;
      })
      .join("");
    return `
      <h4 class="mc-section">Teach ${esc(pendingTm.name)}</h4>
      <p class="placeholder">This Pokémon already knows 4 moves. Choose one to forget:</p>
      <div class="tm-replace-slots">${slots}
        <button class="btn btn-sm btn-ghost" data-act="tm-cancel">Cancel</button>
      </div>`;
  }

  const learnable = learnableTmsFor(owned.uid);
  const options = learnable
    .map((t) => `<option value="${t.num}">TM${String(t.num).padStart(2, "0")} ${esc(t.name)} ×${t.count}</option>`)
    .join("");

  return `
    <h4 class="mc-section">Teach TM</h4>
    <div class="held-item-controls">
      ${
        options
          ? `<select class="held-equip-select" data-tm-select>${options}</select>
             <button class="btn btn-sm" data-act="teach-tm">Teach</button>`
          : `<span class="placeholder">No compatible TMs in your Bag.</span>`
      }
    </div>`;
}

// Rozpracované naučení HM, které vyžaduje výběr slotu k přepsání (jedinec má
// plný počet tahů). Drží se na úrovni modulu, ať přežije překreslení karty.
// { uid, num, name } nebo null.
let pendingHm = null;

/**
 * Sekce HM – naučení tahu z Hidden Machine. NA ROZDÍL OD TM se HM NEspotřebuje,
 * lze ho učit opakovaně libovolným kompatibilním druhům (jako v kánonu).
 * Když má jedinec plné 4 tahy, přepne se na výběr tahu k přepsání (pendingHm).
 */
function hmSection(owned) {
  // Režim výběru slotu k přepsání (jedinec má plno).
  if (pendingHm && pendingHm.uid === owned.uid) {
    const moves = Array.isArray(owned.moves) ? owned.moves : [];
    const slots = moves
      .map((slot, i) => {
        const mv = getMove(slot.id);
        return `<button class="btn btn-sm" data-act="hm-replace" data-slot="${i}">${esc(mv?.name ?? slot.id)}</button>`;
      })
      .join("");
    return `
      <h4 class="mc-section">Teach ${esc(pendingHm.name)}</h4>
      <p class="placeholder">This Pokémon already knows 4 moves. Choose one to forget:</p>
      <div class="tm-replace-slots">${slots}
        <button class="btn btn-sm btn-ghost" data-act="hm-cancel">Cancel</button>
      </div>`;
  }

  const learnable = learnableHmsFor(owned.uid);
  const options = learnable
    .map((h) => `<option value="${h.num}">HM${String(h.num).padStart(2, "0")} ${esc(h.name)}</option>`)
    .join("");

  return `
    <h4 class="mc-section">Teach HM</h4>
    <div class="held-item-controls">
      ${
        options
          ? `<select class="held-equip-select" data-hm-select>${options}</select>
             <button class="btn btn-sm" data-act="teach-hm">Teach</button>`
          : `<span class="placeholder">No compatible HMs in your Bag.</span>`
      }
    </div>`;
}

/** Sekce Held item – zobrazení + nasazení/sundání přímo z karty (i mimo batoh). */
function heldItemSection(owned) {
  const current = heldItemOf(owned);
  const currentHtml = current
    ? `<span class="held-item-display">${current.icon} <strong>${esc(current.name)}</strong></span>`
    : `<span class="placeholder">None</span>`;

  // Držitelné itemy v batohu (count > 0), z nichž lze vybrat k nasazení.
  const items = getState().resources?.items ?? {};
  const options = Object.keys(items)
    .filter((id) => (items[id] ?? 0) > 0 && isHeldItem(id))
    .map((id) => {
      const def = getItem(id);
      return `<option value="${id}">${def?.icon ?? ""} ${esc(def?.name ?? id)} ×${items[id]}</option>`;
    })
    .join("");

  const controls = `
    <div class="held-item-controls">
      ${
        options
          ? `<select class="held-equip-select" data-equip-select>${options}</select>
             <button class="btn btn-sm" data-act="equip">Equip</button>`
          : `<span class="placeholder">No held items in your Bag.</span>`
      }
      ${current ? `<button class="btn btn-sm" data-act="unequip">Remove</button>` : ""}
    </div>`;

  return `
    <h4 class="mc-section">Held Item</h4>
    <div class="held-item-display-wrap">${currentHtml}</div>
    ${controls}
  `;
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
        ${genusHtml(species)}
        <div class="mc-lvl">Lv ${owned.level}</div>
      </div>
    </div>
    ${dexEntryHtml(species)}
    <div class="mc-xp">
      <div class="mc-xp-label">EXP <span>${owned.xp} / ${need}</span></div>
      <span class="mc-bar xp"><span style="width:${xpPctW}%"></span></span>
    </div>
    ${
      canEvolveNow(owned)
        ? `<button class="btn btn-evolve" data-act="evolve">✨ Evolve into ${esc(typeof species.evolvesTo === "string" ? (getSpecies(species.evolvesTo)?.name ?? species.evolvesTo) : "...")}</button>`
        : ""
    }
    <h4 class="mc-section">Stats</h4>
    ${statRadar(owned)}
    ${ownedStatsTable(owned, species)}
    <h4 class="mc-section">Moves</h4>
    ${movesList(owned)}
    ${tmSection(owned)}
    ${hmSection(owned)}
    ${heldItemSection(owned)}
    <dl class="mc-meta">
      <dt>Caught in</dt><dd>${
        owned.caughtBall
          ? `${ballIconHtml(owned.caughtBall, { size: 16 })} ${esc(getPokeball(owned.caughtBall)?.name ?? owned.caughtBall)}`
          : `<span class="placeholder">— (gift / hatched)</span>`
      }</dd>
      <dt>Gender</dt><dd>${
        owned.gender === "genderless"
          ? `<span class="placeholder">Genderless</span>`
          : `${genderSymbolHtml(owned.gender)} ${owned.gender === "m" ? "Male" : "Female"}`
      }</dd>
      <dt>Nature</dt><dd>${natureLabel(owned.nature)}</dd>
      ${(() => {
        const ev = evolutionInfo(owned);
        if (!ev) return "";
        const note = ev.blocked
          ? `<span class="placeholder">(Everstone blocks it)</span>`
          : `<span class="placeholder">at Lv ${ev.level}</span>`;
        return `<dt>Evolves into</dt><dd>${esc(ev.toName)} ${note}</dd>`;
      })()}
      <dt>Gender ratio</dt><dd>${genderRatioLabel(species)}</dd>
      ${heightWeightRows(species)}
      <dt>Egg groups</dt><dd>${(species.eggGroups ?? []).map(esc).join(", ")}</dd>
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
        ${genusHtml(species)}
        <div class="mc-lvl"><span class="dex-tag">Seen — not caught yet</span></div>
      </div>
    </div>
    ${dexEntryHtml(species)}
    ${baseStatsTable(species)}
    <dl class="mc-meta">
      <dt>Gender ratio</dt><dd>${genderRatioLabel(species)}</dd>
      ${heightWeightRows(species)}
      ${
        species.evolvesTo && species.evolutionLevel != null
          ? `<dt>Evolves into</dt><dd>${esc(typeof species.evolvesTo === "string" ? (getSpecies(species.evolvesTo)?.name ?? species.evolvesTo) : "Evolves with a stone")} <span class="placeholder">at Lv ${species.evolutionLevel}</span></dd>`
          : ""
      }
      <dt>Egg groups</dt><dd>${(species.eggGroups ?? []).map(esc).join(", ")}</dd>
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
  let owned = null;
  if (arg.uid) {
    owned = getState().collection.find((p) => p.uid === arg.uid);
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

  const unsub = owned ? bus.on(EVENTS.STATE_CHANGED, scrollAware(() => {
    const fresh = getState().collection.find((p) => p.uid === owned.uid);
    if (fresh) {
      const body = overlay.querySelector(".mon-card-body");
      if (body) {
        const _savedScroll = saveScroll(body);
        body.innerHTML = ownedBody(fresh);
        restoreScroll(body, _savedScroll);
      }
    }
  })) : () => {};

  // Ruční překreslení těla karty (pro stavy bez commitu, např. výběr TM slotu).
  function rerenderBody() {
    if (!owned) return;
    const fresh = getState().collection.find((p) => p.uid === owned.uid);
    const body = overlay.querySelector(".mon-card-body");
    if (fresh && body) {
      const _s = saveScroll(body);
      body.innerHTML = ownedBody(fresh);
      restoreScroll(body, _s);
    }
  }

  function close() {
    pendingTm = null; // zahoď rozpracovaný výběr TM slotu
    pendingHm = null; // i HM slotu
    unsub();
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  }
  function onKey(e) {
    if (e.key === "Escape") close();
  }
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
    // Evolve tlačítko je uvnitř překreslovaného těla → deleguj přes overlay
    // (listenery na vnitřních prvcích by se překreslením ztratily).
    // Dev nástroje (level/shiny) se přesunuly do globálního Dev menu (⚙ Settings).
    const evoBtn = e.target.closest?.('[data-act="evolve"]');
    if (evoBtn && owned) {
      const res = evolvePokemon(owned.uid);
      if (!res.ok && res.reason) window.alert?.(res.reason);
      // Při úspěchu commit() → STATE_CHANGED překreslí tělo na novou formu.
      return;
    }
    // Nasazení drženého itemu: přečti vybraný item ze selectu vedle tlačítka.
    const equipBtn = e.target.closest?.('[data-act="equip"]');
    if (equipBtn && owned) {
      const sel = overlay.querySelector("[data-equip-select]");
      const id = sel?.value;
      if (id) {
        const res = equipHeldItem(owned.uid, id);
        if (!res.ok && res.reason) window.alert?.(res.reason);
        // commit() → STATE_CHANGED překreslí tělo (nový held item + batoh).
      }
      return;
    }
    // Sundání drženého itemu zpět do batohu.
    const unequipBtn = e.target.closest?.('[data-act="unequip"]');
    if (unequipBtn && owned) {
      const res = unequipHeldItem(owned.uid);
      if (!res.ok && res.reason) window.alert?.(res.reason);
      return;
    }
    // Naučit TM: přečti vybraný TM ze selectu. Když má jedinec plno, přepni na
    // výběr slotu (pendingTm) a překresli ručně (teachTm bez slotu nekomituje).
    const teachBtn = e.target.closest?.('[data-act="teach-tm"]');
    if (teachBtn && owned) {
      const sel = overlay.querySelector("[data-tm-select]");
      const num = Number(sel?.value);
      if (num) {
        const res = teachTm(owned.uid, num, null);
        if (res.needsSlot) {
          pendingTm = { uid: owned.uid, num, name: getTm(num)?.name ?? `TM${num}` };
          rerenderBody();
        } else if (!res.ok && res.reason) {
          window.alert?.(`Can't teach this TM (${res.reason}).`);
        }
        // Úspěch → commit v teachTm → STATE_CHANGED překreslí tělo.
      }
      return;
    }
    // Výběr tahu k přepsání při plných slotech.
    const tmReplaceBtn = e.target.closest?.('[data-act="tm-replace"]');
    if (tmReplaceBtn && owned && pendingTm) {
      const slot = Number(tmReplaceBtn.dataset.slot);
      const num = pendingTm.num;
      pendingTm = null;
      const res = teachTm(owned.uid, num, slot);
      if (!res.ok && res.reason) window.alert?.(`Can't teach this TM (${res.reason}).`);
      else rerenderBody(); // pro jistotu (commit obvykle překreslí sám)
      return;
    }
    // Zrušení výběru slotu.
    const tmCancelBtn = e.target.closest?.('[data-act="tm-cancel"]');
    if (tmCancelBtn) {
      pendingTm = null;
      rerenderBody();
      return;
    }
    // Naučit HM: stejný pattern jako TM, ale HM se nespotřebuje (učitelné opakovaně).
    const teachHmBtn = e.target.closest?.('[data-act="teach-hm"]');
    if (teachHmBtn && owned) {
      const sel = overlay.querySelector("[data-hm-select]");
      const num = Number(sel?.value);
      if (num) {
        const res = teachHm(owned.uid, num, null);
        if (res.needsSlot) {
          pendingHm = { uid: owned.uid, num, name: getHm(num)?.name ?? `HM${num}` };
          rerenderBody();
        } else if (!res.ok && res.reason) {
          window.alert?.(`Can't teach this HM (${res.reason}).`);
        }
        // Úspěch → commit v teachHm → STATE_CHANGED překreslí tělo.
      }
      return;
    }
    // Výběr tahu k přepsání při plných slotech (HM).
    const hmReplaceBtn = e.target.closest?.('[data-act="hm-replace"]');
    if (hmReplaceBtn && owned && pendingHm) {
      const slot = Number(hmReplaceBtn.dataset.slot);
      const num = pendingHm.num;
      pendingHm = null;
      const res = teachHm(owned.uid, num, slot);
      if (!res.ok && res.reason) window.alert?.(`Can't teach this HM (${res.reason}).`);
      else rerenderBody(); // pro jistotu (commit obvykle překreslí sám)
      return;
    }
    // Zrušení výběru slotu (HM).
    const hmCancelBtn = e.target.closest?.('[data-act="hm-cancel"]');
    if (hmCancelBtn) {
      pendingHm = null;
      rerenderBody();
      return;
    }
  });
  overlay.querySelector('[data-act="close"]').addEventListener("click", close);
}
