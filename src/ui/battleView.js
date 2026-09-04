/**
 * UI: panel Battle Area (pravá horní část).
 * Vizuální souboj: HP bary obou stran, ovládání (start/pauza, rychlost) a log.
 * Reaguje na událost BATTLE_UPDATE ze soubojového systému.
 */

import { bus, EVENTS } from "../core/events.js";
import { getState } from "../core/state.js";
import {
  getBattle,
  toggleBattle,
  attemptCatch,
  getCatchChance,
  getAutocatch,
  setAutocatch,
  getAutoBattle,
  setAutoBattle,
  getSelectedBall,
  setSelectedBall,
  healTeam,
  teamNeedsHeal,
  playerMove,
  playerSwitch,
  playerCatch,
  playerUseItem,
  playerRun,
  nextEncounter,
  hpOf,
  lootLabel,
  itemsAllowed,
  getRules,
} from "../systems/battleSystem.js";
import { POKEBALLS, getPokeball } from "../../data/pokeballs.js";
import { ITEMS, getItem } from "../../data/items.js";
import { canUseItem } from "../systems/itemSystem.js";
import { xpForNextLevel } from "../systems/progression.js";
import { ballIconHtml } from "./ballIcon.js";
import { spriteImg, spriteScaleForHeight } from "./sprites.js";
import { getTeamPokemon } from "../systems/team.js";
import { computeStats } from "../systems/pokemonSystem.js";
import { getSpecies } from "../../data/pokemon.js";
import { getMove } from "../../data/moves.js";
import { isCaught } from "../systems/pokedex.js";
import { typeColor, typeBadge } from "./typeColors.js";
import { statusBadge } from "./statusBadge.js";
import { preserveWindowScroll } from "./scrollPreserve.js";

/** Podmenu manuálního souboje (jen manuál mód): root | fight | bag | switch | item-target. */
let menuMode = "root";
/** Když je menuMode "item-target", tady je itemId který se má aplikovat. */
let pendingItemId = null;
/** Poslední root pro překreslení při navigaci v podmenu (bez BATTLE_UPDATE). */
let lastRoot = null;

/** Ikona kategorie tahu pro tlačítka útoků. */
const CAT_ICON = { physical: "💥", special: "✨", status: "🌀" };

let subscribed = false;
/** ResizeObserver, který drží velikost spritů závislou na úhlopříčce scény. */
let spriteObs = null;

/**
 * Nastaví velikost spritů podle ÚHLOPŘÍČKY scény (√(š²+v²)), takže sprite roste
 * i klesá s CELKOVOU velikostí battle areny, ne jen s jedním rozměrem (CSS
 * container queries uměly reagovat jen na š/v zvlášť → na nízké aréně se sprite
 * zasekl na výškovém stropu). Volá se po každém překreslení scény (vytváří se
 * znovu) i z ResizeObserveru při změně velikosti okna/panelu.
 * @param {HTMLElement} root
 */
function applySpriteScale(root) {
  const field = root.querySelector(".battle-field");
  if (!field) return;
  const r = field.getBoundingClientRect();
  const diag = Math.hypot(r.width, r.height);
  // ~21 % úhlopříčky, s dolním/horním stropem, ať sprite nezmizí ani nepřeteče.
  const size = Math.max(96, Math.min(460, Math.round(diag * 0.21)));
  field.style.setProperty("--sprite", `${size}px`);
}

/**
 * Vykreslí panel a jednorázově se přihlásí k aktualizacím souboje.
 * @param {HTMLElement} root
 */
export function renderBattle(root) {
  draw(root);
  if (!subscribed) {
    bus.on(EVENTS.BATTLE_UPDATE, () => draw(root));
    bus.on(EVENTS.BATTLE_HIT, (hit) => playHit(root, hit));
    bus.on(EVENTS.BATTLE_FAINT, (info) => playFaint(root, info));
    subscribed = true;
  }
  // Sprity škálují s úhlopříčkou scény – sleduj změny velikosti panelu/okna.
  if (!spriteObs && typeof ResizeObserver !== "undefined") {
    spriteObs = new ResizeObserver(() => applySpriteScale(root));
    spriteObs.observe(root);
  }
}

/**
 * Přehraje jednu ránu: útočník vyrazí vpřed, zasažený se otřese/zabliká
 * a nad ním vylétne plovoucí „-N". `hit.side` je ZASAŽENÁ strana, útočník je
 * tedy ta druhá. Běží až po překreslení scény (event přichází po BATTLE_UPDATE).
 *
 * Útočná animace se liší podle kategorie tahu: physical = útočník doskočí až
 * na soupeře (větší výpad), special = zatím ponecháváme původní menší výpad.
 * @param {HTMLElement} root
 * @param {{ side: "enemy"|"player", dmg: number, category?: string }} hit
 */
function playHit(root, hit) {
  if (!hit) return;
  if (hit.category === "status") {
    // DoT (otrava/popálení) – žádný útočník; jen reakce zasaženého + číslo.
    if (hit.dmg > 0) animateSprite(root, hit.side, "is-hit");
    spawnDamage(root, hit);
    return;
  }
  const atkSide = hit.side === "enemy" ? "player" : "enemy";
  if (hit.category === "physical") {
    // Physical: útočník skutečně doskočí na soupeře (vzdálenost počítáme z DOM).
    jumpAttack(root, atkSide, hit.side);
  } else {
    // Special: zatím jen krátký výpad směrem k soupeři.
    animateSprite(root, atkSide, "is-attacking");
  }
  if (hit.dmg > 0) animateSprite(root, hit.side, "is-hit");
  spawnDamage(root, hit);
}

/**
 * Physical útok: útočník vyskočí a doskočí až na sprite soupeře. Skutečnou
 * vzdálenost mezi sprity spočítáme z jejich pozic v DOM (sprity jsou v rozích
 * scény, takže napevno dané pixely by nedosáhly) a předáme ji do CSS animace
 * přes proměnné `--jx`/`--jy`.
 * @param {HTMLElement} root
 * @param {"enemy"|"player"} atkSide  útočník
 * @param {"enemy"|"player"} defSide  zasažený (cíl doskoku)
 */
function jumpAttack(root, atkSide, defSide) {
  const atk = root.querySelector(`.battle-field .combatant.${atkSide} .battle-sprite`);
  const def = root.querySelector(`.battle-field .combatant.${defSide} .battle-sprite`);
  if (!atk) return;
  if (!def) {
    animateSprite(root, atkSide, "is-attacking");
    return;
  }
  const ar = atk.getBoundingClientRect();
  const dr = def.getBoundingClientRect();
  // Dolet ke středu soupeře, ale zastavíme kousek před ním (85 %), ať útočník
  // přistane „na" soupeři a ne přesně přes něj.
  const dx = ((dr.left + dr.width / 2) - (ar.left + ar.width / 2)) * 0.85;
  const dy = ((dr.top + dr.height / 2) - (ar.top + ar.height / 2)) * 0.85;
  atk.style.setProperty("--jx", `${Math.round(dx)}px`);
  atk.style.setProperty("--jy", `${Math.round(dy)}px`);
  atk.classList.remove("is-attacking-physical");
  void atk.offsetWidth; // reflow → restart animace
  atk.classList.add("is-attacking-physical");
  atk.addEventListener(
    "animationend",
    () => {
      atk.classList.remove("is-attacking-physical");
      atk.style.removeProperty("--jx");
      atk.style.removeProperty("--jy");
    },
    { once: true }
  );
}

/**
 * Faint: padlý Pokémon klesne dolů a vybledne. Třídu necháváme navěšenou až do
 * dalšího překreslení scény (které přijde po `FAINT_ANIM_MS` z battleSystem),
 * takže sprite zůstane „ležet/zmizelý" po celou dobu animace.
 * @param {HTMLElement} root
 * @param {{ side: "enemy"|"player" }} info
 */
function playFaint(root, info) {
  if (!info) return;
  const sprite = root.querySelector(`.battle-field .combatant.${info.side} .battle-sprite`);
  if (!sprite) return;
  sprite.classList.remove("is-fainting");
  void sprite.offsetWidth; // reflow → restart animace
  sprite.classList.add("is-fainting");
}

/**
 * Navěsí jednorázovou CSS animaci na sprite dané strany (útok/zásah).
 * Třídu po doběhnutí odebere, aby šla příště spustit znovu.
 * @param {HTMLElement} root
 * @param {"enemy"|"player"} side
 * @param {string} cls  CSS třída animace
 */
function animateSprite(root, side, cls) {
  const sprite = root.querySelector(`.battle-field .combatant.${side} .battle-sprite`);
  if (!sprite) return;
  sprite.classList.remove(cls);
  void sprite.offsetWidth; // reflow → restart animace, i když třída zůstala z minula
  sprite.classList.add(cls);
  sprite.addEventListener("animationend", () => sprite.classList.remove(cls), { once: true });
}

/**
 * Vyhodí nad zasaženého bojovníka plovoucí „-N" (červené číslo, které vylétne
 * a zmizí). Spawnuje se až po překreslení scény, takže přežije redraw kola.
 * @param {HTMLElement} root
 * @param {{ side: "enemy"|"player", dmg: number, crit?: boolean, status?: string }} hit
 */
function spawnDamage(root, hit) {
  if (!hit || !hit.dmg) return;
  const sprite = root.querySelector(`.battle-field .combatant.${hit.side} .battle-sprite`);
  if (!sprite) return;
  const el = document.createElement("span");
  let cls = "dmg-float";
  if (hit.crit) cls += " is-crit"; // kritický zásah – větší, žluté
  if (hit.status === "poison") cls += " is-poison";
  else if (hit.status === "burn") cls += " is-burn";
  el.className = cls;
  el.textContent = hit.crit ? `-${hit.dmg}!` : `-${hit.dmg}`;
  sprite.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
  setTimeout(() => el.remove(), 1200); // pojistka, kdyby animationend nepřišel
}

/**
 * HTML jednoho bojovníka.
 * @param c      bojovník ze souboje (ref = jedinec, stats, hp)
 * @param side   "enemy" | "player" (řídí barvu a stranu spritu)
 * @param view   pohled spritu: soupeř `front`, náš Pokémon `back`
 * @param showXp přidá EXP bar (jen náš Pokémon – divoký nepřítel XP nesbírá)
 * @param animated animovaný gif sprite (jen manuální souboj; auto/idle = statické png)
 */
function combatantHtml(c, side, view, showXp = false, animated = false) {
  const pct = Math.max(0, Math.round((c.hp / c.stats.maxHp) * 100));
  const low = pct <= 25 ? " low" : "";
  const types = c.types.map(typeBadge).join("");
  const name = `${c.ref.shiny ? "✨ " : ""}${c.name}`;
  const status = statusBadge(c.status);

  // Velikost spritu ve scéně škálujeme podle výšky druhu (Pidgey ≠ Charizard).
  const spScale = spriteScaleForHeight(getSpecies(c.ref.speciesId)?.height);
  const sprite = spriteImg(c.ref.speciesId, {
    view,
    shiny: !!c.ref.shiny,
    gender: c.ref.gender,
    animated,
    alt: c.name,
    extraClass: "battle-sprite",
    scale: spScale,
  });

  let xpHtml = "";
  if (showXp) {
    const need = xpForNextLevel(c.ref.level);
    const xpPct = Math.max(0, Math.min(100, Math.round((c.ref.xp / need) * 100)));
    xpHtml = `
      <div class="xpbar"><div class="xpfill" style="width:${xpPct}%"></div></div>
      <div class="hptext">${c.ref.xp} / ${need} XP</div>`;
  }

  // U soupeře skrýváme číselné HP (hráč nemá znát přesné hodnoty) – bar zůstává.
  const hpText =
    side === "player"
      ? `<div class="hptext">${c.hp} / ${c.stats.maxHp} HP</div>`
      : "";

  return `
    <div class="combatant ${side}">
      ${sprite}
      <div class="c-info">
        <div class="c-head"><strong>${name}</strong> · Lv ${c.ref.level} ${types}${status}</div>
        <div class="hpbar"><div class="hpfill${low}" style="width:${pct}%"></div></div>
        ${hpText}
        ${xpHtml}
      </div>
    </div>`;
}

/**
 * Hlavička okna: nadpis vlevo, vpravo nahoře ovládání –
 * Pause/Resume (pozastavení souboje) + přepínače Auto battle a Auto catch
 * a výběr auto-catch módu (All / Shiny only). `b` může být null (žádný souboj).
 */
function headHtml(b) {
  const ac = getAutocatch();
  const pauseBtn =
    b && !b.result
      ? `<button class="btn head-btn" id="battle-toggle">${b.running ? "⏸ Pause" : "▶ Resume"}</button>`
      : "";
  // Catch tlačítko patří do lišty jen v Auto módu (v manuálu se chytá přes Items).
  // Když dojdou Poké Bally, tlačítko rovnou hlásí „No Poké Balls" (i tooltip).
  let catchBtn = "";
  if (b && !b.result && getAutoBattle()) {
    const balls = getState().resources.balls ?? {};
    const selCount = balls[getSelectedBall()] ?? 0;
    const canCatch = b.enemy && b.enemy.hp > 0 && selCount > 0;
    const ballIcon = ballIconHtml(getSelectedBall(), { size: 16 });
    if (selCount <= 0) {
      catchBtn = `<button class="btn head-btn catch-btn" id="catch-btn" disabled title="No Poké Balls — buy some in the Poké Mart.">${ballIcon} No Poké Balls</button>`;
    } else {
      const pctLabel = canCatch ? ` (${Math.round(getCatchChance() * 100)}%)` : "";
      catchBtn = `<button class="btn head-btn catch-btn" id="catch-btn" ${canCatch ? "" : "disabled"}>${ballIcon} Catch${pctLabel}</button>`;
    }
  }
  const acMode = `<select id="ac-mode" class="ac-mode" ${ac.enabled ? "" : "disabled"} title="Auto catch: which Pokémon to catch">
      <option value="none" ${ac.mode === "none" ? "selected" : ""}>None</option>
      <option value="all" ${ac.mode === "all" ? "selected" : ""}>All</option>
      <option value="shiny" ${ac.mode === "shiny" ? "selected" : ""}>Shiny only</option>
    </select>`;
  // Výběr míčku vyhrazeného pro autocatch (nezávislý na ručním selectedBall).
  // Ukáže počet kusů; když typ dojde, autocatch se sám vypne (viz battleSystem).
  const balls = getState().resources.balls ?? {};
  const acBall = `<select id="ac-ball" class="ac-mode" ${ac.enabled ? "" : "disabled"} title="Auto catch: which Poké Ball to use (never switches to another)">
      ${POKEBALLS.map(
        (ball) => `<option value="${ball.id}" ${ball.id === ac.ball ? "selected" : ""}>${ball.name} (${balls[ball.id] ?? 0})</option>`
      ).join("")}
    </select>`;
  return `<div class="battle-head">
    <h2 class="panel-title">Battle Area${b ? ` — ${b.area.name}` : ""}</h2>
    <div class="battle-toggles">
      ${pauseBtn}
      ${catchBtn}
      <label class="tg"><input type="checkbox" id="tg-autobattle" ${getAutoBattle() ? "checked" : ""}/> Auto battle</label>
      <label class="tg"><input type="checkbox" id="tg-autocatch" ${ac.enabled ? "checked" : ""}/> Auto catch</label>
      ${acMode}
      ${acBall}
    </div>
  </div>`;
}

/**
 * Řádek pod logem v side baru. V AUTO módu je vše (Catch i stav „došly balls")
 * nahoře v liště souboje, takže tady nic není. V MANUÁLNÍM módu je herní menu
 * překryté přímo ve scéně (viz {@link battleCmdHtml}) a tady je jen řádek na hlášku.
 */
function bottomControlsHtml(b) {
  if (getAutoBattle()) return "";
  return `<div id="battle-msg" class="placeholder" style="margin-top:6px"></div>`;
}

/** Zda se v manuálním módu teď dá hrát (a tedy zobrazit menu ve scéně). */
function manualPlayable(b) {
  return !getAutoBattle() && b.running && !b.result && b.enemy && b.enemy.hp > 0;
}

/**
 * Manuální bojové menu překryté ve scéně. Kořen je lišta 4 dlaždic dole
 * (Battle / Run / Items / Switch); podmenu je překryvné okno (cmd-panel) –
 * u Battle navíc s panelem soupeře (info jen u chyceného druhu).
 */
function battleCmdHtml(b) {
  if (menuMode === "fight")
    return `<div class="battle-cmd cmd-panel">${enemyInfoHtml(b)}${fightMenuHtml(b)}</div>`;
  if (menuMode === "bag")
    return `<div class="battle-cmd cmd-panel">${bagMenuHtml(b)}</div>`;
  if (menuMode === "item-target")
    return `<div class="battle-cmd cmd-panel">${itemTargetMenuHtml(b, pendingItemId)}</div>`;
  if (menuMode === "switch")
    return `<div class="battle-cmd cmd-panel">${switchMenuHtml(b)}</div>`;
  return `<div class="battle-cmd cmd-root">${rootMenuHtml()}</div>`;
}

/**
 * Panel soupeře nad útoky: sprite, jméno, level. Typ a base staty se ukážou
 * jen když už máš daný druh chycený (v Pokédexu); jinak „???" a pobídka chytit.
 */
function enemyInfoHtml(b) {
  const e = b.enemy;
  const sp = getSpecies(e.ref.speciesId);
  const caught = isCaught(e.ref.speciesId);
  const name = `${e.ref.shiny ? "✨ " : ""}${e.name}`;
  const sprite = spriteImg(e.ref.speciesId, {
    view: "front",
    shiny: !!e.ref.shiny,
    gender: e.ref.gender,
    alt: e.name,
    extraClass: "cmd-enemy-sprite",
  });
  const head = `<div class="cmd-enemy-head"><strong>${name}</strong> · Lv ${e.ref.level}</div>`;

  if (!caught) {
    return `<div class="cmd-enemy">
      ${sprite}
      <div class="cmd-enemy-info">
        ${head}
        <div class="cmd-enemy-types"><span class="type">???</span></div>
        <p class="placeholder cmd-enemy-note">Not in your Pokédex yet — catch one to reveal its type and base stats.</p>
      </div>
    </div>`;
  }

  const bs = sp?.baseStats ?? {};
  const types = e.types.map(typeBadge).join("");
  const stat = (label, v) =>
    `<span class="bs"><span class="bs-l">${label}</span><span class="bs-v">${v ?? "—"}</span></span>`;
  return `<div class="cmd-enemy">
    ${sprite}
    <div class="cmd-enemy-info">
      ${head}
      <div class="cmd-enemy-types">${types}</div>
      <div class="cmd-bstats">
        ${stat("HP", bs.hp)}${stat("Atk", bs.attack)}${stat("Def", bs.defense)}
        ${stat("SpA", bs.spAttack)}${stat("SpD", bs.spDefense)}${stat("Spe", bs.speed)}
      </div>
    </div>
  </div>`;
}

/** Kořenové menu manuálního souboje: 4 dlaždice vedle sebe (lišta dole). */
function rootMenuHtml() {
  return `
    <button class="btn menu-btn" data-menu="fight">Battle</button>
    <button class="btn menu-btn" data-menu="run">Run</button>
    <button class="btn menu-btn" data-menu="bag">Items</button>
    <button class="btn menu-btn" data-menu="switch">Switch</button>`;
}

/** Podmenu Battle: 4 tahy (jméno/typ/PP), nebo Struggle když došly PP. */
function fightMenuHtml(b) {
  // Transform/Mimic dočasně mění dostupné tahy (volatile.moveOverride).
  const moves = b.player.volatile?.moveOverride ?? b.player.ref.moves ?? [];
  const anyPp = moves.some((m) => (m.pp ?? 0) > 0);
  let btns;
  if (!anyPp) {
    btns = `<button class="btn move-btn struggle" data-move="0">
      <span class="move-name">💢 Struggle</span>
      <span class="move-sub">no PP left</span>
    </button>`;
  } else {
    btns =
      moves
        .map((m, i) => {
          const mv = getMove(m.id);
          if (!mv) return "";
          const out = (m.pp ?? 0) <= 0;
          return `<button class="btn move-btn move-typed" data-move="${i}" style="--tc:${typeColor(mv.type)}" ${out ? "disabled" : ""}>
            <span class="move-name">${CAT_ICON[mv.category] ?? ""} ${mv.name}</span>
            <span class="move-sub">${mv.type ?? "—"} · PP ${m.pp}/${m.maxPp}</span>
          </button>`;
        })
        .join("") || `<p class="placeholder">This Pokémon knows no moves.</p>`;
  }
  return `<div class="move-grid">${btns}</div>
    <button class="btn btn-sm menu-back" data-menu="root">← Back</button>`;
}

/** Podmenu Items (batoh): léčivé itemy (výběr cíle) + výběr ballu a hod. */
function bagMenuHtml(b) {
  const balls = getState().resources.balls ?? {};
  const items = getState().resources.items ?? {};
  const owned = POKEBALLS.filter((ball) => (balls[ball.id] ?? 0) > 0);
  const selected = getSelectedBall();
  const selCount = balls[selected] ?? 0;
  const canCatch = b.enemy && b.enemy.hp > 0 && selCount > 0;
  const catchPct = Math.round(getCatchChance() * 100);

  // Léčivé itemy (bez podmínky na aktivního – výběr cíle přijde v item-target módu).
  // Herní pravidla No items / No potions můžou předměty v souboji zakázat.
  const rules = getRules();
  const allItems = ITEMS.filter((it) => (items[it.id] ?? 0) > 0 && itemsAllowed(it.id));
  const itemBtns = allItems
    .map(
      (it) =>
        `<button class="btn move-btn item-use" data-select-item="${it.id}" title="${it.desc}">${it.icon} ${it.name} <span class="placeholder">×${items[it.id]}</span></button>`
    )
    .join("");
  let itemsSection;
  if (itemBtns) {
    itemsSection = `<div class="bag-items">${itemBtns}</div>`;
  } else if (rules.noItems) {
    itemsSection = `<p class="placeholder bag-note">Items are disabled (game rule).</p>`;
  } else if (rules.noPotions) {
    itemsSection = `<p class="placeholder bag-note">Potions are disabled (game rule).</p>`;
  } else {
    itemsSection = `<p class="placeholder bag-note">No healing items in your bag.</p>`;
  }

  // Sekce Poké Bally (může být prázdná – itemy jsou pořád k dispozici).
  let ballSection;
  if (!owned.length) {
    ballSection = `<p class="placeholder bag-note">No Poké Balls — buy some in the Poké Mart.</p>`;
  } else {
    const chips = owned
      .map(
        (ball) =>
          `<button class="ball-chip ${ball.id === selected ? "active" : ""}" data-ball="${ball.id}" title="${ball.name} — ${ball.desc}">${ballIconHtml(ball.id, { size: 16 })} ${balls[ball.id]}</button>`
      )
      .join("");
    ballSection = `<div class="ball-picker">${chips}</div>
      <button class="btn move-btn" id="throw-ball" ${canCatch ? "" : "disabled"}>${ballIconHtml(selected, { size: 16 })} Throw ${getPokeball(selected)?.name ?? "Ball"}${canCatch ? ` (${catchPct}%)` : ""}</button>`;
  }

  return `${itemsSection}${ballSection}
    <button class="btn btn-sm menu-back" data-menu="root">← Back</button>`;
}

/**
 * Podmenu Item Target: výběr člena týmu, na kterého se item aplikuje.
 * Filtruje členy dle canUseItem pro daný item.
 * @param {*} b      souboj
 * @param {string} itemId  který item se aplikuje
 */
function itemTargetMenuHtml(b, itemId) {
  const team = getTeamPokemon();

  const tiles = team
    .map((p, i) => {
      const sp = getSpecies(p.speciesId);
      const max = computeStats(p).maxHp;
      const hp = Math.max(0, Math.min(max, hpOf(p)));
      const usable = canUseItem(itemId, p);
      const fainted = hp <= 0;
      const pct = Math.round((hp / max) * 100);
      const low = fainted ? " fainted" : pct <= 25 ? " low" : "";
      const reason = !usable.ok ? usable.reason : "";
      const tiles_cls = usable.ok ? "" : " disabled";
      return `<button class="btn switch-tile${tiles_cls}" data-item-target="${p.uid}" ${!usable.ok ? "disabled" : ""} title="${reason}">
        <span class="sw-name">${p.shiny ? "✨ " : ""}${sp?.name ?? p.speciesId} <span class="placeholder">Lv ${p.level}</span></span>
        <span class="hpbar"><span class="hpfill${low}" style="width:${pct}%"></span></span>
        <span class="sw-hp">${hp}/${max} HP</span>
        ${reason ? `<span class="placeholder" style="font-size:0.8em">${reason}</span>` : ""}
      </button>`;
    })
    .join("");
  return `<div class="switch-list">${tiles}</div>
    <button class="btn btn-sm menu-back" data-menu="bag">← Back</button>`;
}

/** Podmenu Switch: seznam týmu s HP; klik prohodí (živého, nenasazeného). */
function switchMenuHtml(b) {
  const team = getTeamPokemon();
  const tiles = team
    .map((p, i) => {
      const sp = getSpecies(p.speciesId);
      const max = computeStats(p).maxHp;
      const hp = Math.max(0, Math.min(max, hpOf(p)));
      const active = i === b.teamCursor;
      const fainted = hp <= 0;
      const pct = Math.round((hp / max) * 100);
      const low = fainted ? " fainted" : pct <= 25 ? " low" : "";
      const tail = active ? " · in battle" : fainted ? " · fainted" : "";
      return `<button class="btn switch-tile${active ? " active" : ""}" data-switch="${p.uid}" ${active || fainted ? "disabled" : ""}>
        <span class="sw-name">${p.shiny ? "✨ " : ""}${sp?.name ?? p.speciesId} <span class="placeholder">Lv ${p.level}</span></span>
        <span class="hpbar"><span class="hpfill${low}" style="width:${pct}%"></span></span>
        <span class="sw-hp">${hp}/${max} HP${tail}</span>
      </button>`;
    })
    .join("");
  return `<div class="switch-list">${tiles}</div>
    <button class="btn btn-sm menu-back" data-menu="root">← Back</button>`;
}

/**
 * Výherní / chytací okno mezi souboji (JEN manuální mód). Po výhře ukáže
 * odměnu, po chycení „hozený" ball s Pokémonem uvnitř. Obě verze mají tlačítko
 * „Next battle" (nasadí dalšího soupeře, viz {@link nextEncounter}).
 */
function interludeHtml(b) {
  const il = b.interlude;
  const e = il.enemy;
  const enemyName = `${e.shiny ? "✨ " : ""}${e.name}`;

  if (il.kind === "catch") {
    const sprite = spriteImg(e.speciesId, {
      view: "front",
      shiny: !!e.shiny,
      gender: e.gender,
      alt: e.name,
      extraClass: "catch-mon-sprite",
    });
    const oc = il.outcome ?? {};
    let sub;
    if (oc.added) sub = `${enemyName} was added to your collection!`;
    else if (oc.improvements && oc.improvements.length)
      sub = `A better ${enemyName} — improved ${oc.improvements.join(", ")} (the previous one was released).`;
    else sub = `${enemyName} caught, but your own was better — released.`;

    return `<div class="battle-result is-catch">
      <div class="result-title">Gotcha!</div>
      <div class="catch-visual">
        <span class="catch-mon">${sprite}</span>
        <span class="catch-ball">${ballIconHtml(il.ball, { size: 84 })}</span>
      </div>
      <div class="result-name">${enemyName} <span class="placeholder">Lv ${e.level}</span></div>
      <p class="result-sub">${sub}</p>
      <button class="btn over-btn" id="next-encounter">Next battle ▶</button>
    </div>`;
  }

  // kind === "win"
  const r = il.rewards ?? {};
  const sprite = spriteImg(e.speciesId, {
    view: "front",
    shiny: !!e.shiny,
    gender: e.gender,
    alt: e.name,
    extraClass: "result-mon-sprite",
  });
  const rows = [];
  rows.push(`<li>✨ <b>+${r.xp ?? 0}</b> XP</li>`);
  rows.push(`<li>💰 <b>+${r.gold ?? 0}</b> gold</li>`);
  for (const d of r.loot ?? []) rows.push(`<li>🎁 <b>+${d.amount}</b> ${lootLabel(d.resource)}</li>`);
  if (r.egg) {
    const eggName = getSpecies(r.egg.speciesId)?.name ?? r.egg.speciesId;
    rows.push(`<li>🥚 ${eggName} Egg</li>`);
  }
  if (r.leveled) rows.push(`<li class="lvl-up">⬆ Reached <b>Lv ${r.newLevel}</b>!</li>`);

  return `<div class="battle-result is-win">
    <div class="result-title">Victory!</div>
    <div class="result-enemy">
      <span class="result-mon">${sprite}</span>
      <span class="result-name">${enemyName} <span class="placeholder">Lv ${e.level}</span> defeated</span>
    </div>
    <ul class="result-rewards">${rows.join("")}</ul>
    <button class="btn over-btn" id="next-encounter">Next battle ▶</button>
  </div>`;
}

/** Překreslí battle-panel a přitom zachová scroll pozici OKNA (skládaný layout
 *  scrolluje celé okno; přepis innerHTML by ho jinak vyhodil nahoru – hlavně
 *  v auto módu, kde BATTLE_UPDATE tiká rychle). Vlastní vykreslení viz drawInner. */
function draw(root) {
  preserveWindowScroll(() => drawInner(root));
}

function drawInner(root) {
  lastRoot = root;
  const b = getBattle();

  if (!b) {
    menuMode = "root"; // příští souboj začne v kořenovém menu
    root.innerHTML = `
      ${headHtml(null)}
      <p class="placeholder">No battle yet. Build a team and start it.</p>
      <button class="btn" id="battle-toggle">▶ Start battle</button>
      <div id="battle-msg" class="placeholder" style="margin-top:8px"></div>
    `;
    wire(root);
    return;
  }

  const defeated = b.result === "defeat";
  const interlude = !defeated && !!b.interlude;
  const showCmd = !defeated && !interlude && manualPlayable(b);
  // Animované gif sprity jen v manuálním souboji; v auto módu jedou rychlé
  // kola, kde by animace nebyla vidět → statické png.
  const anim = !getAutoBattle();

  root.innerHTML = `
    ${headHtml(b)}
    <div class="battle-body">
      <div class="battle-field${defeated ? " is-over" : ""}${interlude ? " is-result" : ""}${showCmd ? " has-cmd" : ""}">
        <div class="bg"${b.background ? ` style="background-image:url('${b.background}')"` : ""}></div>
        ${combatantHtml(b.enemy, "enemy", "front", false, anim)}
        <div class="vs">VS</div>
        ${combatantHtml(b.player, "player", "back", true, anim)}
        ${showCmd ? battleCmdHtml(b) : ""}
        ${interlude ? interludeHtml(b) : ""}
        ${defeated
          ? `<div class="battle-over">
               <div class="over-title">Defeated</div>
               <p class="over-sub">Your whole team fainted.</p>
               <div class="over-actions">
                 ${teamNeedsHeal()
                   ? `<button class="btn over-btn" id="heal-team">🏥 Heal team</button>`
                   : `<div class="over-healed">✓ Team healed — ready to go</div>`}
                 <button class="btn over-btn" id="new-battle">▶ New battle</button>
               </div>
             </div>`
          : ""}
      </div>
      <aside class="battle-side">
        <div class="battle-info">${b.log
          .slice(-30)
          .map((l) => {
            const text = typeof l === "string" ? l : l.text;
            const side = typeof l === "string" ? "neutral" : l.side ?? "neutral";
            return `<div class="log-line log-${side}">${text}</div>`;
          })
          .join("")}</div>
        ${defeated ? "" : bottomControlsHtml(b)}
      </aside>
    </div>
  `;
  // „Textbox" se posune na nejnovější hlášku (jako v klasické hře).
  const info = root.querySelector(".battle-info");
  if (info) info.scrollTop = info.scrollHeight;
  wire(root);
  // Scéna se právě vytvořila znovu → nastav velikost spritů dle úhlopříčky.
  applySpriteScale(root);
}

function wire(root) {
  const toggle = root.querySelector("#battle-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const r = toggleBattle();
      if (r && r.ok === false) {
        const msg = root.querySelector("#battle-msg");
        if (msg) msg.textContent = r.reason;
      }
    });
  }
  // „New battle" po prohře (overlay přímo ve scéně).
  const newBattle = root.querySelector("#new-battle");
  if (newBattle) newBattle.addEventListener("click", () => toggleBattle());

  // „Next battle" ve výherním/chytacím okně (manuální mód) → další soupeř.
  const nextBtn = root.querySelector("#next-encounter");
  if (nextBtn) nextBtn.addEventListener("click", () => nextEncounter());

  // Rychlé vyléčení týmu přímo z obrazovky prohry (bez proklikávání města).
  const healBtn = root.querySelector("#heal-team");
  if (healBtn) healBtn.addEventListener("click", () => healTeam()); // redraw → tlačítko vystřídá „Team healed"

  // Přepínače vpravo nahoře.
  const tgAuto = root.querySelector("#tg-autobattle");
  if (tgAuto) tgAuto.addEventListener("change", (e) => setAutoBattle(e.target.checked));
  const tgCatch = root.querySelector("#tg-autocatch");
  if (tgCatch) tgCatch.addEventListener("change", (e) => setAutocatch({ enabled: e.target.checked }));
  const acMode = root.querySelector("#ac-mode");
  if (acMode) acMode.addEventListener("change", (e) => setAutocatch({ mode: e.target.value }));
  const acBall = root.querySelector("#ac-ball");
  if (acBall) acBall.addEventListener("change", (e) => setAutocatch({ ball: e.target.value }));

  const catchBtn = root.querySelector("#catch-btn");
  if (catchBtn) catchBtn.addEventListener("click", () => attemptCatch());

  root.querySelectorAll("[data-ball]").forEach((chip) =>
    chip.addEventListener("click", () => setSelectedBall(chip.dataset.ball))
  );

  /* --- Manuální bojové menu --- */
  const showMsg = (msg) => {
    const m = root.querySelector("#battle-msg");
    if (m) m.textContent = msg ?? "";
  };

  // Navigace v menu (fight/bag/switch/root) + Run.
  root.querySelectorAll("[data-menu]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const to = btn.dataset.menu;
      if (to === "run") {
        playerRun(); // ukončí souboj → redraw na start
        return;
      }
      menuMode = to; // fight | bag | switch | root
      draw(root); // lokální překreslení (bez akce v souboji)
    })
  );

  // Útok (index slotu). Před akcí zpět do rootu, ať po odehrání kola vidíme menu.
  root.querySelectorAll("[data-move]").forEach((btn) =>
    btn.addEventListener("click", () => {
      menuMode = "root";
      const r = playerMove(Number(btn.dataset.move));
      if (!r.ok) showMsg(r.reason);
    })
  );

  // Hod ballem z batohu.
  const throwBtn = root.querySelector("#throw-ball");
  if (throwBtn)
    throwBtn.addEventListener("click", () => {
      menuMode = "root";
      const r = playerCatch();
      if (!r.ok) showMsg(r.reason);
    });

  // Výběr itemu → přechod do item-target módu (výběr cíle).
  root.querySelectorAll("[data-select-item]").forEach((btn) =>
    btn.addEventListener("click", () => {
      pendingItemId = btn.dataset.selectItem;
      menuMode = "item-target";
      draw(root); // lokální překreslení (bez akce v souboji)
    })
  );

  // Aplikace itemu na vybraného člena týmu (v item-target módu).
  root.querySelectorAll("[data-item-target]").forEach((btn) =>
    btn.addEventListener("click", () => {
      menuMode = "root";
      const r = playerUseItem(pendingItemId, btn.dataset.itemTarget);
      if (!r.ok) showMsg(r.reason);
      pendingItemId = null;
    })
  );

  // Prohození Pokémona.
  root.querySelectorAll("[data-switch]").forEach((tile) =>
    tile.addEventListener("click", () => {
      menuMode = "root";
      const r = playerSwitch(tile.dataset.switch);
      if (!r.ok) showMsg(r.reason);
    })
  );
}
