/**
 * bagView.js – batoh mimo souboj.
 *
 * Modal rozdělený do KLIKACÍCH PODSEKCÍ (tabů): Heal / Poké Bally / TMs / HMs /
 * Evolution / Held / Key items – hráč se přepíná mezi kategoriemi místo jednoho
 * dlouhého scrollu (zobrazují se jen neprázdné kategorie).
 *
 * Consumable item → výběr cíle (canUseItem) → useItem. Evoluční item → výběr cíle
 * k evoluci. Held item → Use/Equip. **TM/HM se učí PŘÍMO z batohu**: klik na TM/HM
 * item → výběr kompatibilního Pokémona → naučení (u plných 4 tahů výběr slotu k
 * přepsání). HM je znovupoužitelný (nespotřebuje se). Živě přes STATE_CHANGED.
 */

import { bus, EVENTS } from "../core/events.js";
import { getState } from "../core/state.js";
import { ITEMS, getItem, isHeldItem } from "../../data/items.js";
import { isHmItemId, getHmByItemId } from "../../data/hms.js";
import { POKEBALLS } from "../../data/pokeballs.js";
import { getMove } from "../../data/moves.js";
import { itemCount, canUseItem, useItem, equipHeldItem, unequipHeldItem, sellItem, isPpItem, usePpItem, ppRoomFor } from "../systems/itemSystem.js";
import { evolveWithItem, evolveByTrade, itemEvolutionTargets, tradeEvolutionTarget } from "../systems/evolutionSystem.js";
import { canTeachTm, teachTm } from "../systems/tmSystem.js";
import { canTeachHm, teachHm } from "../systems/hmSystem.js";
import { computeStats } from "../systems/pokemonSystem.js";
import { getTeamPokemon } from "../systems/team.js";
import { getSpecies } from "../../data/pokemon.js";
import { statusBadge } from "./statusBadge.js";
import { ballIconHtml } from "./ballIcon.js";
import { showPopup } from "./popup.js";
import { saveScroll, restoreScroll, scrollAware } from "./scrollPreserve.js";

/**
 * Otevře batoh. `onStatus` slouží k hlášení výsledku akce (např. do lišty týmu).
 * @param {(msg: string) => void} [onStatus]
 */
export function openBag(onStatus = () => {}) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  // Stavy: null=seznam, "use"/"held"/"evolve"/"teach-tm"/"teach-hm"=výběr cíle
  let activeCat = "heal"; // aktivní podsekce (tab) v hlavním seznamu
  let selectedItemId = null;
  let selectedAction = null;
  let selectedUseQty = 1; // počet kusů pro batch use
  // Rozpracované učení TM/HM u jedince s plnými 4 tahy: {kind:"tm"|"hm",uid,num,name}
  let pendingTeach = null;
  // Rozpracované PP Up/Max: {uid, itemId} – čeká na výběr konkrétního tahu (slotu).
  let pendingPp = null;

  // Během aktivního scrollování překreslení odložíme (viz scrollAware).
  const unsub = bus.on(EVENTS.STATE_CHANGED, scrollAware(render));

  function close() {
    unsub();
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  }
  function onKey(e) {
    if (e.key === "Escape") {
      if (pendingPp) {
        pendingPp = null;
        render();
      } else if (pendingTeach) {
        pendingTeach = null;
        render();
      } else if (selectedAction) {
        selectedAction = null;
        render();
      } else if (selectedItemId) {
        selectedItemId = null;
        render();
      } else {
        close();
      }
    }
  }
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  /** Číslo TM/HM z item id (pro teachTm/teachHm). */
  function teachNumFor(itemId, kind) {
    if (kind === "tm") return getItem(itemId)?.tm ?? null;
    return getHmByItemId(itemId)?.num ?? null;
  }

  /** Potvrzovací popup po naučení TM/HM. */
  function showLearnPopup(uid, kind, machineName) {
    const owned = getState().collection.find((p) => p.uid === uid);
    const sp = getSpecies(owned?.speciesId);
    const nm = `${owned?.shiny ? "✨ " : ""}${sp?.name ?? "Your Pokémon"}`;
    const label = kind === "tm" ? "TM" : "HM";
    showPopup({
      title: `✅ ${label} learned!`,
      body: `<p class="story-text"><strong>${nm}</strong> learned <strong>${machineName}</strong>!</p>`,
    });
  }

  /** Seznam vlastněných consumable itemů (léčiva; bez held/evo/tm/boost/key). */
  function consumablesListHtml() {
    const items = ITEMS
      .filter((it) => !isHeldItem(it.id) && it.category !== "evolution" && it.category !== "special" && it.category !== "tm" && it.category !== "boost" && itemCount(it.id) > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    const rows = items
      .map(
        (it) => `<div class="bag-item-row-wrapper">
          <button class="bag-item-row" data-pick-item="${it.id}" title="${it.desc}">
            <span>${it.icon} <strong>${it.name}</strong> <span class="placeholder">— ${it.desc}</span></span>
            <span class="bag-count">×${itemCount(it.id)}</span>
          </button>
          <div class="bag-item-actions">
            <button class="btn btn-sm btn-sell" data-sell-one="${it.id}">Sell 1</button>
            <button class="btn btn-sm btn-sell" data-sell-all="${it.id}">Sell all</button>
          </div>
        </div>`
      )
      .join("");
    return rows ? rows : `<p class="placeholder">No consumables.</p>`;
  }

  /** Seznam Poké Ballů (read-only – házejí se v souboji). */
  function ballsListHtml() {
    const balls = getState().resources?.balls ?? {};
    const owned = POKEBALLS.filter((pb) => (balls[pb.id] ?? 0) > 0);
    const rows = owned
      .map(
        (pb) => `<div class="bag-item-row-wrapper">
          <div class="bag-item-row" title="${pb.desc ?? ""}">
            <span>${ballIconHtml(pb.id, { size: 18 })} <strong>${pb.name}</strong> <span class="placeholder">— ${pb.desc ?? ""}</span></span>
            <span class="bag-count">×${balls[pb.id]}</span>
          </div>
        </div>`
      )
      .join("");
    return rows ? rows : `<p class="placeholder">No Poké Balls. Buy some at the Poké Mart.</p>`;
  }

  /** Seznam klíčových/příběhových itemů (kategorie "special", KROMĚ HM).
   * Read-only – nedají se použít ani prodat, jen se drží do budoucího využití. */
  function keyItemsListHtml() {
    const items = ITEMS
      .filter((it) => it.category === "special" && !isHmItemId(it.id) && itemCount(it.id) > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    const rows = items
      .map(
        (it) => `<div class="bag-item-row-wrapper">
          <div class="bag-item-row" title="${it.desc}">
            <span>${it.icon} <strong>${it.name}</strong> <span class="placeholder">— ${it.desc}</span></span>
            <span class="bag-count">×${itemCount(it.id)}</span>
          </div>
        </div>`
      )
      .join("");
    return rows ? rows : `<p class="placeholder">No key items.</p>`;
  }

  /** Seznam boostů (Rare Candy, PP Up, PP Max). Rare Candy = klasický Use (výběr
   * Pokémona). PP Up/Max míří na KONKRÉTNÍ tah → po výběru Pokémona se nabídne
   * ještě výběr slotu tahu (viz pendingPp / ppSlotPickerHtml). */
  function boostsListHtml() {
    const items = ITEMS
      .filter((it) => it.category === "boost" && itemCount(it.id) > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    const rows = items
      .map(
        (it) => `<div class="bag-item-row-wrapper">
          <button class="bag-item-row" data-pick-item="${it.id}" title="${it.desc}">
            <span>${it.icon} <strong>${it.name}</strong> <span class="placeholder">— ${it.desc}</span></span>
            <span class="bag-count">×${itemCount(it.id)}</span>
          </button>
          <div class="bag-item-actions">
            <button class="btn btn-sm btn-sell" data-sell-one="${it.id}">Sell 1</button>
            <button class="btn btn-sm btn-sell" data-sell-all="${it.id}">Sell all</button>
          </div>
        </div>`
      )
      .join("");
    return rows
      ? `${rows}<p class="placeholder">Rare Candy raises a Pokémon's level; PP Up/Max raise the PP of a move you pick.</p>`
      : `<p class="placeholder">No boosts. Buy them at the Celadon Dept. Store.</p>`;
  }

  /** Seznam vlastněných TM. Klik → výběr Pokémona → naučení (jednorázové). */
  function tmListHtml() {
    const items = ITEMS
      .filter((it) => it.category === "tm" && itemCount(it.id) > 0)
      .sort((a, b) => (a.tm ?? 0) - (b.tm ?? 0));

    const rows = items
      .map(
        (it) => `<div class="bag-item-row-wrapper">
          <button class="bag-item-row" data-teach-tm="${it.id}" title="${it.desc}">
            <span>${it.icon} <strong>${it.name}</strong> <span class="placeholder">— ${it.desc}</span></span>
            <span class="bag-count">×${itemCount(it.id)}</span>
          </button>
        </div>`
      )
      .join("");
    return rows
      ? `${rows}<p class="placeholder">Tap a TM to teach it to a compatible Pokémon (single use).</p>`
      : `<p class="placeholder">No TMs yet. Earn them from Gym Leaders, the Game Corner, the Poké Mart, or rare battle drops.</p>`;
  }

  /** Seznam vlastněných HM. Klik → výběr Pokémona → naučení (znovupoužitelné). */
  function hmListHtml() {
    const items = ITEMS
      .filter((it) => isHmItemId(it.id) && itemCount(it.id) > 0)
      .sort((a, b) => (getHmByItemId(a.id)?.num ?? 0) - (getHmByItemId(b.id)?.num ?? 0));

    const rows = items
      .map(
        (it) => `<div class="bag-item-row-wrapper">
          <button class="bag-item-row" data-teach-hm="${it.id}" title="${it.desc}">
            <span>${it.icon} <strong>${it.name}</strong> <span class="placeholder">— ${it.desc}</span></span>
            <span class="bag-count">∞</span>
          </button>
        </div>`
      )
      .join("");
    return rows
      ? `${rows}<p class="placeholder">Tap an HM to teach it — HMs are reusable and never run out.</p>`
      : `<p class="placeholder">No HMs yet. You'll receive them as you progress through the story.</p>`;
  }

  /** Seznam evolučních kamenů a Linking Cord. */
  function evolutionItemsListHtml() {
    const items = ITEMS
      .filter((it) => it.category === "evolution" && itemCount(it.id) > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    const rows = items
      .map(
        (it) => {
          const canEvolve = getState().collection.some((p) => {
            if (it.id === "linking-cord") return tradeEvolutionTarget(p.speciesId) != null;
            return itemEvolutionTargets(p.speciesId, it.id).length > 0;
          });
          const disabled = !canEvolve ? 'disabled' : '';
          return `<button class="bag-item-row bag-evolution-row" data-evolve-item="${it.id}" ${disabled} title="${it.desc}">
            <span>${it.icon} <strong>${it.name}</strong> <span class="placeholder">— ${it.desc}</span></span>
            <span class="bag-count">×${itemCount(it.id)}</span>
          </button>`;
        }
      )
      .join("");
    return rows ? rows : `<p class="placeholder">No evolution items.</p>`;
  }

  /** Seznam vlastněných held itemů. */
  function heldItemsListHtml() {
    const items = ITEMS
      .filter((it) => isHeldItem(it.id) && itemCount(it.id) > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    const rows = items
      .map(
        (it) => `<div class="bag-item-row-wrapper">
          <button class="bag-item-row" data-pick-held="${it.id}" title="${it.desc}">
            <span>${it.icon} <strong>${it.name}</strong> <span class="placeholder">— ${it.desc}</span></span>
            <span class="bag-count">×${itemCount(it.id)}</span>
          </button>
          <div class="bag-item-actions">
            <button class="btn btn-sm btn-sell" data-sell-one="${it.id}">Sell 1</button>
            <button class="btn btn-sm btn-sell" data-sell-all="${it.id}">Sell all</button>
          </div>
        </div>`
      )
      .join("");
    return rows ? rows : `<p class="placeholder">No held items.</p>`;
  }

  /** Seznam Pokémonů, kteří aktuálně drží nějaký held item. */
  function currentlyHeldHtml() {
    const collection = getState().collection ?? [];
    const holding = collection.filter((p) => p && p.heldItem);

    if (holding.length === 0) {
      return `<p class="placeholder">No Pokémon is holding an item.</p>`;
    }

    const rows = holding
      .map((p) => {
        const sp = getSpecies(p.speciesId);
        const itemDef = getItem(p.heldItem);
        return `<div class="bag-held-pokemon">
          <span class="held-poke-info">${p.shiny ? "✨ " : ""}${sp?.name ?? p.speciesId} <span class="placeholder">Lv ${p.level}</span></span>
          <span class="held-item-badge">${itemDef?.icon ?? "?"} ${itemDef?.name ?? p.heldItem}</span>
          <button class="btn btn-sm btn-remove" data-unequip="${p.uid}">Remove</button>
        </div>`;
      })
      .join("");
    return rows;
  }

  /** Held sekce = seznam held itemů + aktuálně nasazené. */
  function heldSectionHtml() {
    return `${heldItemsListHtml()}
      <h3 class="shop-cat">📌 Currently held</h3>
      ${currentlyHeldHtml()}`;
  }

  /** Definice podsekcí (tabů) batohu. */
  const CATS = [
    { key: "heal", icon: "🧴", label: "Heal", render: consumablesListHtml },
    { key: "balls", icon: "⚪", label: "Balls", render: ballsListHtml },
    { key: "tms", icon: "💿", label: "TMs", render: tmListHtml },
    { key: "hms", icon: "📀", label: "HMs", render: hmListHtml },
    { key: "boosts", icon: "🍬", label: "Boosts", render: boostsListHtml },
    { key: "evolution", icon: "🪨", label: "Evolution", render: evolutionItemsListHtml },
    { key: "held", icon: "💎", label: "Held", render: heldSectionHtml },
    { key: "key", icon: "🔑", label: "Key", render: keyItemsListHtml },
  ];

  /** Má daná podsekce nějaký obsah (jinak její tab neukazujeme)? */
  function catHasItems(key) {
    const s = getState();
    switch (key) {
      case "heal":
        return ITEMS.some((it) => !isHeldItem(it.id) && it.category !== "evolution" && it.category !== "special" && it.category !== "tm" && itemCount(it.id) > 0);
      case "balls": {
        const balls = s.resources?.balls ?? {};
        return POKEBALLS.some((pb) => (balls[pb.id] ?? 0) > 0);
      }
      case "tms":
        return ITEMS.some((it) => it.category === "tm" && itemCount(it.id) > 0);
      case "hms":
        return ITEMS.some((it) => isHmItemId(it.id) && itemCount(it.id) > 0);
      case "boosts":
        return ITEMS.some((it) => it.category === "boost" && itemCount(it.id) > 0);
      case "evolution":
        return ITEMS.some((it) => it.category === "evolution" && itemCount(it.id) > 0);
      case "held":
        return ITEMS.some((it) => isHeldItem(it.id) && itemCount(it.id) > 0) || (s.collection ?? []).some((p) => p && p.heldItem);
      case "key":
        return ITEMS.some((it) => it.category === "special" && !isHmItemId(it.id) && itemCount(it.id) > 0);
      default:
        return false;
    }
  }

  /** Hlavní seznam s taby podsekcí. */
  function itemListHtml() {
    const available = CATS.filter((c) => catHasItems(c.key));
    // Aktivní tab musí být pořád dostupný (jinak spadni na první / heal).
    if (!available.some((c) => c.key === activeCat)) {
      activeCat = available[0]?.key ?? "heal";
    }
    const tabs = available
      .map((c) => `<button class="bag-tab${c.key === activeCat ? " active" : ""}" data-bag-cat="${c.key}">${c.icon} ${c.label}</button>`)
      .join("");
    const tabsBar = available.length ? `<div class="bag-tabs">${tabs}</div>` : "";

    const active = CATS.find((c) => c.key === activeCat) ?? CATS[0];
    const body = available.length ? active.render() : `<p class="placeholder">Your bag is empty.</p>`;

    return `
      <h2 class="panel-title">🎒 Bag</h2>
      ${tabsBar}
      <div class="bag-list">${body}</div>
      <button class="btn btn-close" data-act="close">Close</button>`;
  }

  /** Výběr akce (Use / Held) pro held item. */
  function actionChoiceHtml() {
    const def = getItem(selectedItemId);
    const hasEffect = def?.effect != null;
    const useBtn = hasEffect ? `<button class="btn btn-wide" data-action="use">Use</button>` : "";
    const sellBtns = `
      <button class="btn btn-sm btn-sell" data-sell-one-action="${selectedItemId}">Sell 1</button>
      <button class="btn btn-sm btn-sell" data-sell-all-action="${selectedItemId}">Sell All</button>
    `;
    return `
      <h2 class="panel-title">${def?.icon ?? ""} ${def?.name ?? "item"}</h2>
      <p class="placeholder">${def?.desc ?? ""}</p>
      <div class="action-buttons">
        ${useBtn}
        <button class="btn btn-wide" data-action="held">Equip as Held Item</button>
      </div>
      <div class="action-buttons">${sellBtns}</div>
      <button class="btn btn-sm menu-back" data-act="back">← Back</button>`;
  }

  /** Výběr cíle pro Use / Held / Evolve / Teach TM / Teach HM. */
  function targetListHtml() {
    const def = getItem(selectedItemId);
    const collection = getState().collection ?? [];
    let targets = [];
    let title = "";
    let desc = "";

    if (selectedAction === "use") {
      targets = collection.filter((p) => canUseItem(selectedItemId, p).ok);
      title = `Use ${def?.name ?? "item"}`;
      desc = `${def?.desc ?? ""} — pick a Pokémon.`;
    } else if (selectedAction === "held") {
      targets = collection.filter((p) => p && p.hp > 0); // živí pokémoni
      title = `Equip on Pokémon`;
      desc = `Choose which Pokémon will hold ${def?.name ?? "this item"}.`;
    } else if (selectedAction === "evolve") {
      if (selectedItemId === "linking-cord") {
        targets = collection.filter((p) => tradeEvolutionTarget(p.speciesId) != null);
      } else {
        targets = collection.filter((p) => itemEvolutionTargets(p.speciesId, selectedItemId).length > 0);
      }
      title = `Evolve with ${def?.name ?? "item"}`;
      desc = `Choose which Pokémon to evolve.`;
    } else if (selectedAction === "teach-tm" || selectedAction === "teach-hm") {
      const kind = selectedAction === "teach-tm" ? "tm" : "hm";
      const num = teachNumFor(selectedItemId, kind);
      // TM/HM lze naučit jen Pokémona, kterého máš U SEBE (v týmu, max 6) – ne z PC.
      targets = getTeamPokemon().filter((p) => (kind === "tm" ? canTeachTm(p.uid, num) : canTeachHm(p.uid, num)));
      title = `Teach ${def?.name ?? "move"}`;
      desc = `Choose a Pokémon from your team to learn this move.`;
    }

    const tiles = targets
      .map((p) => {
        const sp = getSpecies(p.speciesId);
        const max = computeStats(p).maxHp;
        const hp = Math.max(0, Math.min(max, p.hp ?? max));
        const pct = Math.round((hp / max) * 100);
        const low = hp <= 0 ? " fainted" : pct <= 25 ? " low" : "";
        let dataAttr = "";
        if (selectedAction === "use") dataAttr = `data-use-on="${p.uid}"`;
        else if (selectedAction === "held") dataAttr = `data-equip-on="${p.uid}"`;
        else if (selectedAction === "evolve") dataAttr = `data-evolve-with="${p.uid}"`;
        else if (selectedAction === "teach-tm" || selectedAction === "teach-hm") dataAttr = `data-teach-on="${p.uid}"`;

        return `<button class="btn switch-tile" ${dataAttr}>
          <span class="sw-name">${p.shiny ? "✨ " : ""}${sp?.name ?? p.speciesId} <span class="placeholder">Lv ${p.level}</span>${statusBadge(p.status)}</span>
          <span class="hpbar"><span class="hpfill${low}" style="width:${pct}%"></span></span>
          <span class="sw-hp">${hp}/${max} HP</span>
        </button>`;
      })
      .join("");

    let noTargetMsg = "No valid targets.";
    if (selectedAction === "use") noTargetMsg = `No Pokémon can use ${def?.name ?? "this item"} right now.`;
    else if (selectedAction === "held") noTargetMsg = `No Pokémon available.`;
    else if (selectedAction === "evolve") noTargetMsg = `No Pokémon can evolve with ${def?.name ?? "this item"}.`;
    else if (selectedAction === "teach-tm" || selectedAction === "teach-hm") noTargetMsg = `No Pokémon in your team can learn ${def?.name ?? "this move"}.`;

    const body = tiles || `<p class="placeholder">${noTargetMsg}</p>`;

    // Pro use action přidej number input pro batch use (PP itemy míří na 1 tah → bez batche).
    let batchUseSection = "";
    if (selectedAction === "use" && tiles && !isPpItem(selectedItemId)) {
      const maxQty = itemCount(selectedItemId);
      batchUseSection = `
        <div class="batch-use-section">
          <label for="batch-qty-input">Use quantity:</label>
          <input type="number" id="batch-qty-input" min="1" max="${maxQty}" value="${selectedUseQty}" class="batch-qty-input" />
          <span class="placeholder">/ ${maxQty}</span>
        </div>`;
    }

    return `
      <h2 class="panel-title">${def?.icon ?? ""} ${title} <span class="placeholder">×${itemCount(selectedItemId)}</span></h2>
      <p class="placeholder">${desc}</p>
      ${batchUseSection}
      <div class="switch-list">${body}</div>
      <button class="btn btn-sm menu-back" data-act="back">← Back</button>`;
  }

  /** Výběr slotu tahu k přepsání (jedinec už zná 4 tahy). */
  function slotPickerHtml() {
    const { uid, name } = pendingTeach;
    const owned = getState().collection.find((p) => p.uid === uid);
    const sp = getSpecies(owned?.speciesId);
    const slots = (owned?.moves ?? [])
      .map((m, i) => {
        const mv = getMove(m.id);
        const sub = `${mv?.type ?? ""}${mv?.power ? " · " + mv.power : ""}`;
        return `<button class="btn move-btn" data-teach-replace="${i}">
          <span class="move-name">${mv?.name ?? m.id}</span>
          <span class="move-sub">${sub}</span>
        </button>`;
      })
      .join("");
    return `
      <h2 class="panel-title">Teach ${name}</h2>
      <p class="placeholder">${sp?.name ?? "This Pokémon"} already knows 4 moves. Choose one to replace with <strong>${name}</strong>.</p>
      <div class="move-grid">${slots}</div>
      <button class="btn btn-sm menu-back" data-act="back">← Back</button>`;
  }

  /** Výběr konkrétního tahu (slotu) pro PP Up/PP Max – míří na jeden tah. */
  function ppSlotPickerHtml() {
    const { uid, itemId } = pendingPp;
    const def = getItem(itemId);
    const owned = getState().collection.find((p) => p.uid === uid);
    const sp = getSpecies(owned?.speciesId);
    const slots = (owned?.moves ?? [])
      .map((m, i) => {
        const mv = getMove(m.id);
        const room = ppRoomFor(owned, i);
        const full = room <= 0;
        return `<button class="btn move-btn" data-pp-slot="${i}" ${full ? "disabled" : ""}>
          <span class="move-name">${mv?.name ?? m.id}</span>
          <span class="move-sub">PP ${m.pp}/${m.maxPp}${full ? " · max" : ""}</span>
        </button>`;
      })
      .join("");
    return `
      <h2 class="panel-title">${def?.icon ?? ""} ${def?.name ?? "PP item"} <span class="placeholder">×${itemCount(itemId)}</span></h2>
      <p class="placeholder">Choose which move of ${sp?.name ?? "this Pokémon"} to boost.</p>
      <div class="move-grid">${slots}</div>
      <button class="btn btn-sm menu-back" data-act="back">← Back</button>`;
  }

  function render() {
    // Když nám vybraný item dojde, spadneme zpět na seznam (HM se nespotřebovává).
    if (selectedItemId && itemCount(selectedItemId) <= 0 && !isHmItemId(selectedItemId)) {
      selectedItemId = null;
      selectedAction = null;
      pendingTeach = null;
      pendingPp = null;
    }

    let html = "";
    if (pendingPp) {
      html = ppSlotPickerHtml();
    } else if (pendingTeach) {
      html = slotPickerHtml();
    } else if (selectedAction) {
      html = targetListHtml();
    } else if (selectedItemId) {
      html = actionChoiceHtml();
    } else {
      html = itemListHtml();
    }

    const _savedScroll = saveScroll(overlay);
    overlay.innerHTML = `<div class="modal building-modal">${html}</div>`;
    restoreScroll(overlay, _savedScroll);

    // Přepínání podsekcí (tabů)
    overlay.querySelectorAll("[data-bag-cat]").forEach((btn) =>
      btn.addEventListener("click", () => {
        activeCat = btn.dataset.bagCat;
        render();
      })
    );

    // Consumable itemy – rovnou do Use flow
    overlay.querySelectorAll("[data-pick-item]").forEach((btn) =>
      btn.addEventListener("click", () => {
        selectedItemId = btn.dataset.pickItem;
        selectedAction = "use";
        render();
      })
    );

    // Evoluční itemy – do evolve flow
    overlay.querySelectorAll("[data-evolve-item]").forEach((btn) => {
      if (!btn.disabled) {
        btn.addEventListener("click", () => {
          selectedItemId = btn.dataset.evolveItem;
          selectedAction = "evolve";
          render();
        });
      }
    });

    // TM item – do teach-tm flow (výběr Pokémona)
    overlay.querySelectorAll("[data-teach-tm]").forEach((btn) =>
      btn.addEventListener("click", () => {
        selectedItemId = btn.dataset.teachTm;
        selectedAction = "teach-tm";
        render();
      })
    );

    // HM item – do teach-hm flow (výběr Pokémona)
    overlay.querySelectorAll("[data-teach-hm]").forEach((btn) =>
      btn.addEventListener("click", () => {
        selectedItemId = btn.dataset.teachHm;
        selectedAction = "teach-hm";
        render();
      })
    );

    // Held itemy – do action choice
    overlay.querySelectorAll("[data-pick-held]").forEach((btn) =>
      btn.addEventListener("click", () => {
        selectedItemId = btn.dataset.pickHeld;
        selectedAction = null;
        render();
      })
    );

    // Tlačítka akcí (Use / Held)
    overlay.querySelectorAll("[data-action]").forEach((btn) =>
      btn.addEventListener("click", () => {
        selectedAction = btn.dataset.action;
        render();
      })
    );

    // Batch qty input
    const batchQtyInput = overlay.querySelector("#batch-qty-input");
    if (batchQtyInput) {
      batchQtyInput.addEventListener("change", (e) => {
        const val = parseInt(e.target.value, 10);
        const maxQty = itemCount(selectedItemId);
        selectedUseQty = Math.max(1, Math.min(val, maxQty));
        e.target.value = selectedUseQty;
      });
    }

    // Use on target – batch use podle selectedUseQty
    overlay.querySelectorAll("[data-use-on]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const uid = btn.dataset.useOn;
        // PP Up/Max nejdou přes batch use – míří na konkrétní tah → výběr slotu.
        if (isPpItem(selectedItemId)) {
          pendingPp = { uid, itemId: selectedItemId };
          render();
          return;
        }
        let usedCount = 0;
        let lastResult = { ok: false, reason: "Unknown error" };

        for (let i = 0; i < selectedUseQty; i++) {
          const r = useItem(uid, selectedItemId);
          if (r.ok) {
            usedCount++;
            lastResult = r;
          } else {
            lastResult = r;
            break;
          }
        }

        if (usedCount > 0) {
          const itemName = getItem(selectedItemId)?.name ?? "item";
          if (usedCount === 1) {
            onStatus(`${itemName}: ${lastResult.msg}`);
          } else {
            onStatus(`${itemName} ×${usedCount}: ${lastResult.msg}`);
          }
        } else {
          onStatus(lastResult.reason);
        }
      })
    );

    // Evolve with target
    overlay.querySelectorAll("[data-evolve-with]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const uid = btn.dataset.evolveWith;
        let r;
        if (selectedItemId === "linking-cord") {
          r = evolveByTrade(uid, selectedItemId);
        } else {
          r = evolveWithItem(uid, selectedItemId);
        }
        if (r.ok) {
          onStatus(`${r.fromName} evolved into ${r.toName}!`);
          selectedItemId = null;
          selectedAction = null;
          render();
        } else {
          onStatus(r.reason);
        }
      })
    );

    // Teach TM/HM on target – naučení; při plných 4 tazích výběr slotu
    overlay.querySelectorAll("[data-teach-on]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const uid = btn.dataset.teachOn;
        const kind = selectedAction === "teach-tm" ? "tm" : "hm";
        const num = teachNumFor(selectedItemId, kind);
        const machineName = getItem(selectedItemId)?.name ?? "Move";
        const res = kind === "tm" ? teachTm(uid, num, null) : teachHm(uid, num, null);
        if (res.ok) {
          onStatus(`${machineName} learned!`);
          showLearnPopup(uid, kind, machineName);
          selectedItemId = null;
          selectedAction = null;
          render();
        } else if (res.needsSlot) {
          pendingTeach = { kind, uid, num, name: getItem(selectedItemId)?.name ?? "move" };
          render();
        } else {
          onStatus(res.reason ?? "Can't teach that move.");
        }
      })
    );

    // Aplikace PP Up/Max na vybraný slot tahu
    overlay.querySelectorAll("[data-pp-slot]").forEach((btn) =>
      btn.addEventListener("click", () => {
        if (!pendingPp) return;
        const slot = Number(btn.dataset.ppSlot);
        const r = usePpItem(pendingPp.uid, pendingPp.itemId, slot);
        if (r.ok) {
          onStatus(r.msg);
          pendingPp = null;
          selectedAction = null;
          selectedItemId = null;
          render();
        } else {
          onStatus(r.reason);
        }
      })
    );

    // Přepis konkrétního tahu naučeným TM/HM
    overlay.querySelectorAll("[data-teach-replace]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const slot = Number(btn.dataset.teachReplace);
        const { kind, uid, num } = pendingTeach;
        const machineName = getItem(selectedItemId)?.name ?? pendingTeach.name ?? "Move";
        const res = kind === "tm" ? teachTm(uid, num, slot) : teachHm(uid, num, slot);
        if (res.ok) {
          onStatus(`${machineName} learned!`);
          showLearnPopup(uid, kind, machineName);
          pendingTeach = null;
          selectedItemId = null;
          selectedAction = null;
          render();
        } else {
          onStatus(res.reason ?? "Can't teach that move.");
        }
      })
    );

    // Equip on target
    overlay.querySelectorAll("[data-equip-on]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const r = equipHeldItem(btn.dataset.equipOn, selectedItemId);
        if (r.ok) {
          onStatus(`${getItem(selectedItemId)?.name} equipped.`);
          selectedItemId = null;
          selectedAction = null;
          render();
        } else {
          onStatus(r.reason);
        }
      })
    );

    // Sell 1 (z main listu)
    overlay.querySelectorAll("[data-sell-one]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const r = sellItem(btn.dataset.sellOne, 1);
        if (r.ok) onStatus(`Sold for ${r.gold} gold.`);
        else onStatus(r.reason);
      })
    );

    // Sell all (z main listu)
    overlay.querySelectorAll("[data-sell-all]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const itemId = btn.dataset.sellAll;
        const cnt = itemCount(itemId);
        const r = sellItem(itemId, cnt);
        if (r.ok) onStatus(`Sold ${cnt} for ${r.gold} gold.`);
        else onStatus(r.reason);
      })
    );

    // Sell 1 (z action choice)
    overlay.querySelectorAll("[data-sell-one-action]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const r = sellItem(btn.dataset.sellOneAction, 1);
        if (r.ok) {
          onStatus(`Sold for ${r.gold} gold.`);
          selectedItemId = null;
          selectedAction = null;
          render();
        } else {
          onStatus(r.reason);
        }
      })
    );

    // Sell all (z action choice)
    overlay.querySelectorAll("[data-sell-all-action]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const itemId = btn.dataset.sellAllAction;
        const cnt = itemCount(itemId);
        const r = sellItem(itemId, cnt);
        if (r.ok) {
          onStatus(`Sold ${cnt} for ${r.gold} gold.`);
          selectedItemId = null;
          selectedAction = null;
          render();
        } else {
          onStatus(r.reason);
        }
      })
    );

    // Unequip held item
    overlay.querySelectorAll("[data-unequip]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const uid = btn.dataset.unequip;
        const owned = getState().collection.find((p) => p.uid === uid);
        const itemDef = getItem(owned?.heldItem);
        const r = unequipHeldItem(uid);
        if (r.ok) {
          onStatus(`${itemDef?.name ?? "Item"} removed.`);
        } else {
          onStatus(r.reason);
        }
      })
    );

    const back = overlay.querySelector('[data-act="back"]');
    if (back)
      back.addEventListener("click", () => {
        if (pendingPp) {
          pendingPp = null;
        } else if (pendingTeach) {
          pendingTeach = null;
        } else if (selectedAction) {
          selectedAction = null;
        } else {
          selectedItemId = null;
        }
        render();
      });

    const closeBtn = overlay.querySelector('[data-act="close"]');
    if (closeBtn) closeBtn.addEventListener("click", close);
  }

  render();
}
