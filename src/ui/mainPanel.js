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
import { renderProfileTab } from "./profileView.js";
import { renderBattle } from "./battleView.js";
import { renderGymTab } from "./gymView.js";
import { renderRivalTab } from "./rivalView.js";
import { renderRocketsTab } from "./rocketView.js";
import { renderSafariTab } from "./safariView.js";
import { renderLegendaryTab } from "./legendaryView.js";
import { renderLeagueTab } from "./leagueView.js";
import { getActiveArea } from "../systems/battleSystem.js";
import { getState } from "../core/state.js";
import { ownsSpecies } from "../systems/team.js";
import { getGymForCity } from "../../data/gyms.js";
import { rivalForArea, rocketGauntletForArea, leagueForArea } from "../../data/trainers.js";
import { legendaryForArea } from "../../data/legendaries.js";

const ALL_TABS = [
  { id: "battle", label: "Battle" },
  { id: "safari", label: "Safari" },
  { id: "gym", label: "Gym" },
  { id: "rival", label: "Rival" },
  { id: "rockets", label: "Rockets" },
  { id: "legendary", label: "Legendary" },
  { id: "league", label: "🏆 League" },
  { id: "city", label: "City" },
  { id: "pc", label: "PC" },
  { id: "pokedex", label: "Pokédex" },
  { id: "profile", label: "Profile" },
];

/** Aktivní záložka přežívá překreslení (modulová proměnná). */
let activeTab = "battle";
/** Skeleton (lišta + podpanely) se staví jen jednou – battle si drží DOM. */
let built = false;
/** Poslední root+onStatus – ať umí přepnout záložku i vnější volání. */
let rootRef = null;
let statusRef = () => {};

/**
 * Záložky viditelné v LIŠTĚ teď. City jen ve městě. Profile v liště NENÍ –
 * otevírá se tlačítkem v horní liště (renderResourceBar → openMainTab("profile")),
 * ale zůstává platnou „skrytou" záložkou (viz ALL_TABS + render switch níže).
 */
function visibleTabs() {
  const area = getActiveArea();
  const inCity = area?.type === "city";
  // Gym tab se ukáže vždy ve městě s gymem; zavřený gym (Viridian bez 7 odznaků)
  // se pozná až uvnitř tabu hláškou (viz gymView isGymOpen).
  const hasGym = inCity && !!getGymForCity(area?.id);
  const hasRival = !!rivalForArea(area?.id);
  // Gauntlet tab (Rockets/Hikers/Mansion): některé mají story-podmínku (Mansion se
  // ukáže až po vyřešení spínačového labyrintu → flag mansionPuzzleSolved).
  const gaunt = rocketGauntletForArea(area?.id);
  const hasRockets = !!gaunt && (!gaunt.requiresStory || !!getState().story?.[gaunt.requiresStory]);
  const inSafari = area?.id === "safari-zone";
  // Legendary tab: oblast má legendárního, story-gate splněný a druh ještě nevlastníš.
  // Zmizí sám v momentě chycení (ownsSpecies) → forgiving jednorázovost pro plný dex.
  const leg = legendaryForArea(area?.id);
  const hasLegendary =
    !!leg &&
    (!leg.requiresStory || !!getState().story?.[leg.requiresStory]) &&
    !ownsSpecies(leg.speciesId);
  // League tab: jen na Indigo Plateau (kde Liga je). Dostat se sem = mít 8 odznaků
  // (Route 22 → Victory Road → Indigo je za earth-badge), takže žádný extra gate.
  const hasLeague = !!leagueForArea(area?.id);
  return ALL_TABS.filter((t) => {
    if (t.id === "profile") return false; // skrytá – jen z horní lišty
    if (t.id === "battle") return !inSafari; // v Safari se nebojuje – Battle mizí
    if (t.id === "safari") return inSafari; // Safari tab jen v oblasti safari-zone
    if (t.id === "city") return inCity;
    if (t.id === "gym") return hasGym; // jen ve městě s gymem
    if (t.id === "rival") return hasRival; // jen na oblasti s rival gate
    if (t.id === "rockets") return hasRockets; // jen na oblasti s Rocket gauntletem
    if (t.id === "legendary") return hasLegendary; // jen na oblasti s (nechyceným) legendárním
    if (t.id === "league") return hasLeague; // jen na Indigo Plateau (Pokémon League)
    return true;
  });
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
  // Mizící záložky (City/Gym/Rival dle lokace) → spadni na Battle, když už nejsou
  // viditelné. Profile je skrytá záložka z horní lišty, tu neresetujeme (není v `tabs`).
  // battle+safari jsou také podmíněné (v safari-zone se prohodí). Když aktivní
  // záložka zmizí, spadni na první viditelnou (v safari-zone = Safari, jinak Battle).
  const conditional = new Set(["city", "gym", "rival", "rockets", "legendary", "league", "battle", "safari"]);
  if (conditional.has(activeTab) && !tabs.some((t) => t.id === activeTab)) {
    activeTab = tabs[0]?.id ?? "battle";
  }

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
  // Rockets tab má dynamický popisek podle gauntletu v aktuální oblasti
  // (např. „Hikers" na Route 9, „Team Rocket" v Celadonu).
  const rocketLabel = rocketGauntletForArea(getActiveArea()?.id)?.tabLabel;
  // Legendary tab má taky dynamický popisek + ikonu (např. „❄️ Articuno").
  const legMeta = legendaryForArea(getActiveArea()?.id);
  tabBar.innerHTML = tabs
    .map((t) => {
      let label = t.label;
      if (t.id === "rockets" && rocketLabel) label = rocketLabel;
      else if (t.id === "legendary" && legMeta) label = `${legMeta.tabIcon} ${legMeta.tabLabel}`;
      return `<button class="tab ${t.id === activeTab ? "active" : ""}" data-tab="${t.id}">${label}</button>`;
    })
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
    else if (activeTab === "gym") renderGymTab(restPane, onStatus);
    else if (activeTab === "rival") renderRivalTab(restPane, onStatus);
    else if (activeTab === "rockets") renderRocketsTab(restPane, onStatus);
    else if (activeTab === "legendary") renderLegendaryTab(restPane, onStatus);
    else if (activeTab === "league") renderLeagueTab(restPane, onStatus);
    else if (activeTab === "safari") renderSafariTab(restPane, onStatus);
    else if (activeTab === "profile") renderProfileTab(restPane, onStatus);
  }
}
