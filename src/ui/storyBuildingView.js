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
import { getStarterSpeciesId, acquirePokemon, ownsSpecies, ownsSpeciesInRegion, addToTeam, hasDexDiploma, getTeamPokemon } from "../systems/team.js";
import { gainFriendship, friendshipOf, FRIENDSHIP_EVOLVE } from "../systems/evolutionSystem.js";
import { dexCountsByGen } from "../systems/pokedex.js";
import { startDiplomaCeremony } from "./diploma.js";
import { healTeam, teamNeedsHeal, startTrainerBattle, giftLevel, tradePokemon, startStaticEncounter, travelToRegion } from "../systems/battleSystem.js";
import { GEN2_ENABLED } from "../../data/gameConfig.js";
import { generationByRegion } from "../../data/generations.js";
import { createPokemon, MAX_MOVES } from "../systems/pokemonSystem.js";
import { getSpecies } from "../../data/pokemon.js";
import { getMove } from "../../data/moves.js";
import { TMS, getTm, tmDisplayName } from "../../data/tms.js";
import { recordGameCorner } from "../systems/achievementSystem.js";
import { grantTm } from "../systems/tmSystem.js";
import { grantHmToPlayer } from "../systems/hmSystem.js";
import { showPopup } from "./popup.js";
import { playLegendaryScene } from "./legendaryScene.js";
import { openMarket, openTrainingPicker } from "./buildingView.js";
import { getBuilding } from "../../data/buildings.js";
import {
  BOOST_CENTER_ID,
  getTrackLevel,
  trackUpgradeCost,
  isTrackMaxed,
  upgradeTrack,
} from "../systems/buildingSystem.js";

/** Kolik Potionů dá máma (jednorázově). Poké Bally už hráč má ve startu. */
const MOM_POTIONS = 5;

/** Johto startéři (Prof. Elm), pořadí = pořadí na stole. Level jako Kanto start. */
const JOHTO_STARTER_IDS = ["chikorita", "cyndaquil", "totodile"];
const JOHTO_STARTER_LEVEL = 5;

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

  if (storyKey === "game-corner" || storyKey === "goldenrod-game-corner") {
    lastSpin = null; // čerstvý automat při každém otevření
    bjGame = null; // žádná rozehraná partie blackjacku
    bjBet = BJ_BETS[0]; // sázka zpět na nejnižší hodnotu
    gcTab = "slots"; // vždy začni na automatu
  }

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
  "elm-lab": elmLabView,
  "pokemon-tower": pokemonTowerView,
  "mr-fuji-house": mrFujiHouseView,
  "dept-store": deptStoreView,
  "goldenrod-dept-store": goldenrodDeptStoreView,
  "boost-center": boostCenterView,
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
  "vermilion-fishing-hut": vermilionFishingHutView,
  "fuchsia-fishing-house": fuchsiaFishingHouseView,
  // Gen 2 (Johto)
  "olivine-lighthouse": olivineLighthouseView,
  "cianwood-pharmacy": cianwoodPharmacyView,
  "bills-house": billsHouseView,
  "radio-tower": radioTowerView,
  "goldenrod-game-corner": () => gameCornerView(true),
  "goldenrod-flower-shop": goldenrodFlowerShopView,
  "sprout-tower": sproutTowerView,
  "dragons-den": dragonsDenView,
  // Gen 2 (Johto) – johtské zdroje HM (HM jsou regionální, nepřenášejí se z Kanta).
  "azalea-kiln": azaleaKilnView,
  "ecruteak-house": ecruteakHouseView,
  "olivine-house": olivineHouseView,
  "ss-aqua": ssAquaView,
  "blackthorn-house": blackthornHouseView,
  "dance-theater": danceTheaterView,
  "kurts-house": kurtsHouseView,
  "goldenrod-underground": goldenrodUndergroundView,
  "bell-tower": bellTowerView,
  "burned-tower": burnedTowerView,
};

/** Počet Ultra Ballů v Eusinově jednorázovém dárku (Burned Tower, na beasty). */
const EUSINE_GIFT_BALLS = 10;

/**
 * Bratři holiči v Goldenrod Underground (canon GSC). Dva stupně služby: mladší
 * bratr (levný, menší boost přátelství), starší (dražší, větší). Každý použitelný
 * 1×/reálný den (cooldown přes datum). Boost jde na celý tým. Klíč cooldownu v
 * story (datumový řetězec); čte se s fallbackem, takže žádná save migrace netřeba.
 */
const HAIRCUT_BROTHERS = {
  younger: { gain: 5, cost: 800, flag: "haircutYoungerDay", label: "Younger Brother", blurb: "A quick, cheerful trim." },
  older: { gain: 12, cost: 2500, flag: "haircutOlderDay", label: "Older Brother", blurb: "A masterful, meticulous cut." },
};

/** Dnešní datum jako stabilní řetězec (lokální den) pro denní cooldowny. */
function todayStr() {
  return new Date().toDateString();
}

/** Počet Luxury Ballů v dárku od Kimono Girls (jednorázově, friendship-themed). */
const KIMONO_GIFT_LUXURY_BALLS = 5;

/** Druhy Apricorn ballů v Kurtově jednorázovém dárku (count každého). */
const KURT_APRICORN_BALLS = ["fast", "heavy", "lure", "level", "love", "moon"];
const KURT_BALL_COUNT = 5;

/** Cena Fresh Water v Celadon Dept Store (pití pro stráže v branách Saffronu). */
const DRINK_COST = 200;

/** Level oživené fosílie (Omanyte/Kabuto/Aerodactyl) v Cinnabar Pokémon Labu. */
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

/** Prize corner (Celadon/Kanto): vzácní gen1 Pokémoni za coiny (level dle týmu). */
const GAME_CORNER_PRIZES = [
  { id: "abra", cost: 180 },
  { id: "clefairy", cost: 500 },
  { id: "vulpix", cost: 1000 },
  { id: "pinsir", cost: 2500 },
  { id: "dratini", cost: 2800 },
  { id: "scyther", cost: 5500 },
  { id: "porygon", cost: 9999 },
];

/**
 * Prize corner (Goldenrod/Johto): johtské (gen2) druhy + kanonický Porygon.
 * Region-fidelity: kolekce je unikátní per druh+region, takže johtská herna nesmí
 * dávat kantské druhy. Vybrané gen2 druhy JSOU i divoce v Johtu (casino = bonus,
 * žádná dex-díra); Porygon je jediná výjimka – herní exkluziva (→ porygon2 #233).
 */
const GAME_CORNER_PRIZES_GEN2 = [
  { id: "mareep", cost: 800 },
  { id: "aipom", cost: 1200 },
  { id: "snubbull", cost: 1500 },
  { id: "dunsparce", cost: 2500 },
  { id: "girafarig", cost: 4000 },
  { id: "porygon", cost: 9999 },
];

/** Prize list dle herny (Goldenrod = johtské druhy, Celadon = kantské). */
function gameCornerPrizes(johtoArcade) {
  return johtoArcade ? GAME_CORNER_PRIZES_GEN2 : GAME_CORNER_PRIZES;
}

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

/* --------------------------- Blackjack (Game Corner) ---------------------- */
// Druhá hra v herně. Coiny jako sázka. Pravidla jsou mírně ve prospěch podniku,
// aby herna nebyla tiskárnou peněz (coiny -> Porygon): krupiér stojí na 17,
// remíza vrací sázku, přirozené 21 platí 1:1 (ne 3:2). House edge ~2 %.

/** Nabízené výše sázky blackjacku (coiny) – hráč si vybere před rozdáním. */
const BJ_BETS = [5, 25, 100];

/** Aktuálně zvolená výše sázky (drží se přes partie, reset při otevření). */
let bjBet = BJ_BETS[0];

/** Hodnoty karet (eso = 11, sníží se na 1 při přetažení). */
const BJ_RANKS = [
  { r: "A", v: 11 }, { r: "2", v: 2 }, { r: "3", v: 3 }, { r: "4", v: 4 },
  { r: "5", v: 5 }, { r: "6", v: 6 }, { r: "7", v: 7 }, { r: "8", v: 8 },
  { r: "9", v: 9 }, { r: "10", v: 10 }, { r: "J", v: 10 }, { r: "Q", v: 10 }, { r: "K", v: 10 },
];
const BJ_SUITS = ["♠", "♥", "♦", "♣"]; // spades, hearts, diamonds, clubs

/** Aktuální partie blackjacku (mimo save, drží se jen pro překreslení okna). */
let bjGame = null;

/** Vytáhne náhodnou kartu (nekonečný „shoe" – losování s návratem, pro casual hru). */
function bjDraw() {
  const rank = BJ_RANKS[Math.floor(Math.random() * BJ_RANKS.length)];
  const suit = BJ_SUITS[Math.floor(Math.random() * BJ_SUITS.length)];
  return { r: rank.r, v: rank.v, s: suit };
}

/** Hodnota ruky s korekcí es (11 -> 1, dokud je přetaženo). */
function bjValue(hand) {
  let total = hand.reduce((a, c) => a + c.v, 0);
  let aces = hand.filter((c) => c.r === "A").length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

/** Krupiér dobírá, dokud nemá aspoň 17 (stojí na všech 17). */
function bjDealerPlay(game) {
  while (bjValue(game.dealer) < 17) game.dealer.push(bjDraw());
}

/** Vyhodnotí partii, připíše výhru/vrácení sázky do coinů. Vrací hlášku. */
function bjSettle(game) {
  const p = bjValue(game.player);
  const d = bjValue(game.dealer);
  const s = getState();
  if (!s.resources) s.resources = {};
  // Natural = blackjack z prvních dvou karet (21 na 2 kartách). Platí 3:2.
  const playerNatural = game.player.length === 2 && p === 21;
  let result, msg;
  if (p > 21) { result = "lose"; msg = "Bust! You lose."; }
  else if (d > 21) { result = "win"; msg = "Dealer busts — you win!"; }
  else if (p > d) { result = "win"; msg = playerNatural ? "Blackjack! You win 3:2!" : "You win!"; }
  else if (p < d) { result = "lose"; msg = "Dealer wins."; }
  else { result = "push"; msg = "Push — bet returned."; }
  if (result === "win") {
    // Výhra vrací sázku + výhru. Natural platí 3:2, běžná výhra 1:1.
    const winnings = playerNatural ? Math.floor(game.bet * 1.5) : game.bet;
    s.resources.coins = (s.resources.coins ?? 0) + game.bet + winnings;
  } else if (result === "push") {
    s.resources.coins = (s.resources.coins ?? 0) + game.bet;
  }
  game.phase = "done";
  game.result = result;
  game.msg = msg;
  commit();
  if (result === "lose") recordGameCorner("loss"); // achievement: prohraná sázka
  return msg;
}

/** Rozdá novou partii (odečte sázku). Přirozené 21 vyhodnotí hned. */
function bjDeal(onStatus) {
  const s = getState();
  const coins = s.resources?.coins ?? 0;
  if (coins < bjBet) { onStatus("Not enough coins to deal."); return; }
  s.resources.coins = coins - bjBet;
  bjGame = {
    phase: "playing", bet: bjBet, result: null, msg: "",
    player: [bjDraw(), bjDraw()], dealer: [bjDraw(), bjDraw()],
  };
  commit();
  recordGameCorner("play"); // achievement: zahraná partie v herně
  if (bjValue(bjGame.player) === 21 || bjValue(bjGame.dealer) === 21) {
    onStatus("🃏 " + bjSettle(bjGame));
  } else {
    onStatus("🃏 Cards dealt — Hit or Stand?");
  }
}

/** Hráč si bere kartu; přetažení = okamžitá prohra. */
function bjHit(onStatus) {
  if (!bjGame || bjGame.phase !== "playing") return;
  bjGame.player.push(bjDraw());
  if (bjValue(bjGame.player) > 21) {
    onStatus("🃏 " + bjSettle(bjGame));
  } else {
    onStatus("🃏 Hit — Hit or Stand?");
  }
}

/** Hráč stojí; dochytá krupiér a partie se vyhodnotí. */
function bjStand(onStatus) {
  if (!bjGame || bjGame.phase !== "playing") return;
  bjDealerPlay(bjGame);
  onStatus("🃏 " + bjSettle(bjGame));
}

/** HTML jedné karty (rub, když je skrytá krupiérova). */
function bjCardHtml(c, hidden) {
  if (hidden) return `<span class="bj-card bj-back">🂠</span>`;
  const red = c.s === "♥" || c.s === "♦" ? " bj-red" : "";
  return `<span class="bj-card${red}">${c.r}${c.s}</span>`;
}

/* --------------------------- Game Corner: taby ---------------------------- */

/** Aktivní tab herny (Slots / Blackjack / Prizes / Exchange). Reset při otevření. */
let gcTab = "slots";

const GC_TABS = [
  { id: "slots", label: "🎰 Slots" },
  { id: "blackjack", label: "🃏 Blackjack" },
  { id: "prizes", label: "🎁 Prizes" },
  { id: "exchange", label: "💱 Exchange" },
];

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
      title: "Oak's Lab",
      body: `
        <p class="story-text">Professor Oak: "Ah, that's my Parcel from the Poké Mart! You brought it all the way from Viridian? Thank you!"</p>
        <p class="story-text">"As promised, here is your very own <strong>Pokédex</strong> — record every Pokémon you meet! And take this <strong>EXP Share</strong> too: it lets your whole team grow, even the ones resting on the bench. Some Poké Balls, as well."</p>
        <p class="story-text">"The road north through Viridian is open to you now."</p>
        <button class="btn" data-deliver-parcel>📦 Hand over Oak's Parcel (get Pokédex, EXP Share &amp; ${PARCEL_BALLS}× Poké Ball)</button>
      `,
    };
  }

  const action = hasStarter
    ? `<p class="story-text">"So, how's your <strong>${starterName}</strong> doing? Remember, the Pokédex is your faithful companion on the road."</p>
       <button class="btn" data-open-pokedex>📕 Open Pokédex</button>`
    : `<p class="story-text">"Welcome! Every Trainer needs a first partner to set off on their journey. I have three Pokémon right here — go on, pick the one that feels right to you!"</p>
       <button class="btn" data-choose-starter>Choose your starter</button>`;

  // Capstone Gen 1: kompletní KANTO dex → Oak udělí Diplom + Shiny Charm (regionálně,
  // jednorázově). Záměrně počítáme jen gen1 druhy – Shiny Charm je per-region.
  const { caught, total } = dexCountsByGen()[1] ?? { caught: 0, total: 0 };
  let diploma = "";
  if (hasDexDiploma("kanto")) {
    diploma = `<hr class="story-sep">
      <p class="story-text">"You completed the entire Kanto Pokédex — you are a true Pokémon Master! That Shiny Charm is yours to keep here in Kanto."</p>
      <p class="placeholder">Kanto Pokédex Diploma earned · Kanto Shiny Charm active</p>`;
  } else if (hasStarter && total > 0 && caught >= total) {
    diploma = `<hr class="story-sep">
      <p class="story-text">"Wait... your Kanto Pokédex — is it truly complete?! Show me!"</p>
      <button class="btn" data-claim-diploma>🎓 Show Prof. Oak your completed Pokédex</button>`;
  } else if (hasStarter) {
    diploma = `<hr class="story-sep">
      <p class="placeholder">Kanto Pokédex progress: ${caught} / ${total} caught. Complete it and Prof. Oak has a special reward for you!</p>`;
  }

  return {
    title: "Oak's Lab",
    body: `
      <p class="story-text">Professor Oak looks up from his research.</p>
      ${action}
      ${diploma}
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
    title: "Your Home",
    body: `${gift}<hr class="story-sep">${rest}`,
  };
}

function rivalHomeView() {
  return {
    title: "Rival's Home",
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

  return {
    title: "Museum of Science",
    body: `<p class="story-text">Inside, glass cases display ancient <strong>fossils</strong>, a glittering <strong>Moon Stone</strong>, and — up on the second floor — a real piece of a <strong>space rocket</strong>.</p>
      <p class="story-text">One case holds a chunk of <strong>Old Amber</strong> with a tiny ancient creature trapped inside. A plaque reads: "Amber like this — same as the sample recovered near Mt. Moon — may hold the DNA of a long-extinct Pokémon."</p>
      <hr class="story-sep">
      ${reward}
      <hr class="story-sep">
      <p class="placeholder">A note by the fossil case reads: "To bring a fossil back to life, visit the <strong>Pokémon Lab on Cinnabar Island</strong>."</p>`,
  };
}

/**
 * Sekce „Vyplout do Johto" na S.S. Anne. Nabídne se JEN když:
 *  - je gen 2 aktivní (GEN2_ENABLED – na produkci skryté do vydání),
 *  - hráč je Champion (state.story.isChampion),
 *  - hráč je právě v Kantu (nemá smysl plout do Johto z Johta).
 * Klik obslouží wire() → travelToRegion("johto"). Prázdné Johto = mapa-plátno.
 */
function johtoVoyageHtml() {
  if (!GEN2_ENABLED) return "";
  if (!getState().story?.isChampion) return "";
  if ((getState().progress?.region ?? "kanto") !== "kanto") return "";
  const johto = generationByRegion("johto");
  const name = johto?.regionName ?? "Johto";
  return `
    <hr class="story-sep">
    <p class="story-text">A weathered captain leans on the railing. "Champion, eh? There's a whole other region across the sea — <strong>${name}</strong>. Not many trainers ever make the crossing. Care to set sail?"</p>
    <button class="btn" data-sail-johto>⛴️ Set sail for ${name}</button>`;
}

/**
 * Vtipný "celní" tutorial při PRVNÍM příjezdu do Johta (řetězené popupy).
 * Hráči hravou formou vysvětlí dvě region-specifická pravidla a uklidní ho, co
 * mu zůstává:
 *   - Kanto Pokémoni v Johtu bojovat ani trénovat/chovat nesmí (region-lock → odpočívají v PC).
 *   - Kantský Shiny Charm tu neplatí (je regionální – nový se získá za johtský dex).
 *   - Budovy, HM v terénu, Školka a vajíčka jsou per-region (zůstávají v Kantu).
 *   - V Johtu žijí jen johtští Pokémoni (gen2-lock) + Gen 1 předchůdci Gen 2 evolucí.
 *   - CLO NEBERE: peníze, itemy/TM, Pokédex ani kolekci.
 * Jen flavour + tutorial, žádná herní logika (prohození řeší travelToRegion).
 */
function showJohtoCustomsTutorial() {
  // 2) Celní formulář: co se "zabavuje" (region-lock) vs. co projde clem.
  const declaration = () => {
    showPopup({
      title: "Johto Customs — Declaration Form",
      body: `<p class="story-text">The officer stamps a form with theatrical flair. "Regulations, regulations! Let me read you the fine print…"</p>
        <p class="story-text"><strong>Held at the border (Kanto only):</strong></p>
        <ul class="story-list">
          <li><strong>Your Kanto Pokémon</strong> — "League rules! Only Johto-born Pokémon may battle, train, evolve or take items here. Yours will nap safely in the <strong>PC</strong> until you sail home — the <strong>S.S. Aqua</strong> leaves for Kanto from the port in <strong>Olivine City</strong>."</li>
          <li><strong>Your Shiny Charm</strong> — "That sparkly thing? Kanto paperwork, no good here. Complete the <strong>Johto Pokédex</strong> and Prof. Elm will issue you a shiny new one."</li>
          <li><strong>Your building upgrades & Boost Center</strong> — "Those were paid to <em>Kanto</em> contractors! Every town service and your XP / Yield / Fortune boosts start fresh in Johto — re-invest here. (Your Kanto levels wait for you back home.) And the Poké Mart only trusts <em>Johto</em> badges with its better Poké Balls."</li>
          <li><strong>Your Day Care and your Eggs</strong> — "Kanto eggs hatch in Kanto, young one! Your Day Care, the Pokémon in it and every egg wait for you back home. Johto has its own Day Care — but only Johto-born Pokémon may train or breed there."</li>
          <li><strong>Using HMs out in the field</strong> — "Your HM discs may come along, but the badges and permits that let you Surf or Cut were issued in Kanto. Earn them again here."</li>
        </ul>
        <p class="story-text"><strong>Johto wildlife:</strong> "Out here you'll only meet <strong>Johto Pokémon</strong>. A few Kanto kinds live here too — Zubat, Onix, Slowpoke, Horsea and friends — because only Johto-raised ones grow into Johto forms like Crobat or Steelix. Catch them fresh!"</p>
        <p class="story-text"><strong>Cleared through customs (all yours):</strong></p>
        <ul class="story-list">
          <li><strong>Your money</strong> — "We're customs, not robbers!"</li>
          <li><strong>Items and TMs</strong> — "Pack it all, it travels with you."</li>
          <li><strong>Pokédex & your whole collection</strong> — "Knowledge knows no borders. Your Kanto Pokémon stay in the PC, safe and sound."</li>
        </ul>
        <p class="story-text">The officer slides the form back with a wink. "Welcome to Johto, Champion. Go make Prof. Elm proud!"</p>`,
      okLabel: "🛄 Step ashore",
    });
  };

  // 1) Příjezd + celník (nálada, nevysvětluje ještě pravidla).
  showPopup({
    title: "Welcome to Johto",
    body: `<p class="story-text">The S.S. Anne glides into port and you step onto the shores of <strong>Johto</strong> for the very first time.</p>
      <p class="story-text">A cheerful customs officer blocks the gangway, clipboard in hand. "Halt! New arrival from Kanto, eh? Before you set one foot further — we need to go through <strong>customs</strong>."</p>`,
    okLabel: "Hand over your papers",
    onOk: () => declaration(),
  });
}

function ssAnneView() {
  if (storyFlag("ssAnneCleared")) {
    // Tajemství „Mew pod náklaďákem" (kanonická Gen 1 legenda). Až loď odpluje,
    // u vzdáleného doku zbude opuštěný náklaďák. Dosáhneš k němu jen se Surf a
    // odsuneš ho jen se Strength – teprve pak se ukáže Mew. Chytatelný legendary.
    // Po prvním chycení zůstává přístupný jako SHINY-HUNT (opakovatelně, bez odměn),
    // stejně jako legendární tab – jediná cesta k shiny Mew (je to dárek/static).
    const st = getState().story ?? {};
    const canReachTruck = st.hasSurf && st.hasStrength;
    const hasMew = ownsSpecies("mew");
    let secret = "";
    if (canReachTruck) {
      secret = hasMew
        ? `<p class="placeholder">✓ You uncovered the legend beneath the lone truck by the docks. Mew still lingers there — you can seek it again to hunt for a shiny one (no rewards; your caught Mew is kept).</p>
        <button class="btn" data-mew-truck>✨ Surf out and seek Mew again (shiny hunt)</button>`
        : `<p class="story-text">Now that the liner has sailed, a <strong>lone truck</strong> sits abandoned on the far dock, out across the water. An old sailor mutters that something stirs beneath it — "if you're strong enough to shove it aside…"</p>
        <button class="btn" data-mew-truck>🚚 Surf out and heave the truck aside</button>`;
    }
    return {
      title: "S.S. Anne",
      body: `<p class="story-text">The great liner's horn has long since faded — the S.S. Anne has sailed on.</p>
        <p class="placeholder">✓ You've already explored the S.S. Anne and earned HM01 Cut.</p>
        ${secret}
        ${johtoVoyageHtml()}`,
    };
  }
  const items = getState().resources?.items ?? {};
  const hasTicket = (items["ss-anne-ticket"] ?? 0) > 0;
  if (!hasTicket) {
    return {
      title: "S.S. Anne",
      body: `<p class="story-text">A sailor blocks the gangway. "No ticket, no boarding! This is a luxury cruise, you know."</p>
        <p class="placeholder">Find <strong>Bill</strong> at the end of <strong>Route 25</strong> (north of Cerulean) — he'll give you a S.S. Anne Ticket.</p>`,
    };
  }
  return {
    title: "S.S. Anne",
    body: `<p class="story-text">You show your ticket and step aboard the luxurious S.S. Anne. Wandering the decks, you run straight into <strong>${rivalName()}</strong>!</p>
      <p class="story-text">"Hey! You're too weak to be here. Let's battle!"</p>
      <button class="btn" data-ss-anne-battle>⚔️ Battle ${rivalName()}</button>`,
  };
}

/**
 * Prof. Elm's Lab (New Bark Town) – vstupní budova Johta. Jednorázový výběr
 * Johto startéra (Chikorita / Cyndaquil / Totodile). Kanto tým + Pokédex se
 * přenášejí, ale v Johtu smí bojovat jen Pokémoni gen 2 (viz region-lock),
 * proto hráč tu dostane nového parťáka. Flag `johtoStarter` = už vybráno;
 * `johtoStarterId` = který. Klik obslouží wire() → data-choose-johto-starter.
 */
function elmLabView() {
  if (storyFlag("johtoStarter")) {
    const chosenId = getState().story?.johtoStarterId;
    const chosen = chosenId ? getSpecies(chosenId) : null;
    const name = chosen?.name ?? "your Johto partner";
    // Po výběru startéra dá Elmův asistent hráči Vejce od Mr. Pokémona → Togepi
    // (#175; kánonicky jediný zdroj Togepi – odemyká i togetic #176 přes happiness).
    const gotTogepi = storyFlag("togepiGift");
    // Nevybrané 2 startéry se NEřeší tady – po dohrání Johto Ligy (isJohtoChampion)
    // vzácně spawnují v johtské Safari Zone, stejně jako Kanto startéři v kantské
    // (data/gen2/safari.js). Tady jen decentní nápověda pro objevitelnost.
    const unchosen = JOHTO_STARTER_IDS.filter((id) => id !== chosenId);
    const starterHint = (storyFlag("isJohtoChampion") && !unchosen.every((id) => ownsSpecies(id)))
      ? `<hr><p class="placeholder">Prof. Elm leans in. "Odd reports lately — trainers spotting wild <strong>${unchosen.map((id) => getSpecies(id)?.name ?? id).join(" and ")}</strong> in the <strong>Safari Zone</strong> west of Cianwood. Rare as anything, but if you want to complete your research, that's where I'd look."</p>`
      : "";

    // Capstone Gen 2: kompletní JOHTO dex → Elm udělí Diplom + Shiny Charm (regionálně,
    // jednorázově). Počítáme jen gen2 druhy – Shiny Charm je per-region.
    const { caught, total } = dexCountsByGen()[2] ?? { caught: 0, total: 0 };
    let diploma = "";
    if (hasDexDiploma("johto")) {
      diploma = `<hr class="story-sep">
        <p class="story-text">"You completed the entire Johto Pokédex — magnificent research! That Shiny Charm is yours to keep here in Johto."</p>
        <p class="placeholder">Johto Pokédex Diploma earned · Johto Shiny Charm active</p>`;
    } else if (total > 0 && caught >= total) {
      diploma = `<hr class="story-sep">
        <p class="story-text">"Wait... your Johto Pokédex — is it truly complete?! Let me see!"</p>
        <button class="btn" data-claim-diploma-johto>🎓 Show Prof. Elm your completed Pokédex</button>`;
    } else {
      diploma = `<hr class="story-sep">
        <p class="placeholder">Johto Pokédex progress: ${caught} / ${total} caught. Complete it and Prof. Elm has a special reward for you!</p>`;
    }

    return {
      title: "Prof. Elm's Lab",
      body: `<p class="story-text">Prof. Elm looks up from his microscope. "How's your <strong>${name}</strong> settling in? Johto's a big place — take good care of it!"</p>
        <p class="placeholder">✓ You've already chosen your Johto starter here.</p>
        ${gotTogepi
          ? `<p class="placeholder">✓ Elm's aide gave you an <strong>Egg</strong> from Mr. Pokémon — it hatched into a <strong>Togepi</strong>.</p>`
          : `<p class="story-text">Elm's aide rushes in. "Mr. Pokémon found this Egg and asked us to raise it — but a traveling Champion like you is far better suited. Please, take it!"</p>
             <p class="placeholder">The Egg hatches into a <strong>Togepi</strong> — raise it close and it becomes Togetic.</p>
             <button class="btn" data-take-togepi>🥚 Accept the Egg (Togepi)</button>`}
        ${starterHint}
        ${diploma}`,
    };
  }
  const cards = JOHTO_STARTER_IDS.map((id) => {
    const sp = getSpecies(id);
    const name = sp?.name ?? id;
    const types = (sp?.types ?? []).join(" / ");
    return `<button class="btn starter-choice" data-choose-johto-starter="${id}">
        <strong>${name}</strong>${types ? ` <span class="placeholder">(${types})</span>` : ""}
      </button>`;
  }).join("\n      ");
  return {
    title: "Prof. Elm's Lab",
    body: `<p class="story-text">"Ah — a Champion all the way from Kanto! Welcome to Johto." Prof. Elm gestures to three Poké Balls on the table.</p>
      <p class="story-text">"Out here only Pokémon from the Johto region can battle — your Kanto team will rest safely in the PC. So pick a partner and let your new journey begin!"</p>
      <div class="starter-choices">
      ${cards}
      </div>`,
  };
}

function pokemonTowerView() {
  // Věrný Kanto (Krok 7): stavový automat věže.
  //  0) na 2. patře tě přepadne RIVAL (bez Silph Scope) – kánon RBY/Yellow.
  //  1) bez Silph Scope → ducha nejde identifikovat (navedení na Celadon).
  //  2) se Scope, dokud Marowak není uklidněná → souboj s duchem Marowak.
  //  3) po Marowak, dokud není Mr. Fuji zachráněn → osvobodíš ho (Poké Flute).
  //  4) hotovo → klidná věž.
  const towerRivalBeaten = storyFlag("towerRivalBeaten");
  const hasScope = storyFlag("hasSilphScope");
  const marowakCalmed = storyFlag("marowakCalmed");
  const mrFujiSaved = storyFlag("mrFujiSaved");

  if (!towerRivalBeaten) {
    return {
      title: "Pokémon Tower",
      body: `<p class="story-text">You start up the tower's steps, past mourners and rows of graves — when a familiar voice calls out. Your <strong>rival</strong> blocks the second floor, smirking.</p>
        <p class="story-text">"Yo! What are you doing in a creepy place like this? ...Heh. Let's see how tough you've gotten!"</p>
        <button class="btn" data-fight-tower-rival>⚔️ Battle your rival</button>`,
    };
  }
  if (!hasScope) {
    return {
      title: "Pokémon Tower",
      body: `<p class="story-text">You climb the tower's steps, past mourners and rows of graves for Pokémon that have passed on.</p>
        <p class="story-text">On the stairs, a furious <strong>ghost</strong> lunges at you — but you can't make out what it is!</p>
        <p class="placeholder">You'll need the <strong>Silph Scope</strong> to see the ghost clearly. Team Rocket is said to keep one at their hideout in <strong>Celadon City</strong> — come back once you have it.</p>`,
    };
  }
  if (!marowakCalmed) {
    return {
      title: "Pokémon Tower",
      body: `<p class="story-text">You raise the <strong>Silph Scope</strong> to your eye and the ghost snaps into focus: the raging spirit of a <strong>Marowak</strong>, cut down by Team Rocket while defending her child.</p>
        <p class="story-text">She won't rest until she's tested your strength. There's no way past but through.</p>
        <button class="btn" data-fight-marowak>👻 Face the Marowak's spirit</button>`,
    };
  }
  if (!mrFujiSaved) {
    return {
      title: "Pokémon Tower",
      body: `<p class="story-text">With the spirit at peace, you climb to the top floor — where Team Rocket grunts are holding old <strong>Mr. Fuji</strong> captive.</p>
        <p class="story-text">You drive the Rockets off and free him. Grateful, Mr. Fuji presses a gift into your hands…</p>
        <button class="btn" data-rescue-fuji>🎵 Free Mr. Fuji (receive the Poké Flute)</button>`,
    };
  }
  return {
    title: "Pokémon Tower",
    body: `<p class="story-text">The tower is quiet now. The spirits rest peacefully, and Mr. Fuji has returned safely home.</p>
      <p class="placeholder">✓ You calmed the Marowak, rescued Mr. Fuji, and received the <strong>Poké Flute</strong>.</p>`,
  };
}

function mrFujiHouseView() {
  // Po záchraně (mrFujiSaved) je Mr. Fuji doma a navede tě na spícího Snorlaxe.
  if (storyFlag("mrFujiSaved")) {
    return {
      title: "Mr. Fuji's House",
      body: `<p class="story-text"><strong>Mr. Fuji</strong> is home safe, tending to a room full of orphaned Pokémon. "Thank you for saving me from those Rockets, young trainer."</p>
        <p class="story-text">"That <strong>Poké Flute</strong> I gave you can wake any sleeping Pokémon — even that huge <strong>Snorlax</strong> snoring across <strong>Route 12</strong>, just south of here."</p>
        <p class="placeholder">✓ Head to Route 12 and play the Poké Flute to clear the road south.</p>`,
    };
  }
  return {
    title: "Mr. Fuji's House",
    body: `<p class="story-text">Inside, a volunteer tends to a room full of orphaned Pokémon.</p>
      <p class="story-text">"You're looking for <strong>Mr. Fuji</strong>? I'm afraid he went into the <strong>Pokémon Tower</strong> to calm the restless spirits — and he hasn't come back. I'm so worried…"</p>
      <p class="placeholder">Something isn't right at the top of the tower.</p>`,
  };
}

function deptStoreView() {
  // Věrný Kanto (Krok 11): Celadon Dept Store – Kanto's biggest store. Prémiové
  // patra (tlačítko „Shop the floors" → tabovaný obchod, viz buildingView.openMarket)
  // prodávají VŠECHNO kupitelné: míčky, léčení, TM, evoluční kameny, held itemy a
  // prémiové boosty (Rare Candy / PP Up / PP Max) = kanonický gold sink. Rooftop
  // drink stand navíc prodává Fresh Water pro žíznivé stráže v branách Saffronu.
  const gold = getState().resources?.gold ?? 0;
  const owned = getState().resources?.items?.["fresh-water"] ?? 0;
  return {
    title: "Celadon Dept. Store",
    body: `<p class="story-text">The biggest store in Kanto rises floor after floor — Poké Balls, healing items, TMs, evolution stones, held items and rare boosts, plus a rooftop drink stand. The works.</p>
      <button class="btn" data-shop-floors>🛒 Shop the floors</button>
      <p class="story-text">At the rooftop vending machine you can buy a <strong>Fresh Water</strong> for <strong>${DRINK_COST}₽</strong>. The thirsty guards at the gates to Saffron City would surely appreciate one.</p>
      ${owned > 0 ? `<p class="placeholder">In your Bag: <strong>${owned}× Fresh Water</strong>.</p>` : ""}
      <button class="btn" data-buy-drink ${gold < DRINK_COST ? "disabled" : ""}>🥤 Buy Fresh Water — ${DRINK_COST}₽</button>`,
  };
}

function goldenrodDeptStoreView() {
  // Gen 2 (Johto): Goldenrod Dept. Store – johtský protějšek Celadon Dept Store.
  // Tlačítko „Shop the floors" → tabovaný obchod (openMarket "goldenrod-dept-store",
  // plný katalog vč. evolučních kamenů a Linking Cordu). Bez rooftop stánku (to je
  // Kanto-specifické kvůli Fresh Water pro strážce u Silph Co.).
  return {
    title: "Goldenrod Dept. Store",
    body: `<p class="story-text">The biggest store in Johto towers over Goldenrod City — floor after floor of Poké Balls, healing items, TMs, evolution stones, held items and rare boosts. If it's for sale anywhere, it's for sale here.</p>
      <button class="btn" data-shop-goldenrod>🛒 Shop the floors</button>`,
  };
}

/** Formátuje bonus linky jako procenta (1 desetinné místo, bez zbytečné „.0"). */
function boostPct(level, perLevel) {
  const v = level * perLevel * 100;
  return (Math.round(v * 10) / 10).toString();
}

/** HTML jedné boost linie (level, aktuální bonus, progress bar, tlačítko upgrade). */
function boostLineHtml(key, def, effectLabel) {
  const gold = getState().resources?.gold ?? 0;
  const level = getTrackLevel(BOOST_CENTER_ID, key);
  const maxed = isTrackMaxed(BOOST_CENTER_ID, key);
  const cost = trackUpgradeCost(BOOST_CENTER_ID, key);
  const cur = boostPct(level, def.perLevel);
  const cap = boostPct(def.maxLevel, def.perLevel);
  const fillPct = Math.round((level / def.maxLevel) * 100);
  const btn = maxed
    ? `<button class="btn btn-sm" disabled>Maxed</button>`
    : `<button class="btn btn-sm" data-boost-up="${key}" ${gold < cost ? "disabled" : ""}>Upgrade — ${cost}₽</button>`;
  return `
    <div class="boost-line">
      <div class="boost-line-head">
        <span class="boost-line-name">${def.icon} ${def.name}</span>
        <span class="placeholder">Lv ${level}/${def.maxLevel}</span>
      </div>
      <div class="boost-bar"><div class="boost-bar-fill" style="width:${fillPct}%"></div></div>
      <div class="boost-line-foot">
        <span class="boost-line-effect">${effectLabel}: <strong>+${cur}%</strong> <span class="placeholder">(max +${cap}%)</span></span>
        ${btn}
      </div>
    </div>`;
}

function boostCenterView() {
  // Idle-boost budova v Celadonu (viz data/buildings.js "boost-center"). Tři
  // TRVALÉ linie s tvrdým stropem 50 a exponenciální cenou; efekty čte a aplikuje
  // buildingSystem (grantXp / battleSystem gold+shiny / idle offline gold).
  const def = getBuilding(BOOST_CENTER_ID);
  const t = def?.tracks ?? {};
  return {
    title: "Trainer Boost Center",
    body: `<p class="story-text">A members-only facility in Celadon. Pour your winnings into three lifelong perks. Each level is a little pricier than the last, so max ranks are a long-haul goal — not a quick shortcut.</p>
      ${boostLineHtml("xp", t.xp, "XP gain")}
      ${boostLineHtml("yield", t.yield, "Battle gold")}
      ${boostLineHtml("fortune", t.fortune, "Shiny chance")}
      <p class="placeholder">Boosts apply everywhere — active battles, auto-battle, Full Auto and offline idle. Fortune stacks with the Shiny Charm.</p>`,
  };
}

function silphCoView() {
  // Věrný Kanto (Krok 11): Team Rocket zabral Silph Co. Stavový automat:
  //  1) do Saffronu se dostaneš až po napojení stráže v bráně (saffronGuardsCleared,
  //     Fresh Water z Celadon Dept Store) → gauntlet v tabu „Silph Co.";
  //  2) po vyčištění (silphCleared) → flavour (Master Ball + Sabrina otevřena).
  if (storyFlag("silphCleared")) {
    const gotLapras = storyFlag("laprasGift");
    return {
      title: "Silph Co.",
      body: `<p class="story-text">The tower hums with ordinary business again. Employees nod at you as you pass — the trainer who threw Team Rocket out on their ear.</p>
        <p class="placeholder">✓ You freed Silph Co., received the <strong>Master Ball</strong>, and reopened Sabrina's Gym.</p>
        ${gotLapras
          ? `<p class="placeholder">✓ A grateful Silph Co. employee gave you a <strong>Lapras</strong>.</p>`
          : `<p class="story-text">A grateful Silph Co. employee hurries over. "You saved us all! Please, take this — I raised it myself." She holds out a Poké Ball containing a <strong>Lapras</strong>!</p>
             <button class="btn" data-take-lapras>🌊 Accept the Lapras</button>`}`,
    };
  }
  return {
    title: "Silph Co.",
    body: `<p class="story-text">Team Rocket has seized <strong>Silph Co.</strong>, Saffron's proud technology company. Grunts guard every floor, all the way up to their boss. Watch yourself.</p>
      <button class="btn" data-enter-silph>🏢 Storm Silph Co. (Silph Co. tab)</button>`,
  };
}

function celadonMansionView() {
  // Věrný Kanto (Krok 12): v Celadon Mansion dá herní nadšenec hráči Eevee.
  if (storyFlag("eeveeGift")) {
    return {
      title: "Celadon Mansion",
      body: `<p class="story-text">The game-loving kid on the top floor grins as you pass. "How's that Eevee doing? Evolve it into something awesome!"</p>
        <p class="placeholder">✓ You received an <strong>Eevee</strong> here.</p>`,
    };
  }
  return {
    title: "Celadon Mansion",
    body: `<p class="story-text">On the top floor of the Celadon Mansion, a game-obsessed kid looks up from his console. "Oh — a real trainer! I found this little guy but I never battle. You should have it."</p>
      <p class="placeholder">He offers you an <strong>Eevee</strong> — the Evolution Pokémon, able to become Vaporeon, Jolteon or Flareon.</p>
      <button class="btn" data-take-eevee>🦊 Accept the Eevee</button>`,
  };
}

function billsHouseView() {
  // Gen 2 (Johto): Bill v Goldenrodu dá hráči Eevee. VLASTNÍ flag `johtoEeveeGift`
  // (NE sdílený `eeveeGift` s kantským Celadon Mansion!) + vlastní handler
  // [data-take-johto-eevee] – jinak by hráč, co už má kantského Eevee z Celadonu,
  // nikdy nedostal johtského. A kantský Eevee je region-locked (caughtRegion
  // "kanto"), takže v Johtu nelevelí ani neroste přátelství → nešel by vyvinout.
  // Johtský Eevee (createPokemon stampne caughtRegion "johto") → odemyká espeon
  // (happiness-day) / umbreon (happiness-night) v Johtu. Viz pokemonSystem.js:372.
  if (storyFlag("johtoEeveeGift")) {
    return {
      title: "Bill's House",
      body: `<p class="story-text">Bill tinkers with a Storage System prototype. "That Eevee settling in okay? In Johto, raise it close and it'll become Espeon by day or Umbreon by night. Neat, huh?"</p>
        <p class="story-text">He glances up. "Want <em>both</em>? Leave your Eevee with a <strong>Ditto</strong> at the <strong>Day-Care on Route 34</strong> (just south of Goldenrod) and you'll get an Egg — hatch a second Eevee, then raise one by day for <strong>Espeon</strong> and one by night for <strong>Umbreon</strong>."</p>
        <p class="placeholder">✓ You received an <strong>Eevee</strong> here.</p>`,
    };
  }
  return {
    title: "Bill's House",
    body: `<p class="story-text">Bill, the inventor of the Pokémon Storage System, waves you in. "You're a serious trainer — perfect. I've got this Eevee and no time to raise it. Take good care of it, would you?"</p>
      <p class="placeholder">He offers you an <strong>Eevee</strong> — in Johto it can evolve into <strong>Espeon</strong> (high friendship by day) or <strong>Umbreon</strong> (by night). Breed it with a Ditto at the Day-Care on Route 34 for a second one.</p>
      <button class="btn" data-take-johto-eevee>🦊 Accept the Eevee</button>`,
  };
}

function fightingDojoView() {
  // Věrný Kanto (Krok 12): Fighting Dojo v Saffronu. V kánonu si vybíráš JEDNOHO
  // Hitmona – my (cíl „celý dex na 1 průchod") dáváme OBA.
  // Dojo je zároveň domovem Training Grounds (placená EV zkratka + reset EV) –
  // sekce „EV Training" je dostupná vždy, když do Saffronu dojdeš.
  const evSection = `
    <hr class="story-sep" />
    <p class="story-text">Behind the sparring hall, the Dojo runs <strong>intensive EV training drills</strong>. For a fee the masters can drill a chosen stat into one of your Pokémon — or reset its Effort Values so you can start its spread fresh.</p>
    <button class="btn" data-open-ev-training>🏋️ EV Training</button>`;
  if (storyFlag("hitmonsGift")) {
    return {
      title: "Fighting Dojo",
      body: `<p class="story-text">The Dojo master bows respectfully as you enter. "Your fists — and your Pokémon — are strong. Train them well."</p>
        <p class="placeholder">✓ You received both <strong>Hitmonlee</strong> and <strong>Hitmonchan</strong> here.</p>${evSection}`,
    };
  }
  return {
    title: "Fighting Dojo",
    body: `<p class="story-text">Saffron's <strong>Fighting Dojo</strong> echoes with shouts and the crack of splitting boards. The Dojo master sizes you up, then nods at two Poké Balls resting on a rack. "A true champion deserves them both. Take my prized <strong>Hitmonlee</strong> and <strong>Hitmonchan</strong>!"</p>
      <button class="btn" data-take-hitmons>🥋 Accept both Pokémon</button>${evSection}`,
  };
}

function vermilionFishingHutView() {
  // Věrný Kanto (Krok ?): Vermilion Fishing Hut – starý rybář dá Old Rod (jednorázově).
  if (storyFlag("oldRodGift")) {
    return {
      title: "Fishing Hut",
      body: `<p class="story-text">The old fisherman nods knowingly. "You caught something good with that rod, eh?"</p>
        <p class="placeholder">✓ You received the <strong>Old Rod</strong> here.</p>`,
    };
  }
  return {
    title: "Fishing Hut",
    body: `<p class="story-text">Inside the rustic fishing hut, an old fisherman mends his nets. He looks up at you with a weathered smile.</p>
      <p class="story-text">"You look like a young trainer with the spirit to explore. Here — take my <strong>Old Rod</strong>. With a little patience, you'll reel in some fine Pokémon from the water."</p>
      <button class="btn" data-take-old-rod>🎣 Accept the Old Rod</button>`,
  };
}

function fuchsiaFishingHouseView() {
  // Věrný Kanto (Krok ?): Fuchsia Fishing House – rybářský mistr dá Good Rod a Super Rod
  // (obojí jednorázově). V jednom domě dva dárky.
  const hasGoodRod = storyFlag("goodRodGift");
  const hasSuperRod = storyFlag("superRodGift");

  let goodRodSection = hasGoodRod
    ? `<p class="placeholder">✓ You received the <strong>Good Rod</strong> here.</p>`
    : `<p class="story-text">The master fisherman gestures to a finely crafted rod on the wall. "This is my <strong>Good Rod</strong> — it will catch rarer Pokémon than the Old Rod, and in places where the currents run deeper."</p>
       <button class="btn" data-take-good-rod>🎣 Accept the Good Rod</button>`;

  let superRodSection = hasSuperRod
    ? `<p class="placeholder">✓ You received the <strong>Super Rod</strong> here.</p>`
    : `<p class="story-text">He points to his prized possession, a magnificent rod studded with care. "This is my <strong>Super Rod</strong> — the finest fishing tool I know. With it, you can fish in places others can only dream of. Use it well."</p>
       <button class="btn" data-take-super-rod>🎣 Accept the Super Rod</button>`;

  return {
    title: "Fishing House",
    body: `<p class="story-text">The master fisherman's house stands near the Safari Zone, filled with fishing memorabilia and the smell of salt water. The old master himself greets you warmly.</p>
      <p class="story-text">"A trainer! Welcome, welcome. Few know the art of fishing like we do here near the Safari Zone. Let me share my knowledge with you."</p>
      <hr class="story-sep">
      ${goodRodSection}
      <hr class="story-sep">
      ${superRodSection}`,
  };
}

/**
 * Gen 2 (Johto): Glitter Lighthouse v Olivine. Jasmine pečuje o nemocného Amphyho
 * (Ampharos) na vrcholu a nemůže do gymu. Lék SecretPotion je v lékárně v Cianwoodu.
 * Zdroj pravdy: flag `amphyHealed` (hotovo) a `secretpotionObtained` (máš lék).
 */
function olivineLighthouseView() {
  if (storyFlag("amphyHealed")) {
    return {
      title: "Glitter Lighthouse",
      body: `<p class="story-text"><strong>Amphy</strong> glows brilliantly once more, its light sweeping far out to sea to guide the ships home.</p>
        <p class="placeholder">✓ You healed Amphy with the SecretPotion. <strong>Jasmine</strong> has returned to the Olivine Gym — challenge her for the Mineral Badge!</p>`,
    };
  }
  if (storyFlag("secretpotionObtained")) {
    return {
      title: "Glitter Lighthouse",
      body: `<p class="story-text">At the top of the lighthouse, <strong>Jasmine</strong> kneels beside the ailing <strong>Amphy</strong>, the Ampharos whose glow guides Olivine's ships. You hold up the <strong>SecretPotion</strong> from the Cianwood pharmacy — her eyes light up with hope.</p>
        <button class="btn" data-heal-amphy>💊 Give Amphy the SecretPotion</button>`,
    };
  }
  if (!storyFlag("amphySeen")) { setStoryFlag("amphySeen"); commit(); }
  return {
    title: "Glitter Lighthouse",
    body: `<p class="story-text">You climb to the top of the lighthouse. <strong>Jasmine</strong>, the Gym Leader, is nursing a sick <strong>Amphy</strong> — the Ampharos that powers the beacon. "I can't leave it like this," she says. "Please… there's a <strong>pharmacy in Cianwood City</strong>, across the sea. Their <strong>SecretPotion</strong> could save Amphy."</p>
      <p class="placeholder">Sail to <strong>Cianwood City</strong> and visit the pharmacy to get the SecretPotion, then bring it back here.</p>`,
  };
}

/**
 * Gen 2 (Johto): Cianwood Pharmacy. Lékárník dá SecretPotion pro nemocného Amphyho.
 * Zdroj pravdy: flag `secretpotionObtained`.
 */
function cianwoodPharmacyView() {
  if (storyFlag("amphyHealed")) {
    return {
      title: "Cianwood Pharmacy",
      body: `<p class="story-text">The pharmacist smiles warmly. "I heard Amphy pulled through! My SecretPotion did the trick, eh? Olivine's light shines bright again thanks to you."</p>
        <p class="placeholder">✓ Amphy has been healed.</p>`,
    };
  }
  if (storyFlag("secretpotionObtained")) {
    return {
      title: "Cianwood Pharmacy",
      body: `<p class="story-text">"You've got the <strong>SecretPotion</strong> — now hurry!" the pharmacist urges. "That Ampharos on the Olivine lighthouse won't hold on forever."</p>
        <p class="placeholder">Take the SecretPotion back to the <strong>Glitter Lighthouse</strong> in Olivine City.</p>`,
    };
  }
  if (!storyFlag("amphySeen")) {
    return {
      title: "Cianwood Pharmacy",
      body: `<p class="story-text">The <strong>pharmacist</strong> looks up from his mortar. "My <strong>SecretPotion</strong>? That's only for a Pokémon in serious trouble. Who's it for?"</p>
        <p class="placeholder">Nothing to do here for now.</p>`,
    };
  }
  return {
    title: "Cianwood Pharmacy",
    body: `<p class="story-text">The <strong>pharmacist</strong> looks up as you enter. "You came from the Olivine lighthouse? For Amphy?" He reaches beneath the counter. "Here — my <strong>SecretPotion</strong>. It'll cure any Pokémon. Take it, and hurry back!"</p>
      <button class="btn" data-take-secretpotion>💊 Take the SecretPotion</button>`,
  };
}

/**
 * Gen 2 (Johto): Goldenrod Flower Shop. Prodavačka dá hráči Squirtbottle (item
 * squirtbottle + flag hasSquirtbottle). Squirtbottle probudí „strom" na Route 36
 * (boss route-36-sudowoodo) → flag sudowoodoCleared odemkne cestu na sever.
 * Zdroj pravdy: flag `hasSquirtbottle`.
 */
function goldenrodFlowerShopView() {
  if (storyFlag("hasSquirtbottle")) {
    return {
      title: "Goldenrod Flower Shop",
      body: `<p class="story-text">The florist beams. "With that <strong>Squirtbottle</strong> you can water anything along the routes. Oh — and if a 'tree' ever blocks your way north, give it a good squirt!"</p>
        <p class="placeholder">✓ You received the Squirtbottle here.</p>`,
    };
  }
  if (!hasBadge("plain-badge")) {
    return {
      title: "Goldenrod Flower Shop",
      body: `<p class="story-text">The <strong>florist</strong> arranges a bouquet. "My sister has a <strong>Squirtbottle</strong> for watering the plants on the routes — but she only gives it to trainers strong enough to beat <strong>Whitney</strong>!"</p>
        <p class="placeholder">Earn the <strong>Plain Badge</strong> at the Goldenrod Gym, then come back.</p>`,
    };
  }
  return {
    title: "Goldenrod Flower Shop",
    body: `<p class="story-text">The <strong>florist</strong> arranges a bouquet and smiles. "You look like someone who loves nature! Here — take this <strong>Squirtbottle</strong>. It's perfect for watering the plants out on the routes."</p>
      <button class="btn" data-take-squirtbottle>💦 Take the Squirtbottle</button>`,
  };
}


/** Vlastní hráč tento odznak? (progress.badges je globální seznam id odznaků.) */
function hasBadge(id) {
  return (getState().progress?.badges ?? []).includes(id);
}

/**
 * Gen 2 (Johto): Charcoal Kiln v Azalea Town – johtský zdroj HM01 Cut. HM jsou
 * REGIONÁLNÍ (v1.33.0): kantský Cut se v Johtu nedá učit ani použít, proto ho hráč
 * získává znovu tady. Bez gate (dostupné po příchodu do Azaley). Flag `hasCut`.
 */
function azaleaKilnView() {
  if (storyFlag("hasCut")) {
    return {
      title: "Charcoal Kiln",
      body: `<p class="story-text">The apprentice wipes soot from her brow. "Ilex Forest keeps the whole town in charcoal. With <strong>Cut</strong>, you'll clear those thickets easy — just mind the forest's guardian."</p>
        <p class="placeholder">✓ You received <strong>HM01 Cut</strong> here.</p>`,
    };
  }
  return {
    title: "Charcoal Kiln",
    body: `<p class="story-text">Heat rolls out of the kiln as a young apprentice tends the fire. "You're headed into <strong>Ilex Forest</strong>? The trees grow back thick as a wall. Here — take this <strong>HM01 Cut</strong>. We've a spare, and you'll need it more than we do."</p>
      <button class="btn" data-take-cut>🪓 Accept HM01 Cut</button>`,
  };
}

/**
 * Gen 2 (Johto): dům v Ecruteak City – johtský zdroj HM03 Surf. Laskavý muž dá HM03
 * Surf po získání Fog Badge (gate fog-badge, pacing). HM regionální (v1.33.0). Flag `hasSurf`.
 */
function ecruteakHouseView() {
  if (storyFlag("hasSurf")) {
    return {
      title: "Ecruteak House",
      body: `<p class="story-text">The old man nods toward the sea. "With <strong>Surf</strong>, no stretch of water can stop you now. Go on — the ocean's yours."</p>
        <p class="placeholder">✓ You received <strong>HM03 Surf</strong> here.</p>`,
    };
  }
  if (!hasBadge("fog-badge")) {
    return {
      title: "Ecruteak House",
      body: `<p class="story-text">A weathered man rocks by the window. "Surf? Aye, I've a spare HM for it. But the sea's no place for a greenhorn. Earn Ecruteak's <strong>Fog Badge</strong> from Morty first — then we'll talk."</p>
        <p class="placeholder">Defeat <strong>Morty</strong> (Fog Badge) to receive this HM.</p>`,
    };
  }
  return {
    title: "Ecruteak House",
    body: `<p class="story-text">The old man eyes your Fog Badge and grins. "Morty's beaten, eh? Then you're ready for open water. Take my <strong>HM03 Surf</strong> — ride the waves and see where they carry you."</p>
      <button class="btn" data-take-surf>🌊 Accept HM03 Surf</button>`,
  };
}

/**
 * Gen 2 (Johto): námořnický dům v Olivine City – johtský zdroj HM04 Strength. Starý
 * námořník dá HM04 Strength (bez gate). HM regionální (v1.33.0). Flag `hasStrength`.
 */
function olivineHouseView() {
  if (storyFlag("hasStrength")) {
    return {
      title: "Sailor's House",
      body: `<p class="story-text">The old sailor flexes a weathered arm. "With <strong>Strength</strong>, no boulder'll stand in your way. Haul 'em aside like I hauled cargo all those years!"</p>
        <p class="placeholder">✓ You received <strong>HM04 Strength</strong> here.</p>`,
    };
  }
  return {
    title: "Sailor's House",
    body: `<p class="story-text">A broad-shouldered retired sailor sits amid coils of rope. "Spent forty years shifting crates on the Olivine docks," he says. "Don't need this anymore — you take it. <strong>HM04 Strength</strong>, for a Pokémon with some muscle."</p>
      <button class="btn" data-take-strength>💪 Accept HM04 Strength</button>`,
  };
}

/**
 * Gen 2 (Johto): přístav v Olivine City – loď S.S. Aqua zpět do Kanta (Vermilion).
 * Jezdí bez podmínek, jakmile je hráč v Olivine (rozhodnutí autora 2026-10-20).
 * Klik obslouží wire() → travelToRegion("kanto"). Cesta tam = S.S. Anne (Kanto).
 */
function ssAquaView() {
  if ((getState().progress?.region ?? "kanto") !== "johto") {
    return {
      title: "S.S. Aqua",
      body: `<p class="story-text">The harbour is quiet. The S.S. Aqua is moored at the pier.</p>`,
    };
  }
  return {
    title: "S.S. Aqua",
    body: `<p class="story-text">Gulls wheel over the busy pier. A sailor checks the moorings of the gleaming <strong>S.S. Aqua</strong>. "Fastest ship on the sea! Straight across to <strong>Vermilion City</strong> in Kanto. Want to come aboard?"</p>
      <p class="story-text">"Your Johto team, Day Care and eggs stay here and wait for you. Over in Kanto your old team is ready to go again."</p>
      <button class="btn" data-sail-kanto>⛴️ Set sail for Kanto</button>`,
  };
}

/**
 * Gen 2 (Johto): Climber's Lodge v Blackthorn City – johtský zdroj HM07 Waterfall.
 * Horský vůdce dá HM07 Waterfall po získání Rising Badge (gate rising-badge). HM
 * regionální (v1.33.0). Flag `hasWaterfall`.
 */
function blackthornHouseView() {
  if (storyFlag("hasWaterfall")) {
    return {
      title: "Climber's Lodge",
      body: `<p class="story-text">The climber claps you on the shoulder. "<strong>Waterfall</strong>! Now even a wall of water's just another path up. The mountains are open to you, friend."</p>
        <p class="placeholder">✓ You received <strong>HM07 Waterfall</strong> here.</p>`,
    };
  }
  if (!hasBadge("rising-badge")) {
    return {
      title: "Climber's Lodge",
      body: `<p class="story-text">A rugged climber sharpens a pick by the fire. "Waterfall's not for beginners — you'll want a Pokémon that can handle Clair first. Come back with the <strong>Rising Badge</strong> and the HM's yours."</p>
        <p class="placeholder">Defeat <strong>Clair</strong> (Rising Badge) to receive this HM.</p>`,
    };
  }
  return {
    title: "Climber's Lodge",
    body: `<p class="story-text">The climber spots the Rising Badge and nods with respect. "Beat Clair, did you? Then you've earned this. <strong>HM07 Waterfall</strong> — climb the rushing water and reach the places others can't."</p>
      <button class="btn" data-take-waterfall>⛰️ Accept HM07 Waterfall</button>`,
  };
}

/**
 * Gen 2 (Johto): Dance Theater v Ecruteak City – pět Kimono Girls, každá s jiným
 * vývojem Eevee. Přijetí výzvy nastaví `danceTheaterChallenge` → odemkne gauntlet
 * (keyed ecruteak-city, viz ROCKET_GAUNTLETS_GEN2). Po vyčištění (danceTheaterCleared)
 * dá lead girl jednorázový dárek Luxury Ballů (flag `danceTheaterGift`).
 */
function danceTheaterView() {
  // Stav 4: dárek už vzat – jen flavour.
  if (storyFlag("danceTheaterGift")) {
    return {
      title: "Dance Theater",
      body: `<p class="story-text">The Kimono Girls sweep into a graceful bow as you enter. "Your bond with your Pokémon shines as brightly as any dance. You are always welcome here, trainer."</p>
        <p class="placeholder">✓ You bested the five Kimono Girls and received their gift here.</p>`,
    };
  }
  // Stav 3: gauntlet vyčištěn – lead girl nabídne dárek.
  if (storyFlag("danceTheaterCleared")) {
    return {
      title: "Dance Theater",
      body: `<p class="story-text">Zuki, the eldest Kimono Girl, folds her fan and smiles. "Five dances, five victories — and never once did your Pokémon falter in their trust of you. Please, accept these from us. They cradle a Pokémon in comfort and deepen the bond you share."</p>
        <button class="btn" data-take-kimono-gift>🎀 Accept ${KIMONO_GIFT_LUXURY_BALLS} Luxury Balls</button>`,
    };
  }
  // Stav 2: výzva přijata, gauntlet ještě nevyčištěn – pošli hráče do soubojů.
  if (storyFlag("danceTheaterChallenge")) {
    return {
      title: "Dance Theater",
      body: `<p class="story-text">The stage lights glow warm over the polished floor. The five <strong>Kimono Girls</strong> wait in a graceful line, their Eevee evolutions at their sides.</p>
        <p class="placeholder">Defeat all five Kimono Girls to prove the bond you share with your Pokémon.</p>
        <button class="btn" data-enter-dance-theater>💃 Take the stage (battle the Kimono Girls)</button>`,
    };
  }
  // Stav 1: výzva ještě nepřijata – zahaj ji.
  return {
    title: "Dance Theater",
    body: `<p class="story-text">Inside the Dance Theater, five elegant <strong>Kimono Girls</strong> turn to greet you. "We dance with the many faces of Eevee — Vaporeon, Jolteon, Flareon, Espeon and Umbreon," says the eldest. "A trainer's true strength is the bond they share with their Pokémon. Would you test yours against ours?"</p>
      <button class="btn" data-enter-dance-theater>💃 Accept the Kimono Girls' challenge</button>`,
  };
}

/**
 * Gen 2 (Johto): Radio Tower v Goldenrod City – johtský protějšek Silph Co. Team
 * Rocket ji obsadí AŽ po zásahu do mahoganské základny (gate `mahoganyHideoutCleared`).
 * Vstup do budovy nastaví `radioTowerStormed` → odemkne gauntlet tab (keyed
 * goldenrod-city, viz ROCKET_GAUNTLETS_GEN2) až k bossovi Archerovi. Po vyčištění
 * (`radioTowerCleared`) je z věže zase obyčejná rozhlasová stanice. Zdroj pravdy:
 * flagy mahoganyHideoutCleared / radioTowerStormed / radioTowerCleared.
 */
function radioTowerView() {
  // Stav 3: gauntlet vyčištěn – Rocket pryč, věž zase vysílá normálně.
  if (storyFlag("radioTowerCleared")) {
    return {
      title: "Radio Tower",
      body: `<p class="story-text">The Radio Tower hums with music again. Directors bustle between studios and the DJ waves you through. "Thanks to you, we're back on the air — Johto owes you one, kid."</p>
        <p class="placeholder">✓ You drove Team Rocket out of the Radio Tower.</p>`,
    };
  }
  // Stav 2: Rocket obsadil věž (po mahoganské základně) – pošli hráče do gauntletu.
  if (storyFlag("mahoganyHideoutCleared")) {
    return {
      title: "Radio Tower",
      body: `<p class="story-text">Team Rocket grunts have seized the <strong>Radio Tower</strong>, broadcasting a coded call to their scattered forces. The director is held hostage on an upper floor, and executives guard every landing up to their new boss, <strong>Archer</strong>.</p>
        <p class="placeholder">Fight your way up through the tower and take it back.</p>
        <button class="btn" data-enter-radio-tower>📻 Storm the Radio Tower (Radio Tower tab)</button>`,
    };
  }
  // Stav 1: klid – obyčejná rozhlasová věž (Rocket ji zatím neobsadil).
  return {
    title: "Radio Tower",
    body: `<p class="story-text">Goldenrod's <strong>Radio Tower</strong> buzzes with music, quizzes and the chatter of on-air hosts. From the top floor you can see all across the city.</p>
      <p class="placeholder">All quiet for now. Keep an ear out — rumor says Team Rocket has been stirring up north near <strong>Mahogany Town</strong>.</p>`,
  };
}

/**
 * Gen 2 (Johto): Kurtův dům v Azalea Town. Kurt kánonicky vyrábí Poké Bally z
 * Apricornů; Apricorn systém ve hře není (bally jsou tier-buyable), takže Kurt dá
 * jednorázový dárek sady Apricorn ballů jako díky za vyčištění Slowpoke Well
 * (gate `slowpokeWellCleared`). Zdroj pravdy: flag `kurtApricornGift`.
 */
function kurtsHouseView() {
  if (storyFlag("kurtApricornGift")) {
    return {
      title: "Kurt's House",
      body: `<p class="story-text">Kurt looks up from his workbench, a half-carved Apricorn in his weathered hands. "Those balls treating you well? Carved every one myself. Come back anytime — and keep those Rockets out of my town!"</p>
        <p class="placeholder">✓ Kurt gave you a set of handmade Apricorn Poké Balls here.</p>`,
    };
  }
  if (!storyFlag("slowpokeWellCleared")) {
    return {
      title: "Kurt's House",
      body: `<p class="story-text">Kurt, Azalea's old ball-maker, grabs his cane the moment you mention the <strong>Slowpoke Well</strong>. "Team Rocket, cutting off Slowpoke tails to sell? Not in my town!" He hurries toward the well. "Drive them out — then come back, and I'll carve you something special."</p>
        <p class="placeholder">Clear the <strong>Slowpoke Well</strong> of Team Rocket, then return.</p>`,
    };
  }
  return {
    title: "Kurt's House",
    body: `<p class="story-text">Kurt is back at his workbench, carving by lamplight. "You ran those Rockets out of the Slowpoke Well — Azalea owes you. Here, take these. I carve them from <strong>Apricorns</strong> the old way, each with its own knack for catching Pokémon."</p>
      <button class="btn" data-take-kurt-balls>🪵 Accept Kurt's Apricorn Balls</button>`,
  };
}

/**
 * Gen 2 (Johto): Goldenrod Underground – bratři holiči. Zvýší přátelství celého
 * týmu (jediný zdroj friendshipu mimo level-up). Každý bratr 1×/reálný den.
 */
function goldenrodUndergroundView() {
  const team = getTeamPokemon();
  const gold = getState().resources?.gold ?? 0;
  const today = todayStr();

  const brotherSection = (key) => {
    const b = HAIRCUT_BROTHERS[key];
    const usedToday = getState().story?.[b.flag] === today;
    const canAfford = gold >= b.cost;
    let status, button;
    if (team.length === 0) {
      status = `<p class="placeholder">Bring a Pokémon in your team first.</p>`;
      button = "";
    } else if (usedToday) {
      status = `<p class="placeholder">✓ The ${b.label.toLowerCase()} already cut your Pokémon's hair today. Come back tomorrow.</p>`;
      button = "";
    } else {
      status = canAfford
        ? ""
        : `<p class="placeholder">You need <strong>${b.cost}₽</strong> for this cut.</p>`;
      button = `<button class="btn" data-haircut="${key}" ${canAfford ? "" : "disabled"}>✂️ ${b.label} — ${b.cost}₽ (+${b.gain} friendship)</button>`;
    }
    return `
      <hr class="story-sep" />
      <p class="story-text"><strong>${b.label}:</strong> ${b.blurb} <span class="placeholder">(+${b.gain} friendship to your whole team)</span></p>
      ${status}
      ${button}`;
  };

  const teamSummary = team.length
    ? `<p class="placeholder">Your team's friendship — ${team
        .map((p) => {
          const f = friendshipOf(p);
          const name = getSpecies(p.speciesId)?.name ?? p.speciesId;
          const tag = f >= FRIENDSHIP_EVOLVE ? " (ready to evolve)" : "";
          return `${name}: ${f}${tag}`;
        })
        .join(" · ")}</p>`
    : "";

  return {
    title: "Underground Barbers",
    body: `<p class="story-text">Down in Goldenrod's bustling Underground, two barber brothers run their chairs side by side. "A good haircut does wonders for a Pokémon's mood!" one calls out. The happier a Pokémon is, the closer it grows to you — and some only evolve once that bond is strong enough.</p>
      ${teamSummary}
      ${brotherSection("younger")}
      ${brotherSection("older")}`,
  };
}

/**
 * Gen 2 (Johto): Bell (Tin) Tower v Ecruteaku. Kanonický domov Ho-Oh. Gate
 * isJohtoChampion; po splnění nasměruje hráče na Legendary tab (Ho-Oh encounter
 * na ecruteak-city). Nevede vlastní bojovou logiku – jen vstupní bod.
 */
function bellTowerView() {
  if (!storyFlag("isJohtoChampion")) {
    return {
      title: "Bell Tower",
      body: `<p class="story-text">The Bell Tower rises above Ecruteak, its stairway sealed by the sages. "This tower answers only to one who has proven themselves to all of Johto," an elder tells you. "Become the Champion, and the summit — and what waits there — will open to you."</p>
        <p class="placeholder">Become the <strong>Johto Champion</strong> to climb the Bell Tower.</p>`,
    };
  }
  if (ownsSpeciesInRegion("ho-oh", "johto")) {
    return {
      title: "Bell Tower",
      body: `<p class="story-text">Sunlight pours through the summit where <strong>Ho-Oh</strong> once waited. The sages bow — the rainbow Pokémon chose you.</p>
        <p class="placeholder">✓ You have met Ho-Oh atop the Bell Tower.</p>`,
    };
  }
  return {
    title: "Bell Tower",
    body: `<p class="story-text">The sages step aside. "Champion — the way is open." You climb the swaying stairway toward the summit, where a rainbow shimmers and the legendary <strong>Ho-Oh</strong> waits.</p>
      <button class="btn" data-open-legendary>🔔 Climb to the summit</button>`,
  };
}

/**
 * Gen 2 (Johto): Burned Tower (vstup v Ecruteaku). Eusine + mudrci – lore legendy
 * tří beastů + jednorázový dárek Ultra Ballů. Komnata beastů/Suicune = mapová
 * oblast "burned-tower".
 */
function burnedTowerView() {
  const giftSection = storyFlag("eusineGift")
    ? `<p class="placeholder">✓ Eusine gave you ${EUSINE_GIFT_BALLS}× Ultra Ball here.</p>`
    : `<p class="story-text">Eusine, the restless researcher who has chased <strong>Suicune</strong> for years, sizes you up. "You mean to catch the beasts? Then take these — you'd waste a hundred ordinary balls otherwise." He presses a bundle of Ultra Balls into your hands.</p>
       <button class="btn" data-take-eusine-balls>🔥 Accept Eusine's Ultra Balls</button>`;
  return {
    title: "Burned Tower",
    body: `<p class="story-text">Inside the blackened tower, Ecruteak's sages keep the old legend: three Pokémon perished here long ago and were brought back by Ho-Oh as <strong>Raikou</strong>, <strong>Entei</strong> and <strong>Suicune</strong>. Disturb the basement, they warn, and the beasts will wake and scatter across Johto.</p>
      <hr class="story-sep" />
      ${giftSection}`,
  };
}

/**
 * Gen 2 (Johto): Sprout Tower ve Violet City. Mniši trénují s Bellsprouty; na vrcholu
 * Elder dá hráči HM05 Flash (grantHmToPlayer(5) → flag hasFlash + item hm05-flash).
 * JEDINÝ johtský zdroj HM05 – bez něj nejde rozsvítit Dark Cave (unlock {visited
 * route-31, hm:5}) → Murkrow #198 / Wobbuffet #202 / Dunsparce #206 / Cleffa #173 by
 * byly díra v johtském dexu. Zdroj pravdy: flag `hasFlash`.
 */
function sproutTowerView() {
  // Stav 3: Flash už máš – Elder jen poděkuje.
  if (storyFlag("hasFlash")) {
    return {
      title: "Sprout Tower",
      body: `<p class="story-text">The great central pillar sways gently, as it has for a thousand years. The <strong>Elder</strong> nods from his cushion at the top. "With Flash to light your way, even the Dark Cave holds no fear. May your Pokémon grow as tall and supple as this tower."</p>
        <p class="placeholder">✓ You received <strong>HM05 Flash</strong> here.</p>`,
    };
  }
  // Stav 2: gauntlet vyčištěn (Elder poražen) – nabídne HM05 Flash.
  if (storyFlag("sproutTowerCleared")) {
    return {
      title: "Sprout Tower",
      body: `<p class="story-text">The <strong>Elder</strong> bows his head as you reach the top floor. "You battled your way up with grace and strength, just as this tower bends but never breaks. Take this — <strong>HM05 Flash</strong>. It will light the darkest cave, so you need never lose your way."</p>
        <button class="btn" data-take-flash>🔦 Accept HM05 Flash</button>`,
    };
  }
  // Stav 1: gauntlet nevyčištěn – pošli hráče do soubojů se sages.
  return {
    title: "Sprout Tower",
    body: `<p class="story-text">You step inside Sprout Tower, where rows of chanting monks train with their <strong>Bellsprout</strong> around the single giant pillar that sways overhead. "To reach the Elder at the top," one sage intones, "you must first prove yourself against the sages of the tower."</p>
      <p class="placeholder">Battle your way up through the sages. Clear them all and the Elder will reward you with <strong>HM05 Flash</strong>.</p>
      <button class="btn" data-enter-sprout-tower>🗼 Climb the tower (battle the sages)</button>`,
  };
}

/**
 * Gen 2 (Johto): Dragon's Den shrine za Blackthorn City. Po získání Rising Badge
 * (poražení Clair) tě Dragon Elder podrobí zkoušce a dá dárkového Dratiniho se
 * sacred move ExtremeSpeed (kánon GSC – odlišný od divokého v Dragon's Den).
 * Gate: progress.badges obsahuje "rising-badge". Zdroj pravdy: flag `dragonsDenDratini`.
 */
function dragonsDenView() {
  const clairBeaten = (getState().progress?.defeatedTrainers ?? []).includes("clair");
  // Stav 5: dárkový Dratini už vzat – Elder jen poděkuje.
  if (storyFlag("dragonsDenDratini")) {
    return {
      title: "Dragon's Den",
      body: `<p class="story-text">The still waters of the shrine mirror the cavern's ancient carvings. The <strong>Dragon Elder</strong> bows his head. "The Dratini you earned carries the blood of champions — and a move no wild one knows. Raise it well, Dragon Master."</p>
        <p class="placeholder">✓ You passed the Elder's test and received a <strong>Dratini</strong> here.</p>`,
    };
  }
  // Stav 4: gauntlet vyčištěn (Elder poražen) – nabídne dárkového Dratiniho.
  if (storyFlag("dragonsDenCleared")) {
    return {
      title: "Dragon's Den",
      body: `<p class="story-text">The defeated <strong>Dragon Elder</strong> rises slowly, and this time his stern face softens into a smile. "You battled with power, yet never cruelty. Your heart is sound." He beckons to a young <strong>Dratini</strong> coiled by the shrine. "Take this one — raised in the Clan's care, it already knows the sacred move <strong>Extreme Speed</strong>."</p>
        <button class="btn" data-take-dragons-dratini>🐉 Accept the Elder's Dratini</button>`,
    };
  }
  // Stav 1: Clair ještě neporažena – nelze vstoupit.
  if (!clairBeaten) {
    return {
      title: "Dragon's Den",
      body: `<p class="story-text">Mist drifts over the sacred lake behind Blackthorn. A Clan guardian blocks the path and shakes his head. "Only a trainer who has defeated <strong>Clair</strong> may be tested at the shrine. Prove yourself at the Blackthorn Gym first."</p>
        <p class="placeholder">Defeat <strong>Clair</strong> at the Blackthorn Gym, then return to be tested.</p>`,
    };
  }
  // Stav 3: test spuštěn, gauntlet ještě nevyčištěn – pošli hráče do soubojů.
  if (storyFlag("dragonsDenTestStarted")) {
    return {
      title: "Dragon's Den",
      body: `<p class="story-text">The sacred shrine stretches before you across the still water. The <strong>Dragon Clan</strong> awaits, the Dragon Elder at their heart.</p>
        <p class="placeholder">Battle through the Clan and defeat the Dragon Elder to prove yourself and earn his gift.</p>
        <button class="btn" data-enter-dragons-den>🐉 Enter the shrine (face the Clan)</button>`,
    };
  }
  // Stav 2: Clair poražena, test ještě nezačal – zahaj ho.
  return {
    title: "Dragon's Den",
    body: `<p class="story-text">The <strong>Dragon Elder</strong> rises as you approach the shrine. "Clair sent you? A true Dragon Master is judged by the heart, not by strength alone. If you would be tested, enter the shrine and face the Clan in battle. Pass, and Clair will grant you the Rising Badge."</p>
      <button class="btn" data-enter-dragons-den>🐉 Accept the Elder's test</button>`,
  };
}

function tradeHouseView(storyKey) {
  // Věrný Kanto (Krok 12): kanonická městská výměna. Tlačítko se nabídne jen když
  // hráč požadovaný druh vlastní; jinak navede, ať ho chytí a vrátí se.
  const t = CITY_TRADES[storyKey];
  if (!t) return unknownView();
  if (storyFlag(t.flag)) {
    return {
      title: "Trade House",
      body: `<p class="story-text">The trader beams. "That <strong>${t.giveName}</strong> treating you right? Best trade I ever made!"</p>
        <p class="placeholder">✓ You traded your ${t.wantName} for ${t.giveName} here.</p>`,
    };
  }
  const owns = ownsSpeciesInRegion(t.want); // region-lock: odevzdá se jen jedinec z tohoto regionu
  return {
    title: "Trade House",
    body: `<p class="story-text">${t.intro}</p>
      ${owns
        ? `<p class="placeholder">You have a <strong>${t.wantName}</strong> to trade. It'll come back to you as a <strong>${t.giveName}</strong> at the same level.</p>
           <button class="btn" data-trade="${storyKey}">🔄 Trade ${t.wantName} for ${t.giveName}</button>`
        : `<p class="placeholder">You don't have a <strong>${t.wantName}</strong> right now. Catch one and come back to make the trade.</p>`}`,
  };
}

function gameCornerView(johtoArcade = false) {
  // Věrný Kanto: za automaty Game Corneru se skrývá vchod do Rocket Hideoutu.
  // Před vyčištěním navede hráče do „Team Rocket" tabu; PO vyčištění (Krok 13)
  // je z herny plnohodnotná herna: automat + směnárna + prize corner.
  // Gen 2: Goldenrod Game Corner volá s johtoArcade=true → poctivá herna rovnou
  // (Rocket hideout je u Mahogany, ne pod touhle hernou). Sdílí coiny i Porygon prize.
  if (johtoArcade || storyFlag("rocketHideoutCleared")) {
    const coins = getState().resources?.coins ?? 0;
    const gold = getState().resources?.gold ?? 0;
    const reels = lastSpin ? lastSpin.reels.join(" ") : "❔ ❔ ❔";
    const spinMsg = lastSpin
      ? (lastSpin.payout > 0
          ? `<span class="gc-win">🎉 You won ${lastSpin.payout} coins!</span>`
          : `<span class="gc-lose">No match — spin again!</span>`)
      : `Insert ${SLOT_BET} coins and pull the lever!`;

    const tabsHtml = GC_TABS.map((t) =>
      `<button class="btn btn-sm gc-tab ${gcTab === t.id ? "active" : ""}" data-gc-tab="${t.id}">${t.label}</button>`
    ).join("");

    let content;
    if (gcTab === "blackjack") {
      const g = bjGame;
      const playing = g && g.phase === "playing";
      const dealerCards = g
        ? g.dealer.map((c, i) => bjCardHtml(c, playing && i === 1)).join(" ")
        : `${bjCardHtml(null, true)} ${bjCardHtml(null, true)}`;
      const playerCards = g ? g.player.map((c) => bjCardHtml(c, false)).join(" ") : "—";
      const dealerTotal = g ? (playing ? `${bjValue([g.dealer[0]])} + ?` : bjValue(g.dealer)) : "—";
      const playerTotal = g ? bjValue(g.player) : "—";
      const msg = g ? (g.msg || "Hit or Stand?") : "Choose your bet and deal.";
      const resClass = g && g.phase === "done"
        ? (g.result === "win" ? "gc-win" : g.result === "push" ? "" : "gc-lose") : "";
      const betPicker = BJ_BETS.map((b) =>
        `<button class="btn btn-sm bj-bet ${b === bjBet ? "active" : ""}" data-bj-bet="${b}" ${coins < b ? "disabled" : ""}>${b} 🪙</button>`
      ).join("");
      content = `
        <h3 class="gc-h">🃏 Blackjack</h3>
        <div class="bj-table">
          <div class="bj-hand"><span class="bj-label">Dealer</span><span class="bj-total">${dealerTotal}</span><div class="bj-cards">${dealerCards}</div></div>
          <div class="bj-hand"><span class="bj-label">You</span><span class="bj-total">${playerTotal}</span><div class="bj-cards">${playerCards}</div></div>
        </div>
        <p class="gc-spinmsg ${resClass}">${msg}</p>
        ${playing ? "" : `<div class="gc-row bj-bets"><span class="bj-label">Bet:</span>${betPicker}</div>`}
        <div class="gc-row">
          ${playing
            ? `<button class="btn" data-bj-hit>🂠 Hit</button><button class="btn" data-bj-stand>✋ Stand</button>`
            : `<button class="btn" data-bj-deal ${coins < bjBet ? "disabled" : ""}>🃏 Deal (${bjBet} 🪙)</button>`}
        </div>`;
    } else if (gcTab === "prizes") {
      content = `
        <h3 class="gc-h">🎁 Prize Corner</h3>
        <div class="gc-row gc-prizes">
          ${gameCornerPrizes(johtoArcade).map((pr) => {
            const name = getSpecies(pr.id)?.name ?? pr.id;
            // Region-aware: Celadon (kanto) i Goldenrod (johto) sdílejí tenhle view,
            // ale kolekce je unikátní per druh+region. Gate na AKTUÁLNÍ region, aby
            // johtský Porygon šel získat i s kantským v kolekci → porygon2 #233 je
            // dosažitelný v jednom johtském průchodu. Viz team.ownsSpeciesInRegion.
            const owned = ownsSpeciesInRegion(pr.id, getState().progress?.region ?? "kanto");
            const afford = coins >= pr.cost;
            const label = owned ? "✓ Owned" : `${pr.cost} 🪙`;
            return `<button class="btn btn-sm gc-prize" data-buy-prize="${pr.id}" ${owned || !afford ? "disabled" : ""}>${name} — ${label}</button>`;
          }).join("")}
        </div>
        <p class="placeholder">The clerk winks: "That <strong>Porygon</strong> is one of a kind — you'll only ever get one here."</p>
        <h3 class="gc-h">💿 TM Prizes</h3>
        <div class="gc-row gc-prizes">
          ${TMS.filter((tm) => tm.coins).map((tm) => {
            const afford = coins >= tm.coins;
            return `<button class="btn btn-sm gc-prize" data-buy-tm="${tm.num}" ${afford ? "" : "disabled"}>${tmDisplayName(tm)} — ${tm.coins} 🪙</button>`;
          }).join("")}
        </div>`;
    } else if (gcTab === "exchange") {
      content = `
        <h3 class="gc-h">💱 Coin Exchange</h3>
        <div class="gc-row">
          ${COIN_PACKS.map((p) => `<button class="btn btn-sm" data-buy-coins="${p.coins}" ${gold < p.gold ? "disabled" : ""}>Buy ${p.coins} 🪙 — ${p.gold}₽</button>`).join("")}
        </div>`;
    } else {
      content = `
        <h3 class="gc-h">🎰 Slot Machine <span class="gc-sub">(${SLOT_BET} coins / spin)</span></h3>
        <div class="gc-reels">${reels}</div>
        <p class="gc-spinmsg">${spinMsg}</p>
        <button class="btn" data-slot-spin ${coins < SLOT_BET ? "disabled" : ""}>🎰 Spin (${SLOT_BET} 🪙)</button>`;
    }

    return {
      title: johtoArcade ? "🎰 Goldenrod Game Corner" : "🎰 Game Corner",
      body: `
        <p class="story-text">${johtoArcade
          ? "The Goldenrod Game Corner never sleeps — slots chime, cards snap, and coins jingle across the floor."
          : "With Team Rocket gone, the Celadon Game Corner is an honest — and very loud — arcade again. Coins jingle everywhere."}</p>
        <p class="gc-balance">🪙 Coins: <strong>${coins}</strong> &nbsp;·&nbsp; 💰 Money: <strong>${gold}₽</strong></p>
        <div class="gc-tabs">${tabsHtml}</div>
        ${content}
      `,
    };
  }
  return {
    title: "Game Corner",
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
      title: "Warden's House",
      body: `<p class="story-text">The old <strong>Warden</strong> beams a full, golden smile at you. "Thanksh — er, thanks again for my teeth, sonny!"</p>
        <p class="placeholder">✓ You returned the Gold Teeth and received <strong>HM04 Strength</strong>. Now you can shove boulders out of the way.</p>`,
    };
  }
  const items = getState().resources?.items ?? {};
  const hasTeeth = (items["gold-teeth"] ?? 0) > 0;
  if (hasTeeth) {
    return {
      title: "Warden's House",
      body: `<p class="story-text">The <strong>Warden</strong> mumbles toothlessly and points helplessly at his mouth. You hold up the <strong>Gold Teeth</strong> you found in the Safari Zone — his eyes go wide!</p>
        <button class="btn" data-return-teeth>🦷 Return the Gold Teeth</button>`,
    };
  }
  return {
    title: "Warden's House",
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
      title: "Pokémon Mansion",
      body: `<p class="story-text">The scorched halls stand silent at last. You cracked the shifting-wall maze, drove off the Burglars, and cleared the vault.</p>
        <p class="placeholder">✓ You solved the mansion and took the <strong>Secret Key</strong>. The Cinnabar Gym door is unlocked.</p>`,
    };
  }
  if (storyFlag("mansionPuzzleSolved")) {
    return {
      title: "Pokémon Mansion",
      body: `<p class="story-text">You've realigned the shifting walls — the way into the inner labs stands open. But <strong>Burglars</strong> and their boss still prowl the corridors, guarding the vault that holds the <strong>Secret Key</strong>.</p>
        <p class="placeholder">Face them in the <strong>Mansion</strong> tab.</p>
        <button class="btn" data-open-mansion>🏚️ Enter the inner labs (Mansion tab)</button>`,
    };
  }
  return {
    title: "Pokémon Mansion",
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
      title: `Shifting Halls — Room ${i + 1} / ${total}`,
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
                title: "The Walls Fall Silent",
                body: `<p class="story-text">A deep clunk echoes through the mansion. The last wall slides aside, baring a scorched corridor into the <strong>inner labs</strong> — where Burglars and their boss stand guard over the vault.</p>
                  <p class="story-text">Face them in the <strong>Mansion</strong> tab to reach the Secret Key.</p>`,
                okLabel: "Enter the inner labs",
                onOk: () => openMainTab("rockets"),
              });
            }
          } else {
            // Špatná socha → oblak kouře, zopakuj tutéž místnost.
            showPopup({
              title: "A Trap!",
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
  // Věrný Kanto (Krok 9): Cinnabar Lab – oživení fosílií (kánon!). Kdo drží
  // Helix/Dome fosílii nebo Old Amber, může ji tu nechat oživit na
  // Omanyte/Kabuto/Aerodactyl (fosílie se spotřebuje). Vědci zmiňují i pověsti
  // o Mewtwovi (napojení na Mansion).
  const items = getState().resources?.items ?? {};
  const revivable = Object.keys(FOSSIL_TO_SPECIES).filter((id) => (items[id] ?? 0) > 0);
  let fossilSection;
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
  } else {
    fossilSection = `<hr class="story-sep">
      <p class="placeholder">Bring an ancient <strong>fossil</strong> (Helix, Dome, or Old Amber) and the machine here can revive it into a living Pokémon.</p>`;
  }

  return {
    title: "Pokémon Lab",
    body: `<p class="story-text">Cinnabar's research lab hums with equipment. A scientist looks up from a microscope.</p>
      <p class="story-text">"We study ancient Pokémon revived from fossils here. There are… darker rumors too, about experiments in the old mansion up the road. Best not to dwell on those."</p>
      ${fossilSection}`,
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
    openStarterModal(() => {
      // Po výběru startéra Oak předá Pokédex, poví o rivalovi a navede na záložku Rival.
      showPopup({
        title: "Oak's Lab",
        body:
          `Professor Oak: "A fine choice! Here — take this Pokédex too. Record every Pokémon you meet, and one day you'll complete it."<br><br>` +
          `"Oh, one more thing — <strong>${rivalName()}</strong> just picked a Pokémon as well, and can't wait to test it against yours! ` +
          `You'll find them waiting in the <strong>Rival</strong> tab."`,
        okLabel: "Go to the Rival tab",
        onOk: () => openMainTab("rival"),
      });
    });
  });

  // Oak's Lab – capstone: hráč s kompletním dexem ukáže Oakovi Pokédex. Spustí se
  // slavnostní obřad (viz diploma.startDiplomaCeremony): gratulace → vizuální Diplom
  // + stažení → předání Shiny Charmu → poděkování. Flagy nastaví až obřad na konci.
  overlay.querySelector("[data-claim-diploma]")?.addEventListener("click", () => {
    const { caught, total } = dexCountsByGen()[1] ?? { caught: 0, total: 0 };
    if (total === 0 || caught < total) {
      onStatus("Your Kanto Pokédex isn't complete yet.");
      render();
      return;
    }
    close(); // Oak's Lab zavřeme, scénu přebírá obřad (řetězené popupy + diplom)
    startDiplomaCeremony({ region: "kanto", onStatus });
  });

  // Elm's Lab – capstone Gen 2: stejný obřad, ale regionálně pro Johto (Prof. Elm).
  overlay.querySelector("[data-claim-diploma-johto]")?.addEventListener("click", () => {
    const { caught, total } = dexCountsByGen()[2] ?? { caught: 0, total: 0 };
    if (total === 0 || caught < total) {
      onStatus("Your Johto Pokédex isn't complete yet.");
      render();
      return;
    }
    close(); // Elm's Lab zavřeme, scénu přebírá obřad (řetězené popupy + diplom)
    startDiplomaCeremony({ region: "johto", onStatus });
  });

  // Oak's Lab – doručení Oak's Parcel: odemkne sever (Route 2) + Poké Bally.
  overlay.querySelector("[data-deliver-parcel]")?.addEventListener("click", () => {
    const s = getState();
    if (!s.resources.balls) s.resources.balls = {};
    s.resources.balls.poke = (s.resources.balls.poke ?? 0) + PARCEL_BALLS;
    setStoryFlag("oakParcelDelivered");
    commit();
    onStatus(`Oak gave you the Pokédex and EXP Share! +${PARCEL_BALLS}× Poké Ball. The road north is now open.`);
    render();
  });

  // Goldenrod Underground – bratři holiči: boost přátelství celého týmu (1×/den/bratr).
  overlay.querySelectorAll("[data-haircut]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-haircut");
      const b = HAIRCUT_BROTHERS[key];
      if (!b) return;
      const s = getState();
      const today = todayStr();
      if (!s.story) s.story = {};
      if (s.story[b.flag] === today) return; // pojistka: už dnes použito
      if ((s.resources?.gold ?? 0) < b.cost) {
        onStatus("You can't afford that haircut.");
        return;
      }
      const team = getTeamPokemon();
      if (team.length === 0) {
        onStatus("You have no Pokémon in your team to groom.");
        return;
      }
      s.resources.gold -= b.cost;
      team.forEach((p) => gainFriendship(p, b.gain));
      s.story[b.flag] = today;
      commit();
      onStatus(`The ${b.label.toLowerCase()} gave your team a haircut — everyone feels happier! (+${b.gain} friendship each)`);
      render();
    });
  });

  // Bell Tower (Ecruteak) – vstup na vrchol za Ho-Oh: přepne na Legendary tab.
  overlay.querySelector("[data-open-legendary]")?.addEventListener("click", () => {
    close();
    openMainTab("legendary");
  });

  // Burned Tower (Ecruteak) – Eusine dá jednorázově Ultra Bally na chytání beastů.
  overlay.querySelector("[data-take-eusine-balls]")?.addEventListener("click", () => {
    if (storyFlag("eusineGift")) return; // pojistka
    const s = getState();
    if (!s.resources.balls) s.resources.balls = {};
    s.resources.balls.ultra = (s.resources.balls.ultra ?? 0) + EUSINE_GIFT_BALLS;
    setStoryFlag("eusineGift");
    commit();
    onStatus(`Eusine gave you ${EUSINE_GIFT_BALLS}× Ultra Ball to help you catch the legendary beasts!`);
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

  // Cinnabar Pokémon Lab – oživení fosílie: spotřebuje fosílii, přidá druh.
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
    // Po prvním chycení = opakovatelný shiny-hunt bez odměn (viz battleSystem).
    const already = ownsSpecies("mew");
    close();
    // Scéna: náklaďák se odsune a vyletí Mew; souboj až po potvrzení (legendaryScene.js).
    playLegendaryScene({
      speciesId: "mew", name: "Mew", button: already ? "Shiny hunt" : "Face Mew",
      onStart: () => {
        startStaticEncounter("mew", Math.max(50, giftLevel()), { noRewards: already });
        openMainTab("battle");
      },
    });
  });

  // S.S. Anne – plavba do Johto (gen 2). Přepne region → mapView se překreslí na
  // Johto (zatím prázdné plátno). Zpět do Kanto vede tlačítko na mapě.
  overlay.querySelector("[data-sail-johto]")?.addEventListener("click", () => {
    const res = travelToRegion("johto");
    close();
    if (!res.ok) {
      onStatus(res.reason ?? "Can't sail there right now.");
      return;
    }
    // Mapa je samostatný stálý panel – překreslí se sama přes STATE_CHANGED.
    // PRVNÍ příjezd = vtipný "celní" tutorial (region-lock + regionální Shiny Charm
    // vs. věci, co projdou clem). Při dalších plavbách jen krátké uvítání.
    if (storyFlag("johtoCustomsSeen")) {
      showPopup({
        title: "Welcome back to Johto",
        body: `<p class="story-text">The S.S. Anne docks once more in <strong>Johto</strong>. The customs officer waves you through with a grin. "Ah, our Champion again! You know the drill — Kanto team to the PC, Kanto Day Care and eggs stay behind, everything else is yours. Enjoy Johto!"</p>`,
        okLabel: "Step ashore",
      });
      return;
    }
    setStoryFlag("johtoCustomsSeen");
    commit();
    showJohtoCustomsTutorial();
  });

  // S.S. Aqua (Olivine) – zpět do Kanta (opačný směr než S.S. Anne výše).
  overlay.querySelector("[data-sail-kanto]")?.addEventListener("click", () => {
    const res = travelToRegion("kanto", "vermilion-city");
    close();
    if (!res.ok) {
      onStatus(res.reason ?? "Can't sail there right now.");
      return;
    }
    showPopup({
      title: "Welcome back to Kanto",
      body: `<p class="story-text">The S.S. Aqua glides into <strong>Vermilion</strong> harbour. Your Kanto team, Day Care, eggs and building upgrades are right where you left them. Your Johto team rests in the PC until you sail back.</p>`,
      okLabel: "Step ashore",
    });
  });

  // Prof. Elm's Lab – jednorázový výběr Johto startéra. Kanto starter (player
  // .starterId) se NEPŘEPISUJE; ukládáme story.johtoStarterId zvlášť. Nový mon
  // gen 2 → jako jediný smí hned bojovat v Johtu (region-lock).
  overlay.querySelectorAll("[data-choose-johto-starter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (storyFlag("johtoStarter")) return; // pojistka proti dvojkliku
      const id = btn.getAttribute("data-choose-johto-starter");
      if (!JOHTO_STARTER_IDS.includes(id)) return;
      const mon = createPokemon(id, JOHTO_STARTER_LEVEL);
      acquirePokemon(mon); // uloží do kolekce (commit uvnitř)
      // Přidej rovnou do týmu, ať je startér hned použitelný (region-lock: v Johtu
      // smí bojovat jen gen 2). Když je tým plný gen-1 monů, addToTeam vrátí false
      // – pak zůstane v PC a hráč si ho přehodí ručně (upozorníme ho zprávou).
      const inTeam = addToTeam(mon.uid);
      setStoryFlag("johtoStarter");
      const s = getState();
      if (!s.story) s.story = {};
      s.story.johtoStarterId = id;
      commit();
      const name = getSpecies(id)?.name ?? id;
      onStatus(
        inTeam
          ? `Prof. Elm gave you a ${name}! It joined your team.`
          : `Prof. Elm gave you a ${name}! Your team was full — add it from the PC to battle in Johto.`
      );
      render();
    });
  });

  // Pokémon Tower – souboj s rivalem na 2. patře (povinně manuál). Po výhře nastaví
  // story.towerRivalBeaten (viz battleSystem.finishTrainerBattle).
  overlay.querySelector("[data-fight-tower-rival]")?.addEventListener("click", () => {
    close();
    startTrainerBattle("rival-pokemon-tower", { forceManual: true });
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

  // Game Corner – přepínání her (Slots / Blackjack / Prizes / Exchange).
  overlay.querySelectorAll("[data-gc-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      gcTab = btn.getAttribute("data-gc-tab");
      render();
    });
  });

  // Game Corner – blackjack: výběr velikosti sázky.
  overlay.querySelectorAll("[data-bj-bet]").forEach((btn) => {
    btn.addEventListener("click", () => {
      bjBet = Number(btn.getAttribute("data-bj-bet"));
      render();
    });
  });

  // Game Corner – blackjack: rozdat / hit / stand.
  overlay.querySelector("[data-bj-deal]")?.addEventListener("click", () => {
    bjDeal(onStatus);
    render();
  });
  overlay.querySelector("[data-bj-hit]")?.addEventListener("click", () => {
    bjHit(onStatus);
    render();
  });
  overlay.querySelector("[data-bj-stand]")?.addEventListener("click", () => {
    bjStand(onStatus);
    render();
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
    // Achievementy: každé roztočení = hra; tři sedmičky = jackpot; nula = prohra.
    recordGameCorner("play");
    if (reels[0] === reels[1] && reels[1] === reels[2] && reels[0] === "7️⃣") recordGameCorner("jackpot");
    else if (payout === 0) recordGameCorner("loss");
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
      // Hledej v listu podle otevřené herny (Goldenrod = johtské druhy).
      const prize = gameCornerPrizes(storyKey === "goldenrod-game-corner").find((p) => p.id === id);
      if (!prize) return;
      if (ownsSpeciesInRegion(id, getState().progress?.region ?? "kanto")) {
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

  // Game Corner – TM prize corner: coiny za TM (opakovaně, konzumovatelný item).
  overlay.querySelectorAll("[data-buy-tm]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const num = parseInt(btn.getAttribute("data-buy-tm"), 10);
      const tm = getTm(num);
      if (!tm || !tm.coins) return;
      const s = getState();
      if ((s.resources?.coins ?? 0) < tm.coins) {
        onStatus("You don't have enough coins for that prize.");
        return;
      }
      s.resources.coins -= tm.coins;
      grantTm(num);
      commit();
      onStatus(`You exchanged ${tm.coins} coins for ${tmDisplayName(tm)}!`);
      render();
    });
  });

  // Prof. Elm's Lab (Johto) – Vejce od Mr. Pokémona → Togepi (jednorázově, flag
  // togepiGift). Jediný zdroj Togepi (#175) v Johtu; odemyká i togetic (#176).
  overlay.querySelector("[data-take-togepi]")?.addEventListener("click", () => {
    if (storyFlag("togepiGift")) return; // pojistka
    const lvl = giftLevel();
    acquirePokemon(createPokemon("togepi", lvl));
    setStoryFlag("togepiGift");
    commit();
    onStatus(`The Egg hatched into a Togepi (Lv. ${lvl})!`);
    render();
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

  // Bill's House (Johto) – dárek JOHTSKÉHO Eevee (vlastní flag johtoEeveeGift, NE
  // sdílený eeveeGift). createPokemon stampne caughtRegion = aktuální region
  // ("johto"), takže jedinec v Johtu levelí a roste přátelství → vyvine se na
  // Espeon (day) / Umbreon (night). Bez tohohle zdroje by #196/#197 byly díra v dexu.
  overlay.querySelector("[data-take-johto-eevee]")?.addEventListener("click", () => {
    if (storyFlag("johtoEeveeGift")) return; // pojistka
    const lvl = giftLevel();
    acquirePokemon(createPokemon("eevee", lvl));
    setStoryFlag("johtoEeveeGift");
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

  // Fighting Dojo – EV Training (Training Grounds domov): otevře výběr Pokémona
  // a pak okno tréninku/resetu EV (klíčováno na budovu "training-grounds").
  overlay.querySelector("[data-open-ev-training]")?.addEventListener("click", () => {
    openTrainingPicker("training-grounds", onStatus);
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
    if (!s.story) s.story = {};
    s.story.hasGoldTeeth = false;
    grantHmToPlayer(4); // HM04 Strength – flag + item centralizovaně (viz hmSystem)
    setStoryFlag("wardenThanked");
    commit();
    onStatus("The Warden gave you HM04 Strength! You can now move boulders aside.");
    render();
  });

  // Cianwood Pharmacy (Johto) – lékárník dá SecretPotion pro Amphyho (flag
  // secretpotionObtained). Jednorázové; pojistka proti dvojímu vzetí přes flag ve view.
  overlay.querySelector("[data-take-secretpotion]")?.addEventListener("click", () => {
    if (storyFlag("secretpotionObtained") || storyFlag("amphyHealed") || !storyFlag("amphySeen")) return; // pojistka
    setStoryFlag("secretpotionObtained");
    commit();
    onStatus("You received the SecretPotion! Take it to the Glitter Lighthouse in Olivine City.");
    render();
  });

  // Goldenrod Flower Shop (Johto) – prodavačka dá Squirtbottle (item squirtbottle +
  // flag hasSquirtbottle). Squirtbottle probudí Sudowoodo na Route 36. Jednorázové;
  // pojistka proti dvojímu vzetí přes flag ve view i tady.
  overlay.querySelector("[data-take-squirtbottle]")?.addEventListener("click", () => {
    if (storyFlag("hasSquirtbottle") || !hasBadge("plain-badge")) return; // pojistka
    const s = getState();
    if (!s.resources.items) s.resources.items = {};
    s.resources.items["squirtbottle"] = (s.resources.items["squirtbottle"] ?? 0) + 1;
    setStoryFlag("hasSquirtbottle");
    commit();
    onStatus("You received the Squirtbottle! Try it on that strange tree blocking Route 36.");
    render();
  });


  // Johtské zdroje HM (HM jsou regionální od v1.33.0 – nepřenášejí se z Kanta, viz
  // hmSystem.hmAvailable). grantHmToPlayer nastaví flat flag + regionální zrcadlo +
  // item. Pojistky ve view i tady (flag už máš / chybí odznak). Charcoal Kiln → Cut.
  overlay.querySelector("[data-take-cut]")?.addEventListener("click", () => {
    if (storyFlag("hasCut")) return; // pojistka
    grantHmToPlayer(1);
    commit();
    onStatus("You received HM01 Cut!");
    render();
  });

  // Ecruteak House → HM03 Surf (po Fog Badge).
  overlay.querySelector("[data-take-surf]")?.addEventListener("click", () => {
    if (storyFlag("hasSurf") || !hasBadge("fog-badge")) return; // pojistka
    grantHmToPlayer(3);
    commit();
    onStatus("You received HM03 Surf!");
    render();
  });

  // Sailor's House → HM04 Strength (bez gate).
  overlay.querySelector("[data-take-strength]")?.addEventListener("click", () => {
    if (storyFlag("hasStrength")) return; // pojistka
    grantHmToPlayer(4);
    commit();
    onStatus("You received HM04 Strength!");
    render();
  });

  // Climber's Lodge → HM07 Waterfall (po Rising Badge).
  overlay.querySelector("[data-take-waterfall]")?.addEventListener("click", () => {
    if (storyFlag("hasWaterfall") || !hasBadge("rising-badge")) return; // pojistka
    grantHmToPlayer(7);
    commit();
    onStatus("You received HM07 Waterfall!");
    render();
  });

  // Radio Tower (Johto) – vstup do gauntletu: nastaví radioTowerStormed (odemkne tab
  // gauntletu, keyed goldenrod-city) a otevře ho. Gate mahoganyHideoutCleared řeší view.
  overlay.querySelector("[data-enter-radio-tower]")?.addEventListener("click", () => {
    if (!storyFlag("mahoganyHideoutCleared")) return; // pojistka
    setStoryFlag("radioTowerStormed");
    commit();
    close();
    openMainTab("rockets");
  });

  // Dance Theater (Johto) – přijetí výzvy: nastaví danceTheaterChallenge (odemkne tab
  // gauntletu 5 Kimono Girls, keyed ecruteak-city) a otevře ho.
  overlay.querySelector("[data-enter-dance-theater]")?.addEventListener("click", () => {
    setStoryFlag("danceTheaterChallenge");
    commit();
    close();
    openMainTab("rockets");
  });

  // Dance Theater (Johto) – lead Kimono Girl dá po vyčištění gauntletu jednorázový
  // dárek Luxury Ballů (friendship-themed; bally → resources.balls, ne items).
  overlay.querySelector("[data-take-kimono-gift]")?.addEventListener("click", () => {
    if (storyFlag("danceTheaterGift") || !storyFlag("danceTheaterCleared")) return; // pojistka
    const s = getState();
    if (!s.resources.balls) s.resources.balls = {};
    s.resources.balls.luxury = (s.resources.balls.luxury ?? 0) + KIMONO_GIFT_LUXURY_BALLS;
    setStoryFlag("danceTheaterGift");
    commit();
    onStatus(`The Kimono Girls gave you ${KIMONO_GIFT_LUXURY_BALLS} Luxury Balls!`);
    render();
  });

  // Kurt's House (Johto) – po vyčištění Slowpoke Well dá Kurt jednorázovou sadu
  // Apricorn ballů (bally → resources.balls). Pojistka přes flagy ve view i tady.
  overlay.querySelector("[data-take-kurt-balls]")?.addEventListener("click", () => {
    if (storyFlag("kurtApricornGift") || !storyFlag("slowpokeWellCleared")) return; // pojistka
    const s = getState();
    if (!s.resources.balls) s.resources.balls = {};
    for (const ballId of KURT_APRICORN_BALLS) {
      s.resources.balls[ballId] = (s.resources.balls[ballId] ?? 0) + KURT_BALL_COUNT;
    }
    setStoryFlag("kurtApricornGift");
    commit();
    onStatus(`Kurt gave you ${KURT_BALL_COUNT} each of ${KURT_APRICORN_BALLS.length} kinds of Apricorn Balls!`);
    render();
  });

  // Sprout Tower (Johto) – vstup do gauntletu (sages). Otevře tab s frontou soubojů
  // (keyed violet-city). Vyčištění → sproutTowerCleared (viz finishTrainerBattle).
  overlay.querySelector("[data-enter-sprout-tower]")?.addEventListener("click", () => {
    close();
    openMainTab("rockets");
  });

  // Sprout Tower (Johto) – Elder dá HM05 Flash (grantHmToPlayer(5) = flag hasFlash +
  // item hm05-flash centralizovaně) PO vyčištění gauntletu. Jediný johtský zdroj HM05
  // → rozsvítí Dark Cave (#198/#202/#206/#173). Pojistka přes flagy ve view i tady.
  overlay.querySelector("[data-take-flash]")?.addEventListener("click", () => {
    if (storyFlag("hasFlash") || !storyFlag("sproutTowerCleared")) return; // pojistka
    grantHmToPlayer(5);
    commit();
    onStatus("You received HM05 Flash! You can now light up dark caves.");
    render();
  });

  // Dragon's Den (Johto) – zahájení testu: nastaví dragonsDenTestStarted (odemkne tab
  // gauntletu, keyed blackthorn-city) a otevře ho. Gate (Clair poražena) řeší view.
  overlay.querySelector("[data-enter-dragons-den]")?.addEventListener("click", () => {
    if (!(getState().progress?.defeatedTrainers ?? []).includes("clair")) return; // pojistka
    setStoryFlag("dragonsDenTestStarted");
    commit();
    close();
    openMainTab("rockets");
  });

  // Dragon's Den (Johto) – Dragon Elder dá po vyčištění gauntletu dárkového Dratiniho
  // se sacred move ExtremeSpeed (kánon GSC, odlišný od divokého v Dragon's Den).
  // Pojistka přes flagy i badge. acquirePokemon stampne caughtRegion johto.
  overlay.querySelector("[data-take-dragons-dratini]")?.addEventListener("click", () => {
    if (storyFlag("dragonsDenDratini") || !storyFlag("dragonsDenCleared")) return; // pojistka
    if (!(getState().progress?.badges ?? []).includes("rising-badge")) return; // pojistka
    const lvl = giftLevel();
    const dratini = createPokemon("dratini", lvl);
    // Vlož ExtremeSpeed (struktura {id, pp, maxPp}); při plné sadě nahraď poslední tah.
    const esMove = getMove("extreme-speed");
    if (esMove && !dratini.moves.some((m) => m.id === "extreme-speed")) {
      const entry = { id: "extreme-speed", pp: esMove.pp ?? 0, maxPp: esMove.pp ?? 0 };
      if (dratini.moves.length >= MAX_MOVES) dratini.moves[dratini.moves.length - 1] = entry;
      else dratini.moves.unshift(entry);
    }
    acquirePokemon(dratini);
    setStoryFlag("dragonsDenDratini");
    commit();
    onStatus(`You received a Dratini with Extreme Speed (Lv. ${lvl})!`);
    render();
  });

  // Olivine Lighthouse (Johto) – vyléčení Amphyho SecretPotionem: nastaví amphyHealed
  // (odemkne Olivine Gym / Jasmine, viz gen2/gyms.js requiresStory). Vyžaduje lék.
  overlay.querySelector("[data-heal-amphy]")?.addEventListener("click", () => {
    if (!storyFlag("secretpotionObtained") || storyFlag("amphyHealed")) return; // pojistka
    setStoryFlag("amphyHealed");
    commit();
    onStatus("Amphy is cured and glowing bright! Jasmine heads back to the Olivine Gym.");
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

  // Celadon Dept Store – „Shop the floors": otevře plný tabovaný obchod (všechna
  // patra: míčky, léčení, TM, kameny, held itemy, boosty). Dept Store nemá slevu.
  overlay.querySelector("[data-shop-floors]")?.addEventListener("click", () => {
    openMarket("dept-store", onStatus);
  });

  // Gen 2: Goldenrod Dept Store – stejný tabovaný obchod, johtský id.
  overlay.querySelector("[data-shop-goldenrod]")?.addEventListener("click", () => {
    openMarket("goldenrod-dept-store", onStatus);
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

  // Trainer Boost Center (Celadon) – upgrade jedné ze tří boost linií.
  overlay.querySelectorAll("[data-boost-up]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const key = btn.dataset.boostUp;
      const res = upgradeTrack(BOOST_CENTER_ID, key);
      if (!res.ok) {
        onStatus(res.reason ?? "Can't upgrade that.");
        return;
      }
      const def = getBuilding(BOOST_CENTER_ID)?.tracks?.[key];
      onStatus(`${def?.icon ?? "💪"} ${def?.name ?? "Boost"} upgraded to Lv ${getTrackLevel(BOOST_CENTER_ID, key)}.`);
      render();
    })
  );


  // Silph Co – vstup do gauntletu (přepne na Silph Co tab).
  overlay.querySelector("[data-enter-silph]")?.addEventListener("click", () => {
    close();
    openMainTab("rockets");
  });

  // Vermilion Fishing Hut – dárek Old Rod (jednorázově, flag oldRodGift).
  overlay.querySelector("[data-take-old-rod]")?.addEventListener("click", () => {
    const s = getState();
    if (!s.resources.items) s.resources.items = {};
    s.resources.items["old-rod"] = (s.resources.items["old-rod"] ?? 0) + 1;
    setStoryFlag("oldRodGift");
    commit();
    onStatus("You received the Old Rod!");
    render();
  });

  // Fuchsia Fishing House – dárek Good Rod (jednorázově, flag goodRodGift).
  overlay.querySelector("[data-take-good-rod]")?.addEventListener("click", () => {
    const s = getState();
    if (!s.resources.items) s.resources.items = {};
    s.resources.items["good-rod"] = (s.resources.items["good-rod"] ?? 0) + 1;
    setStoryFlag("goodRodGift");
    commit();
    onStatus("You received the Good Rod!");
    render();
  });

  // Fuchsia Fishing House – dárek Super Rod (jednorázově, flag superRodGift).
  overlay.querySelector("[data-take-super-rod]")?.addEventListener("click", () => {
    const s = getState();
    if (!s.resources.items) s.resources.items = {};
    s.resources.items["super-rod"] = (s.resources.items["super-rod"] ?? 0) + 1;
    setStoryFlag("superRodGift");
    commit();
    onStatus("You received the Super Rod!");
    render();
  });
}
