/**
 * cityMaps.js (Gen 2 / Johto) – mapy měst shora pro panel Města (vykresluje src/ui/cityMap.js).
 *
 * Stejný formát a pravidla jako data/gen1/cityMaps.js (popis polí tam). Rozložení vychází
 * z HeartGold/SoulSilver, zjednodušené na 320×180. Budova bez spritu se zatím kreslí jako
 * náhradní (rozměry v BUILDING_PLACEHOLDERS, data/cityMaps.js).
 * Po každé změně: python tools/citymapcheck.py
 */

/** @type {Record<string, object>} */
export const CITY_MAPS_GEN2 = {
  // Rozložení všech měst podle pret/pokecrystal (maps/<Město>.asm – dveře budov, voda, východy),
  // zmenšené na 320×180; budovy si drží relativní polohu, posunuté jen kvůli velikosti spritů.
  // New Bark: Elmova laboratoř vlevo nahoře, dům hráče vpravo (tady Poké Center), Elmův dům dole
  // (tady Mart), Route 29 na západ, moře (Route 27) na východě.
  "new-bark-town": { ground: "grass", border: "round", exit: null, water: { right: 284 }, sideTrees: [44, 176], roadGap: [100, 126],
    paths: [[0, 112, 280, 10], [104, 82, 12, 30], [208, 92, 12, 20], [140, 122, 12, 48], [140, 162, 40, 8]],
    buildings: [["elm-lab", 110, 82], ["poke-center", 214, 92], ["poke-mart", 196, 170]],
    flowers: [[24, 134, 50, 16], [230, 130, 36, 12]], signs: [[60, 126]] },
  // Cherrygrove: plážové město – moře zabírá celou západní polovinu, Mart a Poké Center nahoře
  // vpravo, Route 30 na sever podél pobřeží, Route 29 na východ.
  "cherrygrove-city": { ground: "grass", border: "round", exit: [156, 12], water: { left: 150 }, sideTrees: [44, 176], roadGap: [96, 116],
    paths: [[156, 0, 12, 110], [156, 100, 164, 10]],
    buildings: [["poke-mart", 194, 92], ["poke-center", 248, 92]],
    flowers: [[190, 128, 40, 12], [250, 140, 40, 12]], signs: [[180, 124]], lamps: [[220, 100]] },
  // Violet: Sprout Tower na severu v jezírku, Gym uprostřed, Mart na západě, Poké Center na jihovýchodě
  // u brány na Route 31, Route 32 na jih.
  "violet-city": { ground: "grass", border: "round", exit: null, sideTrees: [44, 176], roadGap: [118, 138],
    paths: [[0, 124, 320, 8], [118, 132, 12, 48], [226, 90, 12, 34]],
    buildings: [["sprout-tower", 232, 90], ["poke-mart", 64, 120], ["gym", 170, 120], ["poke-center", 254, 174]],
    ponds: [[232, 80, 30, 12]], flowers: [[60, 66, 30, 10], [140, 160, 40, 10]], signs: [[100, 138], [212, 138]], lamps: [[96, 124], [208, 124]] },
  // Azalea: Kurtův dům a Mart nahoře, Poké Center uprostřed, Gym vlevo dole, Charcoal Kiln dole,
  // Slowpoke Well na východě; brána do Ilex Forest na západě, Route 33 na východ.
  "azalea-town": { ground: "grass", border: "round", exit: null, sideTrees: [44, 176], roadGap: [96, 116],
    paths: [[0, 100, 320, 10], [146, 110, 12, 40]],
    buildings: [["kurts-house", 80, 92], ["poke-mart", 182, 92], ["poke-center", 150, 150], ["gym", 82, 178], ["azalea-kiln", 212, 176]],
    ponds: [[282, 146, 14, 7]], rocks: [[262, 162], [302, 128]], flowers: [[248, 60, 34, 10]], signs: [[124, 114]], lamps: [[240, 100]] },
  // Goldenrod: velkoměsto u moře (západ). Nahoře Radio Tower, vchod do Undergroundu, Gym, Flower Shop;
  // dole Billova rodina, Game Corner, Poké Center, Dept. Store; Route 35 na sever, Route 34 na jih.
  "goldenrod-city": { ground: "paved", border: "round", exit: [128, 12], water: { left: 14 }, sideTrees: null,
    paths: [[128, 0, 12, 100], [18, 100, 302, 10], [168, 110, 12, 70]],
    buildings: [["radio-tower", 44, 96], ["goldenrod-underground", 94, 92], ["gym", 186, 96], ["goldenrod-flower-shop", 240, 92], ["boost-center", 286, 96],
      ["bills-house", 42, 178], ["goldenrod-game-corner", 92, 176], ["poke-center", 142, 176], ["goldenrod-dept-store", 214, 176], ["poke-mart", 270, 176]],
    flowers: [[230, 120, 30, 8]], signs: [[156, 124]], lamps: [[66, 100], [114, 100], [156, 100], [214, 100], [262, 100]] },
  // Ecruteak: Burned Tower vlevo nahoře, Bell (Tin) Tower vpravo nahoře, jezírko uprostřed, Mart
  // vpravo; dole Gym, dům, Dance Theater a Poké Center; brány na Route 38 (západ) a 42 (východ).
  "ecruteak-city": { ground: "grass", border: "round", exit: null, sideTrees: [44, 176], roadGap: [106, 126],
    paths: [[0, 112, 320, 8], [140, 120, 12, 60]],
    buildings: [["burned-tower", 56, 96], ["poke-mart", 222, 104], ["bell-tower", 284, 104],
      ["gym", 60, 178], ["ecruteak-house", 112, 176], ["dance-theater", 192, 156], ["poke-center", 252, 178]],
    ponds: [[150, 90, 22, 8]], flowers: [[100, 66, 30, 10]], signs: [[128, 126]], lamps: [[96, 112], [176, 112]] },
  // Olivine: přístav na jihu – S.S. Aqua u mola, maják na výběžku vpravo; nahoře Gym, dům a Mart,
  // Poké Center u pobřeží; Route 39 na sever, Route 40 (moře) na západ.
  "olivine-city": { ground: "grass", border: "round", exit: [162, 12], water: { y: 142 }, sideTrees: [44, 140], roadGap: [88, 106],
    paths: [[162, 0, 12, 92], [0, 92, 240, 8], [154, 100, 12, 36]],
    buildings: [["gym", 84, 90], ["olivine-house", 138, 86], ["poke-mart", 200, 90], ["poke-center", 100, 140], ["olivine-lighthouse", 268, 140], ["ss-aqua", 166, 180]],
    dock: [152, 132, 16, 20], signs: [[136, 114]], lamps: [[60, 92], [230, 92]] },
  // Podle pokecrystal maps/CianwoodCity.asm (svislé město, moře na východě = Route 41): Gym na západě,
  // Poké Center na východě u moře, Pharmacy úplně na jihu uprostřed. Chuckův dům v originále není
  // (žena stojí u Gymu, Fly dá po výhře – battleSystem). Training Grounds a Mart (v originále tu nejsou)
  // na místě domů na severu.
  "cianwood-city": { ground: "sand", border: "palm", exit: null, water: { right: 268 },
    paths: [[0, 104, 266, 8], [150, 112, 12, 40], [230, 160, 12, 20]],
    buildings: [["poke-mart", 90, 100], ["training-grounds", 214, 102], ["gym", 76, 168], ["poke-center", 236, 160],
      ["cianwood-pharmacy", 156, 180]],
    palms: [[24, 92], [22, 176], [254, 70], [130, 58]], rocks: [[40, 60], [64, 44], [112, 40]], signs: [[140, 100]] },
  // Mahogany: Mart (úkryt Rocketů) nahoře uprostřed, Gym vlevo dole, Poké Center vpravo dole;
  // brána na Route 43 na sever, Route 42 na západ, Route 44 na východ.
  "mahogany-town": { ground: "grass", border: "pine", exit: [146, 12], sideTrees: [44, 176], roadGap: [104, 128],
    paths: [[146, 0, 12, 112], [0, 112, 320, 10]],
    buildings: [["poke-mart", 194, 108], ["gym", 96, 178], ["poke-center", 236, 174]],
    flowers: [[40, 70, 40, 10], [260, 70, 30, 10]], signs: [[132, 126]], lamps: [[120, 112], [176, 112]] },
  // Blackthorn: Gym stojí v jezírku (voda ze západu, severu i východu, dveře na jih); severně za vodou
  // vchod do Dragon's Den (jen surfem). Dole dům, Mart a Poké Center; Ice Path na východě, Route 45 na jih.
  "blackthorn-city": { ground: "grass", border: "rock", exit: null, sideTrees: [44, 176], roadGap: [116, 136],
    paths: [[0, 122, 320, 8], [150, 130, 12, 50]],
    buildings: [["dragons-den", 160, 62], ["gym", 160, 120], ["blackthorn-house", 70, 162], ["poke-mart", 120, 178], ["poke-center", 196, 178]],
    ponds: [[160, 92, 54, 22]], rocks: [[282, 88], [298, 78], [60, 70], [250, 160], [290, 150]], signs: [[176, 134]], lamps: [[220, 122]] },
  "indigo-plateau-johto": { ground: "grass", border: "rock", exit: null, sideTrees: [44, 176],
    paths: [[58, 140, 62, 10], [200, 140, 64, 10]],
    buildings: [["league", 160, 78], ["poke-center", 74, 138], ["poke-mart", 246, 138]],
    decals: [["league-plaza", 160, 77]], rocks: [[40, 96], [282, 96], [36, 170], [290, 170]], signs: [[104, 132]], lamps: [[122, 140], [198, 140]] },
};
