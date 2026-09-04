/**
 * UI: globální nastavení hry + Dev nástroje.
 *
 * Nastavení žije ve sdíleném modálním okně (`openSettingsModal`), které se dá
 * otevřít z horní lišty (tlačítko ⚙) i z úvodní obrazovky (title screen).
 * Obsahuje herní rychlost a **globální Dev sekci** (peníze, přidání vejce/Ditta,
 * a per-jedincové úpravy level/shiny s výběrem cíle) – dřív byly dev nástroje
 * roztroušené na Kartě Pokémona, teď jsou na jednom místě. Další možnosti
 * (Lock max level, Nuzlocke…) přibudou později – viz docs/BACKLOG.md.
 */

import { bus, EVENTS } from "../core/events.js";
import { getState, commit } from "../core/state.js";
import { getSpecies } from "../../data/pokemon.js";
import { getSpeed, setSpeed } from "../systems/battleSystem.js";
import { devAddEgg, devAddPokemon, devAddMoney } from "../systems/devTools.js";
import { devSetLevel, devToggleShiny } from "../systems/evolutionSystem.js";
import { scrollAware } from "./scrollPreserve.js";

/**
 * Vykreslí tlačítko ⚙ do horní lišty. Klik otevře sdílené modální nastavení.
 * @param {HTMLElement} root
 */
export function renderSettings(root) {
  root.innerHTML = `<button class="btn settings-btn" id="settings-toggle" title="Settings" aria-label="Settings">⚙</button>`;
  root.querySelector("#settings-toggle").addEventListener("click", openSettingsModal);
}

/** Aby se stejné okno neotevřelo dvakrát (např. rychlý dvojklik). */
let openOverlay = null;

/** Poslední hláška dev akce – přežije překreslení těla (STATE_CHANGED). */
let lastDevMsg = "";

/** uid cílového jedince dev úprav (level/shiny). Přežije překreslení těla. */
let devTargetUid = null;

/** Vrátí platný cílový uid: uložený, jinak první v kolekci, jinak null. */
function effectiveTargetUid() {
  const col = getState().collection;
  if (devTargetUid && col.some((p) => p.uid === devTargetUid)) return devTargetUid;
  return col[0]?.uid ?? null;
}

/** HTML dev sekce (peníze, spawn, per-jedinec level/shiny). */
function devSectionHtml() {
  const col = getState().collection;
  const uid = effectiveTargetUid();
  const target = col.find((p) => p.uid === uid) ?? null;

  const options = col
    .map((p) => {
      const sp = getSpecies(p.speciesId);
      const label = `${p.shiny ? "✨ " : ""}${sp?.name ?? p.speciesId} · Lv ${p.level}`;
      return `<option value="${p.uid}" ${p.uid === uid ? "selected" : ""}>${label}</option>`;
    })
    .join("");

  const targetControls = target
    ? `<div class="dev-row dev-lvl-row">
         <button class="btn btn-sm" data-lvl="-10">−10</button>
         <button class="btn btn-sm" data-lvl="-1">−1</button>
         <strong class="dev-lvl">Lv ${target.level}</strong>
         <button class="btn btn-sm" data-lvl="1">+1</button>
         <button class="btn btn-sm" data-lvl="10">+10</button>
         <button class="btn btn-sm" data-lvl-set="100" title="Max level">Max</button>
         <button class="btn btn-sm" data-toggle-shiny>${target.shiny ? "✨ Shiny: on" : "Shiny: off"}</button>
       </div>`
    : `<div class="dev-row"><span class="placeholder">Catch a Pokémon to edit it here.</span></div>`;

  return `
    <div class="settings-dev">
      <div class="settings-label">🔧 Dev tools</div>

      <div class="dev-row">
        <span class="dev-sublabel">Money</span>
        <button class="btn btn-sm" data-money="1000">+1 000 💰</button>
        <button class="btn btn-sm" data-money="10000">+10 000 💰</button>
      </div>

      <div class="dev-row">
        <span class="dev-sublabel">Spawn</span>
        <button class="btn btn-sm" data-dev="egg">🥚 Add egg</button>
        <button class="btn btn-sm" data-dev="ditto">Add Ditto</button>
      </div>

      <div class="dev-row">
        <span class="dev-sublabel">Pokémon</span>
        <select class="dev-select" data-dev-target ${col.length ? "" : "disabled"}>${
          options || '<option>— none —</option>'
        }</select>
      </div>
      ${targetControls}

      <div class="dev-feedback placeholder">${lastDevMsg}</div>
    </div>`;
}

/** Jedno pravidlo = řádek tabulky (název + popis vlevo, toggle vpravo). */
function ruleRow(key, name, desc, on) {
  return `
    <tr>
      <td class="rule-cell">
        <span class="rule-name">${name}</span>
        <span class="rule-desc">${desc}</span>
      </td>
      <td class="rule-toggle-cell">
        <label class="switch" title="${name}">
          <input type="checkbox" data-rule="${key}" ${on ? "checked" : ""}>
          <span class="switch-slider"></span>
        </label>
      </td>
    </tr>`;
}

/** Popisky panelů pro přeuspořádání pořadí. */
const PANEL_LABELS = { tabs: "Menu (taby)", battle: "Souboj", map: "Mapa / město" };

/** HTML přeuspořádání pořadí panelů ve skládaném režimu (šipky nahoru/dolů). */
function stackOrderHtml() {
  const order = getState().settings?.stackOrder ?? ["battle", "map", "tabs"];
  const rows = order
    .map(
      (key, i) => `
      <div class="order-row">
        <span class="order-idx">${i + 1}.</span>
        <span class="order-name">${PANEL_LABELS[key] ?? key}</span>
        <button class="btn btn-sm" data-order-up="${key}" ${i === 0 ? "disabled" : ""} title="Nahoru">▲</button>
        <button class="btn btn-sm" data-order-down="${key}" ${i === order.length - 1 ? "disabled" : ""} title="Dolů">▼</button>
      </div>`
    )
    .join("");
  return `
    <div class="settings-row settings-order">
      <span class="settings-label">🧱 Pořadí panelů (pod sebou)</span>
      <div class="order-list">${rows}</div>
    </div>`;
}

/** HTML přepínače rozvržení (Auto / Široké / Pod sebou / Mobil). */
function layoutHtml() {
  const cur = getState().settings?.layout ?? "auto";
  const opt = (key, label, desc) =>
    `<button class="btn spd layout-opt ${cur === key ? "active" : ""}" data-layout-set="${key}" title="${desc}">${label}</button>`;
  return `
    <div class="settings-row">
      <span class="settings-label">🖥️ Rozvržení</span>
      <span class="layout-group">
        ${opt("auto", "Auto", "Přizpůsobí se velikosti okna – na úzkém displeji panely pod sebe")}
        ${opt("wide", "Široké", "Vždy dva sloupce (klasické, pro velké obrazovky)")}
        ${opt("stacked", "Pod sebou", "Vždy jeden sloupec (telefon / půl obrazovky)")}
        ${opt("mobile", "Mobil", "Jednosloupcový layout se svislým rozdělením souboje")}
      </span>
    </div>`;
}

/** HTML sekce herních pravidel (kompaktní tabulka s toggle přepínači). */
function rulesHtml() {
  const rules = getState().settings?.rules ?? {};
  return `
    <div class="settings-rules">
      <div class="settings-label">📋 Herní pravidla</div>
      <table class="rules-table"><tbody>
        ${ruleRow("noItems", "Bez itemů", "Zakáže použití itemů v souboji", !!rules.noItems)}
        ${ruleRow("noPotions", "Bez lektvarů", "Zakáže léčivé lektvary v souboji", !!rules.noPotions)}
        ${ruleRow("nuzlocke", "Nuzlocke", "Permadeath + chytání jen 1 úlovku na oblast", !!rules.nuzlocke)}
      </tbody></table>
    </div>`;
}

/** HTML vnitřku nastavení (sdílené modalem – ať je zdroj pravdy jeden). */
function settingsBodyHtml() {
  const speed = getSpeed();
  const speeds = [1, 2, 4]
    .map(
      (s) => `<button class="btn spd ${speed === s ? "active" : ""}" data-speed="${s}">${s}×</button>`
    )
    .join("");
  return `
    <div class="settings-row">
      <span class="settings-label">Game speed</span>
      <span class="speed-group">${speeds}</span>
    </div>
    ${layoutHtml()}
    ${stackOrderHtml()}
    ${rulesHtml()}
    ${devSectionHtml()}`;
}

/**
 * Otevře modální okno nastavení. Volá se z horní lišty i z title screenu.
 * Aktivní herní rychlost i dev sekce se v okně živě překreslují po změně stavu.
 */
export function openSettingsModal() {
  if (openOverlay) return;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal settings-modal">
      <h2 class="panel-title">Settings</h2>
      <div class="settings-modal-body">${settingsBodyHtml()}</div>
      <button class="btn btn-close" data-act="close">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);
  openOverlay = overlay;

  const bodyEl = overlay.querySelector(".settings-modal-body");
  const showDevMsg = (msg) => {
    lastDevMsg = msg; // uchovej pro příští překreslení
    const el = bodyEl.querySelector(".dev-feedback");
    if (el) el.textContent = msg; // a ukaž hned (re-render z commitu už proběhl)
  };
  const rerender = () => {
    bodyEl.innerHTML = settingsBodyHtml();
    wireBody();
  };

  const wireBody = () => {
    bodyEl.querySelectorAll("[data-speed]").forEach((b) =>
      b.addEventListener("click", () => setSpeed(Number(b.dataset.speed)))
    );

    // Přepínač rozvržení panelů (generický, přijímá jakoukoliv hodnotu z atributu).
    bodyEl.querySelectorAll("[data-layout-set]").forEach((b) =>
      b.addEventListener("click", () => {
        getState().settings.layout = b.dataset.layoutSet;
        commit();
      })
    );

    // Přeuspořádání pořadí panelů (šipky).
    const moveOrder = (key, dir) => {
      const s = getState();
      const cur = Array.isArray(s.settings.stackOrder)
        ? [...s.settings.stackOrder]
        : ["battle", "map", "tabs"];
      const i = cur.indexOf(key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= cur.length) return;
      [cur[i], cur[j]] = [cur[j], cur[i]];
      s.settings.stackOrder = cur;
      commit();
    };
    bodyEl.querySelectorAll("[data-order-up]").forEach((b) =>
      b.addEventListener("click", () => moveOrder(b.dataset.orderUp, -1))
    );
    bodyEl.querySelectorAll("[data-order-down]").forEach((b) =>
      b.addEventListener("click", () => moveOrder(b.dataset.orderDown, 1))
    );

    // Checkboxy herních pravidel.
    bodyEl.querySelectorAll("[data-rule]").forEach((cb) =>
      cb.addEventListener("change", () => {
        const s = getState();
        if (!s.settings.rules) {
          s.settings.rules = { noItems: false, noPotions: false, nuzlocke: false };
        }
        s.settings.rules[cb.dataset.rule] = cb.checked;
        commit();
      })
    );

    // Peníze.
    bodyEl.querySelectorAll("[data-money]").forEach((b) =>
      b.addEventListener("click", () => {
        const total = devAddMoney(Number(b.dataset.money)); // commit → re-render
        showDevMsg(`Gold is now ${total}.`);
      })
    );

    // Spawn (vejce / Ditto).
    bodyEl.querySelectorAll("[data-dev]").forEach((b) =>
      b.addEventListener("click", () => {
        if (b.dataset.dev === "egg") {
          const r = devAddEgg(); // náhodný druh; commit uvnitř
          showDevMsg(`Added a ${r.name} egg → incubate it in the Day Care.`);
        } else if (b.dataset.dev === "ditto") {
          const r = devAddPokemon("ditto"); // commit uvnitř
          showDevMsg(r.ok ? `Added ${r.name} to your collection.` : "Failed to add Ditto.");
        }
      })
    );

    // Výběr cílového jedince pro level/shiny.
    const sel = bodyEl.querySelector("[data-dev-target]");
    if (sel) sel.addEventListener("change", () => {
      devTargetUid = sel.value;
      rerender();
    });

    // Level úpravy cíle (relativní ± i absolutní Max).
    bodyEl.querySelectorAll("[data-lvl]").forEach((b) =>
      b.addEventListener("click", () => {
        const uid = effectiveTargetUid();
        const p = getState().collection.find((x) => x.uid === uid);
        if (!p) return;
        devSetLevel(uid, p.level + Number(b.dataset.lvl)); // commit → re-render
      })
    );
    bodyEl.querySelectorAll("[data-lvl-set]").forEach((b) =>
      b.addEventListener("click", () => {
        const uid = effectiveTargetUid();
        if (uid) devSetLevel(uid, Number(b.dataset.lvlSet) || 1);
      })
    );

    // Shiny toggle cíle.
    const shinyBtn = bodyEl.querySelector("[data-toggle-shiny]");
    if (shinyBtn) shinyBtn.addEventListener("click", () => {
      const uid = effectiveTargetUid();
      if (uid) devToggleShiny(uid); // commit → re-render
    });
  };
  wireBody();

  // Živé překreslení aktivní rychlosti / dev sekce; unsubscribe při zavření.
  // Během scrollování odložit (viz scrollAware), ať kolečko neseká.
  const off = bus.on(EVENTS.STATE_CHANGED, scrollAware(rerender));

  function close() {
    document.removeEventListener("keydown", onKey);
    off();
    overlay.remove();
    openOverlay = null;
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
