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
import { renderDaycareTab } from "./daycareView.js";
import { renderMoveTutorTab } from "./moveTutorView.js";
import { renderPokedexTab } from "./pokedexView.js";
import { renderPcTab } from "./pcView.js";
import { renderProfileTab } from "./profileView.js";
import { renderAchievementsTab } from "./achievementsView.js";
import { renderBattle } from "./battleView.js";
import { renderGymTab } from "./gymView.js";
import { renderRivalTab } from "./rivalView.js";
import { renderRocketsTab } from "./rocketView.js";
import { renderSafariTab } from "./safariView.js";
import { renderJohtoSafariTab } from "./johtoSafariView.js";
import { JOHTO_SAFARI_AREA_ID } from "../../data/gen2/safari.js";
import { renderContestTab } from "./contestView.js";
import { renderLegendaryTab } from "./legendaryView.js";
import { renderLeagueTab } from "./leagueView.js";
import { renderFishingTab } from "./fishingView.js";
import { hasAnyRod, areaHasWater } from "../systems/fishingSystem.js";
import { getActiveArea, battleBgm } from "../systems/battleSystem.js";
import { playBgm } from "../systems/audioSystem.js";
import { bus, EVENTS } from "../core/events.js";
import { getState } from "../core/state.js";
import { getGymForCity } from "../../data/gyms.js";
import { rivalForArea, rivalRequiresStory, rocketGauntletForArea, leagueForArea, regionForArea } from "../../data/trainers.js";
import { legendaryForArea } from "../../data/legendaries.js";
import { BADGES } from "../../data/badges.js";
import { generationByRegion } from "../../data/generations.js";

const ALL_TABS = [
  { id: "battle", label: "Battle" },
  { id: "safari", label: "Safari" },
  { id: "johto-safari", label: "Safari" },
  { id: "contest", label: "🦗 Contest" },
  { id: "fishing", label: "🎣 Fishing" },
  { id: "gym", label: "Gym" },
  { id: "rival", label: "Rival" },
  { id: "rockets", label: "Rockets" },
  { id: "legendary", label: "Legendary" },
  { id: "league", label: "🏆 League" },
  { id: "city", label: "City" },
  { id: "daycare", label: "🐣 Day Care" },
  { id: "move-tutor", label: "📖 Move Tutor" },
  { id: "pc", label: "PC" },
  { id: "pokedex", label: "Pokédex" },
  { id: "profile", label: "Profile" },
  { id: "achievements", label: "Achievements" },
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
  // Rival tab: oblast má rival gate a případná story-podmínka je splněná (kánon:
  // Silver u Azaley se objeví až po vyčištění Slowpoke Well). Zrcadlí gauntlet gate.
  const rivalReq = rivalRequiresStory(area?.id);
  const hasRival = !!rivalForArea(area?.id) && (!rivalReq || !!getState().story?.[rivalReq]);
  // Gauntlet tab (Rockets/Hikers/Mansion): některé mají story-podmínku (Mansion se
  // ukáže až po vyřešení spínačového labyrintu → flag mansionPuzzleSolved).
  const gaunt = rocketGauntletForArea(area?.id);
  const hasRockets = !!gaunt && (!gaunt.requiresStory || !!getState().story?.[gaunt.requiresStory]);
  const inSafari = area?.id === "safari-zone";
  // Johtská Safari (HGSS bloky) je jiná hra s vlastním tabem – viz johtoSafariView.
  const inJohtoSafari = area?.id === JOHTO_SAFARI_AREA_ID;
  // Contest tab: Bug-Catching Contest jen v National Parku. Battle tu zůstává
  // (park má i běžné divoké encountery) – contest je navíc denní minihra.
  const inPark = area?.id === "national-park";
  // Fishing tab: kdekoli je aspoň kousek vody (area.water) a hráč má prut.
  // V Safari se loví jinak (Safari pravidla) → tam Fishing tab neukazujeme.
  const canFish = !inSafari && !inJohtoSafari && hasAnyRod() && areaHasWater(area);
  // Legendary tab: oblast má legendárního a story-gate je splněný. Tab zůstává
  // viditelný I PO chycení → opakovaný „shiny lov" (repeatable encounter bez odměn,
  // viz battleSystem/legendaryView). První chycení je normální (dex + story), každé
  // další je čistě na shiny duplikát (upgrade stávajícího záznamu na shiny).
  // VÝJIMKA: jednorázová setkání (leg.oneTime, např. Red Gyarados) zmizí po chycení –
  // řídí vlastní claimFlag (ne vlastnictví druhu, protože ten je i jinak získatelný).
  const leg = legendaryForArea(area?.id);
  const legStory = leg?.requiresStory == null ? [] : [].concat(leg.requiresStory); // string i pole
  const hasLegendary =
    !!leg &&
    legStory.every((f) => !!getState().story?.[f]) &&
    (!leg.requiresBadge || (getState().progress?.badges ?? []).includes(leg.requiresBadge)) &&
    (!leg.oneTime || !getState().story?.[leg.claimFlag]);
  // League tab: jen na Indigo Plateau (kde Liga je) A ZÁROVEŇ s KOMPLETNÍ sadou
  // odznaků daného regionu. V Kantu to řešil unlock strom (Victory Road za
  // earth-badge), ale v Johtu jde Jasmine (mineral) přeskočit – proto explicitní
  // gate na všech 8 regionálních odznaků (region-agnostic přes gen odznaku).
  const hasLeague = (() => {
    if (!leagueForArea(area?.id)) return false;
    const gen = generationByRegion(regionForArea(area?.id))?.gen;
    const need = BADGES.filter((b) => (b.gen ?? 1) === gen).map((b) => b.id);
    const have = getState().progress?.badges ?? [];
    return need.length > 0 && need.every((id) => have.includes(id));
  })();
  // Day Care tab: Kanto = Route 5 (kanonické místo), Johto = Route 34 (kanonická
  // Day Care manželů v GSC). Per-region přístup ke stejné službě (jako v Kantu).
  const atDaycare = area?.id === "route-05" || area?.id === "route-34";
  // Move Tutor tab: Kanto = Route 8 (střed), Johto = Route 38 (střed, Ecruteak↔
  // Olivine). Move Tutor je naše QoL služba (v originále takto nebyl) – v obou
  // regionech dostupný na centrální routě, aby nebyl jen v jednom městě.
  const atMoveTutor = area?.id === "route-08" || area?.id === "route-38";
  return ALL_TABS.filter((t) => {
    if (t.id === "profile") return false; // skrytá – jen z horní lišty
    if (t.id === "achievements") return false; // skrytá – otevírá se z horní lišty (🏆)
    if (t.id === "battle") return !inSafari && !inJohtoSafari; // v Safari se nebojuje – Battle mizí
    if (t.id === "safari") return inSafari; // Safari tab jen v oblasti safari-zone
    if (t.id === "johto-safari") return inJohtoSafari; // johtská Safari (bloky) jen v safari-zone-johto
    if (t.id === "contest") return inPark; // Bug-Catching Contest jen v National Parku
    if (t.id === "fishing") return canFish; // jen u vody a s prutem
    if (t.id === "city") return inCity;
    if (t.id === "gym") return hasGym; // jen ve městě s gymem
    if (t.id === "rival") return hasRival; // jen na oblasti s rival gate
    if (t.id === "rockets") return hasRockets; // jen na oblasti s Rocket gauntletem
    if (t.id === "legendary") return hasLegendary; // jen na oblasti s (nechyceným) legendárním
    if (t.id === "league") return hasLeague; // jen na Indigo Plateau (Pokémon League)
    if (t.id === "daycare") return atDaycare; // jen na Route 5 (kanonická Day Care)
    if (t.id === "move-tutor") return atMoveTutor; // jen na Route 8 (Move Tutor's House)
    // Pokédex dá Oak až při odevzdání Parcelu (spolu s EXP Share) – do té doby skrytý.
    if (t.id === "pokedex") return !!getState().story?.oakParcelDelivered;
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
 * Je záložka právě dostupná (viditelná v liště)? Např. League jen na Indigo Plateau se všemi odznaky.
 * @param {string} tabId
 * @returns {boolean}
 */
export function isMainTabVisible(tabId) {
  return visibleTabs().some((t) => t.id === tabId);
}

/**
 * Aktuálně zobrazená záložka (pro moduly, které si drží vlastní stav napříč
 * překreslením – např. reakční minihra rybaření kontroluje, zda je pořád vidět).
 * @returns {string}
 */
export function currentMainTab() {
  return activeTab;
}

/**
 * Sladí hudbu se stavem: na Battle tabu s běžícím soubojem hraje BGM dle kontextu
 * (wild/trainer/rival/gym/champion), jinak "main" (mapa/menu). Chybí-li soubor, playBgm
 * tiše mlčí. Idempotentní – playBgm nerestartuje stejný track, takže idle grind i mapa
 * hrají plynule. Volá se z renderMainPanel (STATE_CHANGED) i z BATTLE_UPDATE (okamžitě
 * na startu/konci souboje).
 */
function syncBattleBgm() {
  const bgm = activeTab === "battle" ? battleBgm() : null;
  playBgm(bgm || "main");
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
  const conditional = new Set(["city", "daycare", "move-tutor", "gym", "rival", "rockets", "legendary", "league", "battle", "safari", "johto-safari", "contest", "fishing"]);
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
    // Hudba reaguje i na dění v souboji (start/konec) mimo STATE_CHANGED tik.
    bus.on(EVENTS.BATTLE_UPDATE, syncBattleBgm);
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
    else if (activeTab === "daycare") renderDaycareTab(restPane, onStatus);
    else if (activeTab === "move-tutor") renderMoveTutorTab(restPane, onStatus);
    else if (activeTab === "gym") renderGymTab(restPane, onStatus);
    else if (activeTab === "rival") renderRivalTab(restPane, onStatus);
    else if (activeTab === "rockets") renderRocketsTab(restPane, onStatus);
    else if (activeTab === "legendary") renderLegendaryTab(restPane, onStatus);
    else if (activeTab === "league") renderLeagueTab(restPane, onStatus);
    else if (activeTab === "safari") renderSafariTab(restPane, onStatus);
    else if (activeTab === "johto-safari") renderJohtoSafariTab(restPane, onStatus);
    else if (activeTab === "contest") renderContestTab(restPane, onStatus);
    else if (activeTab === "fishing") renderFishingTab(restPane, onStatus);
    else if (activeTab === "profile") renderProfileTab(restPane, onStatus);
    else if (activeTab === "achievements") renderAchievementsTab(restPane, onStatus);
  }

  // Sladit bojovou hudbu se stavem (na Battle tabu hraje, jinde ticho).
  syncBattleBgm();
}
