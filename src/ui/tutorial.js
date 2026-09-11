/**
 * tutorial.js – samostatný, izolovaný modul úvodního tutoriálu (onboarding).
 *
 * Nováčka po intru nechá vybrat (Start / Skip) a pak mu KLÍČOVÉ prvky ukáže
 * scénicky – reálným DEMO-soubojem (manuál + auto-battle + auto-catch) a Bag
 * SANDBOXEM (sekce + ukázka evolučního kamene a TM) – dřív, než k nim dojde.
 *
 * Celé v jednom souboru, ať jde snadno upravit/vypnout/smazat. Ven vede jen:
 *   - main.js         → maybeStartTutorial(onDone) po intru
 *   - save.js         → přeskočí zápis, když běží sandbox (state.tutorialDemoActive)
 *   - battleSystem.js → startDemoBattle() + serialize() u demo souboje vrací null
 *   - settingsView.js → Dev „Replay tutorial" volá resetTutorial()+runTutorial()
 *
 * IZOLACE (klíč návrhu): hra se ukládá i automaticky (autosave 30 s + unload) a
 * souboj/Bag běží nad reálným stavem. Aby demo nezanechalo stopu, pracujeme se
 * SANDBOXEM: beginSandbox() zálohuje stav + zvedne tutorialDemoActive (→ save.js
 * přestane ukládat), naaranžujeme dočasné Pokémony/itemy, a endSandbox() stav
 * vrátí (restoreState) → jako by se nic nestalo. Battle i Bag mají vlastní
 * sandbox po sobě.
 */

import { getState, setState, commit } from "../core/state.js";
import { bus, EVENTS } from "../core/events.js";
import { saveGame } from "../systems/save.js";
import { createPokemon } from "../systems/pokemonSystem.js";
import {
  startDemoBattle,
  getBattle,
  stopBattle,
  setAutoBattle,
  setAutocatch,
} from "../systems/battleSystem.js";
import { openMainTab } from "./mainPanel.js";
import { showPopup } from "./popup.js";

/** Flag ve state.story: tutorial už proběhl (nebo byl přeskočen). */
const DONE_FLAG = "tutorialDone";

/** Demo-souboj: dvě neutrální „Route 1" stvoření (bez spoileru startera). */
const DEMO = { playerId: "rattata", playerLevel: 5, enemyId: "pidgey", enemyLevel: 3 };

/** Bag sandbox: ověřené kombinace (Pikachu+Thunder Stone→Raichu; TM24 Thunderbolt umí Pikachu). */
const BAG_DEMO = {
  speciesId: "pikachu",
  level: 12,
  items: { potion: 2, "thunder-stone": 1, tm24: 1 }, // Heal / Evolution / TMs sekce
};

/**
 * Kroky tutoriálu. Každý:
 *   title, text  – obsah bubliny
 *   target       – CSS selektor cíle ke zvýraznění (null = bublina na střed).
 *                  Zvýrazní se SJEDNOCENÍ všech shod (rozbalený dropdown se přisvítí);
 *                  je-li cílem <input>, spotlight padne na jeho <label> (closest).
 *   tipEdge      – "top" | "bottom": přišpendlí bublinu k okraji obrazovky, ať
 *                  neclonní cíl (horní/dolní ovládání souboje, vycentrovaný Bag).
 *   onEnter()    – volitelná akce při vstupu (spuštění/ukončení sandboxu, přepnutí)
 *   gate()       – akční krok: dokud nevrátí true, není žádné tlačítko (hráč musí
 *                  provést akci). Pak se objeví „Next" (Skip zůstává skrytý).
 *   autoAdvance  – u gated kroku: po splnění se posuneme rovnou dál (bez „Next"),
 *                  když je klik na cíl celá akce (např. klik na tab / kategorii).
 *   hint         – nápověda pod textem, dokud není akce splněná
 */
const STEPS = [
  {
    title: "💠 Resources",
    text: "This is your resource bar. The game keeps running even while you're away — you collect gold and progress over time.",
    target: "#resource-bar",
  },
  {
    title: "🗺️ The map",
    text: "Travel by clicking areas on the map. Routes have wild Pokémon to catch and trainers to battle; badges open the way forward.",
    target: "#map-panel",
  },
  {
    title: "🪟 Windows",
    text: "This tab bar switches the main window — Battle, City, Gym, PC, Pokédex and more. Battle is just one of them. Click the Battle tab to open it.",
    target: ".main-tabs",
    onEnter: () => openMainTab("pokedex"), // ať Battle NENÍ předvybraný → hráč musí kliknout
    gate: () => !!document.querySelector('.tab[data-tab="battle"].active'),
    autoAdvance: true, // klik na Battle = rovnou dál (žádné „Next")
    hint: "Click the “Battle” tab.",
  },
  {
    title: "⚔️ Battle — manual",
    text: "A real battle! In manual mode you pick each turn: Battle (attack), Items, Switch or Run. Weaken the Pidgey with Battle, then open Items and throw a Poké Ball to catch it!",
    target: ".battle-cmd",
    tipEdge: "top", // menu je dole ve scéně → bublinu nahoru
    onEnter: startDemo,
    onTick: keepManualCatchable, // KO místo chycení? spawni čerstvého Pidgey
    gate: () => getState().collection.length >= 2, // chytil Pidgey (přibyl do kolekce)
    autoAdvance: true, // po chycení rovnou na auto-battle/auto-catch kroky
    hint: "Attack with Battle, then throw a Poké Ball via Items to catch the Pidgey.",
  },
  {
    title: "⚙️ Auto-battle",
    text: "Now switch on Auto-battle — fights will play out on their own, perfect for idle play. Your Pokémon still take damage and use PP, so you'll need to heal between fights, but you earn full rewards. Tick the checkbox and watch the battle run, then continue.",
    target: "#tg-autobattle",
    tipEdge: "bottom", // přepínače jsou nahoře → bublinu dolů
    onEnter: ensureDemoBattleRunning,
    gate: () => getState().settings?.autoBattle === true,
    clearOnDone: true, // po zapnutí přestaň tmavit → hráč vidí běžící auto-souboj
    hint: "Tick the “Auto battle” checkbox.",
  },
  {
    title: "♾️ Full Auto — hands-off idling",
    text: "Full Auto is the second idle mode. It fights on its own like Auto-battle, but your Pokémon lose NO HP and NO PP — so you can leave it running forever with no healing. The trade-off: rewards (gold & XP) are cut to about 1/10. Rule of thumb: Auto-battle for faster gains while you watch, Full Auto for safe, walk-away idling. Tick it to try, then continue.",
    target: "#tg-fullauto",
    tipEdge: "bottom",
    onEnter: ensureDemoBattleRunning,
    gate: () => getState().settings?.fullAuto === true,
    clearOnDone: true,
    hint: "Tick the “Full Auto” checkbox.",
  },
  {
    title: "🎯 Auto-catch",
    text: "Auto-catch throws balls at wild Pokémon for you. Turn it on, then open the “Catch: …” dropdown to pick what to catch (All / New / Shiny) and choose a Ball. Continue when ready.",
    target: ".battle-toggles, .ac-dd-panel", // toggle + rozbalený dropdown (union)
    tipEdge: "bottom",
    onEnter: ensureDemoBattleRunning,
    gate: () => getState().settings?.autocatch?.enabled === true,
    clearOnDone: true, // po zapnutí přestaň tmavit → hráč vidí chytání i možnosti
    hint: "Tick the “Auto catch” checkbox.",
  },
  {
    title: "🧢 Your team",
    text: "Your team lives here — check HP, stats, moves and evolutions. Keep it healthy at Poké Centers between fights.",
    target: "#team-panel",
    onEnter: endDemo, // ukliď demo-souboj dřív, než ukážeme reálný tým
  },
  {
    title: "🎒 The Bag",
    text: "Your Bag holds items, balls, TMs and more, split into sections (Heal, Balls, TMs, Evolution…) — only sections you own items for show up. Click the Bag button to open it, then continue.",
    // Před otevřením naveď na tlačítko Bag; po otevření se spotlight přesune na
    // sekce (tlačítko Bag už je schované za modálem → jinak by to vypadalo, že po
    // tobě chceme kliknout na Bag „podruhé").
    target: () => (document.querySelector(".bag-tabs") ? ".bag-tabs" : ".bag-btn"),
    tipEdge: "bottom",
    noDim: true, // Bag je modal k prozkoumání – netmav, jen naveď
    onEnter: startBagDemo, // nachystá sandbox (Pikachu + Thunder Stone + TM24), Bag NEotvírá
    gate: () => !!document.querySelector(".bag-tabs"), // odemkne se, až hráč Bag otevře
    hint: "Click the 🎒 Bag button.",
  },
  {
    title: "🪨 Evolution stones",
    text: "Some Pokémon evolve with a stone. Open the Evolution section, then click the Thunder Stone and pick Pikachu — it evolves into Raichu!",
    // Naveď na tab Evolution; po otevření sekce na samotný Thunder Stone.
    target: () =>
      document.querySelector('.bag-tab.active[data-bag-cat="evolution"]')
        ? '[data-evolve-item="thunder-stone"]'
        : '[data-bag-cat="evolution"]',
    tipEdge: "bottom",
    noDim: true, // ať je vidět celý Bag i výběr Pokémona a výsledek evoluce
    // Gate na SKUTEČNÝ výsledek: Raichu v kolekci. (Klik na tab nestačí – po použití
    // kamene Evolution sekce zmizí a aktivní tab se přepne → gate na tabu by spadl → softlock.)
    gate: () => getState().collection.some((p) => p.speciesId === "raichu"),
    hint: "Open Evolution, click the Thunder Stone, and pick Pikachu.",
  },
  {
    title: "💿 TMs",
    text: "TMs teach moves. Open the TMs section, then click TM24 and choose your Raichu to learn Thunderbolt. That's the basics — now go meet Professor Oak!",
    // Naveď na tab TMs; po otevření sekce na samotné TM24.
    target: () =>
      document.querySelector('.bag-tab.active[data-bag-cat="tms"]')
        ? '[data-teach-tm="tm24"]'
        : '[data-bag-cat="tms"]',
    tipEdge: "bottom",
    noDim: true,
    // Gate na skutečně naučený tah (Thunderbolt = TM24), ne jen na klik na tab.
    gate: () =>
      getState().collection.some((p) =>
        (p.moves ?? []).some((m) => m.id === "thunderbolt")
      ),
    hint: "Open TMs, click TM24, and pick Raichu.",
  },
];

/* ------------------------------------------------------------------ *
 * Veřejné API
 * ------------------------------------------------------------------ */

/**
 * Rozhodne, zda nováčkovi nabídnout tutorial. Ať už se přehraje/přeskočí/nenabídne,
 * NAKONEC vždy zavolá onDone().
 * @param {() => void} onDone  navazující akce (typicky guideToOakLab)
 */
export function maybeStartTutorial(onDone = () => {}) {
  const st = getState();
  if (st.story?.[DONE_FLAG]) {
    onDone();
    return;
  }
  showPopup({
    title: "🎓 First time here?",
    body:
      `<p class="story-text">Welcome! Would you like a short guided tour that shows ` +
      `you the basics — the map, your team, the Bag, and how battles work ` +
      `(including auto-battle and auto-catch)?</p>` +
      `<p class="placeholder">You can replay it later from Settings → Dev tools.</p>`,
    dismissible: false,
    choices: [
      { label: "▶️ Start the tutorial", onPick: () => runTutorial(onDone) },
      { label: "⏭️ Skip", onPick: () => finishTutorial(onDone) },
    ],
  });
}

/** Přehraje tutorial krok po kroku (coach-marky + demo-souboj + Bag sandbox). */
export function runTutorial(onDone = () => {}) {
  finishCb = onDone;
  showStep(0);
}

/** Resetuje flag, aby šel tutorial přehrát znovu (Dev tools). */
export function resetTutorial() {
  const st = getState();
  if (st.story) delete st.story[DONE_FLAG];
  commit();
}

/* ------------------------------------------------------------------ *
 * Běhový stav modulu
 * ------------------------------------------------------------------ */

let finishCb = () => {};
let stepIndex = 0;
let overlayEl = null;
let currentSelector = null; // selektor cíle (re-query na každý reposition → odolné proti překreslení)
let currentGate = null;
let busUnsub = null;
let busUnsub2 = null; // druhý odběr (BATTLE_UPDATE)
let pollTimer = null; // periodické dopočítání spotlightu (klik ve fight-menu neemituje event)
let clickHandler = null; // okamžitý přepočet gate po každém kliku (tab/kategorie neemituje event)
let advancing = false; // právě běží auto-posun (jen kroky s autoAdvance)
let demoActive = false; // běží demo-souboj?
let demoPlayerUid = null; // uid aktuálního demo-battlera (Rattata), ať ho lze vyměnit bez smazání chyceného Pidgey
let bagActive = false; // běží Bag sandbox?
let currentSnap = null; // aktivní záloha stavu (jeden sandbox naráz)

/* ------------------------------------------------------------------ *
 * Řízení kroků
 * ------------------------------------------------------------------ */

function showStep(i) {
  stepIndex = i;
  advancing = false;
  currentGate = null; // ⚠️ synchronně vypni gate předchozího kroku (jinak by ho poll stihl vyhodnotit)
  if (i >= STEPS.length) {
    endTutorial();
    return;
  }
  const step = STEPS[i];
  try {
    step.onEnter?.();
  } catch (err) {
    console.error("Tutorial onEnter selhal:", err);
  }
  // Prvek se mohl právě (pře)kreslit → počkej na frame, pak zaměř.
  requestAnimationFrame(() => renderOverlay(step));
}

/** Dokončí tutorial korektně (ukliď oba sandboxy, nastav flag, ulož, pokračuj). */
function endTutorial() {
  ensureDemoTornDown();
  ensureBagTornDown();
  destroyOverlay();
  finishTutorial(finishCb);
}

/** „Skip" uprostřed – uklidit a dokončit. */
function skipAll() {
  endTutorial();
}

/* ------------------------------------------------------------------ *
 * Sandbox helpers (izolace stavu)
 * ------------------------------------------------------------------ */

function beginSandbox() {
  currentSnap = snapshotState(); // čistá záloha (bez flagu)
  getState().tutorialDemoActive = true; // od teď save.js neukládá
}

function endSandbox() {
  restoreState(currentSnap); // vrátí i tutorialDemoActive (nebyl v záloze) → pryč
  currentSnap = null;
}

/* ------------------------------------------------------------------ *
 * Demo-souboj (izolovaný)
 * ------------------------------------------------------------------ */

function startDemo() {
  if (demoActive) return;
  beginSandbox();
  demoActive = true;
  const st = getState();
  // Zajisti dost Poké Ballů, ať hráč Pidgey opravdu chytí (a vybraný ball je „poke").
  st.resources.balls = { ...(st.resources.balls ?? {}), poke: Math.max(20, st.resources.balls?.poke ?? 0) };
  // Čistý start manuálu: auto vypnuté, autocatch vypnutý.
  setAutoBattle(false);
  setAutocatch({ enabled: false, catchAll: false, catchNew: false, catchShiny: false });
  ensureDemoBattleRunning();
}

/**
 * Zajistí běžící demo-souboj (po chycení/výhře nastartuje nový). Do dalšího kola
 * nasadí ČERSTVÉHO (plné HP) demo-battlera, ale ZACHOVÁ cokoli, co hráč během dema
 * chytil (dřív se `st.collection = [player]` chyceného Pidgey rovnou smazalo, takže
 * v kroku Auto-battle zase zmizel – to byl ten „rozbitý" souboj).
 */
function ensureDemoBattleRunning() {
  if (!demoActive) return;
  const b = getBattle();
  if (b && b.running && !b.result && b.enemy && b.enemy.hp > 0) return;
  const st = getState();
  const player = createPokemon(DEMO.playerId, DEMO.playerLevel);
  const enemy = createPokemon(DEMO.enemyId, DEMO.enemyLevel);
  // Zahoď jen předchozího demo-battlera; zbytek (chycený Pidgey) nech být.
  const keep = st.collection.filter((p) => p.uid !== demoPlayerUid);
  demoPlayerUid = player.uid;
  st.collection = [player, ...keep];
  st.team = [player.uid]; // v ringu je jen Rattata; chycení zůstávají v kolekci
  commit();
  startDemoBattle(player, enemy);
  openMainTab("battle");
}

function endDemo() {
  if (!demoActive) return;
  setAutoBattle(false);
  stopBattle();
  endSandbox();
  demoActive = false;
  demoPlayerUid = null;
}

function ensureDemoTornDown() {
  if (demoActive) endDemo();
}

/**
 * Pro manuální krok: hráč má Pidgey CHYTIT (hod Poké Ballem). Kdyby ho místo toho
 * KO (pak už nejde hodit ball) nebo souboj skončil bez chycení, spawni čerstvého,
 * ať to jde zkusit znovu. Chycení = collection má víc než jen hráčova Rattatu.
 */
function keepManualCatchable() {
  if (!demoActive) return;
  if (getState().collection.length >= 2) return; // už chytil → o posun se postará gate
  const b = getBattle();
  if (!b || !b.running || b.result || !b.enemy || b.enemy.hp <= 0) {
    ensureDemoBattleRunning();
  }
}

/* ------------------------------------------------------------------ *
 * Bag sandbox (izolovaný) – sekce + evoluční kámen + TM
 * ------------------------------------------------------------------ */

function startBagDemo() {
  if (bagActive) return;
  beginSandbox();
  bagActive = true;
  const st = getState();
  const mon = createPokemon(BAG_DEMO.speciesId, BAG_DEMO.level);
  st.collection = [mon];
  st.team = [mon.uid];
  st.resources.items = { ...(st.resources.items ?? {}), ...BAG_DEMO.items };
  if (!st.resources.balls) st.resources.balls = {};
  if (!st.resources.balls.poke) st.resources.balls.poke = 5; // ať je i sekce Balls
  commit();
  // Bag NEotvíráme – hráč klikne na 🎒 Bag sám (viz gate kroku „Open the Bag").
}

function endBagDemo() {
  if (!bagActive) return;
  // Zavři Bag modal (i posluchače) – klik na jeho zavírací tlačítko, fallback remove.
  const modal = document.querySelector(".modal-overlay");
  const closeBtn = modal?.querySelector("[data-close], .modal-close");
  if (closeBtn) closeBtn.click();
  else modal?.remove();
  endSandbox();
  bagActive = false;
}

function ensureBagTornDown() {
  if (bagActive) endBagDemo();
}

/* ------------------------------------------------------------------ *
 * Coach-mark overlay (spotlight + bublina)
 * ------------------------------------------------------------------ */

function renderOverlay(step) {
  if (!overlayEl) {
    overlayEl = document.createElement("div");
    overlayEl.className = "tutorial-overlay";
    overlayEl.innerHTML = `
      <div class="tutorial-spot"></div>
      <div class="tutorial-tip" role="dialog" aria-live="polite">
        <h3 class="tutorial-tip-title"></h3>
        <p class="tutorial-tip-text"></p>
        <p class="tutorial-tip-hint placeholder" hidden></p>
        <div class="tutorial-tip-actions">
          <span class="tutorial-tip-count"></span>
          <button class="btn btn-sm tutorial-skip" type="button">Skip</button>
          <button class="btn btn-sm tutorial-next" type="button">Next ▶</button>
        </div>
      </div>`;
    document.body.appendChild(overlayEl);
    overlayEl.querySelector(".tutorial-skip").addEventListener("click", skipAll);
    overlayEl.querySelector(".tutorial-next").addEventListener("click", () => {
      if (!overlayEl.querySelector(".tutorial-next").disabled) showStep(stepIndex + 1);
    });
    window.addEventListener("resize", reposition);
    // Tikové/bojové překreslení může prvkem hnout + měnit stav gate → drž krok.
    busUnsub = bus.on(EVENTS.STATE_CHANGED, onBusTick);
    busUnsub2 = bus.on(EVENTS.BATTLE_UPDATE, onBusTick);
    // Klik na tab / Bag kategorii NEEMITUJE žádný event (mění jen lokální activeTab
    // + překreslení). Po každém kliku přepočítej gate hned – rAF počká na překreslení.
    clickHandler = () => requestAnimationFrame(onBusTick);
    document.addEventListener("click", clickHandler, true);
    // Fallback poll pro změny bez eventu i bez kliku (klik ve fight-menu apod.).
    pollTimer = setInterval(onBusTick, 200);
  }

  overlayEl.querySelector(".tutorial-tip-title").textContent = step.title;
  overlayEl.querySelector(".tutorial-tip-text").textContent = step.text;
  overlayEl.querySelector(".tutorial-tip-count").textContent = `${stepIndex + 1} / ${STEPS.length}`;
  const nextBtn = overlayEl.querySelector(".tutorial-next");
  const skipBtn = overlayEl.querySelector(".tutorial-skip");
  nextBtn.textContent = stepIndex === STEPS.length - 1 ? "Finish ✓" : "Next ▶";

  currentSelector = step.target ?? null;
  currentGate = step.gate ?? null;
  const hintEl = overlayEl.querySelector(".tutorial-tip-hint");
  hintEl.textContent = step.hint ?? "";

  // Krok s akcí (gate): hráč musí kliknout na CÍL, ne na tlačítka. Skryj Next i Skip;
  // u kroků bez autoAdvance odhalí Next refreshGate() teprve po splnění akce.
  // (Bublina sama je passthrough přes CSS – kliky vždy projdou na cíl, klikací je jen tlačítko.)
  const interactive = typeof currentGate === "function";
  nextBtn.hidden = interactive;
  skipBtn.hidden = interactive;
  hintEl.hidden = !interactive || !step.hint;

  // Tmavení: noDim = vůbec (modal k prozkoumání), jinak plné (is-clear se sundá,
  // clearOnDone ho případně sundá po splnění akce v refreshGate).
  const spot = overlayEl.querySelector(".tutorial-spot");
  spot.classList.toggle("no-dim", !!step.noDim);
  spot.classList.remove("is-clear");

  refreshGate();
  reposition();
}

/** Na tik sběrnice: per-krok údržba, pak přepočítej gate i pozici spotlightu. */
function onBusTick() {
  try {
    STEPS[stepIndex]?.onTick?.();
  } catch (err) {
    console.error("Tutorial onTick selhal:", err);
  }
  refreshGate();
  reposition();
}

/**
 * Vyhodnotí gate() aktuálního kroku:
 *   - step.autoAdvance = true → po splnění se rovnou posuneme dál (žádné tlačítko);
 *     vhodné, když je klik na cíl celá akce (např. klik na tab Battle).
 *   - jinak → „Next" se objeví AŽ po splnění akce; do té doby žádné tlačítko není
 *     (hráč nemůže obejít to, co chceme), po splnění si v klidu prohlédne možnosti.
 */
function refreshGate() {
  if (!overlayEl || typeof currentGate !== "function") return;
  const done = currentGate();
  const step = STEPS[stepIndex] || {};
  const hintEl = overlayEl.querySelector(".tutorial-tip-hint");
  if (step.autoAdvance) {
    if (done && !advancing) {
      advancing = true;
      setTimeout(() => showStep(stepIndex + 1), 250);
    }
    return; // Next zůstává skrytý
  }
  overlayEl.querySelector(".tutorial-next").hidden = !done;
  if (hintEl.textContent) hintEl.hidden = done; // nápovědu skryj po splnění akce
  // clearOnDone: po splnění akce sundej tmavení, ať hráč vidí scénu (běžící auto-souboj).
  if (step.clearOnDone) overlayEl.querySelector(".tutorial-spot").classList.toggle("is-clear", done);
}

/**
 * Umístí spotlight a bublinu. Cíl = SJEDNOCENÍ všech viditelných prvků selektoru
 * (re-query každý tik) – takže když se rozbalí dropdown (další prvek), díra se
 * roztáhne i přes něj. Bublinu lze přišpendlit k okraji obrazovky (step.tipEdge),
 * aby neclonila vycentrovaný modal (Bag) ani horní/dolní ovládání souboje.
 */
function reposition() {
  if (!overlayEl) return;
  const spot = overlayEl.querySelector(".tutorial-spot");
  const tip = overlayEl.querySelector(".tutorial-tip");
  const step = STEPS[stepIndex] || {};

  // target smí být i funkce → přepočítá selektor podle aktuálního stavu (spotlight
  // pak sleduje interakci: tlačítko Bag → sekce → konkrétní item).
  const sel = typeof currentSelector === "function" ? currentSelector() : currentSelector;

  let u = null; // union rect viditelných cílů
  if (sel) {
    document.querySelectorAll(sel).forEach((el) => {
      let t = el;
      if (t.tagName === "INPUT") t = t.closest("label") || t; // spotlight na checkboxu je titěrný
      const r = t.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return; // skryté (např. zavřený dropdown-panel) ignoruj
      if (!u) u = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      else {
        u.left = Math.min(u.left, r.left);
        u.top = Math.min(u.top, r.top);
        u.right = Math.max(u.right, r.right);
        u.bottom = Math.max(u.bottom, r.bottom);
      }
    });
  }

  if (u) {
    const pad = 6;
    spot.style.display = "block";
    spot.style.left = `${u.left - pad}px`;
    spot.style.top = `${u.top - pad}px`;
    spot.style.width = `${u.right - u.left + pad * 2}px`;
    spot.style.height = `${u.bottom - u.top + pad * 2}px`;
    positionTip(tip, u, step.tipEdge);
  } else if (sel) {
    // Cíl je zadaný, ale zrovna NENÍ v DOM (zmizel po akci / ještě není) → spotlight
    // schovej. Žádný matoucí čtvereček uprostřed; bublina + nápověda vedou dál.
    spot.style.display = "none";
    positionTip(tip, null, step.tipEdge);
  } else {
    // Úplně bez cíle: 0×0 spotlight uprostřed (ztmaví celou plochu).
    spot.style.display = "block";
    spot.style.left = `${window.innerWidth / 2}px`;
    spot.style.top = `${window.innerHeight / 2}px`;
    spot.style.width = "0px";
    spot.style.height = "0px";
    positionTip(tip, null, step.tipEdge);
  }
}

/** Umístí bublinu: k okraji (tipEdge top/bottom), pod/nad cíl, nebo na střed. */
function positionTip(tip, rect, edge) {
  const tipH = tip.offsetHeight || 160;
  const tipW = tip.offsetWidth || 320;
  const cx = Math.max(12, (window.innerWidth - tipW) / 2);
  tip.classList.remove("tutorial-tip-center");
  if (edge === "top") {
    tip.style.top = "14px";
    tip.style.left = `${cx}px`;
    return;
  }
  if (edge === "bottom") {
    tip.style.top = `${window.innerHeight - tipH - 14}px`;
    tip.style.left = `${cx}px`;
    return;
  }
  if (!rect) {
    // bez cíle a bez edge → na střed
    tip.style.top = "";
    tip.style.left = "";
    tip.classList.add("tutorial-tip-center");
    return;
  }
  const below = rect.bottom + 12;
  const top = below + tipH < window.innerHeight ? below : Math.max(12, rect.top - tipH - 12);
  tip.style.top = `${top}px`;
  tip.style.left = `${Math.min(Math.max(12, rect.left), window.innerWidth - tipW - 12)}px`;
}

function destroyOverlay() {
  window.removeEventListener("resize", reposition);
  busUnsub?.();
  busUnsub2?.();
  busUnsub = busUnsub2 = null;
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  if (clickHandler) document.removeEventListener("click", clickHandler, true);
  clickHandler = null;
  advancing = false;
  overlayEl?.remove();
  overlayEl = null;
  currentSelector = null;
  currentGate = null;
}

/* ------------------------------------------------------------------ *
 * Dokončení + izolace stavu
 * ------------------------------------------------------------------ */

/** Označí tutorial za hotový (uloží), pak spustí navazující akci. */
function finishTutorial(onDone) {
  const st = getState();
  st.story = st.story || {};
  st.story[DONE_FLAG] = true;
  commit();
  saveGame(); // po (případném) sandboxu uloží ČISTÝ stav
  onDone?.();
}

/** Vrátí hlubokou zálohu celého herního stavu (konzistentní se save = JSON). */
export function snapshotState() {
  return JSON.parse(JSON.stringify(getState()));
}

/** Obnoví stav ze zálohy (emituje STATE_CHANGED přes setState). */
export function restoreState(snap) {
  if (snap) setState(snap);
}
