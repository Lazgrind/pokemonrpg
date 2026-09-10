/**
 * save.js – ukládání a načítání hry.
 *
 * Krok 1: localStorage + export/import do .txt souboru (zadání, sekce 7 a 15).
 * Save je verzovaný (saveVersion) a při načtení prochází migrací, aby šlo
 * v budoucnu bezpečně měnit datový model.
 */

import {
  getState,
  setState,
  createNewGame,
  CURRENT_SAVE_VERSION,
} from "../core/state.js";
import { randomIvs, emptyEvs, rollGender, computeStats, defaultMovesFor, randomNature, repairWeakMoveset, MAX_MOVES } from "./pokemonSystem.js";
import { getSpecies, POKEMON_SPECIES } from "../../data/pokemon.js";
import { AREAS } from "../../data/areas.js";

/** Klíč v localStorage. */
const SAVE_KEY = "pokemonIdleRpg.save";

/** Je v localStorage uložená hra? */
export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

/** Uloží aktuální stav do localStorage. */
export function saveGame() {
  const state = getState();
  state.meta.lastSaved = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  return true;
}

/**
 * Načte hru z localStorage. Vrací true při úspěchu.
 * @returns {boolean}
 */
export function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    setState(migrate(JSON.parse(raw)));
    return true;
  } catch (err) {
    console.error("Poškozený save v localStorage:", err);
    return false;
  }
}

/** Založí novou hru a rovnou ji uloží. */
export function newGame() {
  setState(createNewGame());
  saveGame();
}

/**
 * Migrace mezi verzemi datového modelu. Zatím jen doplní chybějící verzi.
 * @param {any} data
 * @returns {import("../core/state.js").GameState}
 */
function migrate(data) {
  if (typeof data !== "object" || data === null) {
    throw new Error("Neplatná struktura save.");
  }
  if (!data.saveVersion) data.saveVersion = 1;
  // v1 → v2: přidán uložený stav souboje.
  if (data.saveVersion < 2) {
    if (data.battle === undefined) data.battle = null;
    data.saveVersion = 2;
  }
  // v2 → v3: přidány budovy města.
  if (data.saveVersion < 3) {
    if (!data.city) data.city = { buildings: {} };
    data.saveVersion = 3;
  }
  // v3 → v4: IV/EV/shiny na jedincích. Doplníme jen chybějící pole, aby
  // stávající jedinci dostali náhodné IV (jako by odjakživa existovaly),
  // prázdné EV a shiny=false. Existující staty se tím jen doplní, ne přepíší.
  if (data.saveVersion < 4) {
    for (const p of data.collection ?? []) {
      if (!p.ivs) p.ivs = randomIvs();
      if (!p.evs) p.evs = emptyEvs();
      if (typeof p.shiny !== "boolean") p.shiny = false;
    }
    data.saveVersion = 4;
  }
  // v4 → v5: nastavení autocatch (chytání v souboji). Doplníme výchozí,
  // pokud chybí, ať staré save fungují beze změny chování (vypnuto).
  if (data.saveVersion < 5) {
    if (!data.settings) data.settings = { autoBattle: true };
    if (!data.settings.autocatch) {
      data.settings.autocatch = { enabled: false, newSpecies: true, betterIvs: true, shiny: true };
    }
    data.saveVersion = 5;
  }
  // v5 → v6: Poké Bally jako inventář po typech (resources.balls), vybraný typ
  // ballu a postup světem (progress.tier, odemyká typy ballů). Dosavadní počet
  // Poké Ballů se převede na typ „poke".
  if (data.saveVersion < 6) {
    if (!data.resources) data.resources = { gold: 0 };
    if (!data.resources.balls) {
      data.resources.balls = { poke: data.resources.pokeballs ?? 0 };
    }
    delete data.resources.pokeballs;
    if (!data.settings) data.settings = { autoBattle: true };
    if (!data.settings.selectedBall) data.settings.selectedBall = "poke";
    if (!data.progress) data.progress = { tier: 1 };
    data.saveVersion = 6;
  }
  // v6 → v7: vajíčka a líhnutí (R-021). Přidáme prázdný inventář vajec; slot
  // inkubace ve Školce (city.daycare.egg) se doplňuje lazy.
  if (data.saveVersion < 7) {
    if (!Array.isArray(data.eggs)) data.eggs = [];
    data.saveVersion = 7;
  }
  // v7 → v8: breeding podle egg groups (R-022). Breeding slot ve Školce
  // (city.daycare.breeding = { a, b, buffer }) se doplňuje lazy v buildingSystem,
  // takže tu jen posuneme verzi – staré save fungují beze změny chování.
  if (data.saveVersion < 8) {
    data.saveVersion = 8;
  }
  // v8 → v9: Pokédex (R-026). Přidáme prázdný seznam viděných druhů; chycené
  // se odvozují z kolekce, takže staré save rovnou ukážou vše vlastněné jako
  // „chyceno" a nic dalšího jako „viděno".
  if (data.saveVersion < 9) {
    if (!data.pokedex || typeof data.pokedex !== "object") data.pokedex = { seen: [] };
    if (!Array.isArray(data.pokedex.seen)) data.pokedex.seen = [];
    data.saveVersion = 9;
  }
  // v9 → v10: ball, ve kterém byl jedinec chycen (`caughtBall`). U starých
  // jedinců ho zpětně neznáme – nastavíme rozumný výchozí „poke" (naprostá
  // většina raných úlovků), ať se ikona na kartě ukáže i u dosavadní kolekce.
  if (data.saveVersion < 10) {
    for (const p of data.collection ?? []) {
      if (p.caughtBall === undefined) p.caughtBall = "poke";
    }
    data.saveVersion = 10;
  }
  // v10 → v11: pohlaví jedince (`gender`). U stávajících jedinců ho rozlosujeme
  // z poměru pohlaví druhu (jednorázově), ať mají všichni platné pohlaví.
  if (data.saveVersion < 11) {
    for (const p of data.collection ?? []) {
      if (p.gender === undefined) p.gender = rollGender(getSpecies(p.speciesId));
    }
    data.saveVersion = 11;
  }
  // v11 → v12: trvalé aktuální HP na jedinci (`hp`). Stávajícím doplníme plné
  // max HP, ať začínají „zdraví" (dřív se HP drželo jen běhově v souboji).
  if (data.saveVersion < 12) {
    for (const p of data.collection ?? []) {
      if (typeof p.hp !== "number") p.hp = computeStats(p).maxHp;
    }
    data.saveVersion = 12;
  }
  // v12 → v13: tahy na jedinci (`moves`). Stávajícím doplníme tahy z learnsetu
  // podle jejich aktuálního levelu, s plnými PP (dřív jedinci žádné tahy neměli).
  if (data.saveVersion < 13) {
    for (const p of data.collection ?? []) {
      if (!Array.isArray(p.moves)) p.moves = defaultMovesFor(p.speciesId, p.level);
    }
    data.saveVersion = 13;
  }
  // v13 → v14: fronta nabídek naučení tahu (`moveLearnQueue`). Když jedinec
  // levelováním získá nový tah, ale má plné 4 sloty, čeká zde na hráčovu volbu
  // nahrazení. Starým save doplníme prázdnou frontu.
  if (data.saveVersion < 14) {
    if (!Array.isArray(data.moveLearnQueue)) data.moveLearnQueue = [];
    data.saveVersion = 14;
  }
  // v14 → v15: trvalý stavový efekt na jedinci (`status`: otrava/popálení/paralýza).
  // Stávající jedinci žádný nemají – nastavíme null (status navěsí až souboj).
  if (data.saveVersion < 15) {
    for (const p of data.collection ?? []) {
      if (p.status === undefined) p.status = null;
    }
    data.saveVersion = 15;
  }
  // v15 → v16: povaha jedince (`nature`). Stávajícím rozlosujeme náhodnou povahu
  // (jednorázově), ať mají všichni platnou; staty se tím mírně přepočítají (±10 %).
  if (data.saveVersion < 16) {
    for (const p of data.collection ?? []) {
      if (typeof p.nature !== "string") p.nature = randomNature();
    }
    data.saveVersion = 16;
  }
  // v16 → v17: inventář léčivých předmětů (resources.items). Starým save doplníme
  // prázdný inventář; itemy se kupují v Poké Martu (viz data/items.js, itemSystem).
  if (data.saveVersion < 17) {
    if (!data.resources) data.resources = { gold: 0 };
    if (!data.resources.items || typeof data.resources.items !== "object") {
      data.resources.items = {};
    }
    data.saveVersion = 17;
  }
  // v17 → v18: drženého itemu na jedinci (`heldItem`). Stávajícím doplníme null
  // (žádný drženou item), ať všichni jedinci mají platné pole.
  if (data.saveVersion < 18) {
    for (const p of data.collection ?? []) {
      if (p.heldItem === undefined) p.heldItem = null;
    }
    data.saveVersion = 18;
  }
  // v18 → v19: PC boxy (úložiště jedinců mimo tým). Starým save doplníme prázdné
  // pole boxů; pcSystem.reconcile() při prvním vykreslení rozmístí všechny dosud
  // vlastněné jedince mimo tým do slotů (a založí Box 1, pokud žádný není).
  if (data.saveVersion < 19) {
    if (!Array.isArray(data.pcBoxes)) data.pcBoxes = [];
    data.saveVersion = 19;
  }
  // v19 → v20: herní pravidla / režimy (settings.rules: noItems/noPotions/nuzlocke)
  // a sledování Nuzlocke úlovků po oblastech (nuzlockeCaught). Starým save doplníme
  // vypnuté režimy a prázdný tracking, ať se chování nezmění.
  if (data.saveVersion < 20) {
    if (!data.settings) data.settings = { autoBattle: true };
    if (!data.settings.rules || typeof data.settings.rules !== "object") {
      data.settings.rules = { noItems: false, noPotions: false, nuzlocke: false };
    } else {
      const r = data.settings.rules;
      if (typeof r.noItems !== "boolean") r.noItems = false;
      if (typeof r.noPotions !== "boolean") r.noPotions = false;
      if (typeof r.nuzlocke !== "boolean") r.nuzlocke = false;
    }
    if (!data.nuzlockeCaught || typeof data.nuzlockeCaught !== "object") {
      data.nuzlockeCaught = {};
    }
    data.saveVersion = 20;
  }
  // v20 → v21: oprava „slabých" sad tahů (dřívější bug – jedinec mohl skončit
  // např. s 3 status + 1 útok, což v auto souboji vede k zaseknutí, protože nemá
  // čím ubírat HP). Přeskládá na útočné-first JEN u jedinců s ≤ 1 útočným tahem,
  // kde jde získat víc útočných; vyvážené sady (2+ útoky) nechává být.
  if (data.saveVersion < 21) {
    for (const p of data.collection ?? []) repairWeakMoveset(p);
    data.saveVersion = 21;
  }
  if (data.saveVersion < 22) {
    // Klikací mapa: aktivní oblast + odznaky (viz data/areas.js, mapView.js).
    data.progress = data.progress ?? { tier: 1 };
    if (!data.progress.activeAreaId) data.progress.activeAreaId = "route-01";
    if (!Array.isArray(data.progress.badges)) data.progress.badges = [];
    if (!data.mapPositions) data.mapPositions = {}; // override pozic uzlů z "režimu umístění"
    data.saveVersion = 22;
  }
  // v22 → v23: nový výchozí autocatch mód "none" (zapnutí Auto catch samo nezačne
  // hned chytat). Kdo autocatch nikdy nezapnul (enabled=false), dostane "none"
  // místo starého defaultu "all"; komu běžel (enabled=true), volbu necháme.
  if (data.saveVersion < 23) {
    const ac = data.settings?.autocatch;
    if (ac && ac.enabled === false && ac.mode === "all") ac.mode = "none";
    data.saveVersion = 23;
  }
  // v23 → v24: postup přes NÁVŠTĚVY (progress.visited) místo odemčení odznaky.
  // Staré save: označíme všechny oblasti jako navštívené (dřív byly všechny
  // odemčené), aby nikdo nepřišel o přístup – žádná regrese. Nová hra začíná
  // jen s Pallet Townem (viz createNewGame, data/areas.js).
  if (data.saveVersion < 24) {
    if (!data.progress) data.progress = { tier: 1, badges: [] };
    if (!Array.isArray(data.progress.visited)) {
      data.progress.visited = AREAS.map((a) => a.id);
    }
    data.saveVersion = 24;
  }
  // v24 → v25: trenéři/gymy – evidence poražených trenérů (jednorázová odměna +
  // sekvenční postup gymem). Staré save začínají bez poražených trenérů.
  if (data.saveVersion < 25) {
    if (!data.progress) data.progress = { tier: 1, badges: [], visited: [] };
    if (!Array.isArray(data.progress.defeatedTrainers)) {
      data.progress.defeatedTrainers = [];
    }
    data.saveVersion = 25;
  }
  // v25 → v26: věrný Kanto krok 2 – Route 2 se nově gatuje na doručení Oak's
  // Parcel (state.story.oakParcelDelivered). Kdo už Viridian navštívil PŘED touto
  // změnou (nemá žádné parcel flagy), toho „propustíme" (doručeno = true), ať
  // nikomu nezůstane sever zamčený – žádná regrese.
  if (data.saveVersion < 26) {
    if (!data.story || typeof data.story !== "object") data.story = {};
    const visited = Array.isArray(data.progress?.visited) ? data.progress.visited : [];
    // Kdo už prošel NA SEVER od Viridianu (Route 2 dál), toho „propustíme"
    // (doručeno), ať se nezablokuje. Kdo jen stojí ve Viridianu (nebo dřív),
    // dostane quest normálně (žádný flag → parcel naskočí příště v Oak's Lab
    // nebo se předá při dalším příchodu do Viridianu).
    const wentNorth = ["route-02", "viridian-forest", "pewter-city"].some((id) =>
      visited.includes(id)
    );
    if (wentNorth && !data.story.oakParcelDelivered) {
      data.story.oakParcelDelivered = true;
    } else if (visited.includes("viridian-city") && !data.story.oakParcelDelivered) {
      // Stojí ve Viridianu, ale ještě nešel na sever → má u sebe balíček k doručení.
      data.story.oakParcelGiven = true;
    }
    data.saveVersion = 26;
  }
  // v26 → v27: oprava bugu z v0.68.0, kde PŮVODNÍ v25→v26 migrace „propustila"
  // (oakParcelDelivered=true) KAŽDÝ save, který jen navštívil Viridian – i když
  // hráč nikdy nešel na sever. Takovým savům parcel doručení zrušíme a (pokud
  // stojí ve Viridianu) vrátíme quest, aby se Oak's Parcel dal doopravdy odehrát.
  if (data.saveVersion < 27) {
    if (!data.story || typeof data.story !== "object") data.story = {};
    const visited = Array.isArray(data.progress?.visited) ? data.progress.visited : [];
    const wentNorth = ["route-02", "viridian-forest", "pewter-city"].some((id) =>
      visited.includes(id)
    );
    if (data.story.oakParcelDelivered && !wentNorth) {
      // Chybně propuštěno – vrátit do stavu „quest běží / čeká na spuštění".
      delete data.story.oakParcelDelivered;
      if (visited.includes("viridian-city")) data.story.oakParcelGiven = true;
    }
    data.saveVersion = 27;
  }
  // v27 → v28: oprava bugu, kde jedinci mohli nasbírat VÍC než 4 tahy (fronta
  // nabídek naučení tahu přidávala do plných slotů bez capu). Ořežeme každou
  // sadu na MAX_MOVES: nejdřív pryč duplikáty (podle id), pak necháme prvních
  // MAX_MOVES – přebytky bug přidával na KONEC, takže první čtyři jsou ta správná
  // původní sada. PP/maxPp u zachovaných tahů zůstávají.
  if (data.saveVersion < 28) {
    for (const p of data.collection ?? []) {
      if (!Array.isArray(p.moves)) continue;
      const seen = new Set();
      const trimmed = [];
      for (const m of p.moves) {
        if (!m || seen.has(m.id)) continue;
        seen.add(m.id);
        trimmed.push(m);
        if (trimmed.length >= MAX_MOVES) break;
      }
      p.moves = trimmed;
    }
    data.saveVersion = 28;
  }
  // v28 → v29: Route 4 se nově gatuje na poražení Team Rocket gauntletu v Mt. Moon
  // (story.mtMoonRocketsCleared). Kdo už je za Mt. Moon (navštívil Route 4 nebo
  // dál), toho „propustíme" – nastavíme flag, ať mu sever nezůstane zamčený (žádná
  // regrese; gauntlet se v UI ukáže jako hotový, protože grunts označíme za poražené).
  if (data.saveVersion < 29) {
    if (!data.story || typeof data.story !== "object") data.story = {};
    const visited = Array.isArray(data.progress?.visited) ? data.progress.visited : [];
    if (visited.includes("route-04") || visited.includes("cerulean-city")) {
      data.story.mtMoonRocketsCleared = true;
      if (!Array.isArray(data.progress.defeatedTrainers)) data.progress.defeatedTrainers = [];
      for (let i = 1; i <= 5; i++) {
        const id = `mt-moon-rocket-${i}`;
        if (!data.progress.defeatedTrainers.includes(id)) data.progress.defeatedTrainers.push(id);
      }
    }
    data.saveVersion = 29;
  }
  // v29 → v30: Vermilion Gym se nově gatuje na HM Cut (story.hasCut ze S.S. Anne).
  // Kdo už porazil kteréhokoli trenéra Vermilion Gymu, ten se evidentně dostal
  // dovnitř – propustíme ho (nastavíme hasCut + ssAnneCleared), žádná regrese.
  if (data.saveVersion < 30) {
    if (!data.story || typeof data.story !== "object") data.story = {};
    const beaten = Array.isArray(data.progress?.defeatedTrainers) ? data.progress.defeatedTrainers : [];
    const vermilionGymTrainers = ["vermilion-gym-sailor-dwayne", "vermilion-gym-gentleman-gregory", "lt-surge"];
    if (vermilionGymTrainers.some((id) => beaten.includes(id))) {
      data.story.hasCut = true;
      data.story.ssAnneCleared = true;
    }
    data.saveVersion = 30;
  }
  // v30 → v31: Krok 6 – Rock Tunnel se nově gatuje na HM05 Flash (story.hasFlash,
  // získaný na Route 9). Kdo už Rock Tunnel (nebo dál) navštívil, toho propustíme
  // (nastavíme hasFlash + přidáme item do batohu), aby se nikomu nezamkla cesta.
  if (data.saveVersion < 31) {
    if (!data.story || typeof data.story !== "object") data.story = {};
    const visited = Array.isArray(data.progress?.visited) ? data.progress.visited : [];
    const pastTunnel = ["rock-tunnel", "route-10", "power-plant", "lavender-town"].some((id) =>
      visited.includes(id)
    );
    if (pastTunnel && !data.story.hasFlash) {
      data.story.hasFlash = true;
      if (!data.resources) data.resources = {};
      if (!data.resources.items) data.resources.items = {};
      data.resources.items["hm05-flash"] = (data.resources.items["hm05-flash"] ?? 0) + 1;
    }
    data.saveVersion = 31;
  }
  // v31 → v32: Krok 7 – Flash je nově za Route 9 Hiker gauntlet + 10 druhů v Pokédexu;
  // Snorlax na Route 12 blokuje jih (potřebuje Poké Flute z Pokémon Tower). Nikomu
  // ale nesmíme zpětně zamknout cestu, proto retroaktivně „propustíme" postoupené:
  //  • kdo už má Flash → bereme Route 9 Hikery za poražené (gauntlet hotový),
  //  • kdo má Rainbow Badge → Erika poražena,
  //  • kdo už navštívil Route 13 (za Snorlaxem) → Snorlax vyřešen + Poké Flute.
  if (data.saveVersion < 32) {
    if (!data.story || typeof data.story !== "object") data.story = {};
    if (!data.progress || typeof data.progress !== "object") data.progress = {};
    if (!Array.isArray(data.progress.defeatedTrainers)) data.progress.defeatedTrainers = [];
    if (!data.resources) data.resources = {};
    if (!data.resources.items) data.resources.items = {};
    const visited = Array.isArray(data.progress.visited) ? data.progress.visited : [];
    const badges = Array.isArray(data.progress.badges) ? data.progress.badges : [];

    if (data.story.hasFlash) {
      data.story.route9HikersCleared = true;
      for (const id of ["route-09-hiker-1", "route-09-hiker-2", "route-09-hiker-3"]) {
        if (!data.progress.defeatedTrainers.includes(id)) data.progress.defeatedTrainers.push(id);
      }
    }
    if (badges.includes("rainbow-badge")) data.story.erikaCleared = true;
    if (visited.includes("route-13")) {
      data.story.snorlaxCleared = true;
      data.story.hasPokeFlute = true;
      data.resources.items["poke-flute"] = (data.resources.items["poke-flute"] ?? 0) + 1;
    }
    data.saveVersion = 32;
  }
  // v32 → v33: Krok 8 – Fuchsia City + přepracované Safari. Safari Zone už NEDÁVÁ
  // Surf/Gold Teeth zadarmo za pouhý vstup – jsou to odměny za expedici (viz
  // safariSystem). Migrace proto řeší jen to, aby se nikdo nezamkl: kdo už je ZA
  // branou (jen díky Surf/Strength se tam dá dostat), musí příslušné HM opravdu mít.
  //  • kdo má Soul Badge → Koga poražen (+ flavour flag bludiště),
  //  • kdo navštívil Fuchsia → arrival flag,
  //  • kdo je za Surf gate (už na Route 19) → HM03 Surf + hasSurf,
  //  • kdo je za Strength gate (Victory Road) → HM04 Strength + hasStrength.
  // (Nový běhový stav state.safari se dolaďuje líně přes safariSystem.getSafari.)
  if (data.saveVersion < 33) {
    if (!data.story || typeof data.story !== "object") data.story = {};
    if (!data.progress || typeof data.progress !== "object") data.progress = {};
    if (!data.resources) data.resources = {};
    if (!data.resources.items) data.resources.items = {};
    const visited = Array.isArray(data.progress.visited) ? data.progress.visited : [];
    const badges = Array.isArray(data.progress.badges) ? data.progress.badges : [];

    if (badges.includes("soul-badge")) {
      data.story.kogaCleared = true;
      data.story.fuchsiaGymWalls = true;
    }
    if (visited.includes("fuchsia-city")) data.story.fuchsiaArrival = true;

    if (visited.includes("route-19")) {
      data.story.hasSurf = true;
      data.resources.items["hm03-surf"] = (data.resources.items["hm03-surf"] ?? 0) + 1;
    }
    if (visited.includes("victory-road")) {
      data.story.hasStrength = true;
      data.story.wardenThanked = true;
      data.resources.items["hm04-strength"] = (data.resources.items["hm04-strength"] ?? 0) + 1;
    }
    data.saveVersion = 33;
  }
  // v34 (Krok 9 – Cinnabar Island): dopočítej story flagy podle postupu, ať se
  // staré savy nezaseknou. Kdo už má Volcano Badge, musí mít Secret Key
  // (jinak by se mu gym zamkl requiresStory) a je označen jako blaineCleared.
  if (data.saveVersion < 34) {
    if (!data.story || typeof data.story !== "object") data.story = {};
    if (!data.progress || typeof data.progress !== "object") data.progress = {};
    if (!data.resources) data.resources = {};
    if (!data.resources.items) data.resources.items = {};
    const visited = Array.isArray(data.progress.visited) ? data.progress.visited : [];
    const badges = Array.isArray(data.progress.badges) ? data.progress.badges : [];

    if (visited.includes("route-19")) data.story.route19Arrival = true;
    if (visited.includes("seafoam-islands")) data.story.seafoamArrival = true;
    if (visited.includes("cinnabar-island")) data.story.cinnabarArrival = true;
    if (badges.includes("volcano-badge")) {
      data.story.blaineCleared = true;
      data.story.cinnabarGymQuiz = true;
      data.story.hasSecretKey = true; // aby se vyčištěný gym nezamkl requiresStory
    }
    data.saveVersion = 34;
  }
  // v35 (Krok 9 – ztížený Pokémon Mansion): Mansion je teď spínačový labyrint
  // (mansionPuzzleSolved) + gauntlet Burglarů/bosse (cinnabarMansionCleared).
  // Kdo už měl Secret Key (starý instantní zisk), byl fakticky „hotov" – nastav
  // oba nové flagy, ať se mu labyrint ani gauntlet znovu nespustí.
  if (data.saveVersion < 35) {
    if (!data.story || typeof data.story !== "object") data.story = {};
    if (data.story.hasSecretKey) {
      data.story.mansionPuzzleSolved = true;
      data.story.cinnabarMansionCleared = true;
    }
    data.saveVersion = 35;
  }
  // v36 (Krok 10 – Pokémon League): přidán běh Ligy (Elite Four + Champion) do
  // progress. Doplň neutrální default (žádný běh neběží). Kdo má earth-badge, měl
  // by mít i giovanniCleared, ať se payoff/otevření Ligy neopakuje.
  if (data.saveVersion < 36) {
    if (!data.progress || typeof data.progress !== "object") data.progress = {};
    if (typeof data.progress.leagueActive !== "boolean") data.progress.leagueActive = false;
    if (typeof data.progress.leagueStep !== "number") data.progress.leagueStep = 0;
    if (!data.story || typeof data.story !== "object") data.story = {};
    const badges = Array.isArray(data.progress.badges) ? data.progress.badges : [];
    if (badges.includes("earth-badge")) data.story.giovanniCleared = true;
    data.saveVersion = 36;
  }
  // v37 (Krok 11 – Saffron City / Silph Co / Sabrina): Team Rocket obsadil Silph Co,
  // žíznivý strážce gatuje budovu (Fresh Water z Celadonu), Silph Co gauntlet
  // (Rockets + rival + Giovanni) → Master Ball a odemčení Sabrinina gymu (Marsh Badge).
  // Aby se nikomu nezamkla cesta ani neopakoval payoff:
  //  • kdo navštívil Saffron → arrival flag (ať se úvodní popup neukáže zpětně),
  //  • kdo má Marsh Badge → Silph Co i Sabrina hotovi (strážci propuštěni, gauntlet
  //    poražen, Master Ball doplněn) – gym se nesmí zpětně zamknout requiresStory,
  //  • kdo je Champion (má giovanniCleared a všech 8 odznaků) → Cerulean Cave arrival.
  if (data.saveVersion < 37) {
    if (!data.story || typeof data.story !== "object") data.story = {};
    if (!data.progress || typeof data.progress !== "object") data.progress = {};
    if (!Array.isArray(data.progress.defeatedTrainers)) data.progress.defeatedTrainers = [];
    if (!data.resources) data.resources = {};
    if (!data.resources.balls || typeof data.resources.balls !== "object") data.resources.balls = {};
    const visited = Array.isArray(data.progress.visited) ? data.progress.visited : [];
    const badges = Array.isArray(data.progress.badges) ? data.progress.badges : [];

    if (visited.includes("saffron-city")) data.story.saffronArrival = true;

    if (badges.includes("marsh-badge")) {
      // Sabrina poražena ⇒ Silph Co musel být vyčištěn dřív → propustit vše zpětně.
      data.story.saffronGuardsCleared = true;
      data.story.silphCleared = true;
      data.story.sabrinaCleared = true;
      for (const id of ["silph-rocket-1", "silph-rocket-2", "silph-rocket-3", "rival-silph", "giovanni-silph"]) {
        if (!data.progress.defeatedTrainers.includes(id)) data.progress.defeatedTrainers.push(id);
      }
      // Master Ball je payoff za Silph Co – doplň ho zpětně těm, kdo Silphem prošli.
      data.resources.balls.master = (data.resources.balls.master ?? 0) + 1;
    }
    // Champion (porazil Ligu) má přístup do Cerulean Cave – ať se mu úvodní lore
    // popup neukáže znovu, když už dávno hraje endgame.
    if (data.story.leagueCleared) {
      data.story.ceruleanCaveArrival = true;
    }
    data.saveVersion = 37;
  }
  // v38 (dodělání Gen 1 dexu, Bundle 1): fosílie už NEjsou volba jedné – hráč má
  // dostat všechny tři (Helix→Omanyte, Dome→Kabuto, Old Amber→Aerodactyl), aby šel
  // celý dex na 1 průchod. Kdo dřív vybral jednu (fossilChosen "helix"/"dome"),
  // dostane zpětně chybějící fosílie (druhou + zbrusu nový Old Amber).
  if (data.saveVersion < 38) {
    if (!data.story || typeof data.story !== "object") data.story = {};
    if (!data.resources) data.resources = {};
    if (!data.resources.items || typeof data.resources.items !== "object") data.resources.items = {};
    const chosen = data.story.fossilChosen;
    if (chosen && chosen !== "all") {
      const items = data.resources.items;
      // Druhá fosílie (kterou si tehdy NEvybral) + Old Amber (nová pro všechny).
      const missing = chosen === "dome" ? ["helix-fossil"] : ["dome-fossil"];
      missing.push("old-amber");
      for (const id of missing) items[id] = (items[id] ?? 0) + 1;
      data.story.fossilChosen = "all";
    }
    data.saveVersion = 38;
  }

  // v39 (Krok 12): dárkoví/statičtí Pokémoni pro doplnění dexu na 1 průchod –
  // Eevee (Celadon Mansion), Lapras (Silph Co.), Hitmonlee+Hitmonchan (Fighting
  // Dojo), Mr. Mime (Route 2), Jynx (Route 10), Farfetch'd (Route 13). Všechny
  // dárky jsou nové jednorázové flagy (eeveeGift, laprasGift, hitmonsGift,
  // mrMimeGift, jynxGift, farfetchdGift) – u existujících savů zůstávají prostě
  // nevyzvednuté, hráč si dojde pro ně. Žádné doplňování dat, jen bump verze.
  if (data.saveVersion < 39) {
    if (!data.story || typeof data.story !== "object") data.story = {};
    data.saveVersion = 39;
  }

  // v40: Game Corner „Plná herna" – nová měna coiny. Existující savy dostanou
  // coins:0 (vydělají si je až v herně); jen bump, žádné doplňování.
  if (data.saveVersion < 40) {
    if (!data.resources || typeof data.resources !== "object") data.resources = {};
    if (typeof data.resources.coins !== "number") data.resources.coins = 0;
    data.saveVersion = 40;
  }

  // v41: Capstone Gen 1 – Diplom za kompletní dex + Shiny Charm (flagy
  // story.dexDiploma / story.shinyCharm). Anti-softlock: kdo už má všech
  // POKEMON_SPECIES.length druhů, dostane obojí zpětně (bez popupu – zaslouží si to).
  if (data.saveVersion < 41) {
    if (!data.story || typeof data.story !== "object") data.story = {};
    const caught = new Set((data.collection ?? []).map((p) => p.speciesId)).size;
    if (caught >= POKEMON_SPECIES.length) {
      data.story.dexDiploma = true;
      data.story.shinyCharm = true;
    }
    data.saveVersion = 41;
  }

  // v42: Shiny Charm lze nově zapínat/vypínat v horní liště (settings.shinyCharmActive).
  // Výchozí = zapnutý, ať se chování stávajících majitelů Charmu nezmění (kdo Charm
  // nevlastní, přepínač stejně neuvidí – řídí se story.shinyCharm).
  if (data.saveVersion < 42) {
    if (!data.settings || typeof data.settings !== "object") data.settings = {};
    if (typeof data.settings.shinyCharmActive !== "boolean") {
      data.settings.shinyCharmActive = true;
    }
    data.saveVersion = 42;
  }

  // v43: doořízne sady tahů na MAX_MOVES. Live bug v balancedMovesetIds (`slice(-0)`
  // === `slice(0)`) přidával při plných 4 útočných slotech VŠECHNY status tahy, takže
  // jedinci mohli mít 8+ tahů i po v28 migraci. Fix je v kódu; tady dorovnáme staré
  // save (dedup podle id, ponech prvních MAX_MOVES – správná původní sada je vepředu).
  if (data.saveVersion < 43) {
    for (const p of data.collection ?? []) {
      if (!Array.isArray(p.moves)) continue;
      const seen = new Set();
      const trimmed = [];
      for (const m of p.moves) {
        if (!m || seen.has(m.id)) continue;
        seen.add(m.id);
        trimmed.push(m);
        if (trimmed.length >= MAX_MOVES) break;
      }
      p.moves = trimmed;
    }
    data.saveVersion = 43;
  }

  // v44: HM02 Fly je nově znovupoužitelný učitelný tah (HM systém). Kdo už prošel
  // S.S. Anne (ssAnneCleared / hasCut), dostane HM02 Fly zpětně do batohu + flag,
  // aby měl přístup ke stejnému obsahu jako nová hra.
  if (data.saveVersion < 44) {
    if (!data.story || typeof data.story !== "object") data.story = {};
    if (data.story.ssAnneCleared || data.story.hasCut) {
      data.story.hasFly = true;
      if (!data.resources || typeof data.resources !== "object") data.resources = {};
      if (!data.resources.items) data.resources.items = {};
      if ((data.resources.items["hm02-fly"] ?? 0) < 1) data.resources.items["hm02-fly"] = 1;
    }
    data.saveVersion = 44;
  }

  return data;
}

/** Stáhne aktuální save jako .txt soubor. */
export function exportSave() {
  const json = JSON.stringify(getState(), null, 2);
  const blob = new Blob([json], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pokemon-idle-save-${stamp}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Načte save z nahraného .txt souboru. Vrací true při úspěchu.
 * @param {File} file
 * @returns {Promise<boolean>}
 */
export async function importSave(file) {
  try {
    const text = await file.text();
    setState(migrate(JSON.parse(text)));
    saveGame();
    return true;
  } catch (err) {
    console.error("Import save selhal:", err);
    return false;
  }
}
