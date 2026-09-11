/**
 * devTools.js – ladicí (dev) akce mimo kartu jedince.
 *
 * Slouží k rychlému testování mechanik bez normálního průběhu hry (výhry,
 * chytání, líhnutí). Napojeno na Dev sekci v Nastavení (⚙). Per-jedincové dev
 * nástroje (level, shiny) zůstávají na Kartě Pokémona (`pokemonCard.js`).
 */

import { POKEMON_SPECIES, getSpecies } from "../../data/pokemon.js";
import { getState, commit } from "../core/state.js";
import { createPokemon } from "./pokemonSystem.js";
import { acquirePokemon, getStarterSpeciesId } from "./team.js";
import { ensureStartersSeen } from "./pokedex.js";
import { addEgg } from "./eggSystem.js";

/** Náhodný druh z celého Dexu (pro „přidej něco na zkoušku"). */
function randomSpeciesId() {
  const list = POKEMON_SPECIES;
  return list[Math.floor(Math.random() * list.length)].id;
}

/**
 * Přidá do inventáře vejce – daného druhu, jinak náhodného. Pak se dá vložit do
 * inkubace ve Školce a nechat vylíhnout.
 * @param {string} [speciesId]
 * @returns {{ id: string, speciesId: string, name: string }}
 */
export function devAddEgg(speciesId) {
  const id = speciesId ?? randomSpeciesId();
  const egg = addEgg(id);
  return { ...egg, name: getSpecies(id)?.name ?? id };
}

/**
 * Přidá jedince daného druhu do kolekce (přes acquirePokemon → platí R-018:
 * nový druh se přidá, duplikát slije lepší hodnoty). Výchozí druh je Ditto.
 * @param {string} [speciesId="ditto"]
 * @param {number} [level=5]
 * @returns {{ ok: boolean, name: string, outcome: any }}
 */
export function devAddPokemon(speciesId = "ditto", level = 5) {
  if (!getSpecies(speciesId)) return { ok: false, name: speciesId, outcome: null };
  const poke = createPokemon(speciesId, level);
  const outcome = acquirePokemon(poke); // commit uvnitř
  return { ok: true, name: getSpecies(speciesId)?.name ?? speciesId, outcome };
}

/**
 * Dev: naráz získá všech `POKEMON_SPECIES` druhů (co ještě nemáš) přes
 * acquirePokemon – jen doplní kolekci, NEuděluje Diplom (ten dá až Prof. Oak
 * v Oak's Lab, když si o dexu promluvíš). Slouží k rychlému otestování capstonu
 * bez chytání 151 kusů: po kliknutí dojdi do Pallet Townu → Oak's Lab.
 * @returns {{ added: number, total: number }}
 */
export function devCompleteDex() {
  let added = 0;
  for (const sp of POKEMON_SPECIES) {
    const res = acquirePokemon(createPokemon(sp.id, 5)); // commit + capstone check uvnitř
    if (res.added) added++;
  }
  return { added, total: POKEMON_SPECIES.length };
}

/**
 * Přidá hráči zlato (dev). Kladné i záporné; nikdy nespadne pod 0.
 * @param {number} amount
 * @returns {number} nový stav zlata
 */
export function devAddMoney(amount) {
  const res = getState().resources;
  res.gold = Math.max(0, (res.gold ?? 0) + amount);
  commit();
  return res.gold;
}

/* --------------------------- Dev: Story checkpointy ---------------------------
 * Rychlé „přeskočení" začátku hry na daný bod příběhu, ať nemusí tester pokaždé
 * procházet intro + celý úvod. Milníky jsou KUMULATIVNÍ (zvolený milník aplikuje
 * i všechny předchozí). Přidání dalšího kroku Kanto příběhu = jen další položka
 * do DEV_CHECKPOINTS + větev v applyOne(). */

/** Výchozí startér, když si hráč ještě žádného nevybral (dev skok). */
const DEV_DEFAULT_STARTER = "bulbasaur";
/** Výchozí jméno rivala pro dev skok (přeskočí intro s pojmenováním). */
const DEV_DEFAULT_RIVAL = "Blue";

/** Uspořádané milníky příběhu (index = pořadí; skok je kumulativní). */
export const DEV_CHECKPOINTS = [
  { key: "start", label: "① Pallet Town · you have a starter (after intro)" },
  { key: "route1", label: "② Rival defeated · Route 1 open" },
  { key: "viridian", label: "③ Viridian City · Parcel quest ready" },
  { key: "parcel", label: "④ Parcel delivered · Route 2 open" },
  { key: "pewter", label: "⑤ Pewter City · at Brock's" },
  { key: "brock", label: "⑥ Brock defeated · Boulder Badge · Route 3" },
  { key: "cerulean", label: "⑦ Cerulean City · at Misty's" },
  { key: "vermilion", label: "⑧ Vermilion City · S.S. Anne + HM Cut" },
  { key: "lavender", label: "⑨ Lt. Surge · Thunder Badge · Flash · Lavender Town (tower locked by ghost)" },
  { key: "celadon", label: "⑩ Celadon City · Rainbow Badge (Erika defeated; hideout not yet)" },
  { key: "silphscope", label: "⑪ Silph Scope obtained · Rocket Hideout cleared (tower untouched)" },
  { key: "pokeflute", label: "⑫ Poke Flute obtained · tower complete (Marowak calmed, Mr. Fuji saved; Snorlax SLEEPS)" },
  { key: "snorlax", label: "⑬ Snorlax awakened · south path open (Step 7 complete)" },
  { key: "fuchsia", label: "⑭ Fuchsia City · arrival (Koga and Safari available)" },
  { key: "soul", label: "⑮ Koga defeated · Soul Badge (Safari not yet)" },
  { key: "surf", label: "⑯ Safari Zone cleared · HM03 Surf + Gold Teeth obtained (Warden not yet)" },
  { key: "strength", label: "⑰ Gold Teeth returned to Warden · HM04 Strength obtained (Step 8 complete)" },
  { key: "cinnabar", label: "⑱ Cinnabar Island · arrival (sea route via Route 19–21 sailed)" },
  { key: "secretkey", label: "⑲ Pokémon Mansion explored · Secret Key obtained (gym unlocked)" },
  { key: "volcano", label: "⑳ Blaine defeated · Volcano Badge (Step 9 complete)" },
  { key: "saffron", label: "㉑ Saffron City · arrival (Rockets hold Silph Co, guard thirsty, gym locked)" },
  { key: "silphopen", label: "㉒ Fresh Water given to guard · Silph Co. open" },
  { key: "silphcleared", label: "㉓ Silph Co. cleared (Rockets + rival + Giovanni) · Master Ball obtained" },
  { key: "sabrina", label: "㉔ Sabrina defeated · Marsh Badge (Step 11 complete)" },
  { key: "earth", label: "㉕ Giovanni defeated · Earth Badge · 8/8 · Victory Road + Indigo open" },
  { key: "champion", label: "㉖ Elite Four + Champion defeated · Champion (Step 10 complete; Cerulean Cave / Mewtwo)" },
];

/** Zajistí kontejnery ve stavu (starší/prázdné save). */
function ensureContainers(s) {
  if (!s.player) s.player = {};
  if (!s.progress) s.progress = {};
  if (!Array.isArray(s.progress.visited)) s.progress.visited = [];
  if (!Array.isArray(s.progress.defeatedTrainers)) s.progress.defeatedTrainers = [];
  if (!Array.isArray(s.progress.badges)) s.progress.badges = [];
  if (!s.story || typeof s.story !== "object") s.story = {};
}

/** Přidá hodnotu do pole, když tam ještě není. */
function addUnique(arr, val) {
  if (!arr.includes(val)) arr.push(val);
}

/** Zajistí, že má hráč startéra a pojmenovaného rivala (jinak by naskočilo intro). */
function ensureStarterAndRival(s) {
  if (!s.player.rivalName) s.player.rivalName = DEV_DEFAULT_RIVAL;
  if (!getStarterSpeciesId() && (s.collection?.length ?? 0) === 0) {
    const p = createPokemon(DEV_DEFAULT_STARTER, 5, { caughtBall: "poke" });
    s.collection.push(p);
    s.team.push(p.uid);
    s.player.starterId = DEV_DEFAULT_STARTER;
    ensureStartersSeen();
  }
}

/**
 * Dev: udělí dárkového Pokémona při skoku na checkpoint (Krok 12), aby výsledný
 * save realisticky obsahoval to, co by hráč v daném místě už měl. Jednorázově dle
 * story-flagu. acquirePokemon commituje sám; flag nastavíme přímo do s.story.
 */
function giftMon(s, speciesId, level, flag) {
  if (!s.story || typeof s.story !== "object") s.story = {};
  if (s.story[flag]) return; // už dán
  if (!getSpecies(speciesId)) return;
  acquirePokemon(createPokemon(speciesId, level));
  s.story[flag] = true;
}

/** Aplikuje JEDEN milník na stav (bez commitu). */
function applyOne(s, key) {
  switch (key) {
    case "start":
      ensureStarterAndRival(s);
      s.progress.activeAreaId = "pallet-town";
      break;
    case "route1":
      // Rival gate „splněn" (vyhráno/prohráno je jedno) → Route 1 odemčená.
      addUnique(s.progress.defeatedTrainers, "rival-pallet");
      break;
    case "viridian":
      // Ve Viridianu, ale balíček ještě nemá → Parcel quest jde otestovat.
      addUnique(s.progress.visited, "route-01");
      addUnique(s.progress.visited, "viridian-city");
      // Krok 12: Viridian Trade House (Abra → Mr. Mime) považ za provedený.
      giftMon(s, "mr-mime", 10, "mrMimeGift");
      s.progress.activeAreaId = "viridian-city";
      break;
    case "parcel":
      // Balíček převzat i doručen → sever (Route 2) otevřený.
      s.story.oakParcelGiven = true;
      s.story.oakParcelDelivered = true;
      addUnique(s.progress.visited, "route-02");
      break;
    case "pewter":
      addUnique(s.progress.visited, "viridian-forest");
      addUnique(s.progress.visited, "pewter-city");
      s.progress.activeAreaId = "pewter-city";
      break;
    case "brock":
      // Brock poražen → Boulder Badge, otevře se Route 3. brockCleared ať event
      // odměny znovu nevyskočí (dostals ji „už dřív").
      addUnique(s.progress.defeatedTrainers, "brock");
      addUnique(s.progress.badges, "boulder-badge");
      s.story.brockCleared = true;
      break;
    case "cerulean":
      // Prošel jsi Route 3 → Mt. Moon → Route 4 až do Cerulean City (u Misty).
      addUnique(s.progress.visited, "route-03");
      addUnique(s.progress.visited, "mt-moon");
      addUnique(s.progress.visited, "route-04");
      addUnique(s.progress.visited, "cerulean-city");
      // Team Rocket v Mt. Moon poražen → gate Route 4 splněn (jinak by ses do
      // Cerulean nedostal). Grunts označíme za poražené, ať Rockets tab ukáže hotovo.
      for (let i = 1; i <= 5; i++) addUnique(s.progress.defeatedTrainers, `mt-moon-rocket-${i}`);
      s.story.mtMoonRocketsCleared = true;
      // Krok 12: Cerulean Trade House (Poliwhirl → Jynx) považ za provedený.
      giftMon(s, "jynx", 18, "jynxGift");
      s.progress.activeAreaId = "cerulean-city";
      break;
    case "vermilion":
      // Cerulean Gym (Misty) poražen → Cascade Badge. `cerulean` checkpoint tě
      // nechává JEN „u Misty" (na test souboje); do dalšího postupu ji tu tedy
      // dokončíme (jinak by cascade-badge/Misty chyběly ve všech krocích za ní).
      addUnique(s.progress.defeatedTrainers, "cerulean-gym-swimmer-luis");
      addUnique(s.progress.defeatedTrainers, "cerulean-gym-jr-diana");
      addUnique(s.progress.defeatedTrainers, "misty");
      addUnique(s.progress.badges, "cascade-badge");
      s.story.mistyCleared = true;
      // Cesta Cerulean → Route 24/25 (Bill) → Route 5/6 → Vermilion; na S.S. Anne
      // poražen rival → HM Cut. Vermilion Gym (Lt. Surge) je tím odemčený.
      addUnique(s.progress.visited, "route-24");
      addUnique(s.progress.visited, "route-25");
      addUnique(s.progress.visited, "route-05");
      addUnique(s.progress.visited, "route-06");
      addUnique(s.progress.visited, "vermilion-city");
      s.story.nuggetBridge = true;
      s.story.billHelped = true;
      addUnique(s.progress.defeatedTrainers, "rival-ss-anne");
      s.story.ssAnneCleared = true;
      s.story.hasCut = true;
      s.story.hasFly = true;
      s.story.vermilionArrival = true;
      // HM Cut + HM Fly item do batohu (odpovídá reálné odměně ze S.S. Anne).
      if (!s.resources) s.resources = {};
      if (!s.resources.items) s.resources.items = {};
      s.resources.items["hm01-cut"] = (s.resources.items["hm01-cut"] ?? 0) + 1;
      if ((s.resources.items["hm02-fly"] ?? 0) < 1) s.resources.items["hm02-fly"] = 1;
      // Krok 12: Vermilion Trade House (Spearow → Farfetch'd) považ za provedený.
      giftMon(s, "farfetchd", 22, "farfetchdGift");
      s.progress.activeAreaId = "vermilion-city";
      break;
    case "lavender":
      // Krok 6: Lt. Surge poražen → Thunder Badge (gym „koše" vyřešeny). Cesta
      // Route 11/Diglett's Cave prozkoumána; Route 9 (Flash) → Rock Tunnel →
      // Route 10 → Lavender Town.
      addUnique(s.progress.defeatedTrainers, "vermilion-gym-sailor-dwayne");
      addUnique(s.progress.defeatedTrainers, "vermilion-gym-gentleman-gregory");
      addUnique(s.progress.defeatedTrainers, "lt-surge");
      addUnique(s.progress.badges, "thunder-badge");
      s.story.surgeCleared = true;
      s.story.vermilionGymSwitches = true;
      addUnique(s.progress.visited, "route-11");
      addUnique(s.progress.visited, "digletts-cave");
      addUnique(s.progress.visited, "route-09");
      addUnique(s.progress.visited, "rock-tunnel");
      addUnique(s.progress.visited, "route-10");
      addUnique(s.progress.visited, "lavender-town");
      s.story.route11Arrival = true;
      s.story.diglettsArrival = true;
      s.story.hasFlash = true;
      s.story.lavenderArrival = true;
      // Krok 7: Flash je nově za Route 9 Hiker gauntlet – kdo je v Lavenderu,
      // prošel Rock Tunnel, tedy Hikery porazil. Označíme je za poražené.
      addUnique(s.progress.defeatedTrainers, "route-09-hiker-1");
      addUnique(s.progress.defeatedTrainers, "route-09-hiker-2");
      addUnique(s.progress.defeatedTrainers, "route-09-hiker-3");
      s.story.route9HikersCleared = true;
      // HM05 Flash item do batohu (odpovídá reálné odměně z Route 9).
      if (!s.resources) s.resources = {};
      if (!s.resources.items) s.resources.items = {};
      s.resources.items["hm05-flash"] = (s.resources.items["hm05-flash"] ?? 0) + 1;
      s.progress.activeAreaId = "lavender-town";
      break;
    // ── Krok 7 rozdělen na 4 jemné milníky (každý = jeden konkrétní zisk).
    //    Skoky jsou KUMULATIVNÍ přes smyčku v devApplyCheckpoint → každý case
    //    přidává JEN své delta, nic neduplikuje. ──────────────────────────────
    case "celadon":
      // 7a: cesta Route 7/8 → Celadon; Erika poražena → Rainbow Badge.
      //     Rocket Hideout (za Game Cornerem) je ještě NEDOTČENÝ (test hideoutu).
      addUnique(s.progress.visited, "route-08");
      addUnique(s.progress.visited, "route-07");
      addUnique(s.progress.visited, "celadon-city");
      addUnique(s.progress.badges, "rainbow-badge");
      addUnique(s.progress.defeatedTrainers, "celadon-gym-beauty-tamia");
      addUnique(s.progress.defeatedTrainers, "celadon-gym-lass-michelle");
      addUnique(s.progress.defeatedTrainers, "erika");
      s.story.erikaCleared = true;
      s.story.celadonArrival = true;
      // Krok 12: Celadon Mansion → dárkové Eevee.
      giftMon(s, "eevee", 25, "eeveeGift");
      s.progress.activeAreaId = "celadon-city";
      break;
    case "silphscope":
      // 7b: Rocket Hideout vyčištěn (4 grunti + Giovanni) → SILPH SCOPE v batohu.
      //     Pokémon Tower je zatím NETKNUTÁ → posadíme hráče do Lavenderu, ať tam jde.
      addUnique(s.progress.defeatedTrainers, "rocket-hideout-1");
      addUnique(s.progress.defeatedTrainers, "rocket-hideout-2");
      addUnique(s.progress.defeatedTrainers, "rocket-hideout-3");
      addUnique(s.progress.defeatedTrainers, "rocket-hideout-4");
      addUnique(s.progress.defeatedTrainers, "giovanni-hideout");
      s.story.rocketHideoutCleared = true;
      s.story.hasSilphScope = true;
      if (!s.resources) s.resources = {};
      if (!s.resources.items) s.resources.items = {};
      s.resources.items["silph-scope"] = (s.resources.items["silph-scope"] ?? 0) + 1;
      // Krok 13: vyčištění hideoutu odemyká „Plnou hernu" v Game Corneru → dej
      // testerovi coiny, ať si může vyzkoušet automat i koupit Porygona (9999).
      s.resources.coins = Math.max(s.resources.coins ?? 0, 9999);
      s.progress.activeAreaId = "lavender-town";
      break;
    case "pokeflute":
      // 7c: v Pokémon Tower uklidněn duch Marowak + zachráněn Mr. Fuji → POKE FLUTE.
      //     Snorlax na Route 12 zatím SPÍ → posadíme hráče na Route 12 (jde ho probudit).
      addUnique(s.progress.defeatedTrainers, "lavender-marowak");
      s.story.marowakCalmed = true;
      s.story.mrFujiSaved = true;
      s.story.hasPokeFlute = true;
      addUnique(s.progress.visited, "route-12");
      if (!s.resources) s.resources = {};
      if (!s.resources.items) s.resources.items = {};
      s.resources.items["poke-flute"] = (s.resources.items["poke-flute"] ?? 0) + 1;
      s.progress.activeAreaId = "route-12";
      break;
    case "snorlax":
      // 7d: Poke Flute probudil Snorlaxe na Route 12 → poražen → jižní cesta otevřená.
      addUnique(s.progress.defeatedTrainers, "lavender-snorlax");
      s.story.snorlaxCleared = true;
      addUnique(s.progress.visited, "route-13");
      s.progress.activeAreaId = "route-13";
      break;
    case "fuchsia":
      // 8a: Krok 8 – příchod do Fuchsia City (jižní osa z Lavenderu: Route 12→13→14→15→Fuchsia).
      //     Město je otevřené, Koga i Safari Zone se nabízejí, ale hráč zatím nic nevyřešil.
      addUnique(s.progress.visited, "route-14");
      addUnique(s.progress.visited, "route-15");
      addUnique(s.progress.visited, "fuchsia-city");
      s.story.fuchsiaArrival = true;
      s.progress.activeAreaId = "fuchsia-city";
      break;
    case "soul":
      // 8b: Koga poražen v Fuchsia Gymu → Soul Badge. Safari Zone zatím NE.
      addUnique(s.progress.defeatedTrainers, "fuchsia-gym-tamer-edgar");
      addUnique(s.progress.defeatedTrainers, "fuchsia-gym-juggler-nelson");
      addUnique(s.progress.defeatedTrainers, "koga");
      addUnique(s.progress.badges, "soul-badge");
      s.story.kogaCleared = true;
      s.story.fuchsiaGymWalls = true;
      s.progress.activeAreaId = "fuchsia-city";
      break;
    case "surf":
      // 8c: Safari Zone expedice dokončena (dev skip) → získal HM03 Surf a Gold Teeth.
      addUnique(s.progress.visited, "safari-zone");
      s.story.safariArrival = true;
      s.story.hasSurf = true;
      s.story.hasGoldTeeth = true;
      if (!s.resources) s.resources = {};
      if (!s.resources.items) s.resources.items = {};
      s.resources.items["hm03-surf"] = (s.resources.items["hm03-surf"] ?? 0) + 1;
      s.resources.items["gold-teeth"] = (s.resources.items["gold-teeth"] ?? 0) + 1;
      s.progress.activeAreaId = "safari-zone";
      break;
    case "strength":
      // 8d: Gold Teeth vráceny Wardenovi → získal HM04 Strength (Krok 8 hotov).
      s.story.hasStrength = true;
      s.story.wardenThanked = true;
      if (!s.resources) s.resources = {};
      if (!s.resources.items) s.resources.items = {};
      s.resources.items["hm04-strength"] = (s.resources.items["hm04-strength"] ?? 0) + 1;
      delete s.resources.items["gold-teeth"];
      s.story.hasGoldTeeth = false;
      s.progress.activeAreaId = "fuchsia-city";
      break;
    case "cinnabar":
      // 9a: Krok 9 – přeplavání mořské cesty (Route 19→20→Seafoam→21) na Cinnabar.
      addUnique(s.progress.visited, "route-19");
      addUnique(s.progress.visited, "route-20");
      addUnique(s.progress.visited, "seafoam-islands");
      addUnique(s.progress.visited, "route-21");
      addUnique(s.progress.visited, "cinnabar-island");
      s.story.route19Arrival = true;
      s.story.seafoamArrival = true;
      s.story.cinnabarArrival = true;
      s.progress.activeAreaId = "cinnabar-island";
      break;
    case "secretkey":
      // 9b: Pokémon Mansion vyřešen (spínačový labyrint + gauntlet Burglarů + boss)
      // → Secret Key získán (odemkne Blaineův gym). Nastavíme celý řetězec flagů,
      // aby se labyrint ani gauntlet po skoku znovu nespouštěl.
      s.story.mansionPuzzleSolved = true;
      s.story.cinnabarMansionCleared = true;
      s.story.hasSecretKey = true;
      addUnique(s.progress.defeatedTrainers, "cinnabar-mansion-burglar-1");
      addUnique(s.progress.defeatedTrainers, "cinnabar-mansion-burglar-2");
      addUnique(s.progress.defeatedTrainers, "cinnabar-mansion-boss");
      if (!s.resources) s.resources = {};
      if (!s.resources.items) s.resources.items = {};
      s.resources.items["secret-key"] = (s.resources.items["secret-key"] ?? 0) + 1;
      s.progress.activeAreaId = "cinnabar-island";
      break;
    case "volcano":
      // 9c: Blaine poražen v Cinnabar Gymu → Volcano Badge (Krok 9 hotov).
      addUnique(s.progress.defeatedTrainers, "cinnabar-gym-burglar-quinn");
      addUnique(s.progress.defeatedTrainers, "cinnabar-gym-supernerd-erik");
      addUnique(s.progress.defeatedTrainers, "blaine");
      addUnique(s.progress.badges, "volcano-badge");
      s.story.cinnabarGymQuiz = true;
      s.story.blaineCleared = true;
      s.progress.activeAreaId = "cinnabar-island";
      break;
    case "saffron":
      // 11a: Krok 11 – příchod do Saffron City. Team Rocket obsadil město i Silph Co,
      // žíznivý strážce blokuje budovu a Sabrinin gym je zamčený (requiresStory).
      addUnique(s.progress.visited, "route-08");
      addUnique(s.progress.visited, "saffron-city");
      s.story.saffronArrival = true;
      // Krok 12: Fighting Dojo v Saffronu → OBA Hitmoni (Hitmonlee + Hitmonchan)
      // pod jedním flagem (hitmonsGift), aby se dárek nedal opakovat.
      if (!s.story.hitmonsGift) {
        acquirePokemon(createPokemon("hitmonlee", 30));
        acquirePokemon(createPokemon("hitmonchan", 30));
        s.story.hitmonsGift = true;
      }
      s.progress.activeAreaId = "saffron-city";
      break;
    case "silphopen":
      // 11b: Fresh Water koupena v Celadonu a podána strážci → Silph Co. se otevře
      // (tab 🏢 Silph Co. se zpřístupní). Item už je „spotřebován", stačí flag.
      s.story.saffronGuardsCleared = true;
      s.progress.activeAreaId = "saffron-city";
      break;
    case "silphcleared":
      // 11c: Silph Co. gauntlet vyčištěn (Rocketi + rival + Giovanni). President
      // zachráněn → Master Ball; Sabrinin gym se odemkne (silphCleared).
      for (const id of ["silph-rocket-1", "silph-rocket-2", "silph-rocket-3", "rival-silph", "giovanni-silph"]) {
        addUnique(s.progress.defeatedTrainers, id);
      }
      s.story.silphCleared = true;
      if (!s.resources) s.resources = {};
      if (!s.resources.balls || typeof s.resources.balls !== "object") s.resources.balls = {};
      s.resources.balls.master = (s.resources.balls.master ?? 0) + 1;
      // Krok 12: vděčný zaměstnanec Silph Co. → dárková Lapras.
      giftMon(s, "lapras", 15, "laprasGift");
      s.progress.activeAreaId = "saffron-city";
      break;
    case "sabrina":
      // 11d: Sabrina poražena v Saffron Gymu → Marsh Badge (Krok 11 hotov).
      s.story.saffronGymIntro = true;
      addUnique(s.progress.defeatedTrainers, "saffron-gym-psychic-johan");
      addUnique(s.progress.defeatedTrainers, "saffron-gym-channeler-preston");
      addUnique(s.progress.defeatedTrainers, "sabrina");
      addUnique(s.progress.badges, "marsh-badge");
      s.story.sabrinaCleared = true;
      s.progress.activeAreaId = "saffron-city";
      break;
    case "earth": {
      // 10a: Giovanni poražen ve Viridian Gymu → Earth Badge (8/8). Nastavíme
      // VŠECHNY odznaky explicitně (Viridian gym vyžaduje 7 ostatních), poražené
      // trenéry gymu, giovanniCleared a otevřeme cestu Route 22 → Victory Road →
      // Indigo Plateau. Liga zatím neběží (leagueActive false).
      const ALL_BADGES = [
        "boulder-badge", "cascade-badge", "thunder-badge", "rainbow-badge",
        "soul-badge", "marsh-badge", "volcano-badge", "earth-badge",
      ];
      for (const b of ALL_BADGES) addUnique(s.progress.badges, b);
      addUnique(s.progress.defeatedTrainers, "viridian-gym-cooltrainer-samson");
      addUnique(s.progress.defeatedTrainers, "viridian-gym-toughguy-nick");
      addUnique(s.progress.defeatedTrainers, "giovanni");
      s.story.viridianGymIntro = true;
      s.story.giovanniCleared = true;
      addUnique(s.progress.visited, "route-22");
      addUnique(s.progress.visited, "route-23");
      addUnique(s.progress.visited, "victory-road");
      addUnique(s.progress.visited, "indigo-plateau");
      s.story.victoryRoadArrival = true;
      s.story.indigoArrival = true;
      s.progress.leagueActive = false;
      s.progress.leagueStep = 0;
      s.progress.activeAreaId = "indigo-plateau";
      break;
    }
    case "champion":
      // 10b: Elite Four + Champion poraženi → titul (Krok 10 hotov). isChampion
      // otevře Cerulean Cave (Unknown Dungeon) s Mewtwem (viz legendaries.js).
      addUnique(s.progress.defeatedTrainers, "elite-four-lorelei");
      addUnique(s.progress.defeatedTrainers, "elite-four-bruno");
      addUnique(s.progress.defeatedTrainers, "elite-four-agatha");
      addUnique(s.progress.defeatedTrainers, "elite-four-lance");
      addUnique(s.progress.defeatedTrainers, "champion-blue");
      s.story.leagueCleared = true;
      s.story.isChampion = true;
      s.progress.leagueActive = false;
      s.progress.leagueStep = 5;
      addUnique(s.progress.visited, "cerulean-cave");
      s.progress.activeAreaId = "indigo-plateau";
      break;
  }
}

/**
 * Vynuluje příběhový postup na čistý základ (Pallet, nic navštíveno/poraženo,
 * žádné parcel flagy ani odznaky). Kolekci, tým, zlato a itemy NECHÁVÁ být –
 * maže jen to, co „Skip to" sám staví, aby byl skok DETERMINISTICKÝ (skok na X
 * tě dá přesně na X, ne na „X nebo víc" podle předchozího stavu).
 */
function resetStoryProgress(s) {
  s.progress.visited = [];
  s.progress.defeatedTrainers = [];
  s.progress.badges = [];
  s.progress.activeAreaId = "pallet-town";
  // Všechny příběhové flagy pryč → skok je plně deterministický (skok na X tě
  // dá přesně na X). Pickup/quest/event flagy (parcel, fosílie, nugget…) se tak
  // znovu naabízí, když danou oblastí projdeš.
  s.story = {};
}

/**
 * Skok na daný story milník. Nejdřív vynuluje příběhový postup (deterministické),
 * pak aplikuje zvolený milník i všechny předchozí (kumulativně). Nastaví startéra,
 * rivala, story-flagy, navštívené oblasti a poražené trenéry podle potřeby.
 * @param {string} key  klíč z DEV_CHECKPOINTS
 * @returns {{ ok: boolean, label: string }}
 */
export function devApplyCheckpoint(key) {
  const idx = DEV_CHECKPOINTS.findIndex((c) => c.key === key);
  if (idx < 0) return { ok: false, label: key };
  const s = getState();
  ensureContainers(s);
  resetStoryProgress(s); // čistý základ → skok je deterministický
  for (let i = 0; i <= idx; i++) applyOne(s, DEV_CHECKPOINTS[i].key);
  commit();
  return { ok: true, label: DEV_CHECKPOINTS[idx].label };
}
