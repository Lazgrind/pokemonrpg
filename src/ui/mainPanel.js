/**
 * mainPanel.js – horní levý tabový panel: Battle / City / PC / Pokédex.
 *
 * Souboj i „správcovské" záložky (City, PC, Pokédex) sdílí jeden panel s lištou
 * záložek. Tým už tu není – má vlastní panel dole (teamView).
 *
 * Battle je zvláštní: jeho podpanel (#tab-battle) se vytvoří JEDNOU a drží si
 * vlastní DOM + odběry sběrnice + ResizeObserver (viz battleView.renderBattle).
 * Přepínání záložek proto jen mění viditelnost (display), NEPŘEKRESLUJE battle.
 * Ostatní záložky se renderují do sdíleného #tab-rest při každém zobrazení.
 *
 * City je podmíněná – ukáže se JEN když je hráč ve městě (aktivní oblast typu
 * "city"). Na routě záložka City mizí. Battle zůstává vždy (ve městě je prázdný,
 * dokud se nespustí gym souboj).
 */

import { renderCity } from "./cityView.js";
import { renderPokedexTab } from "./pokedexView.js";
import { renderPcTab } from "./pcView.js";
import { renderBattle } from "./battleView.js";
import { getActiveArea } from "../systems/battleSystem.js";

const ALL_TABS = [
  { id: "battle", label: "Battle" },
  { id: "city", label: "City" },
  { id: "pc", label: "PC" },
  { id: "pokedex", label: "Pokédex" },
];

/** Aktivní záložka přežívá překreslení (modulová proměnná). */
let activeTab = "battle";
/** Skeleton (lišta + podpanely) se staví jen jednou – battle si drží DOM. */
let built = false;
/** Poslední root+onStatus – ať umí přepnout záložku i vnější volání. */
let rootRef = null;
let statusRef = () => {};

/** Záložky viditelné teď. City jen ve městě; ostatní vždy. */
function visibleTabs() {
  const inCity = getActiveArea()?.type === "city";
  return ALL_TABS.filter((t) => t.id !== "city" || inCity);
}

/**
 * Přepne aktivní záložku zvenčí (např. klik na ikonu Pokédexu v horní liště).
 * @param {string} tabId
 */
export function openMainTab(tabId) {
  if (!ALL_TABS.some((t) => t.id === tabId)) return;
  activeTab = tabId;
  if (rootRef) renderMainPanel(rootRef, statusRef);
}

/**
 * Vykreslí horní panel se záložkami. Battle podpanel se staví jen poprvé; při
 * dalších voláních se překreslí jen lišta + obsah nebattle záložky.
 * @param {HTMLElement} root
 * @param {(msg: string) => void} onStatus
 */
export function renderMainPanel(root, onStatus = () => {}) {
  rootRef = root;
  statusRef = onStatus;
  const tabs = visibleTabs();
  // Když aktivní záložka zmizí (City po opuštění města), spadni na Battle.
  if (!tabs.some((t) => t.id === activeTab)) activeTab = "battle";

  // Skeleton jen jednou – battle podpanel si dál drží vlastní DOM/odběry.
  if (!built) {
    root.innerHTML = `
      <div class="main-tabs tabs"></div>
      <div class="main-body">
        <div id="tab-battle" class="tab-pane"></div>
        <div id="tab-rest" class="tab-pane"></div>
      </div>`;
    renderBattle(root.querySelector("#tab-battle"));
    built = true;
  }

  // Lišta záložek (laciné překreslení pokaždé).
  const tabBar = root.querySelector(".main-tabs");
  tabBar.innerHTML = tabs
    .map((t) => `<button class="tab ${t.id === activeTab ? "active" : ""}" data-tab="${t.id}">${t.label}</button>`)
    .join("");
  tabBar.querySelectorAll(".tab").forEach((btn) =>
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab;
      renderMainPanel(root, onStatus);
    })
  );

  // Přepnutí viditelnosti podpanelů (battle vs. zbytek).
  const battlePane = root.querySelector("#tab-battle");
  const restPane = root.querySelector("#tab-rest");
  const showBattle = activeTab === "battle";
  battlePane.classList.toggle("is-active", showBattle);
  restPane.classList.toggle("is-active", !showBattle);

  // Obsah nebattle záložky (battle se drží sám přes sběrnici).
  if (!showBattle) {
    if (activeTab === "pc") renderPcTab(restPane, onStatus);
    else if (activeTab === "pokedex") renderPokedexTab(restPane, onStatus);
    else if (activeTab === "city") renderCity(restPane, onStatus);
  }
}
