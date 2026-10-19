/**
 * DATA: trenéři generace 2 (Johto). Čistá data – FIXNÍ trenéři (rival Silver + gym
 * trenéři/leadeři + Team Rocket gauntlety + Johto Liga), plán procedurálních route
 * trenérů, Liga, Rocket gauntlety a rival gate. Typedefy, logika a sloučení generací
 * viz ../trainers.js.
 *
 * ⚠️ Tento soubor NESMÍ importovat ../generations.js ani ../trainers.js (cyklus).
 *
 * Kolize id: Koga, Bruno i Lance jsou i v gen1 (Kanto gym leader / Elite Four),
 * proto johtské protějšky nesou prefix `johto-` (getTrainer má jeden globální Map).
 */

/** @type {import("../trainers.js").Trainer[]} FIXNÍ trenéři Johta. */
export const FIXED_TRAINERS_GEN2 = [
  // ═══════════════════════════════════════════════════════════════════════════
  //  RIVAL (Silver) – kánon GSC: 5 povinných soubojů (Cherrygrove → Azalea →
  //  Burned Tower → Radio Tower → Victory Road), tým sílí a Silverův STARTÉR
  //  countruje ten tvůj (counterStarter*, region-aware dle johtoStarterId – viz
  //  data/trainers.js COUNTER_STARTER* a battleSystem.starterForCounter). Zbytek
  //  jádra (Gastly/Zubat/Magnemite/Sneasel/Kadabra linie) je pevný jako v originále.
  //  Gaty: RIVAL_GATES_GEN2 (standalone taby) + jeden vložený do Radio Tower
  //  gauntletu (silver-goldenrod, kánon Goldenrod Underground během Rocket arcu).
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // #1 Cherrygrove – úvodní souboj. gateOnFight: i prohra odemkne cestu dál
    // (vzor gen1 rival-pallet), ať se nováček nezasekne hned na začátku.
    id: "silver-cherrygrove",
    kind: "rival",
    class: "rival",
    name: "Rival Silver",
    team: [{ speciesId: null, level: 7, counterStarter: true }],
    reward: 500,
    quote: "You're weak! Weak trainers like you make me sick! I'll show you what a real trainer can do.",
    gateOnFight: true,
  },
  {
    // #2 Azalea Town – po vyčištění Slowpoke Well (RIVAL_GATES_GEN2 requiresStory).
    id: "silver-azalea",
    kind: "rival",
    class: "rival",
    name: "Rival Silver",
    team: [
      { speciesId: "gastly", level: 14 },
      { speciesId: "zubat", level: 16 },
      { speciesId: null, level: 18, counterStarterMid: true },
    ],
    reward: 1600,
    quote: "Team Rocket, the Gym, you — everyone's in my way. Out of my sight once I've crushed you!",
  },
  {
    // #3 Burned Tower (Ecruteak).
    id: "silver-burned-tower",
    kind: "rival",
    class: "rival",
    name: "Rival Silver",
    team: [
      { speciesId: "magnemite", level: 18 },
      { speciesId: "zubat", level: 20 },
      { speciesId: "haunter", level: 20 },
      { speciesId: null, level: 22, counterStarterMid: true },
    ],
    reward: 2200,
    quote: "Legendary beasts? Who cares. Strength is the only legend that matters. Prove yours — if you can.",
  },
  {
    // #4 Goldenrod Underground – VLOŽEN do Radio Tower gauntletu (ROCKET_GAUNTLETS_GEN2).
    id: "silver-goldenrod",
    kind: "rival",
    class: "rival",
    name: "Rival Silver",
    team: [
      { speciesId: "magnemite", level: 30 },
      { speciesId: "golbat", level: 32 },
      { speciesId: "haunter", level: 32 },
      { speciesId: "sneasel", level: 32 },
      { speciesId: null, level: 34, counterStarterMid: true },
    ],
    reward: 3000,
    quote: "You again?! ...Taking on Team Rocket too, huh. Fine — but I don't lose to the likes of you!",
  },
  {
    // #5 Victory Road – finální souboj před Ligou (kánon; přesunut z Route 26).
    id: "silver-victory-road",
    kind: "rival",
    class: "rival",
    name: "Rival Silver",
    team: [
      { speciesId: "sneasel", level: 42 },
      { speciesId: "magneton", level: 42 },
      { speciesId: "gengar", level: 44 },
      { speciesId: "crobat", level: 44 },
      { speciesId: "kadabra", level: 42 },
      { speciesId: null, level: 45, counterStarterFinal: true },
    ],
    reward: 5000,
    quote: "So you caught up. Fine — I've gotten stronger too. Let's settle this before the League!",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  FIXNÍ BOSSOVÉ (kind "boss") – statické roadblocky, nechytatelné, jednorázové.
  //  Spouští se z map arrival popupu (battleSystem.setActiveArea → event), po výhře
  //  nastaví story flag co odemkne cestu dál. Vzor gen1 lavender-snorlax.
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // Route 36 „strom" – obří Sudowoodo blokuje cestu na sever k Ecruteaku. Probudí
    // se Squirtbottlem (z goldenrodského květinářství) → po výhře story.sudowoodoCleared
    // odemkne Route 37. Divoký veryrare Sudowoodo na Route 36 zůstává (dex coverage).
    id: "route-36-sudowoodo",
    kind: "boss",
    class: "sudowoodo",
    name: "Sudowoodo",
    team: [{ speciesId: "sudowoodo", level: 20 }],
    reward: 1500,
    quote: "You splash the Squirtbottle — the 'tree' shudders, reveals itself as a furious Sudowoodo, and attacks!",
  },

  // ── Mt. Mortar: Karate King's dojo (volitelný gauntlet, viz ROCKET_GAUNTLETS_GEN2) ──
  // Kánon GSC: hluboko v Mt. Mortar trénuje Karate King (Kiyo) bojové Pokémony;
  // po jeho porážce dá hráči dárkového Tyrogue (vysvětluje jeho veryrare výskyt tam).
  // Mirror gen1 route-09-hikers (tematický shluk trenérů u jeskyně). Studenti =
  // normální (kind route), finále Kiyo = boss (nechytatelný, boss-tier obtížnost).
  {
    id: "mt-mortar-black-belt-nob",
    kind: "route",
    class: "black-belt",
    name: "Black Belt Nob",
    team: [
      { speciesId: "machop", level: 29 },
      { speciesId: "mankey", level: 29 },
    ],
    reward: 580,
    quote: "The Karate King trains us hard in these caves. Show me your fighting spirit!",
  },
  {
    id: "mt-mortar-black-belt-lao",
    kind: "route",
    class: "black-belt",
    name: "Black Belt Lao",
    team: [
      { speciesId: "machoke", level: 30 },
      { speciesId: "primeape", level: 30 },
    ],
    reward: 600,
    quote: "Only the strong may face the Karate King. Prove yourself on me first!",
  },
  {
    id: "mt-mortar-karate-king",
    kind: "boss",
    class: "black-belt",
    name: "Karate King Kiyo",
    team: [
      { speciesId: "hitmonlee", level: 34 },
      { speciesId: "hitmonchan", level: 34 },
      { speciesId: "hitmontop", level: 35 },
    ],
    reward: 3500,
    quote: "So you've climbed all the way to the heart of Mt. Mortar. I am Kiyo, the Karate King! Let my fists test your resolve!",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  GYM TRENÉŘI + LEADEŘI (kind "gym" / "gym-leader"). Sekvence = data/gen2/gyms.js.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Violet Gym (Falkner, Flying) ──────────────────────────────────────────
  {
    id: "violet-gym-bird-keeper-rod",
    kind: "gym",
    class: "bird-keeper",
    name: "Bird Keeper Rod",
    team: [
      { speciesId: "pidgey", level: 7 },
      { speciesId: "spearow", level: 7 },
    ],
    reward: 210,
    quote: "Falkner won't lose to a rookie — and neither will I!",
  },
  {
    id: "falkner",
    kind: "gym-leader",
    class: "falkner",
    name: "Leader Falkner",
    team: [
      { speciesId: "pidgey", level: 7 },
      { speciesId: "pidgeotto", level: 9 },
    ],
    reward: 900,
    badge: "zephyr-badge",
    quote:
      "I'm Falkner, the Violet Pokémon Gym Leader! People say you can clip flying Pokémon's wings with a jolt of electricity... but I'll show you the real power of flying Pokémon!",
  },

  // ── Azalea Gym (Bugsy, Bug) ───────────────────────────────────────────────
  {
    id: "azalea-gym-bug-catcher-benny",
    kind: "gym",
    class: "bug-catcher",
    name: "Bug Catcher Benny",
    team: [
      { speciesId: "ledyba", level: 13 },
      { speciesId: "paras", level: 13 },
    ],
    reward: 260,
  },
  {
    id: "azalea-gym-bug-catcher-al",
    kind: "gym",
    class: "bug-catcher",
    name: "Bug Catcher Al",
    team: [
      { speciesId: "spinarak", level: 13 },
      { speciesId: "weedle", level: 14 },
    ],
    reward: 280,
  },
  {
    id: "bugsy",
    kind: "gym-leader",
    class: "bugsy",
    name: "Leader Bugsy",
    team: [
      { speciesId: "metapod", level: 14 },
      { speciesId: "kakuna", level: 14 },
      { speciesId: "scyther", level: 16 },
    ],
    reward: 1600,
    badge: "hive-badge",
    quote:
      "I'm Bugsy! I never lose when it comes to bug Pokémon. My research is going to make me the authority on bugs!",
  },

  // ── Goldenrod Gym (Whitney, Normal) ───────────────────────────────────────
  {
    id: "goldenrod-gym-lass-carrie",
    kind: "gym",
    class: "lass",
    name: "Lass Carrie",
    team: [
      { speciesId: "meowth", level: 16 },
      { speciesId: "sentret", level: 16 },
    ],
    reward: 320,
  },
  {
    id: "goldenrod-gym-beauty-victoria",
    kind: "gym",
    class: "beauty",
    name: "Beauty Victoria",
    team: [
      { speciesId: "hoppip", level: 17 },
      { speciesId: "jigglypuff", level: 17 },
    ],
    reward: 1200,
  },
  {
    id: "whitney",
    kind: "gym-leader",
    class: "whitney",
    name: "Leader Whitney",
    team: [
      { speciesId: "clefairy", level: 18 },
      { speciesId: "miltank", level: 20 },
    ],
    reward: 2000,
    badge: "plain-badge",
    quote:
      "Hi! I'm Whitney! Everyone was into Pokémon, so I got into it too! Pokémon are super cute — you'll never beat my Miltank!",
  },

  // ── Ecruteak Gym (Morty, Ghost) ───────────────────────────────────────────
  {
    id: "ecruteak-gym-medium-martha",
    kind: "gym",
    class: "medium",
    name: "Medium Martha",
    team: [
      { speciesId: "gastly", level: 19 },
      { speciesId: "haunter", level: 20 },
    ],
    reward: 640,
  },
  {
    id: "ecruteak-gym-sage-jeffrey",
    kind: "gym",
    class: "sage",
    name: "Sage Jeffrey",
    team: [
      { speciesId: "gastly", level: 20 },
      { speciesId: "gastly", level: 20 },
    ],
    reward: 700,
  },
  {
    id: "morty",
    kind: "gym-leader",
    class: "morty",
    name: "Leader Morty",
    team: [
      { speciesId: "gastly", level: 21 },
      { speciesId: "haunter", level: 21 },
      { speciesId: "haunter", level: 23 },
      { speciesId: "gengar", level: 25 },
    ],
    reward: 2500,
    badge: "fog-badge",
    quote:
      "I'm Morty. In this Gym, people have long researched the mysterious ghost Pokémon. Legend says a rainbow Pokémon will appear before a truly powerful trainer. I believe in that legend — and I train to see it!",
  },

  // ── Cianwood Gym (Chuck, Fighting) ────────────────────────────────────────
  {
    id: "cianwood-gym-black-belt-yoshi",
    kind: "gym",
    class: "black-belt",
    name: "Black Belt Yoshi",
    team: [
      { speciesId: "mankey", level: 27 },
      { speciesId: "machop", level: 27 },
    ],
    reward: 864,
  },
  {
    id: "cianwood-gym-black-belt-lao",
    kind: "gym",
    class: "black-belt",
    name: "Black Belt Lao",
    team: [{ speciesId: "machoke", level: 29 }],
    reward: 928,
  },
  {
    id: "chuck",
    kind: "gym-leader",
    class: "chuck",
    name: "Leader Chuck",
    team: [
      { speciesId: "primeape", level: 29 },
      { speciesId: "poliwrath", level: 31 },
    ],
    reward: 3100,
    badge: "storm-badge",
    quote:
      "Bwahahaha! So you've come all the way to Cianwood! I am Chuck, the Cianwood Gym Leader! I'll show you the power of the human spirit!",
  },

  // ── Olivine Gym (Jasmine, Steel) – otevře se po vyléčení Amphyho (viz gyms.js) ─
  {
    id: "jasmine",
    kind: "gym-leader",
    class: "jasmine",
    name: "Leader Jasmine",
    team: [
      { speciesId: "magnemite", level: 30 },
      { speciesId: "magnemite", level: 30 },
      { speciesId: "steelix", level: 35 },
    ],
    reward: 3500,
    badge: "mineral-badge",
    quote:
      "...Thank you for helping Amphy. ...Um... I'm Jasmine. Now, please — battle me with all your strength.",
  },

  // ── Mahogany Gym (Pryce, Ice) ─────────────────────────────────────────────
  {
    id: "mahogany-gym-skier-diana",
    kind: "gym",
    class: "skier",
    name: "Skier Diana",
    team: [
      { speciesId: "swinub", level: 31 },
      { speciesId: "seel", level: 31 },
    ],
    reward: 992,
  },
  {
    id: "mahogany-gym-boarder-ronald",
    kind: "gym",
    class: "boarder",
    name: "Boarder Ronald",
    team: [{ speciesId: "dewgong", level: 33 }],
    reward: 1056,
  },
  {
    id: "pryce",
    kind: "gym-leader",
    class: "pryce",
    name: "Leader Pryce",
    team: [
      { speciesId: "seel", level: 27 },
      { speciesId: "dewgong", level: 29 },
      { speciesId: "piloswine", level: 31 },
    ],
    reward: 3300,
    badge: "glacier-badge",
    quote:
      "I am Pryce. I've seen more winters than you've seen days. Pokémon and people both grow strong through hardship. Show me the strength you've earned!",
  },

  // ── Blackthorn Gym (Clair, Dragon) ────────────────────────────────────────
  {
    id: "blackthorn-gym-cooltrainer-paul",
    kind: "gym",
    class: "cooltrainer-m",
    name: "Cool Trainer Paul",
    team: [
      { speciesId: "dragonair", level: 34 },
      { speciesId: "seadra", level: 34 },
    ],
    reward: 1360,
  },
  {
    id: "blackthorn-gym-cooltrainer-lola",
    kind: "gym",
    class: "cooltrainer-f",
    name: "Cool Trainer Lola",
    team: [
      { speciesId: "horsea", level: 35 },
      { speciesId: "dragonair", level: 36 },
    ],
    reward: 1440,
  },
  {
    id: "clair",
    kind: "gym-leader",
    class: "clair",
    name: "Leader Clair",
    team: [
      { speciesId: "dragonair", level: 37 },
      { speciesId: "dragonair", level: 37 },
      { speciesId: "dragonair", level: 37 },
      { speciesId: "kingdra", level: 40 },
    ],
    reward: 4000,
    badge: "rising-badge",
    quote:
      "I'm Clair. The world's best dragon master. I hate to admit it, but you have real skill. Still — I won't hand over the Rising Badge easily!",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  TEAM ROCKET (kind "rocket"/"boss") – Johto gauntlety (viz ROCKET_GAUNTLETS).
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Slowpoke Well (Azalea): Rockets useknávají Slowpokům ocasy ─────────────
  {
    id: "slowpoke-well-rocket-1",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Team Rocket Grunt",
    team: [
      { speciesId: "rattata", level: 9 },
      { speciesId: "zubat", level: 9 },
    ],
    reward: 320,
    quote: "Slowpoke tails sell for a fortune! Out of my way, kid!",
  },
  {
    id: "slowpoke-well-rocket-2",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Team Rocket Grunt",
    team: [
      { speciesId: "zubat", level: 9 },
      { speciesId: "ekans", level: 11 },
    ],
    reward: 350,
  },
  {
    id: "slowpoke-well-proton",
    kind: "boss",
    class: "rocket-executive",
    name: "Rocket Executive Proton",
    team: [
      { speciesId: "zubat", level: 12 },
      { speciesId: "koffing", level: 14 },
    ],
    reward: 1200,
    quote: "I'm Proton, one of the executives of Team Rocket. And I'm the scariest of them all. You'll regret crossing us.",
  },

  // ── Mahogany Hideout (Lake of Rage): Rocket základna pod obchodem ──────────
  {
    id: "mahogany-rocket-1",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Team Rocket Grunt",
    team: [
      { speciesId: "gligar", level: 22 },
      { speciesId: "koffing", level: 22 },
    ],
    reward: 720,
  },
  {
    id: "mahogany-rocket-2",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Team Rocket Grunt",
    team: [
      { speciesId: "raticate", level: 23 },
      { speciesId: "grimer", level: 23 },
    ],
    reward: 740,
  },
  {
    id: "mahogany-rocket-3",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Team Rocket Grunt",
    team: [
      { speciesId: "houndour", level: 22 },
      { speciesId: "koffing", level: 24 },
    ],
    reward: 760,
  },
  {
    id: "mahogany-petrel",
    kind: "boss",
    class: "rocket-executive",
    name: "Rocket Executive Petrel",
    team: [
      { speciesId: "zubat", level: 24 },
      { speciesId: "koffing", level: 24 },
      { speciesId: "weezing", level: 26 },
    ],
    reward: 2200,
    quote: "The Electrode powering our signal are yours to smash — if you get past me! I'm Petrel of Team Rocket!",
  },

  // ── Goldenrod Radio Tower: Rocket převzal vysílač ─────────────────────────
  {
    id: "radio-tower-rocket-1",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Team Rocket Grunt",
    team: [
      { speciesId: "raticate", level: 24 },
      { speciesId: "arbok", level: 24 },
    ],
    reward: 780,
  },
  {
    id: "radio-tower-rocket-2",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Team Rocket Grunt",
    team: [
      { speciesId: "weezing", level: 25 },
      { speciesId: "golbat", level: 25 },
    ],
    reward: 820,
  },
  {
    id: "radio-tower-ariana",
    kind: "rocket",
    class: "rocket-executive",
    name: "Rocket Executive Ariana",
    team: [
      { speciesId: "arbok", level: 27 },
      { speciesId: "vileplume", level: 28 },
    ],
    reward: 1600,
    quote: "My, aren't you a persistent little pest. I'm Ariana — and I won't be as gentle as the others.",
  },
  {
    id: "radio-tower-archer",
    kind: "boss",
    class: "rocket-executive",
    name: "Rocket Boss Archer",
    team: [
      { speciesId: "houndour", level: 27 },
      { speciesId: "koffing", level: 28 },
      { speciesId: "houndoom", level: 30 },
    ],
    reward: 3000,
    quote: "I am Archer, and with Giovanni gone, I lead Team Rocket now. This region will hear our master's return — you will not stop us!",
  },

  // ── Ecruteak Dance Theater: 5 Kimono Girls (Eeveelutions) ─────────────────
  // Kánon GSC: pět Kimono Girls, každá s jiným vývojem Eevee. Gauntlet keyed
  // ecruteak-city (requiresStory danceTheaterChallenge – spustí budova). Vyčištění
  // → danceTheaterCleared; dárek (Luxury Bally) dá lead girl v budově. Viz
  // storyBuildingView.danceTheaterView + battleSystem.finishTrainerBattle.
  {
    id: "kimono-girl-1",
    kind: "kimono-girl",
    class: "kimono-girl",
    name: "Kimono Girl Naoko",
    team: [{ speciesId: "flareon", level: 26 }],
    reward: 1040,
  },
  {
    id: "kimono-girl-2",
    kind: "kimono-girl",
    class: "kimono-girl",
    name: "Kimono Girl Sayo",
    team: [{ speciesId: "jolteon", level: 27 }],
    reward: 1080,
  },
  {
    id: "kimono-girl-3",
    kind: "kimono-girl",
    class: "kimono-girl",
    name: "Kimono Girl Kuni",
    team: [{ speciesId: "vaporeon", level: 27 }],
    reward: 1080,
  },
  {
    id: "kimono-girl-4",
    kind: "kimono-girl",
    class: "kimono-girl",
    name: "Kimono Girl Miki",
    team: [{ speciesId: "espeon", level: 28 }],
    reward: 1120,
  },
  {
    id: "kimono-girl-zuki",
    kind: "boss",
    class: "kimono-girl",
    name: "Kimono Girl Zuki",
    team: [{ speciesId: "umbreon", level: 30 }],
    reward: 2400,
    quote:
      "You have danced your way through my sisters. I am Zuki, the eldest. Face my Umbreon — and show us the bond you share with your Pokémon.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  POKÉMON LEAGUE – JOHTO ELITE FOUR + CHAMPION (Indigo Plateau).
  //  Pozn.: Koga/Bruno/Lance mají prefix johto- kvůli kolizi s gen1 id.
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "johto-elite-four-will",
    kind: "elite-four",
    class: "elite-four",
    name: "Elite Four Will",
    team: [
      { speciesId: "xatu", level: 40 },
      { speciesId: "jynx", level: 41 },
      { speciesId: "exeggutor", level: 41 },
      { speciesId: "slowbro", level: 41 },
      { speciesId: "xatu", level: 42 },
    ],
    reward: 6000,
    quote:
      "I am Will. I have trained all around the world, making my psychic Pokémon powerful. And now — I am one of the Elite Four. Nothing can stop me now!",
  },
  {
    id: "johto-elite-four-koga",
    kind: "elite-four",
    class: "elite-four",
    name: "Elite Four Koga",
    team: [
      { speciesId: "ariados", level: 40 },
      { speciesId: "venomoth", level: 41 },
      { speciesId: "forretress", level: 43 },
      { speciesId: "muk", level: 42 },
      { speciesId: "crobat", level: 44 },
    ],
    reward: 6500,
    quote:
      "Bwahahaha! Welcome. I am Koga of the Elite Four! Poison and traps are my specialty. Let us see if you can survive!",
  },
  {
    id: "johto-elite-four-bruno",
    kind: "elite-four",
    class: "elite-four",
    name: "Elite Four Bruno",
    team: [
      { speciesId: "hitmontop", level: 42 },
      { speciesId: "hitmonlee", level: 42 },
      { speciesId: "hitmonchan", level: 42 },
      { speciesId: "onix", level: 43 },
      { speciesId: "machamp", level: 46 },
    ],
    reward: 7000,
    quote: "I am Bruno of the Elite Four. Through rigorous training, people and Pokémon can become stronger. We will grind you down!",
  },
  {
    id: "johto-elite-four-karen",
    kind: "elite-four",
    class: "elite-four",
    name: "Elite Four Karen",
    team: [
      { speciesId: "umbreon", level: 42 },
      { speciesId: "vileplume", level: 42 },
      { speciesId: "gengar", level: 45 },
      { speciesId: "murkrow", level: 44 },
      { speciesId: "houndoom", level: 47 },
    ],
    reward: 7500,
    quote:
      "I'm Karen of the Elite Four. Strong Pokémon. Weak Pokémon. That is only the selfish perception of people. A true trainer battles with the Pokémon it loves best. I like your style — now show me your strength!",
  },
  {
    id: "johto-champion-lance",
    kind: "champion",
    class: "champion",
    name: "Champion Lance",
    team: [
      { speciesId: "gyarados", level: 44 },
      { speciesId: "dragonite", level: 47 },
      { speciesId: "dragonite", level: 47 },
      { speciesId: "dragonite", level: 48 },
      { speciesId: "aerodactyl", level: 46 },
      { speciesId: "charizard", level: 46 },
    ],
    reward: 12000,
    quote:
      "I'm Lance, the Champion. I've been waiting for you. Your Pokémon have grown strong under your love and care — now face the might of my dragons, and prove you're worthy of the title!",
  },

  // ── Sprout Tower (Violet City): mniši (sages) s Bellsprouty, na vrcholu Elder ──
  // Gauntlet keyed to violet-city; vyčištění (sproutTowerCleared) → Elder v budově
  // dá HM05 Flash (viz storyBuildingView sproutTowerView). Nízké levely (1. gym town).
  {
    id: "sprout-tower-sage-1",
    kind: "sage",
    class: "sage",
    name: "Sage Nico",
    team: [
      { speciesId: "bellsprout", level: 3 },
      { speciesId: "bellsprout", level: 3 },
    ],
    reward: 120,
    quote: "The swaying pillar teaches us to bend, not break. Show me your resolve!",
  },
  {
    id: "sprout-tower-sage-2",
    kind: "sage",
    class: "sage",
    name: "Sage Chow",
    team: [
      { speciesId: "bellsprout", level: 4 },
      { speciesId: "bellsprout", level: 6 },
    ],
    reward: 160,
    quote: "Our Bellsprout train alongside us. Can your Pokémon match their discipline?",
  },
  {
    id: "sprout-tower-elder",
    kind: "boss",
    class: "elder",
    name: "Elder Li",
    team: [
      { speciesId: "bellsprout", level: 7 },
      { speciesId: "hoothoot", level: 10 },
    ],
    reward: 500,
    quote: "I am the Elder of Sprout Tower. Pass my test, and I shall entrust you with the light that guides lost travelers.",
  },

  // ── Dragon's Den (Blackthorn City): Dragon Clan test, na konci Dragon Elder ──
  // Gauntlet keyed to blackthorn-city, gate dragonsDenTestStarted (nastaví budova po
  // rising-badge). Vyčištění (dragonsDenCleared) → Elder v budově dá dárkového
  // Dratiniho s ExtremeSpeed (viz storyBuildingView dragonsDenView). Levely ~38–42.
  {
    id: "dragons-den-clan-1",
    kind: "dragon-tamer",
    class: "cooltrainer",
    name: "Dragon Tamer Darin",
    team: [
      { speciesId: "dratini", level: 38 },
      { speciesId: "dragonair", level: 40 },
    ],
    reward: 1600,
    quote: "Only those who revere dragons may walk this shrine. Prove your bond!",
  },
  {
    id: "dragons-den-clan-2",
    kind: "dragon-tamer",
    class: "cooltrainer",
    name: "Dragon Tamer Mina",
    team: [
      { speciesId: "horsea", level: 38 },
      { speciesId: "seadra", level: 40 },
      { speciesId: "dragonair", level: 40 },
    ],
    reward: 1700,
    quote: "The Clan has raised dragons for a thousand years. We do not yield easily.",
  },
  {
    id: "dragons-den-elder",
    kind: "boss",
    class: "elder",
    name: "Dragon Elder",
    team: [
      { speciesId: "dratini", level: 40 },
      { speciesId: "dragonair", level: 42 },
      { speciesId: "dragonair", level: 42 },
    ],
    reward: 2500,
    quote: "I am the Elder of the Dragon Clan. Defeat me, and I shall judge whether your heart is worthy of a true dragon.",
  },
];

/**
 * Plán route trenérů Johta (areaId → level band / počet / velikost týmu).
 * `level`/`size` = [min,max]. Trenéři se generují z routy (viz ../trainers.js).
 * @type {Record<string, {level:[number,number], count:number, size:[number,number]}>}
 */
export const ROUTE_TRAINER_PLAN_GEN2 = {
  "route-29": { level: [3, 6], count: 3, size: [1, 2] },
  "route-30": { level: [5, 8], count: 4, size: [2, 2] },
  "route-31": { level: [6, 9], count: 3, size: [2, 2] },
  "sprout-tower": { level: [6, 9], count: 3, size: [2, 3] },
  "route-32": { level: [8, 12], count: 5, size: [2, 3] },
  "union-cave": { level: [9, 13], count: 4, size: [2, 3] },
  "route-33": { level: [10, 13], count: 3, size: [2, 3] },
  "ilex-forest": { level: [10, 14], count: 3, size: [2, 3] },
  "route-34": { level: [12, 16], count: 5, size: [2, 3] },
  "route-35": { level: [13, 17], count: 5, size: [2, 4] },
  "national-park": { level: [12, 16], count: 4, size: [2, 3] },
  "route-36": { level: [13, 17], count: 4, size: [2, 3] },
  "route-37": { level: [14, 18], count: 3, size: [2, 3] },
  "burned-tower": { level: [16, 20], count: 3, size: [2, 3] },
  "route-38": { level: [17, 21], count: 5, size: [2, 4] },
  "route-39": { level: [18, 22], count: 4, size: [2, 4] },
  "route-42": { level: [18, 23], count: 4, size: [2, 4] },
  "mt-mortar": { level: [20, 26], count: 5, size: [3, 4] },
  "route-43": { level: [20, 25], count: 5, size: [2, 4] },
  "route-44": { level: [22, 28], count: 5, size: [3, 4] },
  "ice-path": { level: [23, 30], count: 4, size: [3, 4] },
  "route-45": { level: [28, 34], count: 5, size: [3, 5] },
  "route-46": { level: [20, 25], count: 3, size: [2, 3] },
  "route-47": { level: [30, 36], count: 4, size: [3, 4] },
  "route-48": { level: [20, 25], count: 3, size: [2, 3] },
  "dark-cave": { level: [20, 28], count: 4, size: [3, 4] },
  "route-26": { level: [34, 42], count: 5, size: [4, 5] },
  "route-27": { level: [34, 42], count: 5, size: [4, 5] },
  "victory-road-johto": { level: [36, 44], count: 5, size: [4, 5] },
};

/**
 * POKÉMON LEAGUE Johta (Elite Four + Champion) na Indigo Plateau (johtský uzel).
 * Vlastní clearFlag/clearStoryFlag, aby nekolidovala s kantskou Ligou.
 */
export const LEAGUE_GEN2 = {
  areaId: "indigo-plateau-johto",
  title: "Pokémon League — Johto Elite Four",
  intro:
    "The Indigo Plateau again — but this time you face Johto's own Elite Four: Will, Koga, Bruno, and Karen, and beyond them the Dragon Master Lance himself. No healing between battles, only your Bag. Lose once, and you begin again from the first.",
  order: [
    "johto-elite-four-will",
    "johto-elite-four-koga",
    "johto-elite-four-bruno",
    "johto-elite-four-karen",
    "johto-champion-lance",
  ],
  clearFlag: "johtoLeagueCleared",
  clearStoryFlag: "isJohtoChampion",
  clearReward: { gold: 30000 },
};

/**
 * Rival gate Johta (areaId → id rivala Silver, nebo {id, requiresStory}). Kánon
 * GSC: Silver blokuje postup (unlock.trainer na navazující oblasti v gen2/areas.js).
 * Goldenrod Underground souboj (silver-goldenrod) NENÍ zde – je vložený do Radio
 * Tower gauntletu (viz ROCKET_GAUNTLETS_GEN2.goldenrod-city.trainerIds).
 */
export const RIVAL_GATES_GEN2 = {
  "cherrygrove-city": "silver-cherrygrove",
  // Azalea Silver se objeví až po vyčištění Slowpoke Well (kánon).
  "azalea-town": { id: "silver-azalea", requiresStory: "slowpokeWellCleared" },
  "burned-tower": "silver-burned-tower",
  "victory-road-johto": "silver-victory-road",
};

/** POVINNÉ gauntlety Johta (areaId → gauntlet). Viz ../trainers.js. */
export const ROCKET_GAUNTLETS_GEN2 = {
  "slowpoke-well": {
    id: "slowpoke-well-rockets",
    areaId: "slowpoke-well",
    title: "Team Rocket",
    tabLabel: "Team Rocket",
    tabIcon: "💣",
    intro:
      "Team Rocket has taken over the Slowpoke Well beneath Azalea Town, cutting off Slowpoke tails to sell. Drive them out and save the Slowpoke!",
    clearFlag: "slowpokeWellCleared",
    trainerIds: ["slowpoke-well-rocket-1", "slowpoke-well-rocket-2", "slowpoke-well-proton"],
    clearReward: { gold: 1200 },
  },
  "mahogany-town": {
    id: "mahogany-hideout",
    areaId: "mahogany-town",
    title: "Rocket Hideout",
    tabLabel: "Team Rocket",
    tabIcon: "💣",
    intro:
      "Beneath a souvenir shop in Mahogany Town lies Team Rocket's secret hideout — the source of the radio signal forcing Magikarp to evolve at the Lake of Rage. Shut it down.",
    clearFlag: "mahoganyHideoutCleared",
    trainerIds: ["mahogany-rocket-1", "mahogany-rocket-2", "mahogany-rocket-3", "mahogany-petrel"],
    clearReward: { gold: 2500 },
  },
  "goldenrod-city": {
    id: "radio-tower",
    areaId: "goldenrod-city",
    title: "Radio Tower",
    tabLabel: "Radio Tower",
    tabIcon: "📻",
    // Kánon: Radio Tower obsadí Rocket AŽ po zásahu do jejich mahoganské základny.
    // Gauntlet tab se otevře až vstupem do budovy Radio Tower (storyBuildingView
    // radioTowerView → flag radioTowerStormed); budova sama je gatovaná
    // mahoganyHideoutCleared. Vzor: Silph Co (saffronGuardsCleared).
    requiresStory: "radioTowerStormed",
    intro:
      "Team Rocket has seized Goldenrod's Radio Tower to broadcast a call to their scattered forces. Fight up through the grunts, past your rival in the Underground, and on to their new boss, Archer, to take the tower back.",
    clearFlag: "radioTowerCleared",
    // Silver (silver-goldenrod) číhá v Goldenrod Underground uprostřed arcu – kánon GSC.
    trainerIds: ["radio-tower-rocket-1", "silver-goldenrod", "radio-tower-rocket-2", "radio-tower-ariana", "radio-tower-archer"],
    clearReward: { gold: 4000 },
  },
  "violet-city": {
    id: "sprout-tower",
    areaId: "violet-city",
    title: "Sprout Tower",
    tabLabel: "🗼 Sprout Tower",
    tabIcon: "🗼",
    intro:
      "Sprout Tower sways around its ancient central pillar. Climb past the chanting sages and their Bellsprout to reach the Elder at the very top.",
    clearFlag: "sproutTowerCleared",
    trainerIds: ["sprout-tower-sage-1", "sprout-tower-sage-2", "sprout-tower-elder"],
    clearReward: { gold: 600 },
  },
  "blackthorn-city": {
    id: "dragons-den",
    areaId: "blackthorn-city",
    title: "Dragon's Den",
    tabLabel: "🐉 Dragon's Den",
    tabIcon: "🐉",
    // Tab se odemkne, až hráč s Rising Badge vstoupí do shrine přes budovu
    // (dragonsDenTestStarted). Vyčištění → Dragon Elder v budově dá dárkového Dratiniho.
    requiresStory: "dragonsDenTestStarted",
    intro:
      "Behind Blackthorn lies the sacred Dragon's Den. The Dragon Clan guards the shrine — defeat the tamers and the Dragon Elder to prove your heart worthy of a true dragon.",
    clearFlag: "dragonsDenCleared",
    trainerIds: ["dragons-den-clan-1", "dragons-den-clan-2", "dragons-den-elder"],
    clearReward: { gold: 3000 },
  },
  "mt-mortar": {
    id: "mt-mortar-karate-king",
    areaId: "mt-mortar",
    title: "The Karate King",
    tabLabel: "🥋 Karate King",
    tabIcon: "🥋",
    // Volitelný (žádné requiresStory) – dostupný hned po příchodu do Mt. Mortar.
    // Vyčištění (porážka Kiya) → dárkový Tyrogue + flag karateKingBeaten
    // (viz battleSystem gauntlet-clear větev). Mirror gen1 route-09-hikers.
    intro:
      "Deep in Mt. Mortar, a dojo of Black Belts trains among the rocks under the fabled Karate King, Kiyo. Fight through his students and defeat the Karate King himself to earn his respect.",
    clearFlag: "karateKingBeaten",
    trainerIds: ["mt-mortar-black-belt-nob", "mt-mortar-black-belt-lao", "mt-mortar-karate-king"],
    clearReward: { gold: 2500 },
  },
  "ecruteak-city": {
    id: "dance-theater",
    areaId: "ecruteak-city",
    title: "Dance Theater",
    tabLabel: "💃 Dance Theater",
    tabIcon: "💃",
    // Tab se odemkne, až hráč v budově přijme výzvu (danceTheaterChallenge). Vyčištění
    // → lead Kimono Girl v budově dá dárek (Luxury Bally). Viz storyBuildingView.
    requiresStory: "danceTheaterChallenge",
    intro:
      "Ecruteak's Dance Theater hosts the five Kimono Girls, each dancing with a different evolution of Eevee. Prove your bond with your Pokémon by defeating all five.",
    clearFlag: "danceTheaterCleared",
    trainerIds: ["kimono-girl-1", "kimono-girl-2", "kimono-girl-3", "kimono-girl-4", "kimono-girl-zuki"],
    clearReward: { gold: 2500 },
  },
};
