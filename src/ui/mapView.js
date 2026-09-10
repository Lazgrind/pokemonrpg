/**
 * UI: panel Mapy (pravá dolní část) – KLIKACÍ mapa (à la PokeClicker / nintendo).
 *
 * Nad artem regionu (assets/map/kanto.webp) jsou umístěné klikací markery uzlů
 * z datové vrstvy (data/areas.js) na pozicích x/y v %. Klik na uzel = „přesun":
 * nastaví aktivní oblast (battleSystem.setActiveArea) → souboje pak spawnují
 * odsud. Odemčení řídí navštívené oblasti (isAreaUnlocked nad progress.visited);
 * zamčené uzly nejdou kliknout a hráč je nevidí (jen dev „reveal" je ukáže).
 *
 * REŽIM UMÍSTĚNÍ (📍): protože art mapa nemá popisky, hráč si pozice uzlů
 * naklikká sám – vybere uzel v liště a klikne na mapu, kam patří. Pozice se
 * uloží do state.mapPositions (override nad areas.js) a zobrazí se textový
 * výpis, který se pak přepíše natvrdo do data/areas.js.
 */

import { AREAS, getArea, isAreaUnlocked, areaLevelRange } from "../../data/areas.js";
import { setActiveArea, getActiveAreaId, applyFossilChoice, startTrainerBattle } from "../systems/battleSystem.js";
import { endSafari, isSafariActive } from "../systems/safariSystem.js";
import { getState, commit } from "../core/state.js";
import { bus, EVENTS } from "../core/events.js";
import { showPopup } from "./popup.js";
import { openMainTab } from "./mainPanel.js";

const MAP_IMG = "assets/map/kanto.webp";

/* ===================== DEV: Map placement mode =====================
 * Vývojový nástroj pro naklikání pozic uzlů na mapě (tlačítko 📍 Place nodes)
 * + výpis pozic (📋), který se ručně přepíše do data/areas.js.
 *
 * PŘED OSTRÝM RELEASEM: přepni DEV_MAP_PLACEMENT = false → celý nástroj zmizí
 * z UI (tlačítko se nevykreslí, edit režim je nedostupný, žádné mapPositions).
 * Pro ÚPLNÉ smazání kódu vyřízni bloky ohraničené značkami
 * `DEV-PLACEMENT-START` … `DEV-PLACEMENT-END` níže.
 * (Konvence stejná jako u ostatních dev věcí – viz „🔧 Dev tools" v Nastavení.)
 * =================================================================== */
const DEV_MAP_PLACEMENT = true;

/** Režim umístění uzlů + aktuálně vybraný uzel (modulový stav UI). */
let editMode = false;
let editTarget = null;
let editHideLabels = false; // v edit režimu skrýt názvy → jen tečky (nepřekáží v kliku)
let unsub = null;
let rootRef = null;

/** Navštívené oblasti (řídí odemykání navazujících uzlů, viz data/areas.js). */
function visitedAreas() {
  return getState().progress?.visited ?? [];
}

/** Získané odznaky (gatují uzly s unlock.badge, viz data/areas.js). */
function earnedBadges() {
  return getState().progress?.badges ?? [];
}

/** Poražení trenéři/rivalové (gatují uzly s unlock.trainer, viz data/areas.js). */
function defeatedTrainers() {
  return getState().progress?.defeatedTrainers ?? [];
}

/** Příběhové flagy (gatují uzly s unlock.story, viz data/areas.js). */
function storyFlags() {
  return getState().story ?? {};
}

/** Dev přepínač „ukázat všechny uzly" (i zamčené) – řídí ho Dev sekce v Nastavení. */
function devReveal() {
  return !!getState().settings?.mapReveal;
}

/** Pozice uzlu na mapě: override ze state.mapPositions, jinak výchozí z areas.js. */
function posOf(area) {
  const o = getState().mapPositions?.[area.id];
  return o && typeof o.x === "number" ? o : { x: area.x, y: area.y };
}

/** Zapíše naklikanou pozici uzlu (override) a uloží. */
function setMapPos(areaId, x, y) {
  const s = getState();
  if (!s.mapPositions) s.mapPositions = {};
  s.mapPositions[areaId] = { x: round1(x), y: round1(y) };
  commit();
}

const round1 = (n) => Math.round(n * 10) / 10;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * Vykreslí klikací mapu do zadaného elementu.
 * @param {HTMLElement} root
 */
export function renderMap(root) {
  rootRef = root;
  const visited = visitedAreas();

  const badges = earnedBadges();
  const beaten = defeatedTrainers();
  const story = storyFlags();
  const nodesHtml = AREAS.map((area) => {
    const unlocked = isAreaUnlocked(area, visited, badges, beaten, story);
    const p = posOf(area);
    // Popisek levelu = per-oblast pásmo (Lv min–max), u jednobodového jen jedno číslo.
    const [lmin, lmax] = areaLevelRange(area);
    const lvl = area.species?.length ? ` · Lv ${lmin === lmax ? lmin : `${lmin}–${lmax}`}` : "";
    // Pozn.: počet objevených druhů (R-023) ZÁMĚRNĚ NENÍ na uzlu mapy (zabíral moc
    // místa). Ukazuje se u aktivní oblasti v hlavičce Battle Area (viz battleView.js).
    return `
      <button
        class="map-node"
        data-area="${area.id}"
        style="left:${p.x}%; top:${p.y}%"
        ${unlocked ? "" : "disabled"}
        title="${area.name}"
      >
        <span class="map-node-dot"></span>
        <span class="map-node-label">${area.name}${lvl}</span>
      </button>`;
  }).join("");

  root.innerHTML = `
    <div class="map-head">
      <h2 class="panel-title">Map</h2>
      <div class="map-head-actions">
        ${editMode ? `<button class="btn btn-sm" data-toggle-labels>${editHideLabels ? "🏷 Labels: off" : "🏷 Labels: on"}</button>` : ""}
        ${editMode ? `<button class="btn btn-sm" data-show-dump title="Show position dump to submit">📋 Position dump</button>` : ""}
        ${DEV_MAP_PLACEMENT ? `<button class="btn btn-sm map-edit-toggle" data-edit-toggle>${editMode ? "✓ Done" : "📍 Place nodes"}</button>` : ""}
      </div>
    </div>
    <div class="kanto-map ${editMode ? "is-editing" : ""}">
      <div class="map-stage ${editMode ? "is-editing" : ""} ${editMode && editHideLabels ? "hide-labels" : ""}">
        <img class="map-img" src="${MAP_IMG}" alt="Map of Kanto" draggable="false" />
        ${nodesHtml}
      </div>
      ${editMode ? editPanelHtml() : `<div class="map-info" aria-live="polite"></div>`}
    </div>
  `;

  const stage = root.querySelector(".map-stage");
  const info = root.querySelector(".map-info");

  // Přepínač režimu umístění (dev; tlačítko existuje jen když DEV_MAP_PLACEMENT).
  const editToggle = root.querySelector("[data-edit-toggle]");
  if (editToggle) {
    editToggle.addEventListener("click", () => {
      editMode = !editMode;
      editTarget = editMode ? firstUnplaced() : null;
      renderMap(root);
    });
  }

  // Výběr uzlu k umístění (čipy v liště) + kopírování výpisu.
  if (editMode) {
    for (const chip of root.querySelectorAll("[data-pick]")) {
      chip.addEventListener("click", () => {
        editTarget = chip.dataset.pick;
        renderMap(root);
      });
    }
    const labelsBtn = root.querySelector("[data-toggle-labels]");
    if (labelsBtn) {
      labelsBtn.addEventListener("click", () => {
        editHideLabels = !editHideLabels;
        renderMap(root);
      });
    }
    const dumpBtn = root.querySelector("[data-show-dump]");
    if (dumpBtn) dumpBtn.addEventListener("click", openPositionsModal);
  }

  // Klik na scénu.
  stage.addEventListener("click", (e) => {
    if (editMode) {
      // Klik na existující uzel = vyber ho k přesunu (ne umístit).
      const hit = e.target.closest(".map-node");
      if (hit) {
        editTarget = hit.dataset.area;
        renderMap(root);
        return;
      }
      // Klik do prázdna = umísti vybraný uzel sem. Cíl zůstává vybraný,
      // takže jde pozici hned doladit dalším klikem (žádný auto-skok).
      if (!editTarget) return;
      const rect = stage.getBoundingClientRect();
      const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
      const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100);
      setMapPos(editTarget, x, y); // → STATE_CHANGED přesune marker
      renderMap(root);
      return;
    }
    const btn = e.target.closest(".map-node");
    if (!btn || btn.disabled) return;
    const area = getArea(btn.dataset.area);
    if (!area) return;
    // Odchod ze Safari Zone (na jinou oblast) = konec probíhající výpravy.
    if (isSafariActive() && getActiveAreaId() === "safari-zone" && area.id !== "safari-zone") {
      endSafari("leave");
    }
    const res = setActiveArea(area.id);
    if (!res.ok) {
      flash(info, res.reason ?? "Can't go there.");
      return;
    }
    // Příběhový event → vyskakovací okno (NIKDY nic pod mapu). Zatím: příchod do
    // Viridianu s nevyřízeným Oak's Parcel navede hráče do Poké Martu.
    if (res.event === "viridian-parcel-hint") {
      showPopup({
        title: "🏙️ Viridian City",
        body: `<p class="story-text">You step into Viridian City. A townsperson points down the street:</p>
          <p class="story-text">"See that <strong>blue-roofed building</strong>? That's the <strong>Poké Mart</strong> — the clerk there was just asking about you. You should go take a look inside."</p>
          <p class="placeholder">Open the <strong>City</strong> tab and click the Poké Mart.</p>`,
        okLabel: "Head into town",
      });
      return;
    }
    if (res.event === "pewter-gym-hint") {
      showPopup({
        title: "🪨 Pewter City",
        body: `<p class="story-text">You arrive in Pewter City, a town of grey stone nestled against the mountains.</p>
          <p class="story-text">A local nods toward the large building at the north end: "That's our <strong>Pewter Gym</strong> — Leader <strong>Brock</strong> uses <strong>Rock-type</strong> Pokémon. Grass or Water types will serve you well against him."</p>
          <p class="placeholder">Open the <strong>Gym</strong> tab to challenge Brock. Don't miss the <strong>Museum of Science</strong> in the City tab!</p>`,
        okLabel: "Let's explore",
      });
      return;
    }
    if (res.event === "viridian-forest-item") {
      showPopup({
        title: "🌳 Viridian Forest",
        body: `<p class="story-text">The forest is a maze of towering trees, alive with the buzz of Bug Pokémon.</p>
          <p class="story-text">Among the roots you spot some items left behind by other trainers — you pick up a <strong>Potion</strong> and an <strong>Antidote</strong>!</p>
          <p class="placeholder">Tip: a rare <strong>Pikachu</strong> is said to live here.</p>`,
        okLabel: "Take them",
      });
      return;
    }
    if (res.event === "mt-moon-rocket") {
      showPopup({
        title: "🌑 Mt. Moon",
        body: `<p class="story-text">You enter Mt. Moon — a pitch-black cave echoing with the screech of Zubat.</p>
          <p class="story-text">Shady figures in black uniforms block the tunnels: <strong>Team Rocket</strong> has taken over the cave, digging for rare fossils and Moon Stones!</p>
          <p class="story-text">Five grunts stand between you and the way onward. Open the <strong>Rockets</strong> tab and beat every one of them to clear the path.</p>`,
        okLabel: "Press on",
      });
      return;
    }
    if (res.event === "mt-moon-fossil") {
      showPopup({
        title: "🦴 Ancient Fossils",
        body: `<p class="story-text">Deep in Mt. Moon, after driving off the Rockets, you find <strong>three ancient fossils</strong> resting on a stone table — and pocket them all.</p>
          <p class="placeholder">🐚 Helix Fossil → Omanyte · 🗿 Dome Fossil → Kabuto · 🟠 Old Amber → Aerodactyl</p>
          <p class="story-text">Take them to the <strong>Museum of Science</strong> in Pewter City to bring them back to life.</p>`,
        okLabel: "Take all three",
        onOk: () => pickFossil(),
      });
      return;
    }
    if (res.event === "cerulean-arrival") {
      showPopup({
        title: "🌊 Cerulean City",
        body: `<p class="story-text">You reach Cerulean City, a bright town of bridges and shimmering waterfalls.</p>
          <p class="story-text">A local waves toward the Gym by the water: "That's <strong>Misty's</strong> Gym — she uses <strong>Water-type</strong> Pokémon. Grass or Electric types will give you the edge."</p>
          <p class="placeholder">Open the <strong>Gym</strong> tab to challenge Misty for the Cascade Badge.</p>`,
        okLabel: "Let's explore",
      });
      return;
    }
    if (res.event === "nugget-bridge") {
      showPopup({
        title: "🌉 Nugget Bridge",
        body: `<p class="story-text">You battle your way across Nugget Bridge, beating trainer after trainer.</p>
          <p class="story-text">At the far end, an impressed man hands you a shiny <strong>Nugget</strong> — you sell it on the spot for <strong>1000₽</strong>!</p>
          <p class="story-text">He then reveals himself as a <strong>Team Rocket</strong> recruiter... and you turn him down flat.</p>`,
        okLabel: "Keep going",
      });
      return;
    }
    if (res.event === "bill-route-25") {
      showPopup({
        title: "🏠 Bill's Cottage",
        body: `<p class="story-text">At the end of Route 25 you find <strong>Bill</strong>, the famous Pokémon researcher — accidentally fused with a Pokémon by his own teleporter!</p>
          <p class="story-text">You help him split back apart. Grateful, he hands you a <strong>S.S. Anne Ticket</strong>.</p>
          <p class="story-text">"The luxury liner <strong>S.S. Anne</strong> is docked at <strong>Vermilion City</strong> to the south. This ticket will get you aboard!"</p>`,
        okLabel: "Thanks, Bill!",
      });
      return;
    }
    if (res.event === "vermilion-arrival") {
      showPopup({
        title: "⚓ Vermilion City",
        body: `<p class="story-text">You arrive in Vermilion City, a sunny port town on the southern coast.</p>
          <p class="story-text">The luxury liner <strong>S.S. Anne</strong> is docked at the harbor — your ticket will get you aboard. Open the <strong>City</strong> tab and visit the ship!</p>
          <p class="placeholder">The <strong>Vermilion Gym</strong> (Lt. Surge, Electric) is blocked by a small tree — you'll need <strong>HM Cut</strong> to reach it.</p>`,
        okLabel: "Explore the port",
      });
      return;
    }
    if (res.event === "route-11-arrival") {
      showPopup({
        title: "🌿 Route 11",
        body: `<p class="story-text">East of Vermilion, Route 11 stretches out in tall grass, buzzing with wild Pokémon and eager trainers.</p>
          <p class="placeholder">At its far end, <strong>Diglett's Cave</strong> tunnels back west under the region — a handy shortcut.</p>`,
        okLabel: "Explore",
      });
      return;
    }
    if (res.event === "digletts-arrival") {
      showPopup({
        title: "⛏️ Diglett's Cave",
        body: `<p class="story-text">You duck into a narrow, twisting cave. The ground churns with <strong>Diglett</strong> — and the occasional three-headed <strong>Dugtrio</strong>!</p>
          <p class="placeholder">The tunnel runs all the way beneath Kanto, linking back to Route 2 near Viridian.</p>`,
        okLabel: "Watch your step",
      });
      return;
    }
    if (res.event === "route-09-arrival") {
      showPopup({
        title: "⛏️ Route 9",
        body: `<p class="story-text">The rocky trail to <strong>Rock Tunnel</strong> is swarming with burly <strong>Hikers</strong> who won't let anyone pass.</p>
          <p class="story-text">Nearby, one of <strong>Professor Oak's aides</strong> leans out of a rest house: "Beat every Hiker here <em>and</em> register <strong>10 kinds</strong> of Pokémon in your Pokédex, and I'll hand you <strong>HM05 Flash</strong> — you'll need it for the pitch-dark tunnel."</p>
          <p class="placeholder">Open the <strong>Hikers</strong> tab to battle the gauntlet.</p>`,
        okLabel: "Bring it on",
      });
      return;
    }
    if (res.event === "flash-gift") {
      showPopup({
        title: "🔦 HM05 Flash!",
        body: `<p class="story-text">You return to Route 9 with <strong>10 kinds</strong> of Pokémon registered. <strong>Professor Oak's aide</strong> nods approvingly.</p>
          <p class="story-text">"A dedicated trainer — as promised." He presses a Hidden Machine into your hand. You received <strong>HM05 Flash</strong>!</p>
          <p class="story-text">With Flash to light the way, you can now make it through <strong>Rock Tunnel</strong> toward Lavender Town.</p>`,
        okLabel: "Thanks!",
      });
      return;
    }
    if (res.event === "lavender-arrival") {
      showPopup({
        title: "👻 Lavender Town",
        body: `<p class="story-text">A mournful tune drifts through Lavender Town. At its heart looms the <strong>Pokémon Tower</strong>, where trainers lay their departed partners to rest.</p>
          <p class="story-text">People whisper of <strong>restless spirits</strong> haunting the upper floors — and of <strong>Mr. Fuji</strong>, who went up to calm them and never came back.</p>
          <p class="placeholder">Open the <strong>City</strong> tab to visit the Tower and Mr. Fuji's House.</p>`,
        okLabel: "Look around",
      });
      return;
    }
    if (res.event === "celadon-arrival") {
      showPopup({
        title: "🏬 Celadon City",
        body: `<p class="story-text">Celadon City sprawls out before you — the largest, most modern city in Kanto, home to the giant <strong>Dept. Store</strong> and the glittering <strong>Game Corner</strong>.</p>
          <p class="story-text">In the fragrant <strong>Celadon Gym</strong>, <strong>Erika</strong> and her Grass-type Pokémon await — beat her for the <strong>Rainbow Badge</strong>.</p>
          <p class="placeholder">But people whisper that the <strong>Game Corner</strong> is a front for something shady... Open the <strong>City</strong> tab to explore.</p>`,
        okLabel: "Let's explore",
      });
      return;
    }
    if (res.event === "saffron-arrival") {
      showPopup({
        title: "🏙️ Saffron City",
        body: `<p class="story-text">Saffron City, the bustling heart of Kanto, is eerily tense. Black-clad <strong>Team Rocket</strong> grunts loiter on every corner — they've seized the towering <strong>Silph Co.</strong> headquarters and locked down the city.</p>
          <p class="story-text">A parched guard blocks the doors of Silph Co., and <strong>Sabrina's Gym</strong> is sealed shut while the Rockets hold the city.</p>
          <p class="placeholder">Buy a drink (<strong>Fresh Water</strong>) at the <strong>Celadon Dept. Store</strong>, bring it to the Silph Co. guard, then storm the tower to free the city — and claim the <strong>Master Ball</strong>. Open the <strong>City</strong> tab.</p>`,
        okLabel: "Let's help",
      });
      return;
    }
    if (res.event === "snorlax-asleep") {
      showPopup({
        title: "😴 A sleeping Snorlax",
        body: `<p class="story-text">An enormous <strong>Snorlax</strong> is sprawled across Route 12, snoring like thunder. It completely blocks the path south — and nothing you do will budge it.</p>
          <p class="placeholder">Only the sound of a <strong>Poké Flute</strong> could wake it. They say one is kept atop <strong>Lavender Town's Pokémon Tower</strong>.</p>`,
        okLabel: "Hmm...",
      });
      return;
    }
    if (res.event === "snorlax-block") {
      showPopup({
        title: "🎵 Poké Flute",
        body: `<p class="story-text">The huge <strong>Snorlax</strong> snores on, blocking Route 12. But now you have the <strong>Poké Flute</strong>!</p>
          <p class="story-text">Raise it to your lips and play the melody. The Snorlax jolts awake — and it looks ready for a fight!</p>`,
        okLabel: "Play the Poké Flute!",
        onOk: () => {
          startTrainerBattle("lavender-snorlax", { forceManual: true });
          openMainTab("battle");
        },
      });
      return;
    }
    if (res.event === "fuchsia-arrival") {
      showPopup({
        title: "🏘️ Fuchsia City",
        body: `<p class="story-text">Fuchsia City rests among rolling southern hills, gateway to the sprawling <strong>Safari Zone</strong> and its rare, exotic Pokémon.</p>
          <p class="story-text">In the shadows of the <strong>Fuchsia Gym</strong>, the ninja master <strong>Koga</strong> waits with his Poison-types — defeat him for the <strong>Soul Badge</strong>.</p>
          <p class="placeholder">Next to the Safari Zone lives its <strong>Warden</strong> — but he's lost something and can barely speak. Open the <strong>City</strong> tab to look around.</p>`,
        okLabel: "Explore Fuchsia",
      });
      return;
    }
    if (res.event === "safari-arrival") {
      showPopup({
        title: "🦓 Safari Zone",
        body: `<p class="story-text">You reach the gate of the vast <strong>Safari Zone</strong> — home to Pokémon you'll find nowhere else, from <strong>Chansey</strong> and <strong>Kangaskhan</strong> to <strong>Scyther</strong>, <strong>Pinsir</strong> and <strong>Tauros</strong>.</p>
          <p class="story-text">Here you don't battle — you go on an <strong>expedition</strong>. Pay the entrance fee for a fixed number of <strong>steps</strong> and <strong>Safari Balls</strong>, then use <strong>Bait</strong> and <strong>Rocks</strong> to catch the wary wild Pokémon before they flee.</p>
          <p class="placeholder">Press deeper through four areas to reach the rarest Pokémon — the <strong>Gold Teeth</strong> and the fabled <strong>HM03 Surf</strong> in the Secret House await those who go far enough. Open the <strong>Safari</strong> tab to begin.</p>`,
        okLabel: "Let's go!",
      });
      return;
    }
    if (res.event === "route-19-arrival") {
      showPopup({
        title: "🌊 Route 19",
        body: `<p class="story-text">You send out a Pokémon that knows <strong>Surf</strong> and glide out onto the open sea south of Fuchsia. Salt spray stings your face as the waves carry you onward.</p>
          <p class="placeholder">This southern seaway leads through the <strong>Seafoam Islands</strong> and on to <strong>Cinnabar Island</strong>. Wild Water-types patrol the waves — keep moving south.</p>`,
        okLabel: "Surf on!",
      });
      return;
    }
    if (res.event === "seafoam-arrival") {
      // Věrný Kanto (Krok 9): jednorázový flavour při prvním příchodu. Legendární
      // Articuno má vlastní tab „Legendary" (odemkne se po Strength) – na ten jen
      // upozorníme, žádný opakovaný encounter popup (viz legendaryView).
      showPopup({
        title: "🧊 Seafoam Islands",
        body: `<p class="story-text">A chain of icy, mist-shrouded islands rises from the sea. Deep in their caves, sea currents roar and rare Ice- and Water-types make their home.</p>
          <p class="story-text">Old sailors whisper that a <strong>legendary bird of ice</strong> roosts deep within — but the way to it is blocked by great boulders only <strong>Strength</strong> can shift.</p>
          <p class="placeholder">If you can move those boulders, a <strong>Legendary</strong> tab will appear here. Otherwise keep surfing south — <strong>Cinnabar Island</strong> lies just beyond.</p>`,
        okLabel: "Press on",
      });
      return;
    }
    if (res.event === "cinnabar-arrival") {
      showPopup({
        title: "🌋 Cinnabar Island",
        body: `<p class="story-text">You land on <strong>Cinnabar Island</strong>, a volcanic isle of black sand and warm sea air. A research <strong>Pokémon Lab</strong> hums with activity — and up the road looms a burnt-out <strong>Pokémon Mansion</strong>, its charred windows hiding old secrets.</p>
          <p class="story-text">The <strong>Cinnabar Gym</strong> stands locked tight. Its Leader, the fiery quizmaster <strong>Blaine</strong>, guards the <strong>Volcano Badge</strong>.</p>
          <p class="placeholder">The Gym door needs a <strong>Secret Key</strong> — search the ruined Mansion in the <strong>City</strong> tab to find it.</p>`,
        okLabel: "Explore Cinnabar",
      });
      return;
    }
    if (res.event === "victory-road-arrival") {
      showPopup({
        title: "🪨 Victory Road",
        body: `<p class="story-text">A vast, echoing cave rears up before the Indigo Plateau. Only trainers with all <strong>8 badges</strong> may set foot here — <strong>Victory Road</strong>, the final gauntlet of the wild.</p>
          <p class="story-text">Powerful Pokémon lurk in the dark, and huge boulders block the way — shove them aside with <strong>Strength</strong> to find the path (and the switches) through.</p>
          <p class="placeholder">Deep inside roosts the legendary <strong>Moltres</strong> — if you can reach it, a <strong>Legendary</strong> tab will appear here.</p>`,
        okLabel: "Press on",
      });
      return;
    }
    if (res.event === "indigo-arrival") {
      showPopup({
        title: "🏆 Indigo Plateau",
        body: `<p class="story-text">You emerge from Victory Road into the crisp air of the <strong>Indigo Plateau</strong>. The grand Pokémon League building rises ahead — the end of every trainer's road.</p>
          <p class="story-text">Inside wait the <strong>Elite Four</strong> — Lorelei, Bruno, Agatha and Lance — and beyond them, the reigning <strong>Champion</strong>. You must beat all five <strong>one after another</strong>, with <strong>no healing at the Poké Center</strong> in between. Only the Potions and Revives in your <strong>Bag</strong> can save you — and if you fall, you start again from the first.</p>
          <p class="placeholder">Stock up, build your best team, then open the <strong>League</strong> tab when you're ready.</p>`,
        okLabel: "I'm ready",
      });
      return;
    }
    if (res.event === "cerulean-cave-arrival") {
      showPopup({
        title: "🌀 Cerulean Cave",
        body: `<p class="story-text">With the League conquered and Kanto at peace, a forbidden door swings open. On an islet off Cerulean City yawns the mouth of <strong>Cerulean Cave</strong> — a place the Gym Leaders warned even Champions to avoid.</p>
          <p class="story-text">Deep in its flooded depths sleeps <strong>Mewtwo</strong>, a Pokémon born of forbidden science in the ruins of the Pokémon Mansion — the most powerful creature Kanto has ever known.</p>
          <p class="placeholder">Only a true Champion may enter. Bring your strongest team — and perhaps the <strong>Master Ball</strong> you claimed at Silph Co. If you can subdue it, a <strong>Legendary</strong> tab will appear here.</p>`,
        okLabel: "Enter the depths",
      });
      return;
    }
    // Běžný přesun – jen krátká informační hláška (žádný příběh).
    flash(
      info,
      area.type === "city"
        ? `🏙️ ${area.name} — visit its buildings in the City tab.`
        : `📍 Now battling at ${area.name}.`
    );
  });

  // Živá aktualizace stavu (aktivní/odemčeno + pozice) bez přepisu obrázku.
  updateStates(root);
  if (unsub) unsub();
  unsub = bus.on(EVENTS.STATE_CHANGED, () => updateStates(root));
}

/**
 * Zpracuje zisk fosílií z Mt. Moon: uloží všechny tři itemy a potvrdí popupem.
 * (Cíl „celý dex na 1 průchod" → žádná nevratná volba, hráč dostane vše.)
 */
function pickFossil() {
  applyFossilChoice();
  showPopup({
    title: "🦴 Fossils Obtained",
    body: `<p class="story-text">You carefully pack the <strong>Helix Fossil</strong>, <strong>Dome Fossil</strong> and <strong>Old Amber</strong> into your bag.</p>
      <p class="placeholder">The Museum of Science in Pewter City can revive them into <strong>Omanyte</strong>, <strong>Kabuto</strong> and <strong>Aerodactyl</strong>.</p>`,
    okLabel: "Nice!",
  });
}

/* ---------- DEV-PLACEMENT-START (celý blok lze při releasu smazat) ---------- */

/** Lišta režimu umístění: čipy uzlů + instrukce + výpis pozic. */
function editPanelHtml() {
  const chips = AREAS.map((a) => {
    const placed = !!getState().mapPositions?.[a.id];
    const active = a.id === editTarget;
    return `<button class="map-chip ${active ? "active" : ""} ${placed ? "placed" : ""}"
              data-pick="${a.id}">${placed ? "✓ " : ""}${a.name}</button>`;
  }).join("");
  return `
    <div class="map-edit">
      <p class="map-edit-hint">Pick a node (click its dot on the map or the chip below), then click the map where it belongs. Click empty space to fine-tune. Finally click <strong>📋 Position dump</strong> above and send me the dump.</p>
      <div class="map-chips">${chips}</div>
    </div>`;
}

/**
 * Vyskakovací okno s textovým výpisem pozic (nad vším → neořízne ho overflow
 * panelu mapy). Uživatel ho zkopíruje a pošle → přepíše se do data/areas.js.
 */
function openPositionsModal() {
  // Guard proti dvojímu otevření.
  if (document.querySelector(".map-pos-modal")) return;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay map-pos-modal";
  overlay.innerHTML = `
    <div class="modal map-pos-card">
      <h3 style="margin:0 0 8px">📋 Node position dump</h3>
      <p style="margin:0 0 10px;font-size:12px;opacity:0.8">Copy the whole dump and send it to me – I'll hardcode it into <code>data/areas.js</code> and it'll ship to production.</p>
      <textarea class="map-pos-dump" readonly rows="10">${positionsDump()}</textarea>
      <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end">
        <button class="btn btn-sm" data-copy>📋 Copy</button>
        <button class="btn btn-sm" data-close>Close</button>
      </div>
    </div>`;

  const close = () => {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  };
  const onKey = (e) => {
    if (e.key === "Escape") close();
  };

  const ta = overlay.querySelector(".map-pos-dump");
  overlay.querySelector("[data-copy]").addEventListener("click", (e) => {
    ta.select();
    navigator.clipboard?.writeText(ta.value).catch(() => {});
    // Fallback pro prostředí bez clipboard API: text je vybraný, jde Ctrl+C.
    try {
      document.execCommand("copy");
    } catch {}
    const b = e.currentTarget;
    b.textContent = "✓ Copied";
    setTimeout(() => (b.textContent = "📋 Copy"), 1500);
  });
  overlay.querySelector("[data-close]").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", onKey);

  document.body.appendChild(overlay);
  ta.focus();
  ta.select();
}

/** Textový výpis aktuálních pozic (pro přepis do data/areas.js). */
function positionsDump() {
  return AREAS.map((a) => {
    const p = posOf(a);
    return `${a.id}: x: ${p.x}, y: ${p.y}`;
  }).join("\n");
}

/** První uzel bez naklikané pozice (jinak první uzel). */
function firstUnplaced() {
  const mp = getState().mapPositions ?? {};
  return (AREAS.find((a) => !mp[a.id]) ?? AREAS[0]).id;
}

/* ---------- DEV-PLACEMENT-END ---------- */

/** Přepočítá stavové třídy + pozice markerů a popisek aktivní oblasti. */
function updateStates(root) {
  if (!root.isConnected) return;
  const activeId = getActiveAreaId();
  const visited = visitedAreas();
  const badges = earnedBadges();
  const beaten = defeatedTrainers();
  const story = storyFlags();
  const reveal = devReveal();
  for (const btn of root.querySelectorAll(".map-node")) {
    const area = getArea(btn.dataset.area);
    if (!area) continue;
    const unlocked = isAreaUnlocked(area, visited, badges, beaten, story);
    // Hráč vidí jen odemčené; zamčené se skryjí (mimo edit režim a dev „reveal").
    const visible = unlocked || editMode || reveal;
    const p = posOf(area);
    btn.style.left = `${p.x}%`;
    btn.style.top = `${p.y}%`;
    btn.disabled = !unlocked && !editMode;
    btn.classList.toggle("is-hidden", !visible);
    btn.classList.toggle("is-locked", !unlocked);
    btn.classList.toggle("is-active", area.id === activeId);
    btn.classList.toggle("is-target", editMode && area.id === editTarget);
    btn.classList.toggle("type-city", area.type === "city");
    btn.classList.toggle("type-route", area.type !== "city");
  }
  const info = root.querySelector(".map-info");
  if (info && !info.dataset.flashing) {
    const active = getArea(activeId);
    if (active) info.textContent = `Current location: ${active.name}`;
  }
}

/** Krátká dočasná hláška v info řádku (po chvíli se vrátí na aktuální lokaci). */
function flash(info, msg) {
  if (!info) return;
  info.textContent = msg;
  info.dataset.flashing = "1";
  clearTimeout(flash._t);
  flash._t = setTimeout(() => {
    delete info.dataset.flashing;
    const active = getArea(getActiveAreaId());
    if (active) info.textContent = `Current location: ${active.name}`;
  }, 2500);
}
