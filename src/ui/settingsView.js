/**
 * UI: globální nastavení hry (audio, layout, pořadí panelů, herní pravidla).
 *
 * Nastavení žije ve sdíleném modálním okně (`openSettingsModal`), které se dá
 * otevřít z horní lišty (tlačítko ⚙) i z úvodní obrazovky (title screen).
 *
 * Dev sekce (peníze, spawn, level/shiny, story skoky…) je oddělená ve složce
 * `src/dev/` (`devPanel.js`) a zapojuje se do tohoto modalu JEN na localhostu
 * (`isDevEnv()` z `devEnv.js`) – na ostré verzi se vůbec nevyrenderuje.
 */

import { bus, EVENTS } from "../core/events.js";
import { getState, commit } from "../core/state.js";
import { applyAudioSettings } from "../systems/audioSystem.js";
import { isDevEnv } from "../dev/devEnv.js";
import { devSectionHtml, wireDevSection } from "../dev/devPanel.js";
import { scrollAware, saveScroll, restoreScroll } from "./scrollPreserve.js";

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
const PANEL_LABELS = { battle: "Main panel (battle/tabs)", map: "Map", tabs: "Team" };

/** HTML přeuspořádání pořadí panelů ve skládaném režimu (šipky nahoru/dolů). */
function stackOrderHtml() {
  const order = getState().settings?.stackOrder ?? ["battle", "map", "tabs"];
  const rows = order
    .map(
      (key, i) => `
      <div class="order-row">
        <span class="order-idx">${i + 1}.</span>
        <span class="order-name">${PANEL_LABELS[key] ?? key}</span>
        <button class="btn btn-sm" data-order-up="${key}" ${i === 0 ? "disabled" : ""} title="Up">▲</button>
        <button class="btn btn-sm" data-order-down="${key}" ${i === order.length - 1 ? "disabled" : ""} title="Down">▼</button>
      </div>`
    )
    .join("");
  return `
    <div class="settings-row settings-order">
      <span class="settings-label">🧱 Panel order (stacked)</span>
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
      <span class="settings-label">🖥️ Layout</span>
      <span class="layout-group">
        ${opt("auto", "Auto", "Adapts to window size — panels stack on narrow displays")}
        ${opt("wide", "Wide", "Always two columns (classic, for large screens)")}
        ${opt("stacked", "Stacked", "Always one column (phone / half screen)")}
        ${opt("mobile", "Mobile", "Single-column layout with a vertical battle split")}
      </span>
    </div>`;
}

/** HTML sekce herních pravidel (kompaktní tabulka s toggle přepínači). */
function rulesHtml() {
  const rules = getState().settings?.rules ?? {};
  return `
    <div class="settings-rules">
      <div class="settings-label">📋 Game rules</div>
      <table class="rules-table"><tbody>
        ${ruleRow("noItems", "No items", "Disables all items in battle", !!rules.noItems)}
        ${ruleRow("noPotions", "No potions", "Disables healing potions in battle", !!rules.noPotions)}
        ${ruleRow("nuzlocke", "Nuzlocke", "Permadeath + catch only the first encounter per area", !!rules.nuzlocke)}
        ${ruleRow("levelCap", "Level cap", "Caps level by progress (next gym leader's ace → League → no limit once Champion)", !!rules.levelCap)}
      </tbody></table>
    </div>`;
}

/** HTML audio nastavení (hlasitost + mute). */
function audioHtml() {
  const audio = getState().settings?.audio ?? { master: 70, music: 50, sfx: 80, mute: false };
  return `
    <div class="settings-audio">
      <div class="settings-label">🔊 Audio</div>
      <div class="audio-slider-row">
        <label for="audio-master">Master</label>
        <input type="range" id="audio-master" class="audio-slider" data-audio-setting="master" min="0" max="100" value="${audio.master}">
        <span class="audio-value">${audio.master}</span>
      </div>
      <div class="audio-slider-row">
        <label for="audio-music">Music</label>
        <input type="range" id="audio-music" class="audio-slider" data-audio-setting="music" min="0" max="100" value="${audio.music}">
        <span class="audio-value">${audio.music}</span>
      </div>
      <div class="audio-slider-row">
        <label for="audio-sfx">SFX</label>
        <input type="range" id="audio-sfx" class="audio-slider" data-audio-setting="sfx" min="0" max="100" value="${audio.sfx}">
        <span class="audio-value">${audio.sfx}</span>
      </div>
      <div class="audio-checkbox-row">
        <label for="audio-mute">
          <input type="checkbox" id="audio-mute" data-audio-setting="mute" ${audio.mute ? "checked" : ""}>
          Mute all
        </label>
      </div>
    </div>`;
}

/** HTML vnitřku nastavení (sdílené modalem – ať je zdroj pravdy jeden). */
function settingsBodyHtml() {
  return `
    ${audioHtml()}
    ${layoutHtml()}
    ${stackOrderHtml()}
    ${rulesHtml()}
    ${isDevEnv() ? devSectionHtml() : ""}`;
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
  const rerender = () => {
    // Nepřekresluj, když hráč zrovna používá nějaký ovládací prvek – otevřený
    // <select> (Skip to / Pokémon target), rozepsaný input nebo tažený slider.
    // Tikové překreslení (STATE_CHANGED) by jinak zahodilo DOM a nativní dropdown
    // by se hned zavřel. Po opuštění prvku (blur) se stav dožene příští tik.
    // Tlačítka (BUTTON) fokus neblokují → dev akce (±level, shiny…) překreslují dál.
    const active = document.activeElement;
    if (active && bodyEl.contains(active) && /^(SELECT|INPUT|TEXTAREA)$/.test(active.tagName)) {
      return;
    }
    const _s = saveScroll(bodyEl);
    bodyEl.innerHTML = settingsBodyHtml();
    restoreScroll(bodyEl, _s);
    wireBody();
  };

  const wireBody = () => {
    // Audio slidery a mute checkbox.
    bodyEl.querySelectorAll("[data-audio-setting]").forEach((el) => {
      el.addEventListener("change", () => {
        const s = getState();
        if (!s.settings.audio) {
          s.settings.audio = { master: 70, music: 50, sfx: 80, mute: false };
        }
        const key = el.dataset.audioSetting;
        if (key === "mute") {
          s.settings.audio.mute = el.checked;
        } else {
          s.settings.audio[key] = Number(el.value);
        }
        commit();
        applyAudioSettings();
        // Aktualizuj hodnotu vedle slideru.
        if (el.type === "range") {
          const parent = el.closest(".audio-slider-row");
          if (parent) {
            const valueSpan = parent.querySelector(".audio-value");
            if (valueSpan) valueSpan.textContent = el.value;
          }
        }
      });
    });

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
          s.settings.rules = { noItems: false, noPotions: false, nuzlocke: false, levelCap: false };
        }
        s.settings.rules[cb.dataset.rule] = cb.checked;
        commit();
      })
    );

    // Dev sekce (peníze/spawn/level/shiny/story skoky/tutorial/mapa) – zapojí se
    // JEN v lokálním prostředí (localhost); na ostré verzi se vůbec nevyrenderuje.
    if (isDevEnv()) wireDevSection(bodyEl, rerender);
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
