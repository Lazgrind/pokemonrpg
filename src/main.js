/**
 * main.js – vstupní bod aplikace (Krok 0).
 *
 * Úkolem bootstrapu je najít cílové elementy v DOM a nechat jednotlivé
 * UI moduly vykreslit svoji část. Herní logika (systems/) se sem bude
 * napojovat v dalších krocích – zatím jde jen o vizuální kostru.
 */

import { VERSION } from "./core/version.js";
import { renderCity } from "./ui/cityView.js";
import { renderBattle } from "./ui/battleView.js";
import { renderMap } from "./ui/mapView.js";

/** Bezpečně najde element podle id, jinak vyhodí srozumitelnou chybu. */
function el(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Chybí element #${id} v index.html`);
  return node;
}

/** Dočasná zdrojová lišta (placeholder), reálné hodnoty přijdou z herního stavu. */
function renderResourceBar(root) {
  const resources = [
    { icon: "💰", label: "Gold", value: 0 },
    { icon: "✨", label: "XP", value: 0 },
    { icon: "🔴", label: "Poké Balls", value: 0 },
  ];
  root.innerHTML = resources
    .map(
      (r) => `<span class="resource" title="${r.label}">
                <span class="icon">${r.icon}</span>
                <span class="value">${r.value}</span>
              </span>`
    )
    .join("");
}

/** Inicializace hry. */
function init() {
  renderResourceBar(el("resource-bar"));
  renderCity(el("city-panel"));
  renderBattle(el("battle-panel"));
  renderMap(el("map-panel"));

  el("version-tag").textContent = `Pokémon Idle RPG · v${VERSION}`;
  el("status").textContent = "Připraveno";

  console.log(`[Pokémon Idle RPG] v${VERSION} – kostra načtena.`);
}

// Spustíme až po načtení DOM.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
