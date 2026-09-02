/**
 * DATA: definice tahů (moves). Čistá data, žádná logika – jako data/pokemon.js.
 * Nový tah = jen přidat objekt; systémy (damage, PP, UI) čtou přes getMove().
 * Řadit logicky (podle typu / příbuznosti), ať jsou položky za sebou.
 *
 * Model: kategorie **physical / special / status** (physical počítá z Attack/
 * Defense, special ze Sp.Atk/Sp.Def; **status** = bez přímého damage, power 0),
 * **accuracy** v % (101+/null = vždy zasáhne), **PP** = počet použití.
 *
 * ⚠️ POZOR (2026-09-02): Learnsety obsahují KOMPLETNÍ level-up movepooly včetně
 * tahů, jejichž zvláštní efekt engine ZATÍM neumí – to je záměr, tahy jsou
 * „připravené" (data hotová), efekt se v souboji zatím neaplikuje. Co engine dnes
 * reálně řeší: přímý damage (power, type, kategorie, STAB, typová efektivita,
 * kritické zásahy), accuracy/miss, pp, priority a ailment poison/burn/paralysis
 * (i jako čistý status tah). Vše ostatní nese pole **effect** a engine ho ZATÍM
 * ignoruje (stat změny, spánek, zmatení, odražení, odsátí, více-zásah, dvoukolo,
 * útěk, kopírování tahu, transformace…).
 *
 * @typedef {"physical"|"special"|"status"} MoveCategory
 *
 * @typedef {Object} MoveEffect  PŘIPRAVENO – engine zatím neaplikuje.
 * @property {string} kind  "statChange" | "sleep" | "confuse" | "flinch" |
 *   "recoil" | "drain" | "leechSeed" | "twoTurn" | "thrash" | "trap" |
 *   "rapidSpin" | "highCrit" | "critUp" | "rage" | "fixedDamageHalf" |
 *   "forceSwitch" | "copyMove" | "transform" | "heal" | "weather" |
 *   "tailwind" | "pursuit" | "suckerPunch"
 * @property {"self"|"enemy"} [target]
 * @property {string} [stat]     klíč statu (attack/defense/spAttack/spDefense/speed/accuracy/evasion)
 * @property {number} [stages]   o kolik stupňů (±)
 * @property {number} [chance]   šance efektu v % (chybí = 100)
 * @property {number} [frac]     zlomek (recoil/drain/heal)
 * @property {string} [weather]
 *
 * @typedef {Object} Move
 * @property {string} id
 * @property {string} name
 * @property {string} type        typ tahu (viz data/types.js)
 * @property {MoveCategory} category
 * @property {number} power       0 = žádný přímý damage / status
 * @property {number} accuracy    % (100 = skoro jistota; 101+/null = vždy)
 * @property {number} pp          maximální PP
 * @property {number} [priority]  vyšší jde dřív (výchozí 0)
 * @property {"poison"|"burn"|"paralysis"} [ailment]
 * @property {number} [ailmentChance]     výchozí 100
 * @property {MoveEffect} [effect]        PŘIPRAVENO, engine zatím ignoruje
 */

/** @type {Move[]} */
export const MOVES = [
  // --- Normal (damage) ---
  { id: "tackle", name: "Tackle", type: "Normal", category: "physical", power: 40, accuracy: 100, pp: 35 },
  { id: "scratch", name: "Scratch", type: "Normal", category: "physical", power: 40, accuracy: 100, pp: 35 },
  { id: "quick-attack", name: "Quick Attack", type: "Normal", category: "physical", power: 40, accuracy: 100, pp: 30, priority: 1 },
  { id: "body-slam", name: "Body Slam", type: "Normal", category: "physical", power: 60, accuracy: 100, pp: 15, ailment: "paralysis", ailmentChance: 30 },
  { id: "rage", name: "Rage", type: "Normal", category: "physical", power: 20, accuracy: 100, pp: 20, effect: { kind: "rage" } },
  { id: "take-down", name: "Take Down", type: "Normal", category: "physical", power: 90, accuracy: 85, pp: 20, effect: { kind: "recoil", frac: 0.25 } },
  { id: "double-edge", name: "Double-Edge", type: "Normal", category: "physical", power: 120, accuracy: 100, pp: 15, effect: { kind: "recoil", frac: 0.33 } },
  { id: "slash", name: "Slash", type: "Normal", category: "physical", power: 70, accuracy: 100, pp: 20, effect: { kind: "highCrit" } },
  { id: "bite", name: "Bite", type: "Normal", category: "physical", power: 60, accuracy: 100, pp: 25, effect: { kind: "flinch", chance: 30 } },
  { id: "hyper-fang", name: "Hyper Fang", type: "Normal", category: "physical", power: 80, accuracy: 90, pp: 15, effect: { kind: "flinch", chance: 10 } },
  { id: "super-fang", name: "Super Fang", type: "Normal", category: "physical", power: 0, accuracy: 90, pp: 10, effect: { kind: "fixedDamageHalf" } },
  // --- Normal (status) ---
  { id: "growl", name: "Growl", type: "Normal", category: "status", power: 0, accuracy: 100, pp: 40, effect: { kind: "statChange", target: "enemy", stat: "attack", stages: -1 } },
  { id: "leer", name: "Leer", type: "Normal", category: "status", power: 0, accuracy: 100, pp: 30, effect: { kind: "statChange", target: "enemy", stat: "defense", stages: -1 } },
  { id: "tail-whip", name: "Tail Whip", type: "Normal", category: "status", power: 0, accuracy: 100, pp: 30, effect: { kind: "statChange", target: "enemy", stat: "defense", stages: -1 } },
  { id: "sand-attack", name: "Sand Attack", type: "Normal", category: "status", power: 0, accuracy: 100, pp: 15, effect: { kind: "statChange", target: "enemy", stat: "accuracy", stages: -1 } },
  { id: "swords-dance", name: "Swords Dance", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 20, effect: { kind: "statChange", target: "self", stat: "attack", stages: 2 } },
  { id: "growth", name: "Growth", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 40, effect: { kind: "statChange", target: "self", stat: "spAttack", stages: 1 } },
  { id: "focus-energy", name: "Focus Energy", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 30, effect: { kind: "critUp" } },
  { id: "sweet-scent", name: "Sweet Scent", type: "Normal", category: "status", power: 0, accuracy: 100, pp: 20, effect: { kind: "statChange", target: "enemy", stat: "evasion", stages: -1 } },
  { id: "transform", name: "Transform", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 10, effect: { kind: "transform" } },

  // --- Fire ---
  { id: "ember", name: "Ember", type: "Fire", category: "special", power: 40, accuracy: 100, pp: 25, ailment: "burn", ailmentChance: 10 },
  { id: "flamethrower", name: "Flamethrower", type: "Fire", category: "special", power: 90, accuracy: 100, pp: 15, ailment: "burn", ailmentChance: 10 },
  { id: "fire-spin", name: "Fire Spin", type: "Fire", category: "special", power: 35, accuracy: 85, pp: 15, effect: { kind: "trap" } },
  { id: "smokescreen", name: "Smokescreen", type: "Normal", category: "status", power: 0, accuracy: 100, pp: 20, effect: { kind: "statChange", target: "enemy", stat: "accuracy", stages: -1 } },

  // --- Water ---
  { id: "water-gun", name: "Water Gun", type: "Water", category: "special", power: 40, accuracy: 100, pp: 25 },
  { id: "bubble", name: "Bubble", type: "Water", category: "special", power: 40, accuracy: 100, pp: 30, effect: { kind: "statChange", target: "enemy", stat: "speed", stages: -1, chance: 10 } },
  { id: "withdraw", name: "Withdraw", type: "Water", category: "status", power: 0, accuracy: 101, pp: 40, effect: { kind: "statChange", target: "self", stat: "defense", stages: 1 } },
  { id: "skull-bash", name: "Skull Bash", type: "Normal", category: "physical", power: 130, accuracy: 100, pp: 10, effect: { kind: "twoTurn" } },
  { id: "rapid-spin", name: "Rapid Spin", type: "Normal", category: "physical", power: 50, accuracy: 100, pp: 40, effect: { kind: "rapidSpin" } },
  { id: "hydro-pump", name: "Hydro Pump", type: "Water", category: "special", power: 110, accuracy: 80, pp: 5 },
  { id: "water-pulse", name: "Water Pulse", type: "Water", category: "special", power: 60, accuracy: 100, pp: 20, effect: { kind: "confuse", chance: 20 } },
  { id: "aqua-tail", name: "Aqua Tail", type: "Water", category: "physical", power: 90, accuracy: 90, pp: 10 },
  { id: "rain-dance", name: "Rain Dance", type: "Water", category: "status", power: 0, accuracy: 101, pp: 5, effect: { kind: "weather", weather: "rain" } },

  // --- Grass ---
  { id: "vine-whip", name: "Vine Whip", type: "Grass", category: "physical", power: 45, accuracy: 100, pp: 25 },
  { id: "razor-leaf", name: "Razor Leaf", type: "Grass", category: "physical", power: 55, accuracy: 95, pp: 25, effect: { kind: "highCrit" } },
  { id: "solar-beam", name: "Solar Beam", type: "Grass", category: "special", power: 120, accuracy: 100, pp: 10, effect: { kind: "twoTurn" } },
  { id: "petal-dance", name: "Petal Dance", type: "Grass", category: "special", power: 120, accuracy: 100, pp: 10, effect: { kind: "thrash" } },
  { id: "leech-seed", name: "Leech Seed", type: "Grass", category: "status", power: 0, accuracy: 90, pp: 10, effect: { kind: "leechSeed" } },
  { id: "sleep-powder", name: "Sleep Powder", type: "Grass", category: "status", power: 0, accuracy: 75, pp: 15, effect: { kind: "sleep" } },
  { id: "synthesis", name: "Synthesis", type: "Grass", category: "status", power: 0, accuracy: 101, pp: 5, effect: { kind: "heal", frac: 0.5 } },

  // --- Poison ---
  { id: "poison-sting", name: "Poison Sting", type: "Poison", category: "physical", power: 15, accuracy: 100, pp: 35, ailment: "poison", ailmentChance: 30 },
  { id: "poison-powder", name: "Poison Powder", type: "Poison", category: "status", power: 0, accuracy: 75, pp: 35, ailment: "poison", ailmentChance: 100 },

  // --- Flying ---
  { id: "gust", name: "Gust", type: "Flying", category: "special", power: 40, accuracy: 100, pp: 35 },
  { id: "wing-attack", name: "Wing Attack", type: "Flying", category: "physical", power: 60, accuracy: 100, pp: 35 },
  { id: "air-slash", name: "Air Slash", type: "Flying", category: "special", power: 75, accuracy: 95, pp: 15, effect: { kind: "flinch", chance: 30 } },
  { id: "hurricane", name: "Hurricane", type: "Flying", category: "special", power: 110, accuracy: 70, pp: 10, effect: { kind: "confuse", chance: 30 } },
  { id: "whirlwind", name: "Whirlwind", type: "Normal", category: "status", power: 0, accuracy: 100, pp: 20, effect: { kind: "forceSwitch" } },
  { id: "agility", name: "Agility", type: "Flying", category: "status", power: 0, accuracy: 101, pp: 30, effect: { kind: "statChange", target: "self", stat: "speed", stages: 2 } },
  { id: "feather-dance", name: "Feather Dance", type: "Flying", category: "status", power: 0, accuracy: 100, pp: 15, effect: { kind: "statChange", target: "enemy", stat: "attack", stages: -2 } },
  { id: "roost", name: "Roost", type: "Flying", category: "status", power: 0, accuracy: 101, pp: 10, effect: { kind: "heal", frac: 0.5 } },
  { id: "tailwind", name: "Tailwind", type: "Flying", category: "status", power: 0, accuracy: 101, pp: 15, effect: { kind: "tailwind" } },
  { id: "mirror-move", name: "Mirror Move", type: "Flying", category: "status", power: 0, accuracy: 101, pp: 20, effect: { kind: "copyMove" } },

  // --- Dark (typová efektivita zatím neutrální, viz data/types.js) ---
  { id: "pursuit", name: "Pursuit", type: "Dark", category: "physical", power: 40, accuracy: 100, pp: 20, effect: { kind: "pursuit" } },
  { id: "sucker-punch", name: "Sucker Punch", type: "Dark", category: "physical", power: 70, accuracy: 100, pp: 5, priority: 1, effect: { kind: "suckerPunch" } },
  { id: "crunch", name: "Crunch", type: "Dark", category: "physical", power: 80, accuracy: 100, pp: 15, effect: { kind: "statChange", target: "enemy", stat: "defense", stages: -1, chance: 20 } },

  // =========================================================================
  // 2. VLNA (213 tahů) – doplněno 2026-09-02, řazeno abecedně podle id.
  // Multi-stat boost/drop tahy nesou jen JEDEN reprezentativní statChange;
  // plný multi-stat efekt čeká na rozšíření enginu (viz komentáře).
  // =========================================================================
  { id: "absorb", name: "Absorb", type: "Grass", category: "special", power: 20, accuracy: 100, pp: 25, effect: { kind: "drain", frac: 0.5 } },
  { id: "acid", name: "Acid", type: "Poison", category: "special", power: 40, accuracy: 100, pp: 30 },
  { id: "aerial-ace", name: "Aerial Ace", type: "Flying", category: "physical", power: 60, accuracy: 101, pp: 20 },
  { id: "air-cutter", name: "Air Cutter", type: "Flying", category: "special", power: 60, accuracy: 95, pp: 25, effect: { kind: "highCrit" } },
  { id: "ancient-power", name: "Ancient Power", type: "Rock", category: "special", power: 60, accuracy: 100, pp: 5, effect: { kind: "statChange", target: "self", stat: "spAttack", stages: 1, chance: 10 } }, // multi-stat: plný efekt čeká na rozšíření enginu
  { id: "aqua-jet", name: "Aqua Jet", type: "Water", category: "physical", power: 40, accuracy: 100, pp: 20, priority: 1 },
  { id: "aqua-ring", name: "Aqua Ring", type: "Water", category: "status", power: 0, accuracy: 101, pp: 20, effect: { kind: "heal", frac: 0.125 } },
  { id: "assurance", name: "Assurance", type: "Dark", category: "physical", power: 60, accuracy: 100, pp: 10 },
  { id: "astonish", name: "Astonish", type: "Ghost", category: "physical", power: 30, accuracy: 100, pp: 15, effect: { kind: "flinch", chance: 30 } },
  { id: "aura-sphere", name: "Aura Sphere", type: "Fighting", category: "special", power: 90, accuracy: 101, pp: 20 },
  { id: "aurora-beam", name: "Aurora Beam", type: "Ice", category: "special", power: 65, accuracy: 100, pp: 20 },
  { id: "barrier", name: "Barrier", type: "Psychic", category: "status", power: 0, accuracy: 101, pp: 20, effect: { kind: "statChange", target: "self", stat: "defense", stages: 2 } },
  { id: "bind", name: "Bind", type: "Normal", category: "physical", power: 15, accuracy: 85, pp: 20, effect: { kind: "trap" } },
  { id: "blizzard", name: "Blizzard", type: "Ice", category: "special", power: 110, accuracy: 70, pp: 5, ailment: "freeze", ailmentChance: 10 },
  { id: "bone-club", name: "Bone Club", type: "Ground", category: "physical", power: 65, accuracy: 85, pp: 20, effect: { kind: "flinch", chance: 10 } },
  { id: "bonemerang", name: "Bonemerang", type: "Ground", category: "physical", power: 50, accuracy: 90, pp: 10 },
  { id: "bounce", name: "Bounce", type: "Flying", category: "physical", power: 85, accuracy: 85, pp: 5, effect: { kind: "twoTurn" } },
  { id: "brave-bird", name: "Brave Bird", type: "Flying", category: "physical", power: 120, accuracy: 100, pp: 15, effect: { kind: "recoil", frac: 0.33 } },
  { id: "brick-break", name: "Brick Break", type: "Fighting", category: "physical", power: 75, accuracy: 100, pp: 15 },
  { id: "bubble-beam", name: "Bubble Beam", type: "Water", category: "special", power: 65, accuracy: 100, pp: 20 },
  { id: "bug-bite", name: "Bug Bite", type: "Bug", category: "physical", power: 60, accuracy: 100, pp: 20 },
  { id: "bug-buzz", name: "Bug Buzz", type: "Bug", category: "special", power: 90, accuracy: 100, pp: 10 },
  { id: "calm-mind", name: "Calm Mind", type: "Psychic", category: "status", power: 0, accuracy: 101, pp: 20, effect: { kind: "statChange", target: "self", stat: "spAttack", stages: 1 } }, // multi-stat: plný efekt čeká na rozšíření enginu
  { id: "charge-beam", name: "Charge Beam", type: "Electric", category: "special", power: 50, accuracy: 90, pp: 10 },
  { id: "clamp", name: "Clamp", type: "Water", category: "physical", power: 35, accuracy: 85, pp: 15, effect: { kind: "trap" } },
  { id: "clear-smog", name: "Clear Smog", type: "Poison", category: "special", power: 50, accuracy: 101, pp: 15 },
  { id: "close-combat", name: "Close Combat", type: "Fighting", category: "physical", power: 120, accuracy: 100, pp: 5 },
  { id: "comet-punch", name: "Comet Punch", type: "Normal", category: "physical", power: 18, accuracy: 85, pp: 15 },
  { id: "confuse-ray", name: "Confuse Ray", type: "Ghost", category: "status", power: 0, accuracy: 100, pp: 10, effect: { kind: "confuse" } },
  { id: "confusion", name: "Confusion", type: "Psychic", category: "special", power: 50, accuracy: 100, pp: 25, effect: { kind: "confuse", chance: 10 } },
  { id: "constrict", name: "Constrict", type: "Normal", category: "physical", power: 10, accuracy: 100, pp: 35 },
  { id: "conversion", name: "Conversion", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 30 },
  { id: "crabhammer", name: "Crabhammer", type: "Water", category: "physical", power: 100, accuracy: 90, pp: 10, effect: { kind: "highCrit" } },
  { id: "cross-chop", name: "Cross Chop", type: "Fighting", category: "physical", power: 100, accuracy: 80, pp: 5, effect: { kind: "highCrit" } },
  { id: "cross-poison", name: "Cross Poison", type: "Poison", category: "physical", power: 70, accuracy: 100, pp: 20, ailment: "poison", ailmentChance: 10, effect: { kind: "highCrit" } },
  { id: "curse", name: "Curse", type: "Ghost", category: "status", power: 0, accuracy: 101, pp: 10 },
  { id: "dark-pulse", name: "Dark Pulse", type: "Dark", category: "special", power: 80, accuracy: 100, pp: 15, effect: { kind: "flinch", chance: 20 } },
  { id: "defense-curl", name: "Defense Curl", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 40, effect: { kind: "statChange", target: "self", stat: "defense", stages: 1 } },
  { id: "destiny-bond", name: "Destiny Bond", type: "Ghost", category: "status", power: 0, accuracy: 101, pp: 5 },
  { id: "dig", name: "Dig", type: "Ground", category: "physical", power: 80, accuracy: 100, pp: 10, effect: { kind: "twoTurn" } },
  { id: "disable", name: "Disable", type: "Normal", category: "status", power: 0, accuracy: 100, pp: 20 },
  { id: "disarming-voice", name: "Disarming Voice", type: "Fairy", category: "special", power: 40, accuracy: 101, pp: 15 },
  { id: "discharge", name: "Discharge", type: "Electric", category: "special", power: 80, accuracy: 100, pp: 15, ailment: "paralysis", ailmentChance: 30 },
  { id: "double-kick", name: "Double Kick", type: "Fighting", category: "physical", power: 30, accuracy: 100, pp: 30 },
  { id: "double-slap", name: "Double Slap", type: "Normal", category: "physical", power: 15, accuracy: 85, pp: 10 },
  { id: "double-team", name: "Double Team", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 15, effect: { kind: "statChange", target: "self", stat: "evasion", stages: 1 } },
  { id: "draco-meteor", name: "Draco Meteor", type: "Dragon", category: "special", power: 130, accuracy: 90, pp: 5, effect: { kind: "statChange", target: "self", stat: "spAttack", stages: -2 } },
  { id: "dragon-dance", name: "Dragon Dance", type: "Dragon", category: "status", power: 0, accuracy: 101, pp: 20, effect: { kind: "statChange", target: "self", stat: "attack", stages: 1 } }, // multi-stat: plný efekt čeká na rozšíření enginu
  { id: "dragon-rage", name: "Dragon Rage", type: "Dragon", category: "special", power: 0, accuracy: 100, pp: 15 },
  { id: "dragon-tail", name: "Dragon Tail", type: "Dragon", category: "physical", power: 60, accuracy: 90, pp: 10, priority: -6, effect: { kind: "forceSwitch" } },
  { id: "draining-kiss", name: "Draining Kiss", type: "Fairy", category: "special", power: 50, accuracy: 100, pp: 10, effect: { kind: "drain", frac: 0.5 } },
  { id: "dream-eater", name: "Dream Eater", type: "Psychic", category: "special", power: 100, accuracy: 100, pp: 15, effect: { kind: "drain", frac: 0.5 } },
  { id: "drill-peck", name: "Drill Peck", type: "Flying", category: "physical", power: 80, accuracy: 100, pp: 20 },
  { id: "dynamic-punch", name: "Dynamic Punch", type: "Fighting", category: "physical", power: 100, accuracy: 50, pp: 5, effect: { kind: "confuse", chance: 100 } },
  { id: "earth-power", name: "Earth Power", type: "Ground", category: "special", power: 90, accuracy: 100, pp: 10, effect: { kind: "statChange", target: "enemy", stat: "spDefense", stages: -1, chance: 10 } },
  { id: "earthquake", name: "Earthquake", type: "Ground", category: "physical", power: 100, accuracy: 100, pp: 10 },
  { id: "electric-terrain", name: "Electric Terrain", type: "Electric", category: "status", power: 0, accuracy: 101, pp: 10 },
  { id: "explosion", name: "Explosion", type: "Normal", category: "physical", power: 250, accuracy: 100, pp: 5 },
  { id: "extreme-speed", name: "Extreme Speed", type: "Normal", category: "physical", power: 80, accuracy: 100, pp: 5, priority: 2 },
  { id: "fake-out", name: "Fake Out", type: "Normal", category: "physical", power: 40, accuracy: 100, pp: 10, priority: 3, effect: { kind: "flinch" } },
  { id: "false-swipe", name: "False Swipe", type: "Normal", category: "physical", power: 40, accuracy: 100, pp: 40 },
  { id: "fire-blast", name: "Fire Blast", type: "Fire", category: "special", power: 110, accuracy: 85, pp: 5, ailment: "burn", ailmentChance: 10 },
  { id: "fire-punch", name: "Fire Punch", type: "Fire", category: "physical", power: 75, accuracy: 100, pp: 15, ailment: "burn", ailmentChance: 10 },
  { id: "fissure", name: "Fissure", type: "Ground", category: "physical", power: 0, accuracy: 30, pp: 5 },
  { id: "flail", name: "Flail", type: "Normal", category: "physical", power: 0, accuracy: 100, pp: 15 },
  { id: "flame-burst", name: "Flame Burst", type: "Fire", category: "special", power: 70, accuracy: 100, pp: 15 },
  { id: "flame-charge", name: "Flame Charge", type: "Fire", category: "physical", power: 50, accuracy: 100, pp: 20, effect: { kind: "statChange", target: "self", stat: "speed", stages: 1 } },
  { id: "flare-blitz", name: "Flare Blitz", type: "Fire", category: "physical", power: 120, accuracy: 100, pp: 15, ailment: "burn", ailmentChance: 10, effect: { kind: "recoil", frac: 0.33 } },
  { id: "flash-cannon", name: "Flash Cannon", type: "Steel", category: "special", power: 80, accuracy: 100, pp: 10, effect: { kind: "statChange", target: "enemy", stat: "spDefense", stages: -1, chance: 10 } },
  { id: "focus-blast", name: "Focus Blast", type: "Fighting", category: "special", power: 120, accuracy: 70, pp: 5 },
  { id: "follow-me", name: "Follow Me", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 20, priority: 4 },
  { id: "fury-attack", name: "Fury Attack", type: "Normal", category: "physical", power: 15, accuracy: 85, pp: 20 },
  { id: "fury-cutter", name: "Fury Cutter", type: "Bug", category: "physical", power: 40, accuracy: 95, pp: 20 },
  { id: "fury-swipes", name: "Fury Swipes", type: "Normal", category: "physical", power: 18, accuracy: 80, pp: 15 },
  { id: "giga-drain", name: "Giga Drain", type: "Grass", category: "special", power: 75, accuracy: 100, pp: 10, effect: { kind: "drain", frac: 0.5 } },
  { id: "giga-impact", name: "Giga Impact", type: "Normal", category: "physical", power: 150, accuracy: 90, pp: 5, effect: { kind: "twoTurn" } },
  { id: "glare", name: "Glare", type: "Normal", category: "status", power: 0, accuracy: 100, pp: 30, ailment: "paralysis" },
  { id: "gunk-shot", name: "Gunk Shot", type: "Poison", category: "physical", power: 120, accuracy: 80, pp: 5, ailment: "poison", ailmentChance: 30 },
  { id: "hail", name: "Hail", type: "Ice", category: "status", power: 0, accuracy: 101, pp: 10, effect: { kind: "weather", weather: "hail" } },
  { id: "harden", name: "Harden", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 30, effect: { kind: "statChange", target: "self", stat: "defense", stages: 1 } },
  { id: "haze", name: "Haze", type: "Ice", category: "status", power: 0, accuracy: 101, pp: 30 },
  { id: "headbutt", name: "Headbutt", type: "Normal", category: "physical", power: 70, accuracy: 100, pp: 15, effect: { kind: "flinch", chance: 30 } },
  { id: "healing-wish", name: "Healing Wish", type: "Psychic", category: "status", power: 0, accuracy: 101, pp: 10, effect: { kind: "heal" } },
  { id: "heavy-slam", name: "Heavy Slam", type: "Steel", category: "physical", power: 0, accuracy: 100, pp: 10 },
  { id: "high-jump-kick", name: "High Jump Kick", type: "Fighting", category: "physical", power: 130, accuracy: 90, pp: 10 },
  { id: "horn-attack", name: "Horn Attack", type: "Normal", category: "physical", power: 65, accuracy: 100, pp: 25 },
  { id: "horn-drill", name: "Horn Drill", type: "Normal", category: "physical", power: 0, accuracy: 30, pp: 5 },
  { id: "hyper-beam", name: "Hyper Beam", type: "Normal", category: "special", power: 150, accuracy: 90, pp: 5, effect: { kind: "twoTurn" } },
  { id: "hyper-voice", name: "Hyper Voice", type: "Normal", category: "special", power: 90, accuracy: 100, pp: 10 },
  { id: "hypnosis", name: "Hypnosis", type: "Psychic", category: "status", power: 0, accuracy: 60, pp: 20, ailment: "sleep" },
  { id: "ice-beam", name: "Ice Beam", type: "Ice", category: "special", power: 90, accuracy: 100, pp: 10, ailment: "freeze", ailmentChance: 10 },
  { id: "ice-fang", name: "Ice Fang", type: "Ice", category: "physical", power: 65, accuracy: 95, pp: 15, ailment: "freeze", ailmentChance: 10, effect: { kind: "flinch", chance: 10 } },
  { id: "ice-punch", name: "Ice Punch", type: "Ice", category: "physical", power: 75, accuracy: 100, pp: 15, ailment: "freeze", ailmentChance: 10 },
  { id: "ice-shard", name: "Ice Shard", type: "Ice", category: "physical", power: 40, accuracy: 100, pp: 30, priority: 1 },
  { id: "icicle-spear", name: "Icicle Spear", type: "Ice", category: "physical", power: 25, accuracy: 100, pp: 30 },
  { id: "iron-defense", name: "Iron Defense", type: "Steel", category: "status", power: 0, accuracy: 101, pp: 15, effect: { kind: "statChange", target: "self", stat: "defense", stages: 2 } },
  { id: "karate-chop", name: "Karate Chop", type: "Fighting", category: "physical", power: 50, accuracy: 100, pp: 25, effect: { kind: "highCrit" } },
  { id: "knock-off", name: "Knock Off", type: "Dark", category: "physical", power: 65, accuracy: 100, pp: 20 },
  { id: "last-resort", name: "Last Resort", type: "Normal", category: "physical", power: 140, accuracy: 100, pp: 5 },
  { id: "leaf-storm", name: "Leaf Storm", type: "Grass", category: "special", power: 130, accuracy: 90, pp: 5, effect: { kind: "statChange", target: "self", stat: "spAttack", stages: -2 } },
  { id: "leech-life", name: "Leech Life", type: "Bug", category: "physical", power: 80, accuracy: 100, pp: 10, effect: { kind: "drain", frac: 0.5 } },
  { id: "lick", name: "Lick", type: "Ghost", category: "physical", power: 30, accuracy: 100, pp: 30, ailment: "paralysis", ailmentChance: 30 },
  { id: "light-screen", name: "Light Screen", type: "Psychic", category: "status", power: 0, accuracy: 101, pp: 30 },
  { id: "lock-on", name: "Lock On", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 5 },
  { id: "lovely-kiss", name: "Lovely Kiss", type: "Normal", category: "status", power: 0, accuracy: 75, pp: 10, ailment: "sleep" },
  { id: "low-kick", name: "Low Kick", type: "Fighting", category: "physical", power: 0, accuracy: 100, pp: 20 },
  { id: "mach-punch", name: "Mach Punch", type: "Fighting", category: "physical", power: 40, accuracy: 100, pp: 30, priority: 1 },
  { id: "magnet-rise", name: "Magnet Rise", type: "Electric", category: "status", power: 0, accuracy: 101, pp: 10 },
  { id: "magnitude", name: "Magnitude", type: "Ground", category: "physical", power: 30, accuracy: 100, pp: 30 },
  { id: "mean-look", name: "Mean Look", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 5, effect: { kind: "trap" } },
  { id: "mega-drain", name: "Mega Drain", type: "Grass", category: "special", power: 40, accuracy: 100, pp: 15, effect: { kind: "drain", frac: 0.5 } },
  { id: "megahorn", name: "Megahorn", type: "Bug", category: "physical", power: 120, accuracy: 85, pp: 10 },
  { id: "metal-burst", name: "Metal Burst", type: "Steel", category: "physical", power: 60, accuracy: 100, pp: 10 },
  { id: "metal-claw", name: "Metal Claw", type: "Steel", category: "physical", power: 50, accuracy: 100, pp: 35, effect: { kind: "statChange", target: "self", stat: "attack", stages: 1, chance: 10 } },
  { id: "metal-sound", name: "Metal Sound", type: "Steel", category: "status", power: 0, accuracy: 85, pp: 40, effect: { kind: "statChange", target: "enemy", stat: "spDefense", stages: -2 } },
  { id: "metronome", name: "Metronome", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 20 },
  { id: "minimize", name: "Minimize", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 10, effect: { kind: "statChange", target: "self", stat: "evasion", stages: 2 } },
  { id: "mirror-shot", name: "Mirror Shot", type: "Steel", category: "special", power: 65, accuracy: 85, pp: 10, effect: { kind: "statChange", target: "enemy", stat: "accuracy", stages: -1, chance: 30 } },
  { id: "mist", name: "Mist", type: "Ice", category: "status", power: 0, accuracy: 101, pp: 30 },
  { id: "moonblast", name: "Moonblast", type: "Fairy", category: "special", power: 95, accuracy: 100, pp: 15, effect: { kind: "statChange", target: "enemy", stat: "spAttack", stages: -1, chance: 30 } },
  { id: "moonlight", name: "Moonlight", type: "Fairy", category: "status", power: 0, accuracy: 101, pp: 5, effect: { kind: "heal", frac: 0.5 } },
  { id: "mud-shot", name: "Mud Shot", type: "Ground", category: "special", power: 55, accuracy: 95, pp: 15, effect: { kind: "statChange", target: "enemy", stat: "speed", stages: -1, chance: 100 } },
  { id: "mud-slap", name: "Mud Slap", type: "Ground", category: "special", power: 20, accuracy: 100, pp: 10, effect: { kind: "statChange", target: "enemy", stat: "accuracy", stages: -1, chance: 100 } },
  { id: "mud-sport", name: "Mud Sport", type: "Ground", category: "status", power: 0, accuracy: 101, pp: 15 },
  { id: "nasty-plot", name: "Nasty Plot", type: "Dark", category: "status", power: 0, accuracy: 101, pp: 20, effect: { kind: "statChange", target: "self", stat: "spAttack", stages: 2 } },
  { id: "night-shade", name: "Night Shade", type: "Ghost", category: "special", power: 0, accuracy: 100, pp: 15 },
  { id: "night-slash", name: "Night Slash", type: "Dark", category: "physical", power: 70, accuracy: 100, pp: 15, effect: { kind: "highCrit" } },
  { id: "nightmare", name: "Nightmare", type: "Ghost", category: "status", power: 0, accuracy: 100, pp: 15 },
  { id: "outrage", name: "Outrage", type: "Dragon", category: "physical", power: 120, accuracy: 100, pp: 10, effect: { kind: "thrash" } },
  { id: "pay-day", name: "Pay Day", type: "Normal", category: "physical", power: 40, accuracy: 100, pp: 20 },
  { id: "peck", name: "Peck", type: "Flying", category: "physical", power: 35, accuracy: 100, pp: 35 },
  { id: "petal-blizzard", name: "Petal Blizzard", type: "Grass", category: "physical", power: 75, accuracy: 100, pp: 15 },
  { id: "pin-missile", name: "Pin Missile", type: "Bug", category: "physical", power: 25, accuracy: 95, pp: 20 },
  { id: "poison-fang", name: "Poison Fang", type: "Poison", category: "physical", power: 50, accuracy: 100, pp: 30, ailment: "poison", ailmentChance: 30 },
  { id: "poison-jab", name: "Poison Jab", type: "Poison", category: "physical", power: 80, accuracy: 100, pp: 20, ailment: "poison", ailmentChance: 30 },
  { id: "pound", name: "Pound", type: "Normal", category: "physical", power: 40, accuracy: 100, pp: 35 },
  { id: "powder-snow", name: "Powder Snow", type: "Ice", category: "special", power: 40, accuracy: 100, pp: 25, ailment: "freeze", ailmentChance: 10 },
  { id: "power-gem", name: "Power Gem", type: "Rock", category: "special", power: 80, accuracy: 100, pp: 20 },
  { id: "power-whip", name: "Power Whip", type: "Grass", category: "physical", power: 120, accuracy: 85, pp: 10 },
  { id: "protect", name: "Protect", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 10, priority: 4 },
  { id: "psybeam", name: "Psybeam", type: "Psychic", category: "special", power: 65, accuracy: 100, pp: 20, effect: { kind: "confuse", chance: 10 } },
  { id: "psychic", name: "Psychic", type: "Psychic", category: "special", power: 90, accuracy: 100, pp: 10, effect: { kind: "statChange", target: "enemy", stat: "spDefense", stages: -1, chance: 10 } },
  { id: "quiver-dance", name: "Quiver Dance", type: "Bug", category: "status", power: 0, accuracy: 101, pp: 20, effect: { kind: "statChange", target: "self", stat: "spAttack", stages: 1 } }, // multi-stat: plný efekt čeká na rozšíření enginu
  { id: "recover", name: "Recover", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 10, effect: { kind: "heal", frac: 0.5 } },
  { id: "reflect", name: "Reflect", type: "Psychic", category: "status", power: 0, accuracy: 101, pp: 20 },
  { id: "rest", name: "Rest", type: "Psychic", category: "status", power: 0, accuracy: 101, pp: 10, effect: { kind: "heal", frac: 1 } },
  { id: "revenge", name: "Revenge", type: "Fighting", category: "physical", power: 60, accuracy: 100, pp: 10, priority: -4 },
  { id: "roar", name: "Roar", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 20, priority: -6, effect: { kind: "forceSwitch" } },
  { id: "rock-blast", name: "Rock Blast", type: "Rock", category: "physical", power: 25, accuracy: 90, pp: 10 },
  { id: "rock-slide", name: "Rock Slide", type: "Rock", category: "physical", power: 75, accuracy: 90, pp: 10, effect: { kind: "flinch", chance: 30 } },
  { id: "rock-throw", name: "Rock Throw", type: "Rock", category: "physical", power: 50, accuracy: 90, pp: 15 },
  { id: "rolling-kick", name: "Rolling Kick", type: "Fighting", category: "physical", power: 60, accuracy: 85, pp: 15, effect: { kind: "flinch", chance: 30 } },
  { id: "rollout", name: "Rollout", type: "Rock", category: "physical", power: 30, accuracy: 90, pp: 20, effect: { kind: "twoTurn" } },
  { id: "safeguard", name: "Safeguard", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 25 },
  { id: "sand-tomb", name: "Sand Tomb", type: "Ground", category: "physical", power: 35, accuracy: 85, pp: 15, effect: { kind: "trap" } },
  { id: "scary-face", name: "Scary Face", type: "Normal", category: "status", power: 0, accuracy: 100, pp: 10, effect: { kind: "statChange", target: "enemy", stat: "speed", stages: -2 } },
  { id: "screech", name: "Screech", type: "Normal", category: "status", power: 0, accuracy: 85, pp: 40, effect: { kind: "statChange", target: "enemy", stat: "defense", stages: -2 } },
  { id: "seismic-toss", name: "Seismic Toss", type: "Fighting", category: "physical", power: 0, accuracy: 100, pp: 20 },
  { id: "self-destruct", name: "Self-Destruct", type: "Normal", category: "physical", power: 200, accuracy: 100, pp: 5 },
  { id: "shadow-ball", name: "Shadow Ball", type: "Ghost", category: "special", power: 80, accuracy: 100, pp: 15, effect: { kind: "statChange", target: "enemy", stat: "spDefense", stages: -1, chance: 20 } },
  { id: "shadow-punch", name: "Shadow Punch", type: "Ghost", category: "physical", power: 60, accuracy: 101, pp: 20 },
  { id: "sharpen", name: "Sharpen", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 30, effect: { kind: "statChange", target: "self", stat: "attack", stages: 1 } },
  { id: "shell-smash", name: "Shell Smash", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 15, effect: { kind: "statChange", target: "self", stat: "attack", stages: 2 } }, // multi-stat: plný efekt čeká na rozšíření enginu
  { id: "signal-beam", name: "Signal Beam", type: "Bug", category: "special", power: 75, accuracy: 100, pp: 15, effect: { kind: "confuse", chance: 10 } },
  { id: "silver-wind", name: "Silver Wind", type: "Bug", category: "special", power: 60, accuracy: 100, pp: 15, effect: { kind: "statChange", target: "self", stat: "spAttack", stages: 1, chance: 10 } }, // multi-stat: plný efekt čeká na rozšíření enginu
  { id: "sing", name: "Sing", type: "Normal", category: "status", power: 0, accuracy: 55, pp: 15, ailment: "sleep" },
  { id: "slack-off", name: "Slack Off", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 10, effect: { kind: "heal", frac: 0.5 } },
  { id: "slam", name: "Slam", type: "Normal", category: "physical", power: 80, accuracy: 75, pp: 20 },
  { id: "sludge", name: "Sludge", type: "Poison", category: "special", power: 65, accuracy: 100, pp: 20, ailment: "poison", ailmentChance: 30 },
  { id: "sludge-bomb", name: "Sludge Bomb", type: "Poison", category: "special", power: 90, accuracy: 100, pp: 10, ailment: "poison", ailmentChance: 30 },
  { id: "sludge-wave", name: "Sludge Wave", type: "Poison", category: "special", power: 95, accuracy: 100, pp: 10, ailment: "poison", ailmentChance: 10 },
  { id: "smog", name: "Smog", type: "Poison", category: "special", power: 30, accuracy: 70, pp: 20, ailment: "poison", ailmentChance: 40 },
  { id: "soak", name: "Soak", type: "Water", category: "status", power: 0, accuracy: 100, pp: 20 },
  { id: "soft-boiled", name: "Soft-Boiled", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 10, effect: { kind: "heal", frac: 0.5 } },
  { id: "sonic-boom", name: "Sonic Boom", type: "Normal", category: "special", power: 0, accuracy: 90, pp: 15 },
  { id: "spark", name: "Spark", type: "Electric", category: "physical", power: 65, accuracy: 100, pp: 20, ailment: "paralysis", ailmentChance: 30 },
  { id: "spike-cannon", name: "Spike Cannon", type: "Normal", category: "physical", power: 20, accuracy: 100, pp: 15 },
  { id: "spite", name: "Spite", type: "Ghost", category: "status", power: 0, accuracy: 100, pp: 10 },
  { id: "splash", name: "Splash", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 40 },
  { id: "spore", name: "Spore", type: "Grass", category: "status", power: 0, accuracy: 75, pp: 15, ailment: "sleep" },
  { id: "stomp", name: "Stomp", type: "Normal", category: "physical", power: 65, accuracy: 100, pp: 20, effect: { kind: "flinch", chance: 30 } },
  { id: "stone-edge", name: "Stone Edge", type: "Rock", category: "physical", power: 100, accuracy: 80, pp: 5, effect: { kind: "highCrit" } },
  { id: "string-shot", name: "String Shot", type: "Bug", category: "status", power: 0, accuracy: 95, pp: 40, effect: { kind: "statChange", target: "enemy", stat: "speed", stages: -2 } },
  { id: "struggle-bug", name: "Struggle Bug", type: "Bug", category: "special", power: 50, accuracy: 100, pp: 20, effect: { kind: "statChange", target: "enemy", stat: "spAttack", stages: -1 } },
  { id: "stun-spore", name: "Stun Spore", type: "Grass", category: "status", power: 0, accuracy: 75, pp: 30, ailment: "paralysis" },
  { id: "submission", name: "Submission", type: "Fighting", category: "physical", power: 80, accuracy: 80, pp: 20, effect: { kind: "recoil", frac: 0.25 } },
  { id: "sunny-day", name: "Sunny Day", type: "Fire", category: "status", power: 0, accuracy: 101, pp: 5, effect: { kind: "weather", weather: "sun" } },
  { id: "superpower", name: "Superpower", type: "Fighting", category: "physical", power: 120, accuracy: 100, pp: 5, effect: { kind: "statChange", target: "self", stat: "attack", stages: -1 } }, // multi-stat: plný efekt čeká na rozšíření enginu
  { id: "supersonic", name: "Supersonic", type: "Normal", category: "status", power: 0, accuracy: 55, pp: 20, effect: { kind: "confuse" } },
  { id: "swagger", name: "Swagger", type: "Normal", category: "status", power: 0, accuracy: 85, pp: 15, effect: { kind: "statChange", target: "enemy", stat: "attack", stages: 2 } },
  { id: "swift", name: "Swift", type: "Normal", category: "special", power: 60, accuracy: 101, pp: 20 },
  { id: "teleport", name: "Teleport", type: "Psychic", category: "status", power: 0, accuracy: 101, pp: 20, priority: -6 },
  { id: "thrash", name: "Thrash", type: "Normal", category: "physical", power: 120, accuracy: 100, pp: 10, effect: { kind: "thrash" } },
  { id: "thunder", name: "Thunder", type: "Electric", category: "special", power: 110, accuracy: 70, pp: 10, ailment: "paralysis", ailmentChance: 30 },
  { id: "thunder-punch", name: "Thunder Punch", type: "Electric", category: "physical", power: 75, accuracy: 100, pp: 15, ailment: "paralysis", ailmentChance: 10 },
  { id: "thunder-shock", name: "Thunder Shock", type: "Electric", category: "special", power: 40, accuracy: 100, pp: 30, ailment: "paralysis", ailmentChance: 10 },
  { id: "thunder-wave", name: "Thunder Wave", type: "Electric", category: "status", power: 0, accuracy: 90, pp: 20, ailment: "paralysis" },
  { id: "thunderbolt", name: "Thunderbolt", type: "Electric", category: "special", power: 90, accuracy: 100, pp: 15, ailment: "paralysis", ailmentChance: 10 },
  { id: "toxic", name: "Toxic", type: "Poison", category: "status", power: 0, accuracy: 90, pp: 10, ailment: "poison" },
  { id: "toxic-spikes", name: "Toxic Spikes", type: "Poison", category: "status", power: 0, accuracy: 101, pp: 20 },
  { id: "tri-attack", name: "Tri Attack", type: "Normal", category: "special", power: 80, accuracy: 100, pp: 10 },
  { id: "trick", name: "Trick", type: "Psychic", category: "status", power: 0, accuracy: 100, pp: 10 },
  { id: "twineedle", name: "Twineedle", type: "Bug", category: "physical", power: 25, accuracy: 100, pp: 20, ailment: "poison", ailmentChance: 20 },
  { id: "twister", name: "Twister", type: "Dragon", category: "special", power: 40, accuracy: 100, pp: 20, effect: { kind: "flinch", chance: 20 } },
  { id: "vice-grip", name: "Vice Grip", type: "Normal", category: "physical", power: 55, accuracy: 100, pp: 30 },
  { id: "vital-throw", name: "Vital Throw", type: "Fighting", category: "physical", power: 70, accuracy: 101, pp: 10, priority: -1 },
  { id: "waterfall", name: "Waterfall", type: "Water", category: "physical", power: 80, accuracy: 100, pp: 15, effect: { kind: "flinch", chance: 20 } },
  { id: "wild-charge", name: "Wild Charge", type: "Electric", category: "physical", power: 90, accuracy: 100, pp: 15, effect: { kind: "recoil", frac: 0.25 } },
  { id: "will-o-wisp", name: "Will-O-Wisp", type: "Fire", category: "status", power: 0, accuracy: 85, pp: 15, ailment: "burn" },
  { id: "wrap", name: "Wrap", type: "Normal", category: "physical", power: 15, accuracy: 90, pp: 20, effect: { kind: "trap" } },
  { id: "x-scissor", name: "X-Scissor", type: "Bug", category: "physical", power: 80, accuracy: 100, pp: 15 },
  { id: "yawn", name: "Yawn", type: "Normal", category: "status", power: 0, accuracy: 101, pp: 10, ailment: "sleep" },
  { id: "zen-headbutt", name: "Zen Headbutt", type: "Psychic", category: "physical", power: 80, accuracy: 90, pp: 15, effect: { kind: "flinch", chance: 20 } },
];

/** Rychlé vyhledání tahu podle id. */
const MOVES_BY_ID = new Map(MOVES.map((m) => [m.id, m]));

/**
 * Vrátí definici tahu podle id (nebo undefined).
 * @param {string} id
 * @returns {Move | undefined}
 */
export function getMove(id) {
  return MOVES_BY_ID.get(id);
}
