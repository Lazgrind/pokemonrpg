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
import { dexCounts } from "../systems/pokedex.js";
import { BADGES } from "../../data/badges.js";
import { grantDexDiploma } from "../systems/team.js";
import { showPopup } from "./popup.js";

/** Rozměry certifikátu (landscape, dost velké na tisk i sdílení). */
const W = 1000;
const H = 720;

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
export function renderDiplomaCanvas(state = getState()) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const name = state.player?.name?.trim() || "Trainer";
  const { total } = dexCounts();
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
  centerText(ctx, "Professor Oak's Laboratory · Pallet Town, Kanto", 215, "italic 20px Georgia, serif", "#6b6b6b");

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
  centerText(ctx, `has completed the Kanto Pokédex, registering all ${total} Pokémon species,`, 445, "22px Georgia, serif", "#333");
  centerText(ctx, "and is hereby recognized as a true Pokémon Master.", 480, "22px Georgia, serif", "#333");

  // Odměna Shiny Charm.
  centerText(ctx, "✨  Awarded the Shiny Charm  ✨", 545, "600 24px Georgia, serif", "#b8860b");

  // Statistiky.
  centerText(ctx, `Gym Badges: ${badges} / ${BADGES.length}      Play time: ${playtime}      Date: ${date}`, 600, "18px Georgia, serif", "#555");

  // Podpis.
  ctx.textAlign = "center";
  ctx.font = "italic 30px 'Segoe Script', 'Brush Script MT', cursive";
  ctx.fillStyle = "#2b2b2b";
  ctx.fillText("Prof. Oak", W / 2, 665);
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
export function downloadDiplomaPng(state = getState()) {
  const canvas = renderDiplomaCanvas(state);
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
export function showDiplomaModal(state = getState(), { onClose } = {}) {
  if (open) return;
  open = true;

  const canvas = renderDiplomaCanvas(state);
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

  overlay.querySelector("[data-diploma-download]").addEventListener("click", () => downloadDiplomaPng(state));
  overlay.querySelector("[data-diploma-close]").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close(); // klik mimo kartu zavře
  });
  document.addEventListener("keydown", onKey);

  document.body.appendChild(overlay);
}

/** HTML spritu Oaka (fallback: obrázek se skryje, zůstane jen text scény). */
function oakSpriteHtml() {
  return `<img class="ceremony-oak" src="assets/npc/oak.png" alt="Prof. Oak" onerror="this.style.display='none'">`;
}

/** HTML spritu Shiny Charmu (asset zatím nemusí existovat → fallback ✨ glyf). */
function charmSpriteHtml() {
  return `<span class="ceremony-charm">
      <img src="assets/items/shiny-charm.png" alt="Shiny Charm" onerror="this.style.display='none'">
      <span class="ceremony-charm-glyph">✨</span>
    </span>`;
}

/**
 * Slavnostní obřad udělení Diplomu + Shiny Charmu u Prof. Oaka (capstone Gen 1).
 * Vícekrokový dialog (řetězené popupy se spritem Oaka):
 *   1) Oak gratuluje ke kompletnímu dexu a nabídne Diplom.
 *   2) Vizuálně se ukáže Diplom + možnost stažení (showDiplomaModal).
 *   3) Po zavření Diplomu Oak přidá ještě Shiny Charm (sprite vedle Oaka).
 *   4) Převzetí Charmu → TEPRVE TEĎ se nastaví flagy (grantDexDiploma) a Oak
 *      poděkuje za splnění svého životního cíle. Konec rozhovoru.
 * Flagy se nastaví až v posledním kroku, takže když hráč obřad opustí dřív
 * (F5), tlačítko u Oaka zůstane a může ho spustit znovu (žádný softlock).
 * @param {{ onStatus?: (msg: string) => void, onDone?: () => void }} [opts]
 */
export function startDiplomaCeremony({ onStatus = () => {}, onDone = () => {} } = {}) {
  const oak = oakSpriteHtml();

  // 4) Finále: nastav flagy a Oak poděkuje.
  const finish = () => {
    grantDexDiploma(); // → story.dexDiploma + story.shinyCharm + settings.shinyCharmActive
    onStatus("Professor Oak awarded you the Pokédex Diploma and the Shiny Charm!");
    const name = getState().player?.name?.trim() || "Trainer";
    showPopup({
      title: "🔬 Oak's Lab",
      body: `<div class="ceremony">${oak}
        <p class="story-text">Professor Oak: "You've made an old man's lifelong dream come true, ${name}."</p>
        <p class="story-text">"Thank you — truly. Now go, and may your journey shine brighter than ever!"</p></div>`,
      okLabel: "🎉 You're welcome, Professor!",
      onOk: () => onDone(),
    });
  };

  // 3) Předání Shiny Charmu (sprite Charmu vedle Oaka).
  const acceptCharm = () => {
    showPopup({
      title: "✨ A Special Reward",
      dismissible: false,
      body: `<div class="ceremony ceremony-charm-scene">${oak}${charmSpriteHtml()}
        <p class="story-text">Professor Oak: "And that's not all — please, take this too. The Shiny Charm!"</p>
        <p class="story-text">"It hums with a rare energy. Pokémon of unusual colours will now appear far more often on your travels."</p></div>`,
      choices: [{ label: "✨ Take the Shiny Charm", onPick: () => finish() }],
    });
  };

  // 2b) Po zavření vizuálního Diplomu pokračuj k Shiny Charmu.
  const afterDiploma = () => {
    showPopup({
      title: "🔬 Oak's Lab",
      dismissible: false,
      body: `<div class="ceremony">${oak}
        <p class="story-text">You thank Professor Oak for the Diploma.</p>
        <p class="story-text">Professor Oak: "Hold on, don't leave just yet — I have one more gift for a Master like you."</p></div>`,
      choices: [{ label: "Stay and listen", onPick: () => acceptCharm() }],
    });
  };

  // 2) Ukázat vizuální Diplom + stažení; po jeho zavření pokračovat.
  const showDiploma = () => {
    showDiplomaModal(getState(), { onClose: () => afterDiploma() });
  };

  // 1) Úvod: Oak gratuluje a nabídne Diplom.
  showPopup({
    title: "🔬 Oak's Lab",
    dismissible: false,
    body: `<div class="ceremony">${oak}
      <p class="story-text">Professor Oak: "Incredible! You've completed the entire Kanto Pokédex — every single Pokémon!"</p>
      <p class="story-text">"This is the moment I've dreamed of my whole life. I have something special for you..."</p></div>`,
    choices: [{ label: "🎓 Show your completed Pokédex", onPick: () => showDiploma() }],
  });
}
