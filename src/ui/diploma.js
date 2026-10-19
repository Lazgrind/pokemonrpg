/**
 * diploma.js – „reálný" Pokédex Diploma jako obrázek.
 *
 * Capstone Gen 1: po zkompletování dexu udělí Prof. Oak Diplom (viz
 * team.grantDexDiploma + oakLabView). Tady ho vykreslíme na <canvas> jako hezký
 * certifikát, ukážeme ho hráči ve vizuálním modalu a nabídneme stažení PNG.
 * Použito ve dvou místech: slavnostně hned při udělení (Oak's Lab) a kdykoli
 * později z Profilu.
 */

import { getState } from "../core/state.js";
import { dexCountsByGen } from "../systems/pokedex.js";
import { BADGES } from "../../data/badges.js";
import { grantDexDiploma } from "../systems/team.js";
import { generationByRegion } from "../../data/generations.js";
import { showPopup } from "./popup.js";
import { npcUrl } from "../core/assets.js";

/** Rozměry certifikátu (landscape, dost velké na tisk i sdílení). */
const W = 1000;
const H = 720;

/**
 * Konfigurace diplomu per region: profesor, lab a odznaky pro certifikát i obřad.
 * Diplom je REGIONÁLNÍ (per-gen) – každý region má vlastního profesora, vlastní
 * Pokédex a vlastní Shiny Charm. Kanto = Oak, Johto = Elm.
 */
const REGION_DIPLOMA = {
  kanto: { professor: "Prof. Oak", labName: "Oak's Lab", regionName: "Kanto", labLine: "Professor Oak's Laboratory · Pallet Town, Kanto", npc: "oak", gen: 1 },
  johto: { professor: "Prof. Elm", labName: "Elm's Lab", regionName: "Johto", labLine: "Professor Elm's Laboratory · New Bark Town, Johto", npc: "elm", gen: 2 },
};

/** Vrátí konfiguraci diplomu pro region (fallback Kanto). */
function diplomaConfig(region) {
  return REGION_DIPLOMA[region] ?? REGION_DIPLOMA.kanto;
}

/** Počet druhů generace daného regionu (pro „registering all N species"). */
function regionDexTotal(region) {
  const gen = diplomaConfig(region).gen;
  return dexCountsByGen()[gen]?.total ?? 0;
}

/** ms → „Xd Yh" / „Yh Zm" / „Zm" (shodně s profilem). */
function playtimeStr(ms) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Vodorovně vycentrovaný text. */
function centerText(ctx, text, y, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(text, W / 2, y);
}

/**
 * Vykreslí diplom na nové plátno a vrátí ho.
 * @param {object} [state] herní stav (default getState())
 * @returns {HTMLCanvasElement}
 */
export function renderDiplomaCanvas(state = getState(), region = state.progress?.region ?? "kanto") {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const cfg = diplomaConfig(region);
  const name = state.player?.name?.trim() || "Trainer";
  const total = regionDexTotal(region);
  const badges = state.progress?.badges?.length ?? 0;
  const playtime = playtimeStr(Date.now() - (state.meta?.createdAt ?? Date.now()));
  const date = new Date().toLocaleDateString();

  // Pozadí – krémový gradient.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#fffdf5");
  bg.addColorStop(1, "#fdf2d6");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Dvojitý rámeček (zlatý vně, tmavý uvnitř).
  ctx.strokeStyle = "#c9a227";
  ctx.lineWidth = 10;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.strokeStyle = "#7a5c12";
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  // Hlavička.
  centerText(ctx, "★  POKÉMON LEAGUE  ★", 110, "600 22px Georgia, 'Times New Roman', serif", "#7a5c12");
  centerText(ctx, "POKÉDEX DIPLOMA", 175, "700 58px Georgia, 'Times New Roman', serif", "#2b2b2b");
  centerText(ctx, cfg.labLine, 215, "italic 20px Georgia, serif", "#6b6b6b");

  // Oddělovací linka.
  ctx.strokeStyle = "#c9a227";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(160, 250);
  ctx.lineTo(W - 160, 250);
  ctx.stroke();

  // Tělo certifikátu.
  centerText(ctx, "This certifies that", 315, "22px Georgia, serif", "#444");
  centerText(ctx, name, 385, "700 46px Georgia, serif", "#1a3d7c");
  centerText(ctx, `has completed the ${cfg.regionName} Pokédex, registering all ${total} Pokémon species,`, 445, "22px Georgia, serif", "#333");
  centerText(ctx, "and is hereby recognized as a true Pokémon Master.", 480, "22px Georgia, serif", "#333");

  // Odměna Shiny Charm.
  centerText(ctx, "✨  Awarded the Shiny Charm  ✨", 545, "600 24px Georgia, serif", "#b8860b");

  // Statistiky.
  centerText(ctx, `Gym Badges: ${badges} / ${BADGES.length}      Play time: ${playtime}      Date: ${date}`, 600, "18px Georgia, serif", "#555");

  // Podpis.
  ctx.textAlign = "center";
  ctx.font = "italic 30px 'Segoe Script', 'Brush Script MT', cursive";
  ctx.fillStyle = "#2b2b2b";
  ctx.fillText(cfg.professor, W / 2, 665);
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 120, 678);
  ctx.lineTo(W / 2 + 120, 678);
  ctx.stroke();
  centerText(ctx, "Pokémon Professor", 698, "16px Georgia, serif", "#777");

  return canvas;
}

/** Bezpečný název souboru z jména trenéra. */
function safeName(name) {
  return (name || "trainer").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "trainer";
}

/** Vykreslí diplom a stáhne ho jako PNG. */
export function downloadDiplomaPng(state = getState(), region = state.progress?.region ?? "kanto") {
  const canvas = renderDiplomaCanvas(state, region);
  const name = safeName(state.player?.name);
  const stamp = new Date().toISOString().slice(0, 10);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pokedex-diploma-${name}-${stamp}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

/** Je otevřený diplom modal? (jen jeden naráz) */
let open = false;

/**
 * Slavnostní vizuální zobrazení diplomu v modalu + tlačítko stažení.
 * @param {object} [state]
 * @param {{ onClose?: () => void }} [opts] onClose se zavolá po zavření (Esc/klik mimo/tlačítko)
 */
export function showDiplomaModal(state = getState(), { onClose, region = state.progress?.region ?? "kanto" } = {}) {
  if (open) return;
  open = true;

  const canvas = renderDiplomaCanvas(state, region);
  const dataUrl = canvas.toDataURL("image/png");

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay diploma-overlay";
  overlay.innerHTML = `
    <div class="modal diploma-modal">
      <img class="diploma-img" src="${dataUrl}" alt="Pokédex Diploma">
      <div class="diploma-actions">
        <button class="btn" data-diploma-download>⬇ Download PNG</button>
        <button class="btn btn-secondary" data-diploma-close>Close</button>
      </div>
    </div>
  `;

  const close = () => {
    if (!open) return;
    open = false;
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    if (typeof onClose === "function") onClose();
  };
  const onKey = (e) => {
    if (e.key === "Escape") close();
  };

  overlay.querySelector("[data-diploma-download]").addEventListener("click", () => downloadDiplomaPng(state, region));
  overlay.querySelector("[data-diploma-close]").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close(); // klik mimo kartu zavře
  });
  document.addEventListener("keydown", onKey);

  document.body.appendChild(overlay);
}

/** HTML spritu profesora regionu (fallback: obrázek se skryje, zůstane text scény). */
function professorSpriteHtml(cfg) {
  return `<img class="ceremony-oak" src="${npcUrl(cfg.npc, cfg.gen)}" alt="${cfg.professor}" onerror="this.style.display='none'">`;
}

/** HTML spritu Shiny Charmu (asset zatím nemusí existovat → fallback ✨ glyf). */
function charmSpriteHtml() {
  return `<span class="ceremony-charm">
      <img src="assets/items/shiny-charm.png" alt="Shiny Charm" onerror="this.style.display='none'">
      <span class="ceremony-charm-glyph">✨</span>
    </span>`;
}

/**
 * Slavnostní obřad udělení Diplomu + Shiny Charmu u profesora regionu (capstone).
 * REGIONÁLNÍ – Kanto: Prof. Oak, Johto: Prof. Elm; charm i diplom se udělí pro
 * daný region. Vícekrokový dialog (řetězené popupy se spritem profesora):
 *   1) Profesor gratuluje ke kompletnímu dexu a nabídne Diplom.
 *   2) Vizuálně se ukáže Diplom + možnost stažení (showDiplomaModal).
 *   3) Po zavření Diplomu profesor přidá ještě Shiny Charm.
 *   4) Převzetí Charmu → TEPRVE TEĎ se nastaví flagy (grantDexDiploma(region)).
 * Flagy se nastaví až v posledním kroku, takže když hráč obřad opustí dřív (F5),
 * tlačítko u profesora zůstane a může ho spustit znovu (žádný softlock).
 * @param {{ region?: string, onStatus?: (msg: string) => void, onDone?: () => void }} [opts]
 */
export function startDiplomaCeremony({ region = getState().progress?.region ?? "kanto", onStatus = () => {}, onDone = () => {} } = {}) {
  const cfg = diplomaConfig(region);
  const prof = professorSpriteHtml(cfg);
  const title = `🔬 ${cfg.labName}`;

  // 4) Finále: nastav flagy a profesor poděkuje.
  const finish = () => {
    grantDexDiploma(region); // → story.dexDiplomaByRegion + shinyCharmByRegion + settings.shinyCharmActive
    onStatus(`${cfg.professor} awarded you the ${cfg.regionName} Pokédex Diploma and the Shiny Charm!`);
    const name = getState().player?.name?.trim() || "Trainer";
    showPopup({
      title,
      body: `<div class="ceremony">${prof}
        <p class="story-text">${cfg.professor}: "You've made my research dream come true, ${name}."</p>
        <p class="story-text">"Thank you — truly. Now go, and may your journey shine brighter than ever!"</p></div>`,
      okLabel: "🎉 You're welcome, Professor!",
      onOk: () => onDone(),
    });
  };

  // 3) Předání Shiny Charmu (sprite Charmu vedle profesora).
  const acceptCharm = () => {
    showPopup({
      title: "A Special Reward",
      dismissible: false,
      body: `<div class="ceremony ceremony-charm-scene">${prof}${charmSpriteHtml()}
        <p class="story-text">${cfg.professor}: "And that's not all — please, take this too. The Shiny Charm!"</p>
        <p class="story-text">"It hums with a rare energy. Here in ${cfg.regionName}, Pokémon of unusual colours will now appear far more often."</p></div>`,
      choices: [{ label: "✨ Take the Shiny Charm", onPick: () => finish() }],
    });
  };

  // 2b) Po zavření vizuálního Diplomu pokračuj k Shiny Charmu.
  const afterDiploma = () => {
    showPopup({
      title,
      dismissible: false,
      body: `<div class="ceremony">${prof}
        <p class="story-text">You thank ${cfg.professor} for the Diploma.</p>
        <p class="story-text">${cfg.professor}: "Hold on, don't leave just yet — I have one more gift for a Master like you."</p></div>`,
      choices: [{ label: "Stay and listen", onPick: () => acceptCharm() }],
    });
  };

  // 2) Ukázat vizuální Diplom + stažení; po jeho zavření pokračovat.
  const showDiploma = () => {
    showDiplomaModal(getState(), { region, onClose: () => afterDiploma() });
  };

  // 1) Úvod: profesor gratuluje a nabídne Diplom.
  showPopup({
    title,
    dismissible: false,
    body: `<div class="ceremony">${prof}
      <p class="story-text">${cfg.professor}: "Incredible! You've completed the entire ${cfg.regionName} Pokédex — every single Pokémon!"</p>
      <p class="story-text">"This is a moment to remember. I have something special for you..."</p></div>`,
    choices: [{ label: "🎓 Show your completed Pokédex", onPick: () => showDiploma() }],
  });
}
