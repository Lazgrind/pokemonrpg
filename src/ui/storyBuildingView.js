/**
 * storyBuildingView.js – příběhová (interakční) okna městských budov.
 *
 * Na rozdíl od idle budov (buildingView.js – upgrady za gold) tyhle budovy
 * nemají level: klik otevře jednorázovou/flavour interakci věrnou hře. Zatím
 * Pallet Town: Oak's Lab (starter + Pokédex), Tvůj domov (dárek od mámy),
 * Rivalův dům (flavour). Další města přibudou v dalších krocích příběhu.
 *
 * Jednorázové eventy si značíme do `state.story` (mapa flag → true), ať se
 * dárek nedá vzít dvakrát a přežije to refresh/save.
 */

import { getState, commit } from "../core/state.js";
import { openMainTab } from "./mainPanel.js";
import { openStarterModal } from "./starterModal.js";
import { getStarterSpeciesId, acquirePokemon, ownsSpecies } from "../systems/team.js";
import { healTeam, teamNeedsHeal, startTrainerBattle, giftLevel, tradePokemon, startStaticEncounter } from "../systems/battleSystem.js";
import { createPokemon } from "../systems/pokemonSystem.js";
import { getSpecies } from "../../data/pokemon.js";
import { showPopup } from "./popup.js";

/** Kolik Potionů dá máma (jednorázově). Poké Bally už hráč má ve startu. */
const MOM_POTIONS = 5;

/** Je otevřené story okno? (jen jedno naráz) */
let open = false;

/** Vrátí jméno rivala z tohoto playthrough (fallback, když ho hráč nezadal). */
function rivalName() {
  return getState().player?.rivalName?.trim() || "your rival";
}

/** Přečte story-flag. */
function storyFlag(key) {
  return !!getState().story?.[key];
}

/** Zapíše story-flag (lazy init kontejneru). */
function setStoryFlag(key) {
  const s = getState();
  if (!s.story) s.story = {};
  s.story[key] = true;
}

/**
 * Otevře příběhové okno budovy podle story-klíče.
 * @param {string} storyKey  "oak-lab" | "player-home" | "rival-home"
 * @param {(msg: string) => void} [onStatus]
 */
export function openStoryBuilding(storyKey, onStatus = () => {}) {
  if (open) return;
  open = true;

  if (storyKey === "game-corner") lastSpin = null; // čerstvý automat při každém otevření

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    open = false;
  };

  // Klik mimo obsah = zavřít (story okna nejsou povinná).
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  // Vykreslení + napojení; některé akce překreslí (např. po vzetí dárku).
  const render = () => {
    const view = VIEWS[storyKey] ?? unknownView;
    const { title, body } = view();
    overlay.innerHTML = `
      <div class="modal story-modal">
        <button class="modal-close" data-close aria-label="Close">✕</button>
        <h2 class="panel-title">${title}</h2>
        ${body}
      </div>
    `;
    overlay.querySelector("[data-close]")?.addEventListener("click", close);
    wire(storyKey, overlay, onStatus, render, close);
  };

  render();
}

/* ------------------------------- Pohledy --------------------------------- */

const VIEWS = {
  "oak-lab": oakLabView,
  "player-home": playerHomeView,
  "rival-home": rivalHomeView,
  "pewter-museum": pewterMuseumView,
  "ss-anne": ssAnneView,
  "pokemon-tower": pokemonTowerView,
  "mr-fuji-house": mrFujiHouseView,
  "dept-store": deptStoreView,
  "game-corner": gameCornerView,
  "warden-house": wardenHouseView,
  "pokemon-mansion": pokemonMansionView,
  "pokemon-lab": pokemonLabView,
  "silph-co": silphCoView,
  "celadon-mansion": celadonMansionView,
  "fighting-dojo": fightingDojoView,
  "viridian-trade-house": () => tradeHouseView("viridian-trade-house"),
  "cerulean-trade-house": () => tradeHouseView("cerulean-trade-house"),
  "vermilion-trade-house": () => tradeHouseView("vermilion-trade-house"),
};

/** Cena Fresh Water v Celadon Dept Store (drink pro strážce Silph Co). */
const DRINK_COST = 200;

/** Level oživené fosílie (Omanyte/Kabuto) v Museum of Science. */
const FOSSIL_REVIVE_LEVEL = 20;

/**
 * Kanonické městské výměny (in-game trades) – domky ve městech. Dej `want` druh,
 * dostaneš `give` na STEJNÉ úrovni (řeší tradePokemon). Klíč = story budovy.
 */
const CITY_TRADES = {
  "viridian-trade-house": {
    want: "abra", wantName: "Abra", giveId: "mr-mime", giveName: "Mr. Mime", flag: "mrMimeGift",
    intro: `A collector in this cramped Viridian house is obsessed with psychic Pokémon. "Tell you what," he says, eyes gleaming, "I'll trade you my <strong>Mr. Mime</strong> for an <strong>Abra</strong>. Deal?"`,
  },
  "cerulean-trade-house": {
    want: "poliwhirl", wantName: "Poliwhirl", giveId: "jynx", giveName: "Jynx", flag: "jynxGift",
    intro: `Inside this tidy Cerulean home, a woman dotes on a graceful <strong>Jynx</strong>. "I've always dreamed of a <strong>Poliwhirl</strong>," she sighs. "Trade me one and Jynx is yours!"`,
  },
  "vermilion-trade-house": {
    want: "spearow", wantName: "Spearow", giveId: "farfetchd", giveName: "Farfetch'd", flag: "farfetchdGift",
    intro: `A weathered sailor in this Vermilion house grips a leek-wielding <strong>Farfetch'd</strong>. "Bring me a feisty <strong>Spearow</strong>," he grins, "and this Farfetch'd is yours — trade's a trade!"`,
  },
};

/* ----------------------- Game Corner (Krok 13) ------------------------ */
// Kanonická Celadon herna. Odemyká se po vyčištění Rocket Hideoutu
// (rocketHideoutCleared) – z Rockety provozované herny je zase obyčejná herna.
// Tři služby: automat (slots) na coiny, směnárna coinů za gold a prize corner,
// kde se coiny mění za vzácné Pokémony (hlavně PORYGON – jinde v Gen 1
// nezískatelný). Coiny žijí v state.resources.coins.

/** Kolik coinů stojí jedno roztočení. */
const SLOT_BET = 3;

/** Válce automatu: symbol + váha (vyšší = častější). */
const SLOT_SYMBOLS = [
  { s: "🍒", w: 30 },
  { s: "🔔", w: 24 },
  { s: "🍊", w: 22 },
  { s: "⭐", w: 14 },
  { s: "🔵", w: 8 },
  { s: "7️⃣", w: 4 },
];

/** Výplaty za tři shodné symboly (coiny). */
const SLOT_TRIPLES = {
  "7️⃣": 300,
  "🔵": 60,
  "⭐": 30,
  "🍊": 12,
  "🔔": 10,
  "🍒": 8,
};

/** Směnárna: balíčky coinů za gold (kanon ~ 50 coinů / 1000₽). */
const COIN_PACKS = [
  { coins: 50, gold: 1000 },
  { coins: 500, gold: 10000 },
];

/** Prize corner: vzácní Pokémoni za coiny (level škálovaný dle týmu). */
const GAME_CORNER_PRIZES = [
  { id: "abra", cost: 180 },
  { id: "clefairy", cost: 500 },
  { id: "vulpix", cost: 1000 },
  { id: "pinsir", cost: 2500 },
  { id: "dratini", cost: 2800 },
  { id: "scyther", cost: 5500 },
  { id: "porygon", cost: 9999 },
];

/** Poslední roztočení automatu (drží se pro překreslení okna). */
let lastSpin = null;

/** Náhodný symbol válce dle vah. */
function rollReel() {
  const total = SLOT_SYMBOLS.reduce((a, x) => a + x.w, 0);
  let r = Math.random() * total;
  for (const x of SLOT_SYMBOLS) {
    r -= x.w;
    if (r < 0) return x.s;
  }
  return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1].s;
}

/** Výplata (coiny) za tři válce: tři shodné dle tabulky, jinak bonus za třešně. */
function slotPayout([a, b, c]) {
  if (a === b && b === c) return SLOT_TRIPLES[a] ?? 0;
  const cherries = [a, b, c].filter((x) => x === "🍒").length;
  if (cherries === 2) return 4;
  if (cherries === 1) return 1;
  return 0;
}

/** Fosílie → oživený druh (data/items.js special item id → speciesId). */
const FOSSIL_TO_SPECIES = {
  "helix-fossil": "omanyte",
  "dome-fossil": "kabuto",
  "old-amber": "aerodactyl",
};

/** Poké Bally jako odměna za doručení Oak's Parcel (věrné kánonu). */
const PARCEL_BALLS = 5;

/** Jednorázová odměna za první návštěvu Musea of Science (Pewter). */
const MUSEUM_POTIONS = 3;

function oakLabView() {
  const starterId = getStarterSpeciesId();
  const hasStarter = getState().collection.length > 0 && starterId;
  const starterName = hasStarter ? getSpecies(starterId)?.name ?? starterId : null;

  // Oak's Parcel má přednost: máš balíček a ještě jsi ho nedoručil.
  const parcelPending = storyFlag("oakParcelGiven") && !storyFlag("oakParcelDelivered");
  if (parcelPending) {
    return {
      title: "🔬 Oak's Lab",
      body: `
        <p class="story-text">Professor Oak: "Ah, that's my Parcel from the Poké Mart! You brought it all the way from Viridian? Thank you!"</p>
        <p class="story-text">"Here — take these to help you catch more Pokémon. The road north through Viridian is open to you now."</p>
        <button class="btn" data-deliver-parcel>📦 Hand over Oak's Parcel (get ${PARCEL_BALLS}× Poké Ball)</button>
      `,
    };
  }

  const action = hasStarter
    ? `<p class="story-text">"So, how's your <strong>${starterName}</strong> doing? Remember, the Pokédex is your faithful companion on the road."</p>
       <button class="btn" data-open-pokedex>📕 Open Pokédex</button>`
    : `<p class="story-text">"Welcome! Choose your very first partner."</p>
       <button class="btn" data-choose-starter>Choose your starter</button>`;

  return {
    title: "🔬 Oak's Lab",
    body: `
      <p class="story-text">Professor Oak looks up from his research.</p>
      ${action}
    `,
  };
}

function playerHomeView() {
  const taken = storyFlag("momGift");
  const gift = taken
    ? `<p class="story-text">Mom: "Take good care of yourself out there!"</p>
       <p class="placeholder">✓ You've already taken Mom's gift.</p>`
    : `<p class="story-text">Mom: "Don't forget to take these — they'll come in handy on your journey!"</p>
       <button class="btn" data-take-gift>Take gift (${MOM_POTIONS}× Potion)</button>`;

  // Máma tě vždycky zadarmo doléčí – pojistka proti soft-locku (Pallet nemá Poké Center).
  const needsHeal = teamNeedsHeal();
  const rest = needsHeal
    ? `<button class="btn" data-rest>🛏️ Rest at home (heal team)</button>`
    : `<p class="placeholder">✓ Your team is fully rested.</p>`;

  return {
    title: "🏠 Your Home",
    body: `${gift}<hr class="story-sep">${rest}`,
  };
}

function rivalHomeView() {
  return {
    title: "🏡 Rival's Home",
    body: `<p class="story-text">The house where <strong>${rivalName()}</strong> lives. Nobody's home right now — they've probably already set off on their own journey.</p>`,
  };
}

function pewterMuseumView() {
  const claimed = storyFlag("pewterMuseumReward");
  const reward = claimed
    ? `<p class="story-text">The scientist smiles. "Come back any time — science never sleeps!"</p>
       <p class="placeholder">✓ You've already received the museum's welcome gift.</p>`
    : `<p class="story-text">A scientist greets you warmly. "A new trainer! Take these on the house — travelers should always be prepared."</p>
       <button class="btn" data-museum-reward>🎁 Accept welcome gift (${MUSEUM_POTIONS}× Potion)</button>`;

  // Oživení fosílií: kdo drží Helix/Dome fosílii, může ji tu nechat oživit na
  // Omanyte/Kabuto (fosílie se spotřebuje). Věrné duchu hry (revival lab).
  const items = getState().resources?.items ?? {};
  const revivable = Object.keys(FOSSIL_TO_SPECIES).filter((id) => (items[id] ?? 0) > 0);
  let fossilSection = "";
  if (revivable.length) {
    const buttons = revivable
      .map((id) => {
        const species = getSpecies(FOSSIL_TO_SPECIES[id])?.name ?? FOSSIL_TO_SPECIES[id];
        const fname = id === "dome-fossil" ? "Dome Fossil" : id === "old-amber" ? "Old Amber" : "Helix Fossil";
        return `<button class="btn" data-revive-fossil="${id}">🧬 Revive ${fname} → ${species}</button>`;
      })
      .join("");
    fossilSection = `<hr class="story-sep">
      <p class="story-text">The lead scientist eyes your bag. "Is that a <strong>fossil</strong>? Our machine can bring it back to life — would you like me to try?"</p>
      ${buttons}`;
  }

  return {
    title: "🏛️ Museum of Science",
    body: `<p class="story-text">Inside, glass cases display ancient <strong>fossils</strong>, a glittering <strong>Moon Stone</strong>, and — up on the second floor — a real piece of a <strong>space rocket</strong>.</p>
      <hr class="story-sep">
      ${reward}
      ${fossilSection}`,
  };
}

function ssAnneView() {
  if (storyFlag("ssAnneCleared")) {
    // Tajemství „Mew pod náklaďákem" (kanonická Gen 1 legenda). Až loď odpluje,
    // u vzdáleného doku zbude opuštěný náklaďák. Dosáhneš k němu jen se Surf a
    // odsuneš ho jen se Strength – teprve pak se ukáže Mew. Chytatelný legendary,
    // vrací se dokud ho nechytíš (řízeno ownsSpecies), takže žádný trvalý zámek.
    const st = getState().story ?? {};
    const canReachTruck = st.hasSurf && st.hasStrength;
    const hasMew = ownsSpecies("mew");
    let secret = "";
    if (hasMew) {
      secret = `<p class="placeholder">✓ You uncovered the legend beneath the lone truck by the docks…</p>`;
    } else if (canReachTruck) {
      secret = `<p class="story-text">Now that the liner has sailed, a <strong>lone truck</strong> sits abandoned on the far dock, out across the water. An old sailor mutters that something stirs beneath it — "if you're strong enough to shove it aside…"</p>
        <button class="btn" data-mew-truck>🚚 Surf out and heave the truck aside</button>`;
    }
    return {
      title: "🚢 S.S. Anne",
      body: `<p class="story-text">The great liner's horn has long since faded — the S.S. Anne has sailed on.</p>
        <p class="placeholder">✓ You've already explored the S.S. Anne and earned HM01 Cut.</p>
        ${secret}`,
    };
  }
  const items = getState().resources?.items ?? {};
  const hasTicket = (items["ss-anne-ticket"] ?? 0) > 0;
  if (!hasTicket) {
    return {
      title: "🚢 S.S. Anne",
      body: `<p class="story-text">A sailor blocks the gangway. "No ticket, no boarding! This is a luxury cruise, you know."</p>
        <p class="placeholder">Find <strong>Bill</strong> at the end of <strong>Route 25</strong> (north of Cerulean) — he'll give you a S.S. Anne Ticket.</p>`,
    };
  }
  return {
    title: "🚢 S.S. Anne",
    body: `<p class="story-text">You show your ticket and step aboard the luxurious S.S. Anne. Wandering the decks, you run straight into <strong>${rivalName()}</strong>!</p>
      <p class="story-text">"Hey! You're too weak to be here. Let's battle!"</p>
      <button class="btn" data-ss-anne-battle>⚔️ Battle ${rivalName()}</button>`,
  };
}

function pokemonTowerView() {
  // Věrný Kanto (Krok 7): stavový automat věže.
  //  1) bez Silph Scope → ducha nejde identifikovat (navedení na Celadon).
  //  2) se Scope, dokud Marowak není uklidněná → souboj s duchem Marowak.
  //  3) po Marowak, dokud není Mr. Fuji zachráněn → osvobodíš ho (Poké Flute).
  //  4) hotovo → klidná věž.
  const hasScope = storyFlag("hasSilphScope");
  const marowakCalmed = storyFlag("marowakCalmed");
  const mrFujiSaved = storyFlag("mrFujiSaved");

  if (!hasScope) {
    return {
      title: "🗼 Pokémon Tower",
      body: `<p class="story-text">You climb the tower's steps, past mourners and rows of graves for Pokémon that have passed on.</p>
        <p class="story-text">On the stairs, a furious <strong>ghost</strong> lunges at you — but you can't make out what it is!</p>
        <p class="placeholder">You'll need the <strong>Silph Scope</strong> to see the ghost clearly. Team Rocket is said to keep one at their hideout in <strong>Celadon City</strong> — come back once you have it.</p>`,
    };
  }
  if (!marowakCalmed) {
    return {
      title: "🗼 Pokémon Tower",
      body: `<p class="story-text">You raise the <strong>Silph Scope</strong> to your eye and the ghost snaps into focus: the raging spirit of a <strong>Marowak</strong>, cut down by Team Rocket while defending her child.</p>
        <p class="story-text">She won't rest until she's tested your strength. There's no way past but through.</p>
        <button class="btn" data-fight-marowak>👻 Face the Marowak's spirit</button>`,
    };
  }
  if (!mrFujiSaved) {
    return {
      title: "🗼 Pokémon Tower",
      body: `<p class="story-text">With the spirit at peace, you climb to the top floor — where Team Rocket grunts are holding old <strong>Mr. Fuji</strong> captive.</p>
        <p class="story-text">You drive the Rockets off and free him. Grateful, Mr. Fuji presses a gift into your hands…</p>
        <button class="btn" data-rescue-fuji>🎵 Free Mr. Fuji (receive the Poké Flute)</button>`,
    };
  }
  return {
    title: "🗼 Pokémon Tower",
    body: `<p class="story-text">The tower is quiet now. The spirits rest peacefully, and Mr. Fuji has returned safely home.</p>
      <p class="placeholder">✓ You calmed the Marowak, rescued Mr. Fuji, and received the <strong>Poké Flute</strong>.</p>`,
  };
}

function mrFujiHouseView() {
  // Po záchraně (mrFujiSaved) je Mr. Fuji doma a navede tě na spícího Snorlaxe.
  if (storyFlag("mrFujiSaved")) {
    return {
      title: "🏡 Mr. Fuji's House",
      body: `<p class="story-text"><strong>Mr. Fuji</strong> is home safe, tending to a room full of orphaned Pokémon. "Thank you for saving me from those Rockets, young trainer."</p>
        <p class="story-text">"That <strong>Poké Flute</strong> I gave you can wake any sleeping Pokémon — even that huge <strong>Snorlax</strong> snoring across <strong>Route 12</strong>, just south of here."</p>
        <p class="placeholder">✓ Head to Route 12 and play the Poké Flute to clear the road south.</p>`,
    };
  }
  return {
    title: "🏡 Mr. Fuji's House",
    body: `<p class="story-text">Inside, a volunteer tends to a room full of orphaned Pokémon.</p>
      <p class="story-text">"You're looking for <strong>Mr. Fuji</strong>? I'm afraid he went into the <strong>Pokémon Tower</strong> to calm the restless spirits — and he hasn't come back. I'm so worried…"</p>
      <p class="placeholder">Something isn't right at the top of the tower.</p>`,
  };
}

function deptStoreView() {
  // Věrný Kanto (Krok 11): Celadon Dept Store – rooftop drink stand prodává Fresh
  // Water, kterým napojíš vyčerpaného strážce u Silph Co v Saffronu. Zbytek nákupu
  // je zatím flavour (plný nákup přijde později).
  const gold = getState().resources?.gold ?? 0;
  const owned = getState().resources?.items?.["fresh-water"] ?? 0;
  return {
    title: "🏬 Celadon Dept. Store",
    body: `<p class="story-text">The biggest store in Kanto rises floor after floor — Poké Balls, healing items, TMs, and a rooftop drink stand, the works.</p>
      <p class="story-text">At the rooftop vending machine you can buy a <strong>Fresh Water</strong> for <strong>${DRINK_COST}₽</strong>. A thirsty guard over in Saffron City would surely appreciate one.</p>
      ${owned > 0 ? `<p class="placeholder">In your Bag: <strong>${owned}× Fresh Water</strong>.</p>` : ""}
      <button class="btn" data-buy-drink ${gold < DRINK_COST ? "disabled" : ""}>🥤 Buy Fresh Water — ${DRINK_COST}₽</button>
      <p class="placeholder">(Full department-store shopping will open up in a later update. For now, stock up at the Poké Mart.)</p>`,
  };
}

function silphCoView() {
  // Věrný Kanto (Krok 11): Team Rocket zabral Silph Co. Stavový automat:
  //  1) strážce žízní → přines Fresh Water (koupíš v Celadon Dept Store);
  //  2) po napojení (saffronGuardsCleared) → gauntlet v tabu „Silph Co.";
  //  3) po vyčištění (silphCleared) → flavour (Master Ball + Sabrina otevřena).
  if (storyFlag("silphCleared")) {
    const gotLapras = storyFlag("laprasGift");
    return {
      title: "🏢 Silph Co.",
      body: `<p class="story-text">The tower hums with ordinary business again. Employees nod at you as you pass — the trainer who threw Team Rocket out on their ear.</p>
        <p class="placeholder">✓ You freed Silph Co., received the <strong>Master Ball</strong>, and reopened Sabrina's Gym.</p>
        ${gotLapras
          ? `<p class="placeholder">✓ A grateful Silph Co. employee gave you a <strong>Lapras</strong>.</p>`
          : `<p class="story-text">A grateful Silph Co. employee hurries over. "You saved us all! Please, take this — I raised it myself." She holds out a Poké Ball containing a <strong>Lapras</strong>!</p>
             <button class="btn" data-take-lapras>🌊 Accept the Lapras</button>`}`,
    };
  }
  if (storyFlag("saffronGuardsCleared")) {
    return {
      title: "🏢 Silph Co.",
      body: `<p class="story-text">The revived guard waves you through. "Thanks, kid — now go get 'em. The Rockets have every floor above locked down, all the way up to their boss. Watch yourself."</p>
        <button class="btn" data-enter-silph>🏢 Storm Silph Co. (Silph Co. tab)</button>`,
    };
  }
  const items = getState().resources?.items ?? {};
  const hasDrink = (items["fresh-water"] ?? 0) > 0;
  if (hasDrink) {
    return {
      title: "🏢 Silph Co.",
      body: `<p class="story-text">A parched Silph Co. guard slumps against the locked doors, blocking the way. "Can't... let you... in... so thirsty in this heat..." You hold up the <strong>Fresh Water</strong> you bought in Celadon.</p>
        <button class="btn" data-give-drink>🥤 Give the guard a drink</button>`,
    };
  }
  return {
    title: "🏢 Silph Co.",
    body: `<p class="story-text">Team Rocket has seized <strong>Silph Co.</strong>, Saffron's proud technology company. A parched guard slumps against the locked doors: "So... thirsty... can't guard like this... if only someone had something to drink..."</p>
      <p class="placeholder">Buy a <strong>Fresh Water</strong> from the <strong>Celadon Dept. Store</strong> rooftop stand, then bring it back here to get inside.</p>`,
  };
}

function celadonMansionView() {
  // Věrný Kanto (Krok 12): v Celadon Mansion dá herní nadšenec hráči Eevee.
  if (storyFlag("eeveeGift")) {
    return {
      title: "🏨 Celadon Mansion",
      body: `<p class="story-text">The game-loving kid on the top floor grins as you pass. "How's that Eevee doing? Evolve it into something awesome!"</p>
        <p class="placeholder">✓ You received an <strong>Eevee</strong> here.</p>`,
    };
  }
  return {
    title: "🏨 Celadon Mansion",
    body: `<p class="story-text">On the top floor of the Celadon Mansion, a game-obsessed kid looks up from his console. "Oh — a real trainer! I found this little guy but I never battle. You should have it."</p>
      <p class="placeholder">He offers you an <strong>Eevee</strong> — the Evolution Pokémon, able to become Vaporeon, Jolteon or Flareon.</p>
      <button class="btn" data-take-eevee>🦊 Accept the Eevee</button>`,
  };
}

function fightingDojoView() {
  // Věrný Kanto (Krok 12): Fighting Dojo v Saffronu. V kánonu si vybíráš JEDNOHO
  // Hitmona – my (cíl „celý dex na 1 průchod") dáváme OBA.
  if (storyFlag("hitmonsGift")) {
    return {
      title: "🥋 Fighting Dojo",
      body: `<p class="story-text">The Dojo master bows respectfully as you enter. "Your fists — and your Pokémon — are strong. Train them well."</p>
        <p class="placeholder">✓ You received both <strong>Hitmonlee</strong> and <strong>Hitmonchan</strong> here.</p>`,
    };
  }
  return {
    title: "🥋 Fighting Dojo",
    body: `<p class="story-text">Saffron's <strong>Fighting Dojo</strong> echoes with shouts and the crack of splitting boards. The Dojo master sizes you up, then nods at two Poké Balls resting on a rack. "A true champion deserves them both. Take my prized <strong>Hitmonlee</strong> and <strong>Hitmonchan</strong>!"</p>
      <button class="btn" data-take-hitmons>🥋 Accept both Pokémon</button>`,
  };
}

function tradeHouseView(storyKey) {
  // Věrný Kanto (Krok 12): kanonická městská výměna. Tlačítko se nabídne jen když
  // hráč požadovaný druh vlastní; jinak navede, ať ho chytí a vrátí se.
  const t = CITY_TRADES[storyKey];
  if (!t) return unknownView();
  if (storyFlag(t.flag)) {
    return {
      title: "🏠 Trade House",
      body: `<p class="story-text">The trader beams. "That <strong>${t.giveName}</strong> treating you right? Best trade I ever made!"</p>
        <p class="placeholder">✓ You traded your ${t.wantName} for ${t.giveName} here.</p>`,
    };
  }
  const owns = ownsSpecies(t.want);
  return {
    title: "🏠 Trade House",
    body: `<p class="story-text">${t.intro}</p>
      ${owns
        ? `<p class="placeholder">You have a <strong>${t.wantName}</strong> to trade. It'll come back to you as a <strong>${t.giveName}</strong> at the same level.</p>
           <button class="btn" data-trade="${storyKey}">🔄 Trade ${t.wantName} for ${t.giveName}</button>`
        : `<p class="placeholder">You don't have a <strong>${t.wantName}</strong> right now. Catch one and come back to make the trade.</p>`}`,
  };
}

function gameCornerView() {
  // Věrný Kanto: za automaty Game Corneru se skrývá vchod do Rocket Hideoutu.
  // Před vyčištěním navede hráče do „Team Rocket" tabu; PO vyčištění (Krok 13)
  // je z herny plnohodnotná herna: automat + směnárna + prize corner.
  if (storyFlag("rocketHideoutCleared")) {
    const coins = getState().resources?.coins ?? 0;
    const gold = getState().resources?.gold ?? 0;
    const reels = lastSpin ? lastSpin.reels.join(" ") : "❔ ❔ ❔";
    const spinMsg = lastSpin
      ? (lastSpin.payout > 0
          ? `<span class="gc-win">🎉 You won ${lastSpin.payout} coins!</span>`
          : `<span class="gc-lose">No match — spin again!</span>`)
      : `Insert ${SLOT_BET} coins and pull the lever!`;

    return {
      title: "🎰 Game Corner",
      body: `
        <p class="story-text">With Team Rocket gone, the Celadon Game Corner is an honest — and very loud — arcade again. Coins jingle everywhere.</p>
        <p class="gc-balance">🪙 Coins: <strong>${coins}</strong> &nbsp;·&nbsp; 💰 Money: <strong>${gold}₽</strong></p>

        <h3 class="gc-h">🎰 Slot Machine <span class="gc-sub">(${SLOT_BET} coins / spin)</span></h3>
        <div class="gc-reels">${reels}</div>
        <p class="gc-spinmsg">${spinMsg}</p>
        <button class="btn" data-slot-spin ${coins < SLOT_BET ? "disabled" : ""}>🎰 Spin (${SLOT_BET} 🪙)</button>

        <h3 class="gc-h">💱 Coin Exchange</h3>
        <div class="gc-row">
          ${COIN_PACKS.map((p) => `<button class="btn btn-sm" data-buy-coins="${p.coins}" ${gold < p.gold ? "disabled" : ""}>Buy ${p.coins} 🪙 — ${p.gold}₽</button>`).join("")}
        </div>

        <h3 class="gc-h">🎁 Prize Corner</h3>
        <div class="gc-row gc-prizes">
          ${GAME_CORNER_PRIZES.map((pr) => {
            const name = getSpecies(pr.id)?.name ?? pr.id;
            const owned = ownsSpecies(pr.id);
            const afford = coins >= pr.cost;
            const label = owned ? "✓ Owned" : `${pr.cost} 🪙`;
            return `<button class="btn btn-sm gc-prize" data-buy-prize="${pr.id}" ${owned || !afford ? "disabled" : ""}>${name} — ${label}</button>`;
          }).join("")}
        </div>
        <p class="placeholder">The clerk winks: "That <strong>Porygon</strong> is one of a kind — you'll only ever get one here."</p>
      `,
    };
  }
  return {
    title: "🎰 Game Corner",
    body: `<p class="story-text">Slot machines chime and flash across the smoky hall. But one poster on the back wall looks oddly out of place…</p>
      <p class="story-text">You press it — and a hidden staircase slides open, leading down into a <strong>Team Rocket hideout</strong>!</p>
      <button class="btn" data-goto-rockets>💣 Descend into the Rocket Hideout</button>`,
  };
}

function wardenHouseView() {
  // Věrný Kanto (Krok 8): Warden Safari Zone ztratil své Gold Teeth a bez nich
  // nemůže srozumitelně mluvit. Přineseš-li mu je (najdeš v Safari), z vděku dá
  // HM04 Strength. Zdroj pravdy o zubech = item gold-teeth v batohu.
  if (storyFlag("wardenThanked")) {
    return {
      title: "🏡 Warden's House",
      body: `<p class="story-text">The old <strong>Warden</strong> beams a full, golden smile at you. "Thanksh — er, thanks again for my teeth, sonny!"</p>
        <p class="placeholder">✓ You returned the Gold Teeth and received <strong>HM04 Strength</strong>. Now you can shove boulders out of the way.</p>`,
    };
  }
  const items = getState().resources?.items ?? {};
  const hasTeeth = (items["gold-teeth"] ?? 0) > 0;
  if (hasTeeth) {
    return {
      title: "🏡 Warden's House",
      body: `<p class="story-text">The <strong>Warden</strong> mumbles toothlessly and points helplessly at his mouth. You hold up the <strong>Gold Teeth</strong> you found in the Safari Zone — his eyes go wide!</p>
        <button class="btn" data-return-teeth>🦷 Return the Gold Teeth</button>`,
    };
  }
  return {
    title: "🏡 Warden's House",
    body: `<p class="story-text">The <strong>Warden</strong> of the Safari Zone gums his words hopelessly — you can't make out a single thing he's trying to say.</p>
      <p class="placeholder">He's clearly lost something in the <strong>Safari Zone</strong>. Explore it thoroughly and you might turn up what he needs.</p>`,
  };
}

function pokemonMansionView() {
  // Věrný Kanto (Krok 9): vyhořelý Pokémon Mansion na Cinnabaru. Cesta ke klíči je
  // třífázová: (1) spínačový labyrint (tady, přes chained popup) → flag
  // mansionPuzzleSolved; (2) gauntlet Burglarů + boss v tabu „Mansion" → Secret Key
  // + flag hasSecretKey. Zdroj pravdy o hotovu = flag hasSecretKey.
  if (storyFlag("hasSecretKey")) {
    return {
      title: "🏚️ Pokémon Mansion",
      body: `<p class="story-text">The scorched halls stand silent at last. You cracked the shifting-wall maze, drove off the Burglars, and cleared the vault.</p>
        <p class="placeholder">✓ You solved the mansion and took the <strong>Secret Key</strong>. The Cinnabar Gym door is unlocked.</p>`,
    };
  }
  if (storyFlag("mansionPuzzleSolved")) {
    return {
      title: "🏚️ Pokémon Mansion",
      body: `<p class="story-text">You've realigned the shifting walls — the way into the inner labs stands open. But <strong>Burglars</strong> and their boss still prowl the corridors, guarding the vault that holds the <strong>Secret Key</strong>.</p>
        <p class="placeholder">Face them in the <strong>Mansion</strong> tab.</p>
        <button class="btn" data-open-mansion>🏚️ Enter the inner labs (Mansion tab)</button>`,
    };
  }
  return {
    title: "🏚️ Pokémon Mansion",
    body: `<p class="story-text">You step into the fire-gutted mansion. Charred <strong>research journals</strong> lie scattered across the floor — and the walls themselves seem to <em>shift</em>, sliding open and shut around hidden statue switches.</p>
      <p class="story-text">"…discovered <strong>Mew</strong> deep in the jungle of Guyana… gene splicing… the specimen, <strong>Mewtwo</strong>, grew far too powerful… it went on a rampage and burned this place down…"</p>
      <p class="story-text">To reach the inner labs you'll have to throw the statue switches in the right order. The journals hold the clues.</p>
      <button class="btn" data-search-mansion>🔦 Search the shifting halls</button>`,
  };
}

/**
 * Spínačový labyrint Pokémon Mansionu (Krok 9). Tři místnosti; v každé útržek
 * deníku napoví, která z pokřivených soch je ta pravá. Špatná volba spustí oblak
 * jedovatého kouře (flavour) a zopakuje místnost; správná posune dál. Po třetí
 * správné volbě → flag mansionPuzzleSolved → otevře se gauntlet v tabu „Mansion".
 *
 * Chained showPopup: každý popup je dismissible:false (labyrint neopustíš omylem),
 * volba přes `choices`. close() běží před onPick, takže lze řetězit další popup.
 * @param {(msg: string) => void} onStatus
 */
function startMansionPuzzle(onStatus) {
  // Každá místnost: hint (útržek deníku) + tři sochy; `correct` = index té pravé.
  const ROOMS = [
    {
      hint: `A singed page reads: "Specimen aggressive. Sealed the first door behind the statue that <strong>faces the flames</strong> — the one scorched blackest."`,
      statues: ["A soot-grey statue, barely touched", "A statue scorched blackest by fire", "A cracked but pale statue"],
      correct: 1,
    },
    {
      hint: `Another note: "Second lock keyed to the <strong>tallest</strong> effigy — the watcher over the stairwell."`,
      statues: ["A squat, hunched effigy", "A toppled effigy in pieces", "The tallest effigy, looming over the stairs"],
      correct: 2,
    },
    {
      hint: `Final entry, ink shaking: "Vault switch is the <strong>only statue still whole</strong>. All others we smashed in the panic."`,
      statues: ["The one statue still perfectly whole", "A half-shattered statue", "A statue burnt to a stump"],
      correct: 0,
    },
  ];

  const total = ROOMS.length;

  const enterRoom = (i) => {
    const room = ROOMS[i];
    showPopup({
      title: `🏚️ Shifting Halls — Room ${i + 1} / ${total}`,
      body: `<p class="story-text">The walls grind and reseal behind you. Three warped <strong>statues</strong> line the room.</p>
        <p class="story-text">${room.hint}</p>`,
      dismissible: false,
      choices: room.statues.map((label, idx) => ({
        label,
        onPick: () => {
          if (idx === room.correct) {
            if (i + 1 < total) {
              enterRoom(i + 1); // další místnost
            } else {
              // Poslední správná socha → labyrint vyřešen.
              setStoryFlag("mansionPuzzleSolved");
              commit();
              onStatus("The shifting walls lock open — the way to the inner labs is clear!");
              showPopup({
                title: "🏚️ The Walls Fall Silent",
                body: `<p class="story-text">A deep clunk echoes through the mansion. The last wall slides aside, baring a scorched corridor into the <strong>inner labs</strong> — where Burglars and their boss stand guard over the vault.</p>
                  <p class="story-text">Face them in the <strong>Mansion</strong> tab to reach the Secret Key.</p>`,
                okLabel: "Enter the inner labs",
                onOk: () => openMainTab("rockets"),
              });
            }
          } else {
            // Špatná socha → oblak kouře, zopakuj tutéž místnost.
            showPopup({
              title: "💨 A Trap!",
              body: `<p class="story-text">The wrong statue tips back with a grind — and a vent hisses open, flooding the room with acrid <strong>poison smoke</strong>! You stagger back to the doorway, coughing, and the walls reset.</p>
                <p class="story-text">Read the journal again and try another statue.</p>`,
              okLabel: "Try again",
              onOk: () => enterRoom(i),
            });
          }
        },
      })),
    });
  };

  enterRoom(0);
}

function pokemonLabView() {
  // Věrný Kanto (Krok 9): Cinnabar Lab – flavour. Vědci zmiňují fosílie a
  // pověsti o Mewtwovi (napojení na Mansion). Oživení fosílií řeší Pewter Museum.
  return {
    title: "🧪 Pokémon Lab",
    body: `<p class="story-text">Cinnabar's research lab hums with equipment. A scientist looks up from a microscope.</p>
      <p class="story-text">"We study ancient Pokémon revived from fossils here. There are… darker rumors too, about experiments in the old mansion up the road. Best not to dwell on those."</p>
      <p class="placeholder">(Fossil revival is handled at Pewter's Museum of Science.)</p>`,
  };
}

function unknownView() {
  return { title: "…", body: `<p class="placeholder">Nothing here yet.</p>` };
}

/* -------------------------------- Wiring --------------------------------- */

function wire(storyKey, overlay, onStatus, render, close) {
  // Oak's Lab
  overlay.querySelector("[data-open-pokedex]")?.addEventListener("click", () => {
    close();
    openMainTab("pokedex");
  });
  overlay.querySelector("[data-choose-starter]")?.addEventListener("click", () => {
    close();
    openStarterModal();
  });

  // Oak's Lab – doručení Oak's Parcel: odemkne sever (Route 2) + Poké Bally.
  overlay.querySelector("[data-deliver-parcel]")?.addEventListener("click", () => {
    const s = getState();
    if (!s.resources.balls) s.resources.balls = {};
    s.resources.balls.poke = (s.resources.balls.poke ?? 0) + PARCEL_BALLS;
    setStoryFlag("oakParcelDelivered");
    commit();
    onStatus(`Delivered Oak's Parcel! +${PARCEL_BALLS}× Poké Ball. The road north is now open.`);
    render();
  });

  // Tvůj domov – jednorázový dárek od mámy.
  overlay.querySelector("[data-take-gift]")?.addEventListener("click", () => {
    const s = getState();
    if (!s.resources.items) s.resources.items = {};
    s.resources.items.potion = (s.resources.items.potion ?? 0) + MOM_POTIONS;
    setStoryFlag("momGift");
    commit();
    onStatus(`Mom gave you ${MOM_POTIONS}× Potion!`);
    render();
  });

  // Tvůj domov – bezplatné doléčení týmu (máma), pojistka proti soft-locku.
  overlay.querySelector("[data-rest]")?.addEventListener("click", () => {
    const n = healTeam();
    if (n < 0) {
      onStatus("Not now — the League challenge allows no healing except Bag items.");
      return;
    }
    onStatus(n > 0 ? "Mom patched up your team. Fully rested!" : "Your team is already fine.");
    render();
  });

  // Museum of Science (Pewter) – jednorázová uvítací odměna.
  overlay.querySelector("[data-museum-reward]")?.addEventListener("click", () => {
    const s = getState();
    if (!s.resources.items) s.resources.items = {};
    s.resources.items.potion = (s.resources.items.potion ?? 0) + MUSEUM_POTIONS;
    setStoryFlag("pewterMuseumReward");
    commit();
    onStatus(`The museum gave you ${MUSEUM_POTIONS}× Potion!`);
    render();
  });

  // Museum of Science – oživení fosílie: spotřebuje fosílii, přidá Omanyte/Kabuto.
  overlay.querySelectorAll("[data-revive-fossil]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const fossilId = btn.getAttribute("data-revive-fossil");
      const speciesId = FOSSIL_TO_SPECIES[fossilId];
      const s = getState();
      const items = s.resources?.items ?? {};
      if (!speciesId || (items[fossilId] ?? 0) <= 0) return; // pojistka
      items[fossilId] -= 1;
      if (items[fossilId] <= 0) delete items[fossilId];
      commit();
      const mon = createPokemon(speciesId, FOSSIL_REVIVE_LEVEL);
      acquirePokemon(mon);
      const name = getSpecies(speciesId)?.name ?? speciesId;
      onStatus(`The machine whirs to life — your fossil was revived into ${name}!`);
      render();
    });
  });

  // S.S. Anne (Vermilion) – souboj s rivalem (povinně manuál). Po výhře dá HM Cut
  // (viz battleSystem.finishTrainerBattle → story.hasCut). Přepneme na Battle tab.
  overlay.querySelector("[data-ss-anne-battle]")?.addEventListener("click", () => {
    close();
    startTrainerBattle("rival-ss-anne", { forceManual: true });
    openMainTab("battle");
  });

  // S.S. Anne – tajný „Mew pod náklaďákem" (kanon legenda). Statické setkání s Mew
  // (legendary rarita → chytatelný, těžký; vrací se dokud ho nechytíš). Level dle
  // týmu, minimálně 50, ať je to důstojný závěrečný úlovek.
  overlay.querySelector("[data-mew-truck]")?.addEventListener("click", () => {
    if (ownsSpecies("mew")) return; // pojistka
    close();
    startStaticEncounter("mew", Math.max(50, giftLevel()));
    openMainTab("battle");
  });

  // Pokémon Tower – souboj s duchem Marowak (povinně manuál). Po výhře nastaví
  // story.marowakCalmed (viz battleSystem.finishTrainerBattle).
  overlay.querySelector("[data-fight-marowak]")?.addEventListener("click", () => {
    close();
    startTrainerBattle("lavender-marowak", { forceManual: true });
    openMainTab("battle");
  });

  // Pokémon Tower – osvobození Mr. Fujiho: dostaneš Poké Flute + story flagy.
  overlay.querySelector("[data-rescue-fuji]")?.addEventListener("click", () => {
    const s = getState();
    if (!s.resources.items) s.resources.items = {};
    s.resources.items["poke-flute"] = (s.resources.items["poke-flute"] ?? 0) + 1;
    setStoryFlag("mrFujiSaved");
    setStoryFlag("hasPokeFlute");
    commit();
    onStatus("Mr. Fuji gave you the Poké Flute! Wake the Snorlax on Route 12.");
    render();
  });

  // Game Corner – vstup do skrytého Rocket Hideoutu (přepne na Team Rocket tab).
  overlay.querySelector("[data-goto-rockets]")?.addEventListener("click", () => {
    close();
    openMainTab("rockets");
  });

  // Game Corner – automat: vsadí SLOT_BET coinů, roztočí válce, připíše výhru.
  overlay.querySelector("[data-slot-spin]")?.addEventListener("click", () => {
    const s = getState();
    if (!s.resources) return;
    const coins = s.resources.coins ?? 0;
    if (coins < SLOT_BET) {
      onStatus("Not enough coins to spin.");
      return;
    }
    s.resources.coins = coins - SLOT_BET;
    const reels = [rollReel(), rollReel(), rollReel()];
    const payout = slotPayout(reels);
    s.resources.coins += payout;
    lastSpin = { reels, payout };
    commit();
    onStatus(payout > 0 ? `🎰 ${reels.join(" ")} — you won ${payout} coins!` : `🎰 ${reels.join(" ")} — no luck.`);
    render();
  });

  // Game Corner – směnárna: koupě balíčku coinů za gold.
  overlay.querySelectorAll("[data-buy-coins]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const packCoins = parseInt(btn.getAttribute("data-buy-coins"), 10);
      const pack = COIN_PACKS.find((p) => p.coins === packCoins);
      if (!pack) return;
      const s = getState();
      if ((s.resources?.gold ?? 0) < pack.gold) {
        onStatus("You don't have enough money.");
        return;
      }
      s.resources.gold -= pack.gold;
      s.resources.coins = (s.resources.coins ?? 0) + pack.coins;
      commit();
      onStatus(`Exchanged ${pack.gold}₽ for ${pack.coins} coins.`);
      render();
    });
  });

  // Game Corner – prize corner: coiny za Pokémona (level dle týmu, 1×/druh).
  overlay.querySelectorAll("[data-buy-prize]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-buy-prize");
      const prize = GAME_CORNER_PRIZES.find((p) => p.id === id);
      if (!prize) return;
      if (ownsSpecies(id)) {
        onStatus("You already own that Pokémon.");
        return;
      }
      const s = getState();
      if ((s.resources?.coins ?? 0) < prize.cost) {
        onStatus("You don't have enough coins for that prize.");
        return;
      }
      s.resources.coins -= prize.cost;
      commit();
      const lvl = giftLevel();
      acquirePokemon(createPokemon(id, lvl));
      const name = getSpecies(id)?.name ?? id;
      onStatus(`You exchanged ${prize.cost} coins for a ${name} (Lv. ${lvl})!`);
      render();
    });
  });

  // Celadon Mansion – dárek Eevee (jednorázově, flag eeveeGift). Level škálovaný
  // podle týmu (giftLevel), aby dárek vždy seděl bez ohledu na dobu vyzvednutí.
  overlay.querySelector("[data-take-eevee]")?.addEventListener("click", () => {
    if (storyFlag("eeveeGift")) return; // pojistka
    const lvl = giftLevel();
    acquirePokemon(createPokemon("eevee", lvl));
    setStoryFlag("eeveeGift");
    commit();
    onStatus(`You received an Eevee (Lv. ${lvl})!`);
    render();
  });

  // Fighting Dojo – dárek OBOU Hitmonů (jednorázově, flag hitmonsGift).
  overlay.querySelector("[data-take-hitmons]")?.addEventListener("click", () => {
    if (storyFlag("hitmonsGift")) return; // pojistka
    const lvl = giftLevel();
    acquirePokemon(createPokemon("hitmonlee", lvl));
    acquirePokemon(createPokemon("hitmonchan", lvl));
    setStoryFlag("hitmonsGift");
    commit();
    onStatus(`You received Hitmonlee and Hitmonchan (Lv. ${lvl})!`);
    render();
  });

  // Silph Co. – dárek Lapras od zaměstnance (jednorázově, flag laprasGift).
  overlay.querySelector("[data-take-lapras]")?.addEventListener("click", () => {
    if (storyFlag("laprasGift")) return; // pojistka
    const lvl = giftLevel();
    acquirePokemon(createPokemon("lapras", lvl));
    setStoryFlag("laprasGift");
    commit();
    onStatus(`You received a Lapras (Lv. ${lvl})!`);
    render();
  });

  // Městské Trade Houses – kanonická výměna (dej druh → dostaneš na stejném levelu).
  overlay.querySelectorAll("[data-trade]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-trade");
      const t = CITY_TRADES[key];
      if (!t) return;
      const res = tradePokemon(t.want, t.giveId, t.flag);
      if (!res.ok) {
        if (res.reason === "only") onStatus("You can't trade away your only Pokémon!");
        else if (res.reason === "missing") onStatus(`You need a ${t.wantName} to make this trade.`);
        else onStatus("That trade can't be made right now.");
        return;
      }
      onStatus(`You traded your ${t.wantName} for ${t.giveName} (Lv. ${res.level})!`);
      render();
    });
  });

  // Warden's House (Fuchsia) – vrácení Gold Teeth: spotřebuje zuby, dá HM04
  // Strength + story.hasStrength (odemkne Victory Road) a poděkuje (wardenThanked).
  overlay.querySelector("[data-return-teeth]")?.addEventListener("click", () => {
    const s = getState();
    if (!s.resources.items) s.resources.items = {};
    const items = s.resources.items;
    if ((items["gold-teeth"] ?? 0) <= 0) return; // pojistka
    items["gold-teeth"] -= 1;
    if (items["gold-teeth"] <= 0) delete items["gold-teeth"];
    items["hm04-strength"] = (items["hm04-strength"] ?? 0) + 1;
    if (!s.story) s.story = {};
    s.story.hasGoldTeeth = false;
    setStoryFlag("hasStrength");
    setStoryFlag("wardenThanked");
    commit();
    onStatus("The Warden gave you HM04 Strength! You can now move boulders aside.");
    render();
  });

  // Pokémon Mansion (Cinnabar) – spusť spínačový labyrint (chained popup). Po
  // vyřešení nastaví story.mansionPuzzleSolved → otevře se gauntlet v tabu „Mansion".
  overlay.querySelector("[data-search-mansion]")?.addEventListener("click", () => {
    close();
    startMansionPuzzle(onStatus);
  });

  // Pokémon Mansion – po vyřešení labyrintu: skok do tabu „Mansion" (gauntlet +
  // boss). Secret Key + story.hasSecretKey udělí až vyčištění gauntletu
  // (viz battleSystem.finishTrainerBattle → clearItem/clearStoryFlag).
  overlay.querySelector("[data-open-mansion]")?.addEventListener("click", () => {
    close();
    openMainTab("rockets");
  });

  // Celadon Dept Store – koupě Fresh Water (drink pro strážce Silph Co).
  overlay.querySelector("[data-buy-drink]")?.addEventListener("click", () => {
    const s = getState();
    if ((s.resources?.gold ?? 0) < DRINK_COST) {
      onStatus("You don't have enough money for a drink.");
      return;
    }
    s.resources.gold -= DRINK_COST;
    if (!s.resources.items) s.resources.items = {};
    s.resources.items["fresh-water"] = (s.resources.items["fresh-water"] ?? 0) + 1;
    commit();
    onStatus("You bought a Fresh Water. Take it to the thirsty guard at Silph Co. in Saffron City.");
    render();
  });

  // Silph Co (Saffron) – napojení strážce: spotřebuje Fresh Water, otevře gauntlet.
  overlay.querySelector("[data-give-drink]")?.addEventListener("click", () => {
    const s = getState();
    if (!s.resources.items) s.resources.items = {};
    const items = s.resources.items;
    if ((items["fresh-water"] ?? 0) <= 0) return; // pojistka
    items["fresh-water"] -= 1;
    if (items["fresh-water"] <= 0) delete items["fresh-water"];
    setStoryFlag("saffronGuardsCleared");
    commit();
    onStatus("The revived guard lets you into Silph Co. — Team Rocket holds the upper floors!");
    render();
  });

  // Silph Co – vstup do gauntletu (přepne na Silph Co tab).
  overlay.querySelector("[data-enter-silph]")?.addEventListener("click", () => {
    close();
    openMainTab("rockets");
  });
}
