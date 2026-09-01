/**
 * UI: detail budovy – otevře se po kliknutí na budovu ve městě.
 * Hlavní okno je „čisté": stav budovy + její akce (obchod / školka / vejce).
 * Všechny upgrady (budova i její linie) jsou schované za tlačítkem „Upgrades"
 * v samostatném okně, ať je hlavní pohled přehledný.
 * Čísla se živě aktualizují přes STATE_CHANGED, dokud je okno otevřené.
 */

import { getBuilding } from "../../data/buildings.js";
import { POKEBALLS } from "../../data/pokeballs.js";
import { ballIconHtml } from "./ballIcon.js";
import {
  getLevel,
  isMaxed,
  upgradeCost,
  upgradeBuilding,
  ballPrice,
  buyBall,
  healPercent,
  ppRegenPercent,
  daycareXpPerMinute,
  getDaycareOccupant,
  setDaycareOccupant,
  clearDaycareOccupant,
  getTrackLevel,
  isTrackMaxed,
  trackUpgradeCost,
  upgradeTrack,
  hatchSpeedPercent,
  eggSlotCount,
  getBreedingSlot,
  setBreedingParent,
  clearBreedingParent,
} from "../systems/buildingSystem.js";
import { breedingStatus } from "../systems/breedingSystem.js";
import { canBreedSpecies, BREED_MINUTES, INHERIT_IV_COUNT } from "../../data/breeding.js";
import { isBallUnlocked } from "../systems/pokeballSystem.js";
import { healTeam } from "../systems/battleSystem.js";
import {
  getEggs,
  incubationList,
  addIncubatingEgg,
  removeIncubatingEgg,
  isIncubating,
} from "../systems/eggSystem.js";
import { getState } from "../core/state.js";
import { getSpecies } from "../../data/pokemon.js";
import { hatchMinutesFor } from "../../data/eggs.js";
import { xpForNextLevel } from "../systems/progression.js";
import { formatDuration } from "../systems/idle.js";
import { isInTeam } from "../systems/team.js";
import { bus, EVENTS } from "../core/events.js";

/** Jméno druhu Pokémona. */
function speciesName(p) {
  return getSpecies(p.speciesId)?.name ?? p.speciesId;
}

/**
 * Otevře detail budovy jako modal.
 * @param {string} id
 * @param {(msg: string) => void} [onStatus]
 */
export function openBuilding(id, onStatus = () => {}) {
  const def = getBuilding(id);
  if (!def) return;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  // Živá aktualizace obsahu při změně stavu (po nákupu/vylepšení).
  const unsub = bus.on(EVENTS.STATE_CHANGED, render);

  function close() {
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
  });

  function render() {
    const gold = getState().resources.gold;
    const level = getLevel(id);
    const maxed = isMaxed(id);

    // Datové sekce podle schopností budovy.
    const stats = [`<span>💰 Your gold: <strong>${gold}</strong></span>`];
    const actions = [];
    let extraHtml = ""; // vlastní blok (obchod / školka / breederi)

    // Poké Mart: obchod je schovaný pod tlačítkem „Market" (sekce podle typu
    // zboží). Slevy na bally řeší Upgrades okno.
    if (def.ball) {
      actions.push(`<button class="btn" data-act="market">🛒 Market</button>`);
    }

    // Pokémon Centrum: ruční doléčení celého týmu + auto doléčení po výhře
    // (auto battle mód; výše se ladí v Upgrades).
    if (def.heal) {
      const pct = healPercent(id);
      const cap = def.heal.maxPercent ?? Infinity;
      const atCap = pct >= cap;
      stats.push(
        `<span>🏥 Auto-heal after victory (Auto battle): <strong>${pct} %</strong> max HP${atCap ? " (cap)" : ""}</span>`
      );
      if (def.tracks?.ppRegen) {
        const ppPct = ppRegenPercent(id);
        stats.push(
          `<span>💧 PP regen after victory (Auto battle): <strong>${ppPct} %</strong> move PP</span>`
        );
      }
      actions.push(`<button class="btn" data-act="heal">🏥 Heal team</button>`);
    }

    // Školka: pasivní XP pro svěřence + inkubace vajec (Egg Breeders).
    if (def.daycare) {
      const rate = daycareXpPerMinute(id);
      const occ = getDaycareOccupant();
      stats.push(`<span>🐣 Training speed: <strong>${rate} XP/min</strong></span>`);
      if (occ) {
        stats.push(
          `<span>👶 In care: <strong>${speciesName(occ)}</strong> · Lv ${occ.level} (${occ.xp}/${xpForNextLevel(occ.level)} XP)</span>`
        );
        actions.push(`<button class="btn" data-act="daycare-remove">Pick up ${speciesName(occ)}</button>`);
      } else {
        const br = getBreedingSlot();
        const avail = getState().collection.filter(
          (p) => !isInTeam(p.uid) && p.uid !== br.a && p.uid !== br.b
        );
        if (avail.length === 0) {
          extraHtml += `<p class="placeholder" style="margin-top:8px">You have no free Pokémon (outside your team) to place in the Day Care.</p>`;
        } else {
          actions.push(
            `<button class="btn" data-act="daycare-open">🐣 Choose a Pokémon for the Day Care (${avail.length})</button>`
          );
        }
      }

      // Egg Breeders: jeden čudlík otevře okno s hatchery (mřížka slotů).
      if (def.tracks) {
        const hs = hatchSpeedPercent(id);
        const unlocked = eggSlotCount(id);
        const maxSlots = def.tracks.eggSlots.maxLevel;
        const used = incubationList().length;
        stats.push(`<span>⏩ Hatch speed: <strong>+${hs} %</strong></span>`);
        stats.push(`<span>🥚 Egg breeders: <strong>${used}/${unlocked}</strong> (max ${maxSlots})</span>`);
        actions.push(`<button class="btn" data-act="breeders">🥚 Hatch an egg</button>`);
      }

      // Breeding: dva rodiče se sdílenou egg group (nebo žolík) dělají vejce.
      const bs = breedingStatus();
      const parentCount = (bs.a ? 1 : 0) + (bs.b ? 1 : 0);
      let breedStat;
      if (bs.a && bs.b) {
        breedStat = bs.compatible
          ? `<strong>${speciesName(bs.a)} × ${speciesName(bs.b)}</strong> · ${Math.round(bs.ratio * 100)}%`
          : `<strong>${speciesName(bs.a)} × ${speciesName(bs.b)}</strong> — incompatible`;
      } else {
        breedStat = `<strong>${parentCount}/2 parents</strong>`;
      }
      stats.push(`<span>💞 Breeding: ${breedStat}</span>`);
      actions.push(`<button class="btn" data-act="breeding">💞 Breeding</button>`);
    }

    // Upgrades: budova i její linie za jedním klikacím oknem.
    const upgradeCount = 1 + (def.tracks ? Object.keys(def.tracks).length : 0);
    actions.push(
      `<button class="btn" data-act="upgrades">⬆️ Upgrades${upgradeCount > 1 ? ` (${upgradeCount})` : ""}</button>`
    );

    overlay.innerHTML = `
      <div class="modal building-modal">
        <div class="building-modal-head">
          <span class="b-icon">${def.icon}</span>
          <div>
            <h2 class="panel-title" style="border:0;margin:0;padding:0">${def.name}</h2>
            <div class="building-desc">${def.description}</div>
          </div>
          <span class="lvl">Lv ${level}${maxed ? " (max)" : ""}</span>
        </div>

        <div class="building-stats">
          ${stats.join("\n          ")}
        </div>
        ${extraHtml}

        <div class="building-actions">
          ${actions.join("\n          ")}
        </div>

        <button class="btn btn-close" data-act="close">Close</button>
      </div>
    `;

    const market = overlay.querySelector('[data-act="market"]');
    if (market) market.addEventListener("click", () => openMarket(id, onStatus));

    const heal = overlay.querySelector('[data-act="heal"]');
    if (heal)
      heal.addEventListener("click", () => {
        const n = healTeam();
        onStatus(n > 0 ? `Healed ${n} Pokémon to full HP ✓` : "Your team is already at full HP");
      });

    const upgrades = overlay.querySelector('[data-act="upgrades"]');
    if (upgrades) upgrades.addEventListener("click", () => openUpgrades(id, onStatus));

    const dcOpen = overlay.querySelector('[data-act="daycare-open"]');
    if (dcOpen) dcOpen.addEventListener("click", () => openDaycarePicker(id, onStatus));

    const dcRem = overlay.querySelector('[data-act="daycare-remove"]');
    if (dcRem)
      dcRem.addEventListener("click", () => {
        clearDaycareOccupant();
        onStatus("Pokémon picked up from the Day Care");
      });

    const breeders = overlay.querySelector('[data-act="breeders"]');
    if (breeders) breeders.addEventListener("click", () => openBreeders(id, onStatus));

    const breeding = overlay.querySelector('[data-act="breeding"]');
    if (breeding) breeding.addEventListener("click", () => openBreeding(id, onStatus));

    overlay.querySelector('[data-act="close"]').addEventListener("click", close);
  }

  render();
}

/**
 * Okno s hatchery (Egg Breeders): mřížka všech slotů. Odemčená prázdná hatchery
 * má vlastní tlačítko „Hatch an egg" (otevře výběr vejce), obsazená ukazuje
 * postup + „Take out", zamčená jen 🔒. Druh vejce zůstává skrytý (R-021).
 * @param {string} id  id budovy (školky)
 * @param {(msg: string) => void} onStatus
 */
function openBreeders(id, onStatus) {
  const def = getBuilding(id);
  if (!def?.tracks) return;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  const unsub = bus.on(EVENTS.STATE_CHANGED, render);

  function close() {
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
  });

  function render() {
    const maxSlots = def.tracks.eggSlots.maxLevel;
    const unlocked = eggSlotCount(id);
    const list = incubationList();
    const idleEggs = getEggs().filter((e) => !isIncubating(e.id));

    let cells = "";
    for (let i = 0; i < maxSlots; i++) {
      if (i >= unlocked) {
        cells += `<div class="breeder-slot locked" title="Locked — upgrade Egg slots to unlock">
          <div class="breeder-egg">🔒</div>
          <div class="placeholder">Locked</div>
        </div>`;
        continue;
      }
      const inc = list[i];
      if (inc) {
        const p = Math.round(inc.ratio * 100);
        const remain = inc.remainingSec <= 0 ? "ready!" : formatDuration(inc.remainingSec);
        cells += `<div class="breeder-slot filled">
          <div class="breeder-egg">🥚</div>
          <div class="egg-bar"><div class="egg-bar-fill" style="width:${p}%"></div></div>
          <div class="breeder-time">${p}% · ${remain}</div>
          <button class="btn btn-sm" data-egg-remove="${inc.id}">Take out</button>
        </div>`;
      } else {
        cells += `<div class="breeder-slot empty">
          <div class="breeder-egg">🥚</div>
          <button class="btn btn-sm" data-act="egg-open" ${idleEggs.length ? "" : "disabled"}>Hatch an egg</button>
        </div>`;
      }
    }

    const note =
      idleEggs.length === 0
        ? `<p class="placeholder" style="margin-top:8px">No eggs to hatch — win battles for a chance to find one.</p>`
        : `<p class="placeholder" style="margin-top:8px">You have <strong>${idleEggs.length}</strong> egg(s) ready to place. The species stays a mystery until it hatches.</p>`;

    overlay.innerHTML = `
      <div class="modal building-modal">
        <h2 class="panel-title">${def.icon} Egg Breeders</h2>
        <p class="placeholder">Unlocked <strong>${unlocked}/${maxSlots}</strong> — upgrade Egg slots for more.</p>
        <div class="breeder-grid">${cells}</div>
        ${note}
        <button class="btn btn-close" data-act="close">Close</button>
      </div>
    `;

    overlay.querySelectorAll('[data-act="egg-open"]').forEach((btn) =>
      btn.addEventListener("click", () => openEggPicker(id, onStatus))
    );

    overlay.querySelectorAll("[data-egg-remove]").forEach((btn) =>
      btn.addEventListener("click", () => {
        removeIncubatingEgg(btn.dataset.eggRemove);
        onStatus("Egg taken out of the breeder");
      })
    );

    overlay.querySelector('[data-act="close"]').addEventListener("click", close);
  }

  render();
}

/**
 * Okno breedingu: dva rodičovské sloty (A/B). Kompatibilní pár (sdílená egg
 * group nebo žolík Ditto) po čase vyprodukuje vejce – druh potomka i konkrétní
 * genetika zůstávají skryté do vylíhnutí (R-021/R-022). Prázdný slot má tlačítko
 * „Choose parent", obsazený „Remove". Postup a stav se aktualizují živě.
 * @param {string} id  id budovy (školky)
 * @param {(msg: string) => void} onStatus
 */
function openBreeding(id, onStatus) {
  const def = getBuilding(id);
  if (!def?.daycare) return;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  const unsub = bus.on(EVENTS.STATE_CHANGED, render);

  function close() {
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
  });

  /** HTML jednoho rodičovského slotu. */
  function slotHtml(which, p) {
    const title = `Parent ${which.toUpperCase()}`;
    if (p) {
      const sp = getSpecies(p.speciesId);
      return `<div class="breed-slot filled">
        <div class="breed-slot-title placeholder">${title}</div>
        <div class="breed-mon">${speciesName(p)}${p.shiny ? " ✨" : ""}</div>
        <div class="placeholder">Lv ${p.level} · ${(sp?.eggGroups ?? []).join(", ") || "—"}</div>
        <button class="btn btn-sm" data-breed-remove="${which}">Remove</button>
      </div>`;
    }
    return `<div class="breed-slot empty">
      <div class="breed-slot-title placeholder">${title}</div>
      <div class="breeder-egg">➕</div>
      <button class="btn btn-sm" data-breed-add="${which}">Choose parent</button>
    </div>`;
  }

  function render() {
    const st = breedingStatus();

    let statusHtml;
    if (!st.a || !st.b) {
      statusHtml = `<p class="placeholder">Place two Pokémon that share an egg group (or one Ditto) to start producing eggs.</p>`;
    } else if (!st.compatible) {
      statusHtml = `<p class="breed-status bad">These two can't breed — they need a shared egg group (or one must be a Ditto).</p>`;
    } else {
      const pct = Math.round(st.ratio * 100);
      const remain = st.remainingSec <= 0 ? "an egg is ready!" : `next egg in ${formatDuration(st.remainingSec)}`;
      statusHtml = `<p class="breed-status good">Compatible ✓ — producing eggs.</p>
        <div class="egg-bar"><div class="egg-bar-fill" style="width:${pct}%"></div></div>
        <div class="breeder-time">${pct}% · ${remain}</div>`;
    }

    overlay.innerHTML = `
      <div class="modal building-modal">
        <h2 class="panel-title">💞 Breeding</h2>
        <p class="placeholder">A compatible pair lays an egg roughly every ${BREED_MINUTES} min (also while you're away). Bred eggs inherit ${INHERIT_IV_COUNT} IVs from the parents and are shiny at 1/4096.</p>
        <div class="breed-slots">
          ${slotHtml("a", st.a)}
          ${slotHtml("b", st.b)}
        </div>
        ${statusHtml}
        <button class="btn btn-close" data-act="close">Close</button>
      </div>
    `;

    overlay.querySelectorAll("[data-breed-add]").forEach((btn) =>
      btn.addEventListener("click", () => openBreedingPicker(id, btn.dataset.breedAdd, onStatus))
    );

    overlay.querySelectorAll("[data-breed-remove]").forEach((btn) =>
      btn.addEventListener("click", () => {
        clearBreedingParent(btn.dataset.breedRemove);
        onStatus("Parent removed from breeding");
      })
    );

    overlay.querySelector('[data-act="close"]').addEventListener("click", close);
  }

  render();
}

/**
 * Krátký popis efektu následujícího vylepšení budovy (podle typu budovy).
 * @param {import("../../data/buildings.js").BuildingDef} def
 * @param {string} id
 * @returns {string}
 */
function buildingUpgradeEffect(def, id) {
  if (def.heal) {
    const pct = healPercent(id);
    const next = Math.min(def.heal.maxPercent ?? Infinity, pct + def.heal.perLevel);
    return `Heal after victory ${pct} % → ${next} % max HP`;
  }
  if (def.daycare) {
    const rate = daycareXpPerMinute(id);
    return `Training ${rate} → ${rate + def.daycare.perLevel} XP/min`;
  }
  if (def.ball) return "Lowers all Poké Ball prices";
  return "";
}

/**
 * Krátký popis efektu následujícího vylepšení dané linie (podle klíče).
 * @param {string} key
 * @param {number} level  aktuální úroveň linie
 * @param {import("../../data/buildings.js").TrackDef} [t]  definice linie (kvůli perLevel)
 * @returns {string}
 */
function trackUpgradeEffect(key, level, t) {
  if (key === "hatchSpeed") return `Hatch speed +${level} % → +${level + 1} %`;
  if (key === "eggSlots") return `Egg breeders ${level} → ${level + 1}`;
  if (key === "ppRegen") {
    const per = t?.perLevel ?? 0;
    const now = Math.min(100, level * per);
    const next = Math.min(100, (level + 1) * per);
    return `PP regen after victory +${now} % → +${next} % move PP`;
  }
  return "";
}

/**
 * Okno se všemi upgrady budovy: samotná budova + její upgrade linie (tracks).
 * @param {string} id
 * @param {(msg: string) => void} onStatus
 */
function openUpgrades(id, onStatus) {
  const def = getBuilding(id);
  if (!def) return;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  const unsub = bus.on(EVENTS.STATE_CHANGED, render);

  function close() {
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
  });

  /** Jeden řádek upgradu (společný layout pro budovu i linie). */
  function row({ icon, name, levelLabel, effect, maxed, cost, canAfford, attr }) {
    const btn = maxed
      ? `<button class="btn btn-sm" disabled>Maxed</button>`
      : `<button class="btn btn-sm" ${attr} ${canAfford ? "" : "disabled"}>${cost} 💰</button>`;
    return `<div class="upgrade-row">
      <div class="upgrade-info">
        <div class="upgrade-name">${icon} <strong>${name}</strong> <span class="placeholder">${levelLabel}</span></div>
        ${effect ? `<div class="upgrade-effect placeholder">${effect}</div>` : ""}
      </div>
      ${btn}
    </div>`;
  }

  function render() {
    const gold = getState().resources.gold;
    const rows = [];

    // 1) Vylepšení samotné budovy.
    {
      const level = getLevel(id);
      const maxed = isMaxed(id);
      const cost = upgradeCost(id);
      rows.push(
        row({
          icon: def.icon,
          name: def.name,
          levelLabel: `Lv ${level}/${def.maxLevel}`,
          effect: maxed ? "" : buildingUpgradeEffect(def, id),
          maxed,
          cost,
          canAfford: gold >= cost,
          attr: `data-up-building`,
        })
      );
    }

    // 2) Upgrade linie (tracks), pokud budova nějaké má.
    if (def.tracks) {
      for (const [key, t] of Object.entries(def.tracks)) {
        const lvl = getTrackLevel(id, key);
        const maxed = isTrackMaxed(id, key);
        const cost = trackUpgradeCost(id, key);
        rows.push(
          row({
            icon: t.icon,
            name: t.name,
            levelLabel: `Lv ${lvl}/${t.maxLevel}`,
            effect: maxed ? "" : trackUpgradeEffect(key, lvl, t),
            maxed,
            cost,
            canAfford: gold >= cost,
            attr: `data-up-track="${key}"`,
          })
        );
      }
    }

    overlay.innerHTML = `
      <div class="modal building-modal">
        <h2 class="panel-title">${def.icon} ${def.name} — Upgrades</h2>
        <p class="placeholder">💰 Your gold: <strong>${gold}</strong></p>
        <div class="upgrade-list">
          ${rows.join("\n          ")}
        </div>
        <button class="btn btn-close" data-act="close">Close</button>
      </div>
    `;

    const upB = overlay.querySelector("[data-up-building]");
    if (upB)
      upB.addEventListener("click", () => {
        const r = upgradeBuilding(id);
        onStatus(r.ok ? "Building upgraded ✓" : r.reason);
      });

    overlay.querySelectorAll("[data-up-track]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const r = upgradeTrack(id, btn.dataset.upTrack);
        onStatus(r.ok ? "Upgraded ✓" : r.reason);
      })
    );

    overlay.querySelector('[data-act="close"]').addEventListener("click", close);
  }

  render();
}

/**
 * Okno obchodu (Poké Mart): zboží rozdělené do sekcí. Zatím jen sekce Poké Balls
 * (nákup po kusech; zamčené/speciální jsou jen náhled). Další sekce (items,
 * kameny…) se přidají jako další blok níže.
 * @param {string} id
 * @param {(msg: string) => void} onStatus
 */
function openMarket(id, onStatus) {
  const def = getBuilding(id);
  if (!def) return;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  const unsub = bus.on(EVENTS.STATE_CHANGED, render);

  function close() {
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
  });

  function render() {
    const gold = getState().resources.gold;
    overlay.innerHTML = `
      <div class="modal building-modal">
        <h2 class="panel-title">${def.icon} ${def.name} — Market</h2>
        <p class="placeholder">💰 Your gold: <strong>${gold}</strong> · pick a department.</p>
        <div class="market-depts">
          <button class="dept-card" data-section="balls">
            <span class="dept-icon">🔴</span>
            <span class="dept-name">Poké Balls</span>
          </button>
        </div>
        <button class="btn btn-close" data-act="close">Close</button>
      </div>
    `;

    const balls = overlay.querySelector('[data-section="balls"]');
    if (balls) balls.addEventListener("click", () => openBallShop(id, onStatus));

    overlay.querySelector('[data-act="close"]').addEventListener("click", close);
  }

  render();
}

/**
 * Okno sekce Poké Balls: každý typ jako karta („okno"), ne řádek. Odemčené lze
 * koupit po kusu, zamčené/speciální jsou náhled.
 * @param {string} id
 * @param {(msg: string) => void} onStatus
 */
function openBallShop(id, onStatus) {
  const def = getBuilding(id);
  if (!def) return;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  const unsub = bus.on(EVENTS.STATE_CHANGED, render);

  function close() {
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
  });

  function render() {
    const gold = getState().resources.gold;
    const balls = getState().resources.balls ?? {};
    // Zamčené / neprodejné (dosud neodemčené) věci do obchodu neplníme – ať je
    // seznam přehledný a ukazuje jen to, co jde teď koupit.
    const forSale = POKEBALLS.filter((ball) => ball.price != null && isBallUnlocked(ball));
    const rows = forSale
      .map((ball) => {
        const owned = balls[ball.id] ?? 0;
        const price = ballPrice(ball.id, id);
        const canBuy = gold >= price;
        return `<div class="ball-row">
          <span>${ballIconHtml(ball.id, { size: 18 })} <strong>${ball.name}</strong> <span class="placeholder">— ${ball.desc}</span></span>
          <span class="ball-buy">×${owned}
            <button class="btn btn-sm" data-buy-ball="${ball.id}" ${canBuy ? "" : "disabled"}>${price} 💰</button>
          </span>
        </div>`;
      })
      .join("");

    const body = rows || `<p class="placeholder">No Poké Balls available yet.</p>`;

    overlay.innerHTML = `
      <div class="modal building-modal">
        <h2 class="panel-title">🔴 Poké Balls</h2>
        <p class="placeholder">💰 Your gold: <strong>${gold}</strong></p>
        <div class="ball-shop">${body}</div>
        <button class="btn btn-close" data-act="close">Close</button>
      </div>
    `;

    overlay.querySelectorAll("[data-buy-ball]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const r = buyBall(btn.dataset.buyBall, 1, id);
        onStatus(r.ok ? "Ball bought ✓" : r.reason);
      })
    );

    overlay.querySelector('[data-act="close"]').addEventListener("click", close);
  }

  render();
}

/** Rarity v pořadí od nejběžnější (pro filtrovací přepínače a řazení). */
const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"];

/** Hezký (kapitalizovaný) popisek. */
function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * Obecné okno výběru Pokémona z kolekce: mřížka dlaždic + filtrovací menu
 * (hledání jménem, rarita, typ, jen shiny, řazení) schované pod tlačítkem
 * Filters. Klik na dlaždici zavolá `onPick(uid)`; při úspěchu okno zavře.
 * Sdílené Školkou (výcvik) i breedingem (výběr rodiče).
 * @param {{ title: string, avail: import("../core/state.js").OwnedPokemon[],
 *   onPick: (uid: string) => { ok: boolean, reason?: string }, okMsg: string,
 *   onStatus: (msg: string) => void }} cfg
 */
function openPokemonPicker({ title, avail, onPick, okMsg, onStatus }) {
  // Nabídky filtrů podle toho, co je skutečně na výběr.
  const rarities = RARITY_ORDER.filter((r) =>
    avail.some((p) => getSpecies(p.speciesId)?.rarity === r)
  );
  const types = [...new Set(avail.flatMap((p) => getSpecies(p.speciesId)?.types ?? []))].sort();

  const filters = { q: "", rarities: new Set(), types: new Set(), shinyOnly: false, sort: "level" };

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  const rarityChips = rarities
    .map((r) => `<button class="filter-chip" data-rarity="${r}">${cap(r)}</button>`)
    .join("");
  const typeChips = types
    .map((t) => `<button class="filter-chip" data-type="${t}">${t}</button>`)
    .join("");

  overlay.innerHTML = `
    <div class="modal building-modal">
      <h2 class="panel-title">${title}</h2>
      <button class="btn btn-sm filter-toggle" data-filter-toggle>🔎 Filters</button>
      <div class="filter-bar" hidden>
        <div class="filter-row">
          <input type="text" id="daycare-search" class="daycare-search" placeholder="Search by name…" autocomplete="off">
          <select class="filter-sort" data-sort>
            <option value="level">Level ↓</option>
            <option value="name">Name A–Z</option>
            <option value="dex">Dex #</option>
          </select>
        </div>
        ${rarityChips ? `<div class="filter-row"><span class="filter-label">Rarity:</span>${rarityChips}</div>` : ""}
        ${typeChips ? `<div class="filter-row"><span class="filter-label">Type:</span>${typeChips}</div>` : ""}
        <div class="filter-row"><button class="filter-chip" data-shiny>✨ Shiny only</button></div>
      </div>
      <div class="daycare-picker">
        <div class="daycare-grid"></div>
        <p class="placeholder filter-empty" hidden>No Pokémon match the filters.</p>
      </div>
      <button class="btn btn-close" data-act="close">Close</button>
    </div>
  `;

  const grid = overlay.querySelector(".daycare-grid");
  const emptyMsg = overlay.querySelector(".filter-empty");

  function renderGrid() {
    let rows = avail.filter((p) => {
      const sp = getSpecies(p.speciesId);
      if (filters.q && !(sp?.name ?? "").toLowerCase().includes(filters.q)) return false;
      if (filters.rarities.size && !filters.rarities.has(sp?.rarity)) return false;
      if (filters.types.size && !(sp?.types ?? []).some((t) => filters.types.has(t))) return false;
      if (filters.shinyOnly && !p.shiny) return false;
      return true;
    });

    rows.sort((a, b) => {
      const sa = getSpecies(a.speciesId);
      const sb = getSpecies(b.speciesId);
      if (filters.sort === "name") return (sa?.name ?? "").localeCompare(sb?.name ?? "");
      if (filters.sort === "dex") return (sa?.dexNo ?? 0) - (sb?.dexNo ?? 0);
      return b.level - a.level || (sa?.name ?? "").localeCompare(sb?.name ?? ""); // level ↓
    });

    grid.innerHTML = rows
      .map((p) => {
        const sp = getSpecies(p.speciesId);
        const meta = `${cap(sp?.rarity ?? "")} · ${(sp?.types ?? []).join("/")}`;
        return `
        <button class="daycare-tile" data-pick-uid="${p.uid}" title="${speciesName(p)} · Lv ${p.level}">
          <span class="dt-name">${speciesName(p)}${p.shiny ? " ✨" : ""}</span>
          <span class="dt-lvl">Lv ${p.level}</span>
          <span class="dt-meta placeholder">${meta}</span>
        </button>`;
      })
      .join("");
    emptyMsg.hidden = rows.length > 0;

    grid.querySelectorAll("[data-pick-uid]").forEach((tile) =>
      tile.addEventListener("click", () => {
        const r = onPick(tile.dataset.pickUid);
        onStatus(r.ok ? okMsg : r.reason);
        if (r.ok) close();
      })
    );
  }

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

  const search = overlay.querySelector("#daycare-search");
  search.addEventListener("input", () => {
    filters.q = search.value.trim().toLowerCase();
    renderGrid();
  });

  overlay.querySelector("[data-sort]").addEventListener("change", (e) => {
    filters.sort = e.target.value;
    renderGrid();
  });

  overlay.querySelectorAll("[data-rarity]").forEach((chip) =>
    chip.addEventListener("click", () => {
      const r = chip.dataset.rarity;
      if (filters.rarities.has(r)) filters.rarities.delete(r);
      else filters.rarities.add(r);
      chip.classList.toggle("active");
      renderGrid();
    })
  );

  overlay.querySelectorAll("[data-type]").forEach((chip) =>
    chip.addEventListener("click", () => {
      const t = chip.dataset.type;
      if (filters.types.has(t)) filters.types.delete(t);
      else filters.types.add(t);
      chip.classList.toggle("active");
      renderGrid();
    })
  );

  overlay.querySelector("[data-shiny]").addEventListener("click", (e) => {
    filters.shinyOnly = !filters.shinyOnly;
    e.currentTarget.classList.toggle("active");
    renderGrid();
  });

  const filterBar = overlay.querySelector(".filter-bar");
  overlay.querySelector("[data-filter-toggle]").addEventListener("click", (e) => {
    filterBar.hidden = !filterBar.hidden;
    e.currentTarget.classList.toggle("active", !filterBar.hidden);
    if (!filterBar.hidden) search.focus();
  });

  renderGrid();

  overlay.querySelector('[data-act="close"]').addEventListener("click", close);
}

/**
 * Výběr Pokémona do Školky (výcvik). Nabízí jen volné jedince mimo tým a mimo
 * breeding sloty.
 * @param {string} id  id budovy (školky)
 * @param {(msg: string) => void} onStatus
 */
function openDaycarePicker(id, onStatus) {
  const br = getBreedingSlot();
  const avail = getState().collection.filter(
    (p) => !isInTeam(p.uid) && p.uid !== br.a && p.uid !== br.b
  );
  openPokemonPicker({
    title: "Choose a Pokémon for the Day Care",
    avail,
    onPick: (uid) => setDaycareOccupant(uid),
    okMsg: "Pokémon placed in the Day Care ✓",
    onStatus,
  });
}

/**
 * Výběr rodiče do breeding slotu. Nabízí jen jedince, kteří se mohou množit
 * (ne „no-eggs"), mimo tým, mimo výcvik a mimo druhý breeding slot.
 * @param {string} id  id budovy (školky)
 * @param {"a"|"b"} which  který slot
 * @param {(msg: string) => void} onStatus
 */
function openBreedingPicker(id, which, onStatus) {
  const slot = getBreedingSlot();
  const occ = getDaycareOccupant();
  const other = which === "a" ? slot.b : slot.a;
  const avail = getState().collection.filter(
    (p) =>
      !isInTeam(p.uid) &&
      p.uid !== other &&
      p.uid !== occ?.uid &&
      canBreedSpecies(getSpecies(p.speciesId))
  );
  openPokemonPicker({
    title: `Choose parent ${which.toUpperCase()}`,
    avail,
    onPick: (uid) => setBreedingParent(which, uid),
    okMsg: "Parent set for breeding ✓",
    onStatus,
  });
}

/**
 * Samostatné okno výběru vejce k inkubaci. Druh vejce zůstává skrytý – ukazuje
 * se jen „Egg" a odhadovaná doba líhnutí. Klik vloží vejce do volného breederu.
 * @param {string} id  id budovy (školky)
 * @param {(msg: string) => void} onStatus
 */
function openEggPicker(id, onStatus) {
  // Jen vejce, která ještě neinkubují. Stabilní číslo #N (dle pořadí v inventáři)
  // + rarita/čas líhnutí – druh zůstává skrytý (respektujeme skrytí, R-021).
  const eggs = getEggs()
    .filter((e) => !isIncubating(e.id))
    .map((e, i) => {
      const rarity = getSpecies(e.speciesId)?.rarity ?? "common";
      return { id: e.id, label: i + 1, rarity, mins: hatchMinutesFor(rarity) };
    });

  const rarities = RARITY_ORDER.filter((r) => eggs.some((e) => e.rarity === r));
  const filters = { rarities: new Set(), sort: "time" };

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  const rarityChips = rarities
    .map((r) => `<button class="filter-chip" data-rarity="${r}">${cap(r)}</button>`)
    .join("");

  overlay.innerHTML = `
    <div class="modal building-modal">
      <h2 class="panel-title">Choose an egg to incubate</h2>
      <p class="placeholder">The species stays a mystery until it hatches.</p>
      <button class="btn btn-sm filter-toggle" data-filter-toggle>🔎 Filters</button>
      <div class="filter-bar" hidden>
        <div class="filter-row">
          <select class="filter-sort" data-sort>
            <option value="time">Hatch time ↑</option>
            <option value="time-desc">Hatch time ↓</option>
          </select>
        </div>
        ${rarityChips ? `<div class="filter-row"><span class="filter-label">Rarity:</span>${rarityChips}</div>` : ""}
      </div>
      <div class="daycare-picker">
        <div class="daycare-grid"></div>
        <p class="placeholder filter-empty" hidden>No eggs match the filters.</p>
      </div>
      <button class="btn btn-close" data-act="close">Close</button>
    </div>
  `;

  const grid = overlay.querySelector(".daycare-grid");
  const emptyMsg = overlay.querySelector(".filter-empty");

  function renderGrid() {
    let rows = eggs.filter((e) => !filters.rarities.size || filters.rarities.has(e.rarity));
    rows.sort((a, b) =>
      filters.sort === "time-desc" ? b.mins - a.mins || a.label - b.label : a.mins - b.mins || a.label - b.label
    );

    grid.innerHTML = rows
      .map(
        (e) => `
        <button class="daycare-tile" data-egg-id="${e.id}" title="Egg #${e.label} · ~${e.mins} min">
          <span class="dt-name">🥚 Egg #${e.label}</span>
          <span class="dt-lvl">~${e.mins} min</span>
        </button>`
      )
      .join("");
    emptyMsg.hidden = rows.length > 0;

    grid.querySelectorAll("[data-egg-id]").forEach((tile) =>
      tile.addEventListener("click", () => {
        const r = addIncubatingEgg(tile.dataset.eggId);
        onStatus(r.ok ? "Egg placed in a breeder ✓" : r.reason);
        if (r.ok) close();
      })
    );
  }

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

  overlay.querySelector("[data-sort]").addEventListener("change", (e) => {
    filters.sort = e.target.value;
    renderGrid();
  });

  overlay.querySelectorAll("[data-rarity]").forEach((chip) =>
    chip.addEventListener("click", () => {
      const r = chip.dataset.rarity;
      if (filters.rarities.has(r)) filters.rarities.delete(r);
      else filters.rarities.add(r);
      chip.classList.toggle("active");
      renderGrid();
    })
  );

  const filterBar = overlay.querySelector(".filter-bar");
  overlay.querySelector("[data-filter-toggle]").addEventListener("click", (e) => {
    filterBar.hidden = !filterBar.hidden;
    e.currentTarget.classList.toggle("active", !filterBar.hidden);
  });

  renderGrid();

  overlay.querySelector('[data-act="close"]').addEventListener("click", close);
}
