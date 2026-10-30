/**
 * devTools.js – ladicí (dev) akce Dev menu.
 *
 * Slouží k rychlému testování mechanik bez normálního průběhu hry (výhry,
 * chytání, líhnutí). Napojeno na Dev sekci v Nastavení (⚙), která se zapojuje
 * jen na localhostu (viz `devEnv.js`). Celé Dev menu žije ve složce `src/dev/`.
 * Per-jedincové dev nástroje (level, shiny) jsou taky tady (`devSetLevel`,
 * `devToggleShiny`) – dřív byly přilepené v `evolutionSystem.js`.
 */

import { POKEMON_SPECIES, getSpecies } from "../../data/pokemon.js";
import { getState, commit } from "../core/state.js";
import { createPokemon, computeStats, defaultMovesFor } from "../systems/pokemonSystem.js";
import { acquirePokemon, getStarterSpeciesId } from "../systems/team.js";
import { ensureStartersSeen } from "../systems/pokedex.js";
import { addEgg, devHatchAllIncubating } from "../systems/eggSystem.js";
import { MAX_LEVEL } from "../systems/progression.js";
import { travelToRegion } from "../systems/battleSystem.js";

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
 * DEV: okamžitě vylíhne všechna vejce, která jsou právě v inkubaci ve Školce.
 * Emituje EGG_HATCHED za každé → naskočí i reveal popup (fronta).
 * @returns {{ count: number }}
 */
export function devHatchAllEggs() {
  return { count: devHatchAllIncubating() };
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
 * acquirePokemon – jen doplní kolekci, NEuděluje Diplom (ten dá až profesor
 * regionu v labu, když si o dexu promluvíš). Slouží k rychlému otestování
 * capstonu bez ručního chytání celého národního dexu: po kliknutí dojdi do labu
 * (Kanto → Oak's Lab / Johto → Elm's Lab).
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
      // Po Nugget Bridge tě v Cerulean City přepadl rival (volitelný, ale v tuhle
      // chvíli už dávno za tebou) → označ za poraženého, ať tab ukazuje hotovo.
      addUnique(s.progress.defeatedTrainers, "rival-cerulean");
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
      // Old Rod od rybáře ve Vermilionu (Fishing Hut) – ať jde rybaření testovat.
      s.resources.items["old-rod"] = (s.resources.items["old-rod"] ?? 0) + 1;
      s.story.oldRodGift = true;
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
      // Cycling Road (volitelná boční větev z Celadonu) – označ jako navštívené,
      // ať po skipu nezůstane zamčená (jinak by chtěla ruční průchod 16→17→18).
      addUnique(s.progress.visited, "route-16");
      addUnique(s.progress.visited, "route-17");
      addUnique(s.progress.visited, "route-18");
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
      // 7c: v Pokémon Tower poražen rival (2F) + uklidněn duch Marowak + zachráněn
      //     Mr. Fuji → POKE FLUTE. Snorlax na Route 12 zatím SPÍ → hráč na Route 12.
      addUnique(s.progress.defeatedTrainers, "rival-pokemon-tower");
      s.story.towerRivalBeaten = true;
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
      // 7d: Poke Flute probudil Snorlaxe na Route 12 → chycen (statické setkání) → jižní cesta otevřená.
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
      // Good Rod + Super Rod od rybářského mistra ve Fuchsia Fishing House.
      if (!s.resources) s.resources = {};
      if (!s.resources.items) s.resources.items = {};
      s.resources.items["good-rod"] = (s.resources.items["good-rod"] ?? 0) + 1;
      s.resources.items["super-rod"] = (s.resources.items["super-rod"] ?? 0) + 1;
      s.story.goodRodGift = true;
      s.story.superRodGift = true;
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
      // Předligový rival na Route 22 (odemyká se giovanniCleared z checkpointu
      // "earth") – champion už je dávno za ním, označíme ho jako poraženého.
      addUnique(s.progress.defeatedTrainers, "rival-route-22");
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
  // Z Johta nejdřív normální návrat do Kanta (jako lodí): přehodí region, mapu, tým,
  // budovy, Školku, vejce i HM. Jinak by skok zůstal v Johtu s kantským postupem.
  if ((getState().progress?.region ?? "kanto") !== "kanto") travelToRegion("kanto");
  const s = getState();
  ensureContainers(s);
  resetStoryProgress(s); // čistý základ → skok je deterministický
  for (let i = 0; i <= idx; i++) applyOne(s, DEV_CHECKPOINTS[i].key);
  commit();
  return { ok: true, label: DEV_CHECKPOINTS[idx].label };
}

/* ----------------------- Dev: Story checkpointy JOHTO ------------------------
 * Johtský protějšek kantských checkpointů. Johto se hraje AŽ po dohrání Kanto
 * Ligy (titul Champion je podmínka plavby přes S.S. Anne), takže KAŽDÝ johtský
 * skok si nejdřív postaví plný kantský základ (ensureJohtoBaseline → aplikuje
 * všechny DEV_CHECKPOINTS 0..champion: isChampion, všechny HM, kantské odznaky),
 * uklidí kantský tým do PC (teamByRegion.kanto), přepne region na "johto" a dá
 * johtského startéra od Prof. Elma. Pak se kumulativně aplikují johtské milníky.
 * Přidání dalšího kroku = položka do DEV_CHECKPOINTS_GEN2 + větev v applyOneGen2(). */

/** Výchozí Johto startér pro dev skok (když si hráč žádného nevybral). */
const DEV_DEFAULT_JOHTO_STARTER = "chikorita";
/** Level dárkového Johto startéra (odpovídá elm-lab výběru). */
const DEV_JOHTO_STARTER_LEVEL = 5;

/** Uspořádané johtské milníky (index = pořadí; skok je kumulativní). */
export const DEV_CHECKPOINTS_GEN2 = [
  { key: "j-start", label: "Ⓙ① New Bark Town · Johto starter chosen (Kanto cleared)" },
  { key: "j-cherrygrove", label: "Ⓙ② Cherrygrove City · Silver battled · Togepi Egg" },
  { key: "j-zephyr", label: "Ⓙ③ Violet City · Falkner defeated · Zephyr Badge" },
  { key: "j-hive", label: "Ⓙ④ Azalea Town · Slowpoke Well cleared · Bugsy · Hive Badge" },
  { key: "j-plain", label: "Ⓙ⑤ Goldenrod City · Whitney · Plain Badge" },
  { key: "j-fog", label: "Ⓙ⑥ Ecruteak City · Morty · Fog Badge" },
  { key: "j-storm", label: "Ⓙ⑦ Cianwood City · SecretPotion + Whirlpool · Chuck · Storm Badge" },
  { key: "j-mineral", label: "Ⓙ⑧ Olivine City · Amphy healed · Jasmine · Mineral Badge" },
  { key: "j-glacier", label: "Ⓙ⑨ Mahogany Town · Rocket hideout cleared · Pryce · Glacier Badge" },
  { key: "j-radio", label: "Ⓙ⑩ Goldenrod Radio Tower retaken (Rocket disbanded)" },
  { key: "j-rising", label: "Ⓙ⑪ Blackthorn City · Clair · Rising Badge · 8/8" },
  { key: "j-league-open", label: "Ⓙ⑫ Victory Road + Indigo Plateau open (Routes 27/26)" },
  { key: "j-champion", label: "Ⓙ⑬ Johto Elite Four + Lance defeated · Johto Champion" },
];

/** Dá hráči johtského startéra (do kolekce + týmu) a nastaví flagy. Jednorázově. */
function giftJohtoStarter(s) {
  if (s.story.johtoStarter) return; // už dán
  const id = DEV_DEFAULT_JOHTO_STARTER;
  if (!getSpecies(id)) return;
  const mon = createPokemon(id, DEV_JOHTO_STARTER_LEVEL, { caughtBall: "poke" });
  acquirePokemon(mon); // kolekce + Pokédex (commit uvnitř)
  // Region-lock: jen gen 2 smí v Johtu bojovat → startér rovnou do (prázdného) týmu.
  // Po opakovaném skoku už startér v PC je a nový se do něj jen sloučil (jeden jedinec
  // druhu na region) → do týmu dej toho, který v kolekci opravdu je.
  const owned = s.collection.find((p) => p.uid === mon.uid)
    ?? s.collection.find((p) => p.speciesId === id && p.caughtRegion === mon.caughtRegion);
  if (owned && !s.team.includes(owned.uid)) s.team.push(owned.uid);
  s.story.johtoStarter = true;
  s.story.johtoStarterId = id;
}

/**
 * Postaví kantský základ a přepne do Johta. Aplikuje VŠECHNY kantské checkpointy
 * (0..champion → isChampion, HM, kantské odznaky, kantský tým), pak přejde do Johta
 * přes travelToRegion (tým, budovy, Školka, vejce, HM per region), vstup do New Bark
 * Townu a dá johtského startéra. Volá se jednou před johtskou smyčkou.
 */
function ensureJohtoBaseline(s) {
  // Region je tu už "kanto" (z Johta se před skokem vrací devApplyCheckpointGen2).
  // Plný kantský postup (kumulativně přes všechny kantské milníky).
  for (const c of DEV_CHECKPOINTS) applyOne(s, c.key);
  // Přechod do Johta stejně jako lodí (battleSystem.travelToRegion): uloží kantský tým,
  // budovy, Školku, vejce a HM a nasadí johtské (HM prázdné – příběh se před skokem maže).
  travelToRegion("johto");
  s.team = []; // deterministicky: čerstvý johtský tým, dřívější johtští Pokémoni zůstanou v PC
  s.progress.activeAreaId = "new-bark-town";
  addUnique(s.progress.visited, "new-bark-town");
  // Johto startér od Prof. Elma (prázdný tým → rovnou použitelný v Johtu).
  giftJohtoStarter(s);
}

/** Aplikuje JEDEN johtský milník na stav (bez commitu). */
function applyOneGen2(s, key) {
  switch (key) {
    case "j-start":
      // Základ (region johto + startér + Kanto hotovo) řeší ensureJohtoBaseline.
      s.progress.activeAreaId = "new-bark-town";
      break;
    case "j-cherrygrove":
      // Route 29 → Cherrygrove; Silver tě tu vyzve (rival gate). Elm dá Togepi Egg.
      addUnique(s.progress.visited, "route-29");
      addUnique(s.progress.visited, "cherrygrove-city");
      addUnique(s.progress.defeatedTrainers, "silver-cherrygrove");
      giftMon(s, "togepi", 5, "togepiGift");
      s.progress.activeAreaId = "cherrygrove-city";
      break;
    case "j-zephyr":
      // Route 30/31 → Violet City (Sprout Tower); Falkner poražen → Zephyr Badge.
      addUnique(s.progress.visited, "route-30");
      addUnique(s.progress.visited, "route-31");
      addUnique(s.progress.visited, "violet-city");
      addUnique(s.progress.defeatedTrainers, "violet-gym-bird-keeper-rod");
      addUnique(s.progress.defeatedTrainers, "falkner");
      addUnique(s.progress.badges, "zephyr-badge");
      s.progress.activeAreaId = "violet-city";
      break;
    case "j-hive":
      // Route 32 → Union Cave → Route 33 → Azalea; Rocket ve Slowpoke Well vyčištěn;
      // Bugsy poražen → Hive Badge.
      addUnique(s.progress.visited, "route-32");
      addUnique(s.progress.visited, "union-cave");
      addUnique(s.progress.visited, "route-33");
      addUnique(s.progress.visited, "azalea-town");
      addUnique(s.progress.visited, "slowpoke-well");
      for (const id of ["slowpoke-well-rocket-1", "slowpoke-well-rocket-2", "slowpoke-well-proton"]) {
        addUnique(s.progress.defeatedTrainers, id);
      }
      s.story.slowpokeWellCleared = true;
      // Silver #2 u Azaley (po Slowpoke Well) – gate pro Ilex Forest.
      addUnique(s.progress.defeatedTrainers, "silver-azalea");
      addUnique(s.progress.defeatedTrainers, "azalea-gym-bug-catcher-benny");
      addUnique(s.progress.defeatedTrainers, "azalea-gym-bug-catcher-al");
      addUnique(s.progress.defeatedTrainers, "bugsy");
      addUnique(s.progress.badges, "hive-badge");
      // HM01 Cut z azalejského Charcoal Kiln (gatuje Ilex Forest).
      s.story.hasCut = true;
      if (!s.resources.items) s.resources.items = {};
      s.resources.items["hm01-cut"] = (s.resources.items["hm01-cut"] ?? 0) + 1;
      s.progress.activeAreaId = "azalea-town";
      break;
    case "j-plain":
      // Ilex Forest → Route 34 → Goldenrod; Whitney poražena → Plain Badge.
      // (Eevee z Bill's House sdílí flag eeveeGift s kantským Celadonem – ten už
      //  byl dán v základu, takže druhý dárkový Eevee nevzniká, je to záměr.)
      addUnique(s.progress.visited, "ilex-forest");
      addUnique(s.progress.visited, "route-34");
      addUnique(s.progress.visited, "goldenrod-city");
      addUnique(s.progress.defeatedTrainers, "goldenrod-gym-lass-carrie");
      addUnique(s.progress.defeatedTrainers, "goldenrod-gym-beauty-victoria");
      addUnique(s.progress.defeatedTrainers, "whitney");
      addUnique(s.progress.badges, "plain-badge");
      // Squirtbottle z goldenrodského Flower Shopu (probudí Sudowoodo na Route 36).
      if (!s.resources.items) s.resources.items = {};
      s.resources.items["squirtbottle"] = (s.resources.items["squirtbottle"] ?? 0) + 1;
      s.story.hasSquirtbottle = true;
      s.progress.activeAreaId = "goldenrod-city";
      break;
    case "j-fog":
      // Route 35 → National Park → Route 36/37 → Ecruteak; Morty poražen → Fog Badge.
      addUnique(s.progress.visited, "route-35");
      addUnique(s.progress.visited, "national-park");
      addUnique(s.progress.visited, "route-36");
      addUnique(s.progress.visited, "ruins-of-alph");
      // Sudowoodo na Route 36 poražen Squirtbottlem → odemkne Route 37 na sever.
      addUnique(s.progress.defeatedTrainers, "route-36-sudowoodo");
      s.story.sudowoodoCleared = true;
      addUnique(s.progress.visited, "route-37");
      addUnique(s.progress.visited, "ecruteak-city");
      addUnique(s.progress.visited, "burned-tower");
      // Sestup do sklepa Burned Tower probudil tři beasts → odemkne taby
      // Suicune (burned-tower) / Raikou (route-42) / Entei (route-37).
      s.story.beastsAwakened = true;
      // Silver #3 v Burned Tower – gate pro Route 38 (cesta k Olivine).
      addUnique(s.progress.defeatedTrainers, "silver-burned-tower");
      addUnique(s.progress.defeatedTrainers, "ecruteak-gym-medium-martha");
      addUnique(s.progress.defeatedTrainers, "ecruteak-gym-sage-jeffrey");
      addUnique(s.progress.defeatedTrainers, "morty");
      addUnique(s.progress.badges, "fog-badge");
      // HM03 Surf z ecruteakského domu (po Fog Badge; gatuje Route 40/41 + Cianwood).
      s.story.hasSurf = true;
      if (!s.resources.items) s.resources.items = {};
      s.resources.items["hm03-surf"] = (s.resources.items["hm03-surf"] ?? 0) + 1;
      s.progress.activeAreaId = "ecruteak-city";
      break;
    case "j-storm":
      // Route 38/39 → Olivine → Route 40/41 → Cianwood. V cianwoodské lékárně získán
      // SecretPotion; od Chucka HM06 Whirlpool. Chuck poražen → Storm Badge.
      addUnique(s.progress.visited, "route-38");
      addUnique(s.progress.visited, "route-39");
      addUnique(s.progress.visited, "olivine-city");
      addUnique(s.progress.visited, "route-40");
      addUnique(s.progress.visited, "route-41");
      addUnique(s.progress.visited, "cianwood-city");
      s.story.secretpotionObtained = true;
      s.story.hasWhirlpool = true; // HM06 (odemkne Whirl Islands + Lugia)
      if (!s.resources) s.resources = {};
      if (!s.resources.items) s.resources.items = {};
      s.resources.items["hm06-whirlpool"] = (s.resources.items["hm06-whirlpool"] ?? 0) + 1;
      addUnique(s.progress.visited, "whirl-islands");
      addUnique(s.progress.defeatedTrainers, "cianwood-gym-black-belt-yoshi");
      addUnique(s.progress.defeatedTrainers, "cianwood-gym-black-belt-lao");
      addUnique(s.progress.defeatedTrainers, "chuck");
      addUnique(s.progress.badges, "storm-badge");
      s.story.hasFly = true; // HM02 Fly od Chuckovy ženy hned po výhře (battleSystem)
      s.resources.items["hm02-fly"] = (s.resources.items["hm02-fly"] ?? 0) + 1;
      s.progress.activeAreaId = "cianwood-city";
      break;
    case "j-mineral":
      // SecretPotion podán nemocnému Amphymu na majáku → amphyHealed → Olivine Gym
      // se otevře. Jasmine poražena → Mineral Badge.
      s.story.amphyHealed = true;
      addUnique(s.progress.defeatedTrainers, "jasmine");
      addUnique(s.progress.badges, "mineral-badge");
      // HM04 Strength z olivinského námořnického domu (gatuje Ice Path – balvanový hlavolam).
      s.story.hasStrength = true;
      if (!s.resources.items) s.resources.items = {};
      s.resources.items["hm04-strength"] = (s.resources.items["hm04-strength"] ?? 0) + 1;
      s.progress.activeAreaId = "olivine-city";
      break;
    case "j-glacier":
      // Route 42 → Mt. Mortar → Mahogany; Rocket základna pod obchodem (u Lake of
      // Rage) vyčištěna; Pryce poražen → Glacier Badge.
      addUnique(s.progress.visited, "route-42");
      addUnique(s.progress.visited, "mt-mortar");
      addUnique(s.progress.visited, "mahogany-town");
      addUnique(s.progress.visited, "route-43");
      addUnique(s.progress.visited, "lake-of-rage");
      for (const id of ["mahogany-rocket-1", "mahogany-rocket-2", "mahogany-rocket-3", "mahogany-petrel"]) {
        addUnique(s.progress.defeatedTrainers, id);
      }
      s.story.mahoganyHideoutCleared = true;
      addUnique(s.progress.defeatedTrainers, "mahogany-gym-skier-diana");
      addUnique(s.progress.defeatedTrainers, "mahogany-gym-boarder-ronald");
      addUnique(s.progress.defeatedTrainers, "pryce");
      addUnique(s.progress.badges, "glacier-badge");
      s.progress.activeAreaId = "mahogany-town";
      break;
    case "j-radio":
      // Rocket obsadil goldenrodský Radio Tower (až po zásahu v Mahogany) → vyčištěn
      // (grunti + Ariana + boss Archer) → radioTowerCleared. Team Rocket rozpuštěn.
      for (const id of ["radio-tower-rocket-1", "silver-goldenrod", "radio-tower-rocket-2", "radio-tower-ariana", "radio-tower-archer"]) {
        addUnique(s.progress.defeatedTrainers, id);
      }
      s.story.radioTowerStormed = true;
      s.story.radioTowerCleared = true;
      s.progress.activeAreaId = "goldenrod-city";
      break;
    case "j-rising":
      // Route 44 → Ice Path → Blackthorn; Clair poražena → Rising Badge (8/8).
      addUnique(s.progress.visited, "route-44");
      addUnique(s.progress.visited, "ice-path");
      addUnique(s.progress.visited, "blackthorn-city");
      addUnique(s.progress.defeatedTrainers, "blackthorn-gym-cooltrainer-paul");
      addUnique(s.progress.defeatedTrainers, "blackthorn-gym-cooltrainer-lola");
      addUnique(s.progress.defeatedTrainers, "clair");
      addUnique(s.progress.badges, "rising-badge");
      s.progress.activeAreaId = "blackthorn-city";
      break;
    case "j-league-open":
      // Dragon's Den (dex: Dratini) + cesta k Lize: New Bark → Route 27 → Route 26
      // → Victory Road (Silver finální rival gate) → Indigo Plateau. Liga neběží.
      addUnique(s.progress.visited, "route-27");
      addUnique(s.progress.visited, "route-26");
      addUnique(s.progress.visited, "victory-road-johto");
      addUnique(s.progress.visited, "indigo-plateau-johto");
      addUnique(s.progress.defeatedTrainers, "silver-victory-road");
      s.progress.leagueActive = false;
      s.progress.leagueStep = 0;
      s.progress.activeAreaId = "indigo-plateau-johto";
      break;
    case "j-champion":
      // Johto Elite Four + Champion Lance poraženi → titul Johto Champion.
      // isJohtoChampion odemyká Ho-Oh (Ecruteak), Celebi (Ilex) a spawn
      // johtských startérů v johtské Safari Zone (viz data/gen2/safari.js).
      for (const id of [
        "johto-elite-four-will", "johto-elite-four-koga", "johto-elite-four-bruno",
        "johto-elite-four-karen", "johto-champion-lance",
      ]) {
        addUnique(s.progress.defeatedTrainers, id);
      }
      s.story.johtoLeagueCleared = true;
      s.story.isJohtoChampion = true;
      s.progress.leagueActive = false;
      s.progress.leagueStep = 5;
      s.progress.activeAreaId = "indigo-plateau-johto";
      break;
  }
}

/**
 * Skok na daný JOHTSKÝ story milník. Nejdřív vynuluje příběhový postup, postaví
 * kantský základ + přepne do Johta (ensureJohtoBaseline), pak aplikuje zvolený
 * johtský milník i všechny předchozí (kumulativně).
 * @param {string} key  klíč z DEV_CHECKPOINTS_GEN2
 * @returns {{ ok: boolean, label: string }}
 */
export function devApplyCheckpointGen2(key) {
  const idx = DEV_CHECKPOINTS_GEN2.findIndex((c) => c.key === key);
  if (idx < 0) return { ok: false, label: key };
  // Z Johta nejdřív zpět do Kanta (jako lodí), ať se kantský základ staví nad kantským
  // týmem a budovami, ne nad johtskými.
  if ((getState().progress?.region ?? "kanto") !== "kanto") travelToRegion("kanto");
  const s = getState();
  ensureContainers(s);
  resetStoryProgress(s); // čistý základ → skok je deterministický
  ensureJohtoBaseline(s); // Kanto hotovo + region johto + startér
  for (let i = 0; i <= idx; i++) applyOneGen2(s, DEV_CHECKPOINTS_GEN2[i].key);
  commit();
  return { ok: true, label: DEV_CHECKPOINTS_GEN2[idx].label };
}

/**
 * DEV/TEST: natvrdo nastaví jedinci level (1–MAX_LEVEL), aby šlo pohodlně testovat
 * evoluce, learnsety apod. Vynuluje XP, přenastaví tahy na výchozí sadu daného
 * levelu (`defaultMovesFor`) a dorovná HP na plné max. Commituje.
 * @param {string} uid
 * @param {number} level
 * @returns {{ ok: boolean, level?: number }}
 */
export function devSetLevel(uid, level) {
  const owned = getState().collection.find((p) => p.uid === uid);
  if (!owned) return { ok: false };
  const lvl = Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(level) || 1)));
  owned.level = lvl;
  owned.xp = 0;
  owned.moves = defaultMovesFor(owned.speciesId, lvl, owned.caughtRegion); // čistá sada tahů pro daný level
  owned.hp = computeStats(owned).maxHp;
  commit();
  return { ok: true, level: lvl };
}

/**
 * DEV/TEST: přepne jedinci shiny stav, aby šlo pohodlně testovat shiny sprity
 * (vč. zachování shiny při evoluci). Commituje.
 * @param {string} uid
 * @returns {{ ok: boolean, shiny?: boolean }}
 */
export function devToggleShiny(uid) {
  const owned = getState().collection.find((p) => p.uid === uid);
  if (!owned) return { ok: false };
  owned.shiny = !owned.shiny;
  commit();
  return { ok: true, shiny: owned.shiny };
}
