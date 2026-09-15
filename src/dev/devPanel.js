/**
 * devPanel.js – UI Dev sekce (peníze, spawn, per-jedinec level/shiny, skoky ve
 * story, replay tutoriálu, odhalení mapy).
 *
 * HTML (`devSectionHtml`) i zapojení posluchačů (`wireDevSection`) žijí tady,
 * odděleně od běžného Nastavení. `settingsView.js` je zavolá JEN když
 * `isDevEnv()` (localhost) – na ostré verzi se dev sekce nevyrenderuje.
 *
 * Stav dev sekce (poslední hláška, cílový jedinec) drží tento modul, ať přežije
 * překreslení těla modalu (STATE_CHANGED).
 */

import { getState, commit } from "../core/state.js";
import { getSpecies } from "../../data/pokemon.js";
import {
  devAddEgg,
  devHatchAllEggs,
  devAddPokemon,
  devAddMoney,
  devApplyCheckpoint,
  devCompleteDex,
  devSetLevel,
  devToggleShiny,
  DEV_CHECKPOINTS,
} from "./devTools.js";
import { resetTutorial, runTutorial } from "../ui/tutorial.js";

/** Poslední hláška dev akce – přežije překreslení těla modalu. */
let lastDevMsg = "";

/** uid cílového jedince dev úprav (level/shiny). Přežije překreslení těla. */
let devTargetUid = null;

/** Vrátí platný cílový uid: uložený, jinak první v kolekci, jinak null. */
function effectiveTargetUid() {
  const col = getState().collection;
  if (devTargetUid && col.some((p) => p.uid === devTargetUid)) return devTargetUid;
  return col[0]?.uid ?? null;
}

/** HTML dev sekce (peníze, spawn, per-jedinec level/shiny, story skoky). */
export function devSectionHtml() {
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
        <button class="btn btn-sm" data-dev="hatch-all">🐣 Hatch an egg</button>
        <button class="btn btn-sm" data-dev="ditto">Add Ditto</button>
        <button class="btn btn-sm" data-dev="complete-dex">Complete Dex (all 151)</button>
      </div>

      <div class="dev-row">
        <span class="dev-sublabel">Pokémon</span>
        <select class="dev-select" data-dev-target ${col.length ? "" : "disabled"}>${
          options || '<option>— none —</option>'
        }</select>
      </div>
      ${targetControls}

      <div class="dev-row">
        <span class="dev-sublabel">Tutorial</span>
        <button class="btn btn-sm" data-dev-tutorial>▶️ Replay tutorial</button>
      </div>

      <div class="dev-row">
        <span class="dev-sublabel">Map</span>
        <button class="btn btn-sm" data-map-reveal>${
          getState().settings?.mapReveal ? "👁 Nodes: show all" : "🧭 Nodes: by progress"
        }</button>
      </div>

      <div class="dev-row">
        <span class="dev-sublabel">Skip to</span>
        <select class="dev-select" data-checkpoint>${DEV_CHECKPOINTS.map(
          (c) => `<option value="${c.key}">${c.label}</option>`
        ).join("")}</select>
        <button class="btn btn-sm" data-checkpoint-go>⏩ Jump</button>
      </div>

      <div class="dev-feedback placeholder">${lastDevMsg}</div>
    </div>`;
}

/**
 * Zapojí posluchače dev sekce na čerstvě vyrenderovaném těle modalu.
 * @param {HTMLElement} bodyEl  kořen těla nastavení (obsahuje `.settings-dev`)
 * @param {() => void} rerender  překreslí celé tělo modalu (po změně cíle)
 */
export function wireDevSection(bodyEl, rerender) {
  const showDevMsg = (msg) => {
    lastDevMsg = msg; // uchovej pro příští překreslení
    const el = bodyEl.querySelector(".dev-feedback");
    if (el) el.textContent = msg; // a ukaž hned (re-render z commitu už proběhl)
  };

  // Peníze.
  bodyEl.querySelectorAll("[data-money]").forEach((b) =>
    b.addEventListener("click", () => {
      const total = devAddMoney(Number(b.dataset.money)); // commit → re-render
      showDevMsg(`Gold is now ${total}.`);
    })
  );

  // Spawn (vejce / Ditto / Complete Dex).
  bodyEl.querySelectorAll("[data-dev]").forEach((b) =>
    b.addEventListener("click", () => {
      if (b.dataset.dev === "egg") {
        const r = devAddEgg(); // náhodný druh; commit uvnitř
        showDevMsg(`Added a ${r.name} egg → incubate it in the Day Care.`);
      } else if (b.dataset.dev === "hatch-all") {
        const r = devHatchAllEggs(); // vylíhne vše v inkubaci; commit + EGG_HATCHED uvnitř
        showDevMsg(
          r.count > 0
            ? `Hatched ${r.count} egg${r.count === 1 ? "" : "s"} from the hatchery.`
            : "No eggs are incubating in the Day Care."
        );
      } else if (b.dataset.dev === "ditto") {
        const r = devAddPokemon("ditto"); // commit uvnitř
        showDevMsg(r.ok ? `Added ${r.name} to your collection.` : "Failed to add Ditto.");
      } else if (b.dataset.dev === "complete-dex") {
        const r = devCompleteDex(); // commit + capstone check uvnitř
        showDevMsg(`Added ${r.added} new species — dex complete (${r.total}).`);
      }
    })
  );

  // Skok na story milník (přeskočí začátek hry pro testování).
  const cpBtn = bodyEl.querySelector("[data-checkpoint-go]");
  if (cpBtn) cpBtn.addEventListener("click", () => {
    const sel = bodyEl.querySelector("[data-checkpoint]");
    const r = devApplyCheckpoint(sel?.value); // commit uvnitř → re-render
    showDevMsg(r.ok ? `⏩ Skipped to: ${r.label}` : "Skip failed.");
  });

  // Znovupřehrání tutoriálu (reset flagu + rovnou spuštění).
  const tutBtn = bodyEl.querySelector("[data-dev-tutorial]");
  if (tutBtn) tutBtn.addEventListener("click", () => {
    resetTutorial();
    runTutorial();
    showDevMsg("Tutorial restarted.");
  });

  // Přepínač viditelnosti uzlů na mapě: vše (dev) ↔ jen odemčené (reálný postup).
  const mapBtn = bodyEl.querySelector("[data-map-reveal]");
  if (mapBtn) mapBtn.addEventListener("click", () => {
    const s = getState().settings;
    s.mapReveal = !s.mapReveal;
    commit(); // STATE_CHANGED → mapa i tato sekce se překreslí
    showDevMsg(s.mapReveal ? "Map: showing ALL nodes." : "Map: nodes by progress.");
  });

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
}
