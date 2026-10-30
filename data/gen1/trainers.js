/**
 * DATA: trenéři generace 1 (Kanto). Čistá data – FIXNÍ trenéři (rival + gym
 * trenéři/leadeři + gauntlety + Liga), plán procedurálních route trenérů, Liga,
 * Rocket gauntlety a rival gate. Typedefy, logika (generování týmů, obtížnost,
 * sprite, helpery) a sloučení generací viz ../trainers.js.
 *
 * ⚠️ Tento soubor NESMÍ importovat ../generations.js ani ../trainers.js (cyklus).
 */

import { GEN2_ENABLED } from "../gameConfig.js";

/** @type {import("../trainers.js").Trainer[]} FIXNÍ trenéři Kanta. */
export const FIXED_TRAINERS_GEN1 = [
  // ═══════════════════════════════════════════════════════════════════════════
  //  RIVAL (kind "rival") – klikací gateway tab, PŘEDLIGOVÝ endgame soupeř.
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "rival-route-22",
    kind: "rival",
    class: "rival",
    name: "Rival",
    team: [
      { speciesId: "pidgeot", level: 47 },
      { speciesId: "alakazam", level: 47 },
      { speciesId: "rhydon", level: 45 },
      { speciesId: "gyarados", level: 45 },
      { speciesId: "arcanine", level: 47 },
      { speciesId: null, level: 50, counterStarterFinal: true },
    ],
    reward: 5000,
    quote: "Smell ya later! ...Just kidding. Let's see if you're ready for the League!",
  },
  {
    id: "rival-pallet",
    kind: "rival",
    class: "rival",
    name: "Rival",
    team: [{ speciesId: null, level: 4, counterStarter: true, moves: ["tackle", "tail-whip"] }],
    reward: 200,
    quote: "I'll take the strongest one! Show me what you've got!",
    difficulty: { ivFixed: 0, evOffense: 0, evSpeed: 0, optimizeNature: false },
    gateOnFight: true,
  },
  {
    id: "rival-ss-anne",
    kind: "rival",
    class: "rival",
    name: "Rival",
    team: [
      { speciesId: "pidgeotto", level: 18 },
      { speciesId: "raticate", level: 16 },
      { speciesId: null, level: 20, counterStarterMid: true },
    ],
    reward: 1330,
    quote: "What?! You beat me again?! ...Take this, it fell out of my bag. Smell ya later!",
  },
  {
    // Věrný Kanto (Yellow): rival tě přepadne v Cerulean City u vykradeného domu
    // PO přechodu Nugget Bridge (RIVAL_GATES_GEN1 requiresStory "nuggetBridge").
    // Volitelný tab (neblokuje postup), ale route-24/25 jsou povinné (Bill → S.S.
    // Ticket), takže hráč sem stejně dojde. Levely < S.S. Anne rival (vzestupně).
    id: "rival-cerulean",
    kind: "rival",
    class: "rival",
    name: "Rival",
    team: [
      { speciesId: "pidgeotto", level: 17 },
      { speciesId: "raticate", level: 16 },
      { speciesId: "kadabra", level: 16 },
      { speciesId: null, level: 18, counterStarterMid: true },
    ],
    reward: 1200,
    quote: "Hey! I was looking for you! Let's see how much stronger you've gotten since Pallet Town!",
  },
  {
    // Věrný Kanto: rival čeká na 2. patře Pokémon Tower v Lavenderu – souboj se
    // spustí JAKO PRVNÍ při vstupu do věže, ještě PŘED duchem Marowak (ten je výš
    // a vyžaduje Silph Scope). Spouští se z budovy (pokemonTowerView), výhra nastaví
    // story.towerRivalBeaten (viz battleSystem.finishTrainerBattle). Levely mezi
    // S.S. Anne (~L20) a Silph (~L40).
    id: "rival-pokemon-tower",
    kind: "rival",
    class: "rival",
    name: "Rival",
    team: [
      { speciesId: "pidgeotto", level: 25 },
      { speciesId: "gyarados", level: 23 },
      { speciesId: "growlithe", level: 22 },
      { speciesId: "kadabra", level: 20 },
      { speciesId: null, level: 25, counterStarterMid: true },
    ],
    reward: 1600,
    quote: "Yo! What brings you to a creepy place like this? ...Heh. Let's see how tough you've gotten — battle me!",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  GYM TRENÉŘI + LEADEŘI (kind "gym" / "gym-leader") – spouští se z Gym tabu.
  //  Sekvence gymu určuje data/gyms.js (trainerOrder), tady jen definice.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Pewter Gym (Brock, Rock) ──────────────────────────────────────────────
  {
    id: "pewter-gym-camper-liam",
    kind: "gym",
    class: "camper",
    name: "Camper Liam",
    team: [
      { speciesId: "diglett", level: 10 },
      { speciesId: "sandshrew", level: 10 },
    ],
    reward: 200,
    quote: "Stop right there! You can't reach Brock without beating me first!",
  },
  {
    id: "brock",
    kind: "gym-leader",
    class: "brock",
    name: "Leader Brock",
    team: [
      { speciesId: "geodude", level: 12 },
      { speciesId: "onix", level: 14 },
    ],
    reward: 1400,
    badge: "boulder-badge",
    quote:
      "I'm Brock! I'm Pewter's Gym Leader! My rock-hard willpower is evident even in my Pokémon. Let's battle!",
  },

  // ── Cerulean Gym (Misty, Water) ───────────────────────────────────────────
  {
    id: "cerulean-gym-swimmer-luis",
    kind: "gym",
    class: "swimmer-m",
    name: "Swimmer Luis",
    team: [
      { speciesId: "horsea", level: 16 },
      { speciesId: "shellder", level: 17 },
    ],
    reward: 85,
    quote: "The water in this Gym is deep. Don't drown!",
  },
  {
    id: "cerulean-gym-jr-diana",
    kind: "gym",
    class: "jr-trainer-f",
    name: "Jr. Trainer Diana",
    team: [{ speciesId: "goldeen", level: 19 }],
    reward: 456,
    quote: "You're after Misty's badge? Then you'll have to get past me and my Goldeen first!",
  },
  {
    id: "misty",
    kind: "gym-leader",
    class: "misty",
    name: "Leader Misty",
    team: [
      { speciesId: "staryu", level: 18 },
      { speciesId: "starmie", level: 21 },
    ],
    reward: 2100,
    badge: "cascade-badge",
    quote:
      "I'm Misty, Cerulean's Gym Leader! My policy is an all-out offensive with Water-type Pokémon!",
    defeatText: [
      "Misty: \"Wow! You're too much! All right! You can have the <strong>Cascade Badge</strong> to show you beat me!\"",
      "Head north over Nugget Bridge to meet <strong>Bill</strong>, or south along Route 5 toward <strong>Vermilion City</strong>.",
    ],
  },

  // ── Vermilion Gym (Lt. Surge, Electric) ───────────────────────────────────
  {
    id: "vermilion-gym-sailor-dwayne",
    kind: "gym",
    class: "sailor",
    name: "Sailor Dwayne",
    team: [
      { speciesId: "magnemite", level: 21 },
      { speciesId: "pikachu", level: 21 },
    ],
    reward: 462,
    quote: "This Gym is full of electric traps! Even sailors like me get a shock now and then!",
  },
  {
    id: "vermilion-gym-gentleman-gregory",
    kind: "gym",
    class: "gentleman",
    name: "Gentleman Gregory",
    team: [
      { speciesId: "voltorb", level: 21 },
      { speciesId: "voltorb", level: 21 },
    ],
    reward: 2100,
    quote: "When I was in the army, Lt. Surge was my strict commanding officer. Shall we?",
  },
  {
    id: "lt-surge",
    kind: "gym-leader",
    class: "lt-surge",
    name: "Leader Lt. Surge",
    team: [
      { speciesId: "voltorb", level: 21 },
      { speciesId: "pikachu", level: 18 },
      { speciesId: "raichu", level: 24 },
    ],
    reward: 2400,
    badge: "thunder-badge",
    quote:
      "Ten-hut! I'm Lt. Surge! My Electric Pokémon will fry you. This is the difference in our experience!",
  },

  // ── Celadon Gym (Erika, Grass) ────────────────────────────────────────────
  {
    id: "celadon-gym-beauty-tamia",
    kind: "gym",
    class: "beauty",
    name: "Beauty Tamia",
    team: [
      { speciesId: "bellsprout", level: 23 },
      { speciesId: "weepinbell", level: 24 },
    ],
    reward: 1560,
    quote: "Look, look! My Pokémon bloom as beautifully as the flowers in this Gym!",
  },
  {
    id: "celadon-gym-lass-michelle",
    kind: "gym",
    class: "lass",
    name: "Lass Michelle",
    team: [
      { speciesId: "oddish", level: 24 },
      { speciesId: "gloom", level: 24 },
    ],
    reward: 384,
    quote: "Hey! No boys allowed! ...Oh, you're a challenger? Fine, I'll battle you!",
  },
  {
    id: "erika",
    kind: "gym-leader",
    class: "erika",
    name: "Leader Erika",
    team: [
      { speciesId: "victreebel", level: 29 },
      { speciesId: "tangela", level: 24 },
      { speciesId: "vileplume", level: 29 },
    ],
    reward: 2900,
    badge: "rainbow-badge",
    quote:
      "Hello. Lovely weather, isn't it? I am Erika. I teach the art of flower arranging. My Pokémon are Grass-type.",
  },

  // ── Fuchsia Gym (Koga, Poison) ────────────────────────────────────────────
  {
    id: "fuchsia-gym-tamer-edgar",
    kind: "gym",
    class: "tamer",
    name: "Tamer Edgar",
    team: [
      { speciesId: "arbok", level: 33 },
      { speciesId: "sandslash", level: 33 },
    ],
    reward: 1584,
    quote: "Koga's Gym is full of invisible walls. Don't bump your nose on the way to me!",
  },
  {
    id: "fuchsia-gym-juggler-nelson",
    kind: "gym",
    class: "juggler",
    name: "Juggler Nelson",
    team: [
      { speciesId: "drowzee", level: 31 },
      { speciesId: "kadabra", level: 34 },
    ],
    reward: 1088,
    quote: "Strength isn't the key for Pokémon. It's strategy! I'll show you how it's done!",
  },
  {
    id: "koga",
    kind: "gym-leader",
    class: "koga",
    name: "Leader Koga",
    team: [
      { speciesId: "koffing", level: 37 },
      { speciesId: "muk", level: 39 },
      { speciesId: "koffing", level: 37 },
      { speciesId: "weezing", level: 43 },
    ],
    reward: 4300,
    badge: "soul-badge",
    quote:
      "Fwahahaha! A mere child like you dares to challenge me? I am Koga, master of Poison-type Pokémon!",
  },

  // ── Saffron Gym (Sabrina, Psychic) ────────────────────────────────────────
  {
    id: "saffron-gym-psychic-johan",
    kind: "gym",
    class: "psychic",
    name: "Psychic Johan",
    team: [
      { speciesId: "slowpoke", level: 34 },
      { speciesId: "kadabra", level: 34 },
    ],
    reward: 680,
    quote: "I can see the future... and in it, you lose. Let's make it come true!",
  },
  {
    id: "saffron-gym-channeler-preston",
    kind: "gym",
    class: "channeler",
    name: "Channeler Preston",
    team: [
      { speciesId: "gastly", level: 31 },
      { speciesId: "haunter", level: 34 },
    ],
    reward: 748,
    quote: "Sabrina sees everything... and the spirits whisper to me. Prepare yourself!",
  },
  {
    id: "sabrina",
    kind: "gym-leader",
    class: "sabrina",
    name: "Leader Sabrina",
    team: [
      { speciesId: "kadabra", level: 38 },
      { speciesId: "mr-mime", level: 37 },
      { speciesId: "venomoth", level: 38 },
      { speciesId: "alakazam", level: 43 },
    ],
    reward: 4300,
    badge: "marsh-badge",
    quote:
      "I am Sabrina. I had a feeling you would come. My psychic power lets me see the future. You will lose.",
  },

  // ── Cinnabar Gym (Blaine, Fire) ───────────────────────────────────────────
  {
    id: "cinnabar-gym-burglar-quinn",
    kind: "gym",
    class: "burglar",
    name: "Burglar Quinn",
    team: [
      { speciesId: "growlithe", level: 38 },
      { speciesId: "ponyta", level: 40 },
    ],
    reward: 3520,
    quote: "I used to be a burglar, but now I only steal wins! Fire away!",
  },
  {
    id: "cinnabar-gym-supernerd-erik",
    kind: "gym",
    class: "super-nerd",
    name: "Super Nerd Erik",
    team: [
      { speciesId: "vulpix", level: 40 },
      { speciesId: "growlithe", level: 40 },
    ],
    reward: 1440,
    quote: "Do you know how hot fire Pokémon burn? I've calculated it. You won't like the answer!",
  },
  {
    id: "blaine",
    kind: "gym-leader",
    class: "blaine",
    name: "Leader Blaine",
    team: [
      { speciesId: "growlithe", level: 42 },
      { speciesId: "ponyta", level: 40 },
      { speciesId: "rapidash", level: 42 },
      { speciesId: "arcanine", level: 47 },
    ],
    reward: 4700,
    badge: "volcano-badge",
    quote:
      "Hah! I'm Blaine! I'm the Cinnabar Gym Leader! My fiery Pokémon will incinerate all challengers! Hah!",
  },

  // ── Pokémon Mansion gauntlet (Cinnabar) – fronta Burglarů + boss za Secret Key ─
  {
    id: "cinnabar-mansion-burglar-1",
    kind: "rocket",
    class: "burglar",
    name: "Burglar Ignatz",
    team: [
      { speciesId: "growlithe", level: 34 },
      { speciesId: "vulpix", level: 35 },
      { speciesId: "ponyta", level: 36 },
    ],
    reward: 1620,
    quote: "Heh, a looter's paradise in here — and you're not getting past me!",
  },
  {
    id: "cinnabar-mansion-burglar-2",
    kind: "rocket",
    class: "burglar",
    name: "Burglar Simon",
    team: [
      { speciesId: "vulpix", level: 35 },
      { speciesId: "growlithe", level: 36 },
      { speciesId: "rapidash", level: 38 },
    ],
    reward: 1710,
    quote: "The good stuff's locked in the vault. Beat it, kid!",
  },
  {
    id: "cinnabar-mansion-boss",
    kind: "boss",
    class: "super-nerd",
    name: "Scientist Volk",
    team: [
      { speciesId: "koffing", level: 37 },
      { speciesId: "magmar", level: 39 },
      { speciesId: "weezing", level: 39 },
      { speciesId: "rapidash", level: 41 },
    ],
    reward: 3280,
    quote: "The Mewtwo experiments must not be disturbed! I'll burn these journals before I let you have that key!",
  },

  // ── Viridian Gym (Giovanni, Ground) ───────────────────────────────────────
  {
    id: "viridian-gym-cooltrainer-samson",
    kind: "gym",
    class: "cooltrainer-m",
    name: "Cool Trainer Samson",
    team: [
      { speciesId: "rhyhorn", level: 43 },
      { speciesId: "persian", level: 44 },
    ],
    reward: 1760,
    quote: "The Leader of this Gym is the strongest of them all. You won't even reach him!",
  },
  {
    id: "viridian-gym-toughguy-nick",
    kind: "gym",
    class: "black-belt",
    name: "Black Belt Nick",
    team: [
      { speciesId: "machoke", level: 42 },
      { speciesId: "golem", level: 43 },
    ],
    reward: 1720,
    quote: "Hwaah! Only the toughest trainers stand in Viridian Gym. Show me your strength!",
  },
  {
    id: "giovanni",
    kind: "gym-leader",
    class: "giovanni",
    name: "Leader Giovanni",
    team: [
      { speciesId: "rhyhorn", level: 45 },
      { speciesId: "dugtrio", level: 42 },
      { speciesId: "nidoqueen", level: 44 },
      { speciesId: "nidoking", level: 45 },
      { speciesId: "rhydon", level: 50 },
    ],
    reward: 5000,
    badge: "earth-badge",
    quote:
      "So! I must say, I am impressed you got here. I am Giovanni, Viridian's Gym Leader. This is our final battle!",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  TEAM ROCKET GRUNTS (kind "rocket") – POVINNÝ gauntlet (viz ROCKET_GAUNTLETS).
  // ═══════════════════════════════════════════════════════════════════════════
  {
    // Věrný Kanto (RBY): v Cerulean City někdo vykradl dům a zloděj z Team Rocket
    // (prokopal se dovnitř) tam pořád je. VOLITELNÝ 1-grunt „gauntlet" – flavour,
    // negatuje postup (viz ROCKET_GAUNTLETS_GEN1["cerulean-city"], bez requiresStory).
    id: "cerulean-rocket-grunt",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Team Rocket Grunt",
    team: [
      { speciesId: "ekans", level: 17 },
      { speciesId: "zubat", level: 16 },
    ],
    reward: 500,
    quote: "Gah! You saw me?! ...Fine. Team Rocket never runs without a fight — come on!",
  },
  {
    id: "mt-moon-rocket-1",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Team Rocket Grunt",
    team: [
      { speciesId: "rattata", level: 11 },
      { speciesId: "zubat", level: 11 },
    ],
    reward: 350,
    quote: "This cave belongs to Team Rocket now. Beat it, kid!",
  },
  {
    id: "mt-moon-rocket-2",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Team Rocket Grunt",
    team: [
      { speciesId: "sandshrew", level: 12 },
      { speciesId: "zubat", level: 12 },
    ],
    reward: 380,
    quote: "We're digging for fossils here. Get lost!",
  },
  {
    id: "mt-moon-rocket-3",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Team Rocket Grunt",
    team: [
      { speciesId: "ekans", level: 12 },
      { speciesId: "zubat", level: 13 },
    ],
    reward: 400,
    quote: "You've got guts coming down here alone.",
  },
  {
    id: "mt-moon-rocket-4",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Team Rocket Grunt",
    team: [
      { speciesId: "grimer", level: 13 },
      { speciesId: "koffing", level: 13 },
    ],
    reward: 430,
    quote: "You'll never take the fossils from us!",
  },
  {
    id: "mt-moon-rocket-5",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Team Rocket Grunt",
    team: [
      { speciesId: "raticate", level: 14 },
      { speciesId: "ekans", level: 14 },
      { speciesId: "zubat", level: 14 },
    ],
    reward: 500,
    quote: "I'm the last one standing. There's no way past me!",
  },

  // ── Route 9: Mountain Hikers ──────────────────────────────────────────────
  {
    id: "route-09-hiker-1",
    kind: "hiker",
    class: "hiker",
    name: "Hiker Marcos",
    team: [
      { speciesId: "geodude", level: 12 },
      { speciesId: "machop", level: 12 },
    ],
    reward: 400,
    quote: "This mountain trail is no place for the weak!",
  },
  {
    id: "route-09-hiker-2",
    kind: "hiker",
    class: "hiker",
    name: "Hiker Dudley",
    team: [{ speciesId: "onix", level: 14 }],
    reward: 420,
    quote: "My Onix will grind you to dust!",
  },
  {
    id: "route-09-hiker-3",
    kind: "hiker",
    class: "hiker",
    name: "Hiker Franklin",
    team: [
      { speciesId: "geodude", level: 13 },
      { speciesId: "geodude", level: 13 },
      { speciesId: "onix", level: 13 },
    ],
    reward: 460,
    quote: "Rock Tunnel's just ahead. Prove you belong here!",
  },

  // ── Celadon City: Team Rocket Hideout ─────────────────────────────────────
  {
    id: "rocket-hideout-1",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Team Rocket Grunt",
    team: [
      { speciesId: "rattata", level: 18 },
      { speciesId: "zubat", level: 18 },
      { speciesId: "raticate", level: 21 },
    ],
    reward: 600,
    quote: "You shouldn't be down here, kid!",
  },
  {
    id: "rocket-hideout-2",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Team Rocket Grunt",
    team: [
      { speciesId: "grimer", level: 19 },
      { speciesId: "koffing", level: 19 },
    ],
    reward: 640,
    quote: "Team Rocket owns this town now.",
  },
  {
    id: "rocket-hideout-3",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Team Rocket Grunt",
    team: [
      { speciesId: "machop", level: 21 },
      { speciesId: "drowzee", level: 20 },
    ],
    reward: 700,
    quote: "The boss is just past me. You'll never reach him!",
  },
  {
    id: "rocket-hideout-4",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Team Rocket Grunt",
    team: [
      { speciesId: "sandshrew", level: 20 },
      { speciesId: "ekans", level: 20 },
      { speciesId: "zubat", level: 20 },
    ],
    reward: 740,
    quote: "This is your last warning!",
  },
  {
    id: "giovanni-hideout",
    kind: "boss",
    class: "giovanni",
    name: "Boss Giovanni",
    team: [
      { speciesId: "onix", level: 25 },
      { speciesId: "rhyhorn", level: 24 },
      { speciesId: "kangaskhan", level: 29 },
    ],
    reward: 2500,
    quote: "So you've come this far. I am Giovanni, leader of Team Rocket. I'll deal with you myself!",
  },

  // ── Pokémon Tower: Marowak ghost a Route 12: Snorlax ─────────────────────
  {
    id: "lavender-marowak",
    kind: "boss",
    class: "ghost",
    name: "Ghostly Marowak",
    team: [{ speciesId: "marowak", level: 30 }],
    reward: 1000,
    quote: "GAAAAH! The vengeful spirit of a mother Marowak lunges at you!",
  },
  // Pozn.: Snorlax na Route 12 NENÍ trenér. Věrně Kantu je to chytatelné statické
  // setkání (viz mapView „snorlax-block" → startStaticEncounter("snorlax", 30,
  // { claimFlag: "snorlaxCleared" })). Proto tu žádný „lavender-snorlax" boss není.

  // ── Silph Co. gauntlet (Saffron): grunti → rival → boss Giovanni ──────────
  {
    id: "silph-rocket-1",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Rocket Grunt",
    team: [
      { speciesId: "raticate", level: 33 },
      { speciesId: "zubat", level: 33 },
    ],
    reward: 700,
    quote: "Silph Co. belongs to Team Rocket now! Get lost, kid!",
  },
  {
    id: "silph-rocket-2",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Rocket Grunt",
    team: [
      { speciesId: "arbok", level: 34 },
      { speciesId: "golbat", level: 34 },
    ],
    reward: 720,
    quote: "Hey! Who let a kid in here? Intruders get crushed!",
  },
  {
    id: "silph-rocket-3",
    kind: "rocket",
    class: "rocket-grunt",
    name: "Rocket Grunt",
    team: [
      { speciesId: "grimer", level: 33 },
      { speciesId: "koffing", level: 33 },
      { speciesId: "weezing", level: 35 },
    ],
    reward: 760,
    quote: "The boss is about to take over Silph Co.! You won't stop us!",
  },
  {
    id: "rival-silph",
    kind: "rival",
    class: "rival",
    name: "Rival",
    team: [
      { speciesId: "pidgeot", level: 40 },
      { speciesId: "growlithe", level: 38 },
      { speciesId: "kadabra", level: 38 },
      { speciesId: "gyarados", level: 40 },
      // Kánon RBY: ve Silph Co má rival už FINÁLNÍ evoluci startéra (Charizard/
      // Blastoise/Venusaur), ne střední. (Ostatní jeho Pokémoni jsou taky plně vyvinutí.)
      { speciesId: null, level: 42, counterStarterFinal: true },
    ],
    reward: 2600,
    quote:
      "Hey! What are YOU doing here?! ...Taking on Team Rocket too, huh? Fine — but first let's see how strong you've really gotten!",
  },
  {
    id: "giovanni-silph",
    kind: "boss",
    class: "giovanni",
    name: "Boss Giovanni",
    team: [
      { speciesId: "nidorino", level: 37 },
      { speciesId: "kangaskhan", level: 35 },
      { speciesId: "rhyhorn", level: 37 },
      { speciesId: "nidoqueen", level: 41 },
    ],
    reward: 5300,
    quote:
      "Fuhaha! You again. Team Rocket has taken Silph Co. — this whole region's future is mine to shape! ...Unless you can tear it from my grasp.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  POKÉMON LEAGUE – ELITE FOUR + CHAMPION (Indigo Plateau).
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "elite-four-lorelei",
    kind: "elite-four",
    class: "elite-four",
    name: "Elite Four Lorelei",
    team: [
      { speciesId: "dewgong", level: 54 },
      { speciesId: "cloyster", level: 53 },
      { speciesId: "slowbro", level: 54 },
      { speciesId: "jynx", level: 56 },
      { speciesId: "lapras", level: 56 },
    ],
    reward: 6000,
    quote:
      "Welcome to the Pokémon League. I am Lorelei of the Elite Four. My icy Pokémon will freeze you solid — no waffling here!",
    defeatText: [
      "Lorelei: \"You're better than I thought! Go on ahead! You only got a taste of Pokémon League power!\"",
      "The next door opens. <strong>Bruno</strong> of the Elite Four awaits.",
    ],
  },
  {
    id: "elite-four-bruno",
    kind: "elite-four",
    class: "elite-four",
    name: "Elite Four Bruno",
    team: [
      { speciesId: "onix", level: 53 },
      { speciesId: "hitmonchan", level: 55 },
      { speciesId: "hitmonlee", level: 55 },
      { speciesId: "onix", level: 56 },
      { speciesId: "machamp", level: 58 },
    ],
    reward: 6500,
    quote: "I am Bruno of the Elite Four! We will grind you down with our superior power! HOOAH!",
    defeatText: [
      "Bruno: \"Why? How could I lose? My job is done! Go face your next challenge!\"",
      "The next door opens. <strong>Agatha</strong> of the Elite Four awaits.",
    ],
  },
  {
    id: "elite-four-agatha",
    kind: "elite-four",
    class: "elite-four",
    name: "Elite Four Agatha",
    team: [
      { speciesId: "gengar", level: 56 },
      { speciesId: "golbat", level: 56 },
      { speciesId: "haunter", level: 55 },
      { speciesId: "arbok", level: 58 },
      { speciesId: "gengar", level: 60 },
    ],
    reward: 7000,
    quote:
      "I am Agatha of the Elite Four. Oak's taken a real shine to you, kid. My ghosts will teach you what real horror is!",
    defeatText: [
      "Agatha: \"Oh ho! You're something special, child! All right, I'll let you go. You'll face Lance next!\"",
      "The next door opens. <strong>Lance</strong>, the dragon master, awaits.",
    ],
  },
  {
    id: "elite-four-lance",
    kind: "elite-four",
    class: "elite-four",
    name: "Elite Four Lance",
    team: [
      { speciesId: "gyarados", level: 58 },
      { speciesId: "dragonair", level: 56 },
      { speciesId: "dragonair", level: 56 },
      { speciesId: "aerodactyl", level: 60 },
      { speciesId: "dragonite", level: 62 },
    ],
    reward: 7500,
    quote:
      "Welcome. I am Lance, the Dragon master and the last of the Elite Four. My dragons are all but invincible. Prepare yourself!",
    defeatText: [
      "Lance: \"That's it! I hate to admit it, but you are a Pokémon master! ...Still, there's one more trainer you must face.\"",
      "The final door opens. The <strong>Champion</strong> is waiting.",
    ],
  },
  {
    id: "champion-blue",
    kind: "champion",
    class: "champion",
    name: "Champion Blue",
    team: [
      { speciesId: "pidgeot", level: 61 },
      { speciesId: "alakazam", level: 59 },
      { speciesId: "rhydon", level: 61 },
      { speciesId: "gyarados", level: 61 },
      { speciesId: "arcanine", level: 61 },
      { speciesId: null, level: 63, counterStarterFinal: true },
    ],
    reward: 10000,
    quote:
      "Hah! I knew it! While you were plodding along, I became the Pokémon League CHAMPION! Now I'll show you the difference between us!",
  },
];

/**
 * Plán route trenérů Kanta: pro každou routu level band + počet trenérů + velikost
 * týmu. Vynechány zóny bez trenérů dle kánonu. `level`/`size` = [min,max].
 * @type {Record<string, {level:[number,number], count:number, size:[number,number]}>}
 */
export const ROUTE_TRAINER_PLAN_GEN1 = {
  "route-01": { level: [3, 6], count: 3, size: [2, 2] },
  "route-22": { level: [5, 8], count: 3, size: [2, 3] },
  "route-02": { level: [4, 7], count: 3, size: [2, 2] },
  "viridian-forest": { level: [5, 8], count: 4, size: [2, 3] },
  "route-03": { level: [9, 13], count: 4, size: [2, 3] },
  "mt-moon": { level: [11, 14], count: 5, size: [2, 3] },
  "route-04": { level: [10, 13], count: 3, size: [2, 3] },
  "route-24": { level: [11, 15], count: 5, size: [2, 3] },
  "route-25": { level: [12, 16], count: 5, size: [2, 4] },
  "route-05": { level: [14, 17], count: 3, size: [2, 3] },
  "route-06": { level: [15, 18], count: 4, size: [2, 3] },
  "route-11": { level: [17, 21], count: 5, size: [2, 4] },
  "route-09": { level: [14, 18], count: 5, size: [2, 4] },
  "rock-tunnel": { level: [15, 20], count: 5, size: [3, 4] },
  "route-10": { level: [16, 20], count: 4, size: [2, 4] },
  "route-08": { level: [18, 23], count: 5, size: [3, 4] },
  "route-07": { level: [18, 22], count: 4, size: [2, 4] },
  "route-16": { level: [24, 28], count: 4, size: [3, 4] },
  "route-17": { level: [26, 30], count: 5, size: [3, 5] },
  "route-18": { level: [28, 31], count: 4, size: [3, 4] },
  "route-12": { level: [28, 33], count: 5, size: [3, 5] },
  "route-13": { level: [29, 34], count: 5, size: [3, 5] },
  "route-14": { level: [30, 34], count: 5, size: [3, 5] },
  "route-15": { level: [30, 34], count: 5, size: [3, 5] },
  "route-19": { level: [28, 32], count: 4, size: [3, 4] },
  "route-20": { level: [30, 34], count: 5, size: [3, 4] },
  "route-21": { level: [32, 36], count: 4, size: [3, 5] },
  "route-23": { level: [40, 45], count: 5, size: [4, 5] },
  "victory-road": { level: [42, 47], count: 5, size: [4, 5] },
};

/**
 * POKÉMON LEAGUE Kanta (Elite Four + Champion) na Indigo Plateau.
 * order = striktní pořadí (poslední = Champion). Viz ../trainers.js / battleSystem.
 */
export const LEAGUE_GEN1 = {
  areaId: "indigo-plateau",
  title: "Pokémon League — Elite Four",
  intro:
    "This is the Indigo Plateau, the pinnacle of every trainer's journey. Behind these doors wait the Elite Four and, beyond them, the Champion. Face them one after another — there is no leaving to heal between battles. Your only aid is what you carry in your Bag. Lose even once, and you start again from the very first challenger.",
  order: ["elite-four-lorelei", "elite-four-bruno", "elite-four-agatha", "elite-four-lance", "champion-blue"],
  clearFlag: "leagueCleared",
  clearStoryFlag: "isChampion",
  clearReward: { gold: 20000 },
  // Okno po PRVNÍM pokoření Ligy (battleSystem → STORY_POPUP).
  clearPopup: {
    title: "Pokémon League Champion!",
    body: `<p class="story-text">The final Pokémon falls. Blue sinks to his knees. "...No! Why?! I never lost to you before... What went wrong?"</p>
      <p class="story-text">Professor Oak steps into the Hall of Fame. "Blue! I'm disappointed in you. And you —" he turns to you, beaming, "— you understand that the bond of trust between you and your Pokémon is what makes them strong. You are the new <strong>Pokémon League Champion</strong>!"</p>
      <p class="story-text">Your team is recorded in the <strong>Hall of Fame</strong>. And with the League conquered, the sealed <strong>Cerulean Cave</strong> is said to open at last — home to the strongest Pokémon of all, <strong>Mewtwo</strong>. Your legend has only begun.</p>${GEN2_ENABLED ? `
      <p class="story-text">Word of a new Champion spreads fast: the captain of the <strong>S.S. Anne</strong> in <strong>Vermilion City</strong> is ready to take you across the sea to the <strong>Johto</strong> region.</p>` : ""}`,
    okLabel: "Hall of Fame ✦",
  },
};

/** Rival gate Kanta (areaId → id rivala, nebo {id, requiresStory}). */
export const RIVAL_GATES_GEN1 = {
  "pallet-town": "rival-pallet",
  // Cerulean rival se objeví AŽ po přechodu Nugget Bridge (story "nuggetBridge",
  // nastaveno při příchodu na Route 24) – kánon Yellow (rival v Cerulean City).
  "cerulean-city": { id: "rival-cerulean", requiresStory: "nuggetBridge" },
  // Route 22 je raná odbočka (order 3) u Viridianu, ale tenhle rival je PŘEDLIGOVÝ
  // endgame souboj (L45–50, kánon RBY před Victory Road). Tab se proto odemkne až
  // po poražení Giovanniho = 8. odznak (story "giovanniCleared"), ať hra brzy
  // nenabízí nevyhratelný souboj. Příchod na Route 22 před tím → varovný popup
  // (viz battleSystem.setActiveArea "route-22-not-yet" + mapView).
  "route-22": { id: "rival-route-22", requiresStory: "giovanniCleared" },
};

/** POVINNÉ gauntlety Kanta (areaId → gauntlet). Viz ../trainers.js. */
export const ROCKET_GAUNTLETS_GEN1 = {
  // Věrný Kanto (RBY): vykradený dům v Cerulean City. VOLITELNÝ 1-grunt souboj
  // (žádné requiresStory, negatuje nic – tab se objeví při první návštěvě Cerulean,
  // po výhře ukáže cleared). Odměna = „nalezené" peníze z lupu.
  "cerulean-city": {
    id: "cerulean-rocket",
    areaId: "cerulean-city",
    title: "Robbed House",
    tabLabel: "Rocket Thief",
    tabIcon: "🕵️",
    intro:
      "A house on the edge of Cerulean City was ransacked — and the Team Rocket thief who dug his way in is still inside, clutching the stolen goods. Corner him!",
    clearFlag: "ceruleanRocketBeaten",
    trainerIds: ["cerulean-rocket-grunt"],
    clearReward: { gold: 700 },
  },
  "mt-moon": {
    id: "mt-moon-rockets",
    areaId: "mt-moon",
    title: "Team Rocket",
    intro:
      "Team Rocket grunts have overrun Mt. Moon, hunting for the rare fossils. Drive out all five of them to clear the path deeper into the cave!",
    clearFlag: "mtMoonRocketsCleared",
    trainerIds: ["mt-moon-rocket-1", "mt-moon-rocket-2", "mt-moon-rocket-3", "mt-moon-rocket-4", "mt-moon-rocket-5"],
    clearReward: { gold: 1000 },
  },
  "route-09": {
    id: "route-09-hikers",
    areaId: "route-09",
    title: "Mountain Hikers",
    tabLabel: "Hikers",
    tabIcon: "⛏️",
    intro: "The road to Rock Tunnel is guarded by tough mountain Hikers. Beat them all to prove you're ready for the dark.",
    clearFlag: "route9HikersCleared",
    trainerIds: ["route-09-hiker-1", "route-09-hiker-2", "route-09-hiker-3"],
    clearReward: { gold: 600 },
  },
  "celadon-city": {
    id: "rocket-hideout",
    areaId: "celadon-city",
    title: "Team Rocket Hideout",
    tabLabel: "Team Rocket",
    tabIcon: "💣",
    intro: "Behind a poster in the Game Corner, a secret stairway leads down into Team Rocket's hideout. Fight your way to the boss.",
    clearFlag: "rocketHideoutCleared",
    trainerIds: ["rocket-hideout-1", "rocket-hideout-2", "rocket-hideout-3", "rocket-hideout-4", "giovanni-hideout"],
    clearReward: { gold: 2500 },
    clearItem: "silph-scope",
    clearStoryFlag: "hasSilphScope",
  },
  "cinnabar-island": {
    id: "cinnabar-mansion",
    areaId: "cinnabar-island",
    title: "Pokémon Mansion",
    tabLabel: "Mansion",
    tabIcon: "🏚️",
    requiresStory: "mansionPuzzleSolved",
    intro:
      "You slipped past the shifting walls. Deeper in the charred labs, two Burglars and their boss stand between you and the vault holding the Secret Key.",
    clearFlag: "cinnabarMansionCleared",
    trainerIds: ["cinnabar-mansion-burglar-1", "cinnabar-mansion-burglar-2", "cinnabar-mansion-boss"],
    clearReward: { gold: 1800 },
    clearItem: "secret-key",
    clearStoryFlag: "hasSecretKey",
  },
  "saffron-city": {
    id: "silph-co",
    areaId: "saffron-city",
    title: "Silph Co.",
    tabLabel: "Silph Co.",
    tabIcon: "🏢",
    requiresStory: "saffronGuardsCleared",
    intro:
      "Team Rocket has seized Silph Co.'s tower floor by floor. Fight your way up through the grunts, past your rival, all the way to Giovanni on the top floor — and free the company.",
    clearFlag: "silphCleared",
    trainerIds: ["silph-rocket-1", "silph-rocket-2", "silph-rocket-3", "rival-silph", "giovanni-silph"],
    clearReward: { gold: 4000 },
  },
};
