/**
 * cityMaps.js (Gen 1 / Kanto) – mapy měst shora pro panel Města (vykresluje src/ui/cityMap.js).
 *
 * Mapa má 320×180 pixelů a zobrazuje se zvětšená bez rozmazání (pixel art). Rozložení
 * vychází z FireRed/LeafGreen, zjednodušené na velikost panelu.
 *
 * Pravidla:
 *  - `buildings`: jen budovy, které ve městě opravdu jsou (CITY_BUILDINGS v data/buildings.js),
 *    plus "gym", pokud má město gym (getGymForCity) – klik na gym otevře záložku Gym,
 *    a "league" na oblasti s Ligou (leagueForArea) – klik otevře záložku League.
 *  - `decals`: plošné obrázky na zemi pod budovami [id, střed x, horní hrana] (nádvoří Ligy).
 *    Položka = [id, střed x, spodní hrana] v pixelech mapy; velikost dává sprite budovy.
 *  - Sprity budov jsou pixel art v realistickém měřítku (tools/pixelize_buildings.py).
 *  - Nová budova ve městě = přidat ji sem, jinak se na mapě neobjeví (ověří tools/citymapcheck.py).
 *
 * Pole: ground (grass | dusk | sand | paved), border (round | pine | palm | rock),
 * exit = mezera v lese na sever [x, šířka] (null = les celý), sideTrees = [od, do] stromy po stranách
 * (null = žádné), roadGap = mezera pro cestu ze strany, paths = [x, y, w, h], water = moře
 * { y, x0?, x1?, left? }, river = { x, w } (most se kreslí sám), ponds = [cx, cy, rx, ry],
 * dock = [x, y, w, h], fountain = [cx, base], pens = výběhy [x, y, w, h], fences = [x0, base, x1],
 * flowers = záhony [x, y, w, h], rocks / palms / signs / lamps = [x, base], volcano = [cx, base, w, h].
 */

/** @type {Record<string, object>} */
export const CITY_MAPS_GEN1 = {
  "pallet-town": { ground: "grass", border: "round", exit: [150, 14], water: { y: 160, x1: 140 }, sideTrees: [44, 176],
    paths: [[150, 0, 14, 106], [70, 96, 170, 10], [190, 106, 12, 46]],
    buildings: [["player-home", 92, 94], ["rival-home", 214, 94], ["oak-lab", 196, 154]],
    fences: [[36, 124, 128]], flowers: [[40, 128, 84, 14], [110, 60, 30, 10], [240, 120, 40, 14]], signs: [[136, 42], [176, 124]] },
  "viridian-city": { ground: "grass", border: "round", exit: [150, 14], sideTrees: [44, 176], roadGap: [96, 120],
    paths: [[150, 0, 14, 180], [0, 104, 320, 10], [70, 166, 80, 10], [164, 170, 82, 10]],
    buildings: [["poke-center", 92, 102], ["poke-mart", 222, 102], ["viridian-trade-house", 92, 166], ["gym", 246, 170]],
    ponds: [[190, 148, 18, 8]], flowers: [[104, 58, 30, 8], [40, 124, 30, 8]], signs: [[136, 44], [136, 124]], lamps: [[122, 104], [180, 104]] },
  "pewter-city": { ground: "grass", border: "pine", exit: null, sideTrees: [44, 176], roadGap: [96, 120],
    paths: [[40, 104, 280, 10], [150, 114, 14, 66], [164, 160, 62, 10], [104, 168, 46, 10]],
    buildings: [["pewter-museum", 84, 102], ["poke-center", 226, 102], ["poke-mart", 226, 160], ["gym", 96, 168]],
    rocks: [[40, 66], [130, 60], [176, 64], [282, 62], [290, 138], [44, 120]], signs: [[136, 124], [300, 122]] },
  "cerulean-city": { ground: "grass", border: "round", exit: [150, 14], river: { x: 22, w: 18 }, sideTrees: [44, 176], roadGap: [96, 120], noLeftTrees: true,
    paths: [[150, 0, 14, 180], [0, 104, 320, 10], [80, 160, 70, 10], [164, 170, 70, 10]],
    buildings: [["poke-center", 102, 102], ["poke-mart", 226, 102], ["cerulean-trade-house", 104, 160], ["gym", 234, 170]],
    flowers: [[60, 60, 30, 8], [276, 124, 30, 10]], signs: [[136, 44], [60, 124]], lamps: [[178, 104]] },
  "vermilion-city": { ground: "grass", border: "round", exit: [112, 14], water: { y: 148, x0: 124 }, sideTrees: [44, 176], roadGap: [88, 112],
    paths: [[112, 0, 14, 96], [0, 96, 320, 10], [202, 106, 12, 42], [96, 106, 12, 68], [62, 164, 46, 10]],
    buildings: [["poke-center", 62, 94], ["vermilion-trade-house", 172, 94], ["poke-mart", 262, 94], ["gym", 62, 164], ["vermilion-fishing-hut", 150, 146], ["ss-anne", 268, 178]],
    dock: [198, 146, 20, 28], signs: [[96, 44], [240, 124]], lamps: [[116, 96], [216, 96]] },
  "celadon-city": { ground: "grass", border: "round", exit: null, sideTrees: null,
    paths: [[0, 102, 320, 12], [0, 164, 320, 12], [150, 114, 14, 50]],
    buildings: [["dept-store", 46, 100], ["celadon-mansion", 118, 100], ["poke-center", 200, 100], ["gym", 280, 100], ["boost-center", 44, 162], ["poke-mart", 112, 162], ["game-corner", 210, 162]],
    fountain: [284, 152], flowers: [[252, 120, 62, 10]], signs: [[176, 126]], lamps: [[84, 102], [164, 102], [244, 102], [84, 164], [168, 164]] },
  "lavender-town": { ground: "dusk", border: "pine", dusk: true, mist: true, wisps: true, exit: [150, 14], sideTrees: [44, 176], roadGap: [96, 120],
    paths: [[0, 104, 320, 10], [150, 0, 14, 104], [150, 114, 14, 66]],
    buildings: [["poke-center", 76, 102], ["pokemon-tower", 262, 102], ["mr-fuji-house", 92, 158], ["poke-mart", 214, 158]],
    signs: [[134, 44], [174, 128]], lamps: [[120, 104], [196, 104]] },
  "saffron-city": { ground: "paved", border: "round", exit: [40, 14], sideTrees: null,
    paths: [[40, 0, 14, 100], [0, 100, 320, 12], [0, 164, 320, 12], [150, 112, 14, 52]],
    buildings: [["fighting-dojo", 96, 98], ["silph-co", 160, 98], ["gym", 246, 98], ["poke-center", 90, 162], ["poke-mart", 236, 162]],
    signs: [[24, 124], [176, 126]], lamps: [[66, 100], [128, 100], [196, 100], [290, 100], [128, 164], [196, 164]] },
  "fuchsia-city": { ground: "grass", border: "round", exit: [150, 14], water: { y: 162 }, sideTrees: [44, 150], roadGap: [84, 106],
    paths: [[150, 0, 14, 92], [0, 92, 320, 10], [150, 102, 14, 56], [104, 150, 46, 8]],
    buildings: [["warden-house", 62, 90], ["poke-center", 262, 90], ["poke-mart", 96, 150], ["gym", 222, 158], ["fuchsia-fishing-house", 290, 158]],
    pens: [[96, 42, 40, 30], [178, 42, 40, 30]], signs: [[168, 40], [136, 116]], lamps: [[124, 92], [196, 92]] },
  "cinnabar-island": { ground: "sand", border: "palm", exit: null, water: { y: 160, left: 22 }, volcano: [264, 66, 100, 52],
    paths: [[24, 112, 296, 10], [64, 76, 12, 36], [134, 78, 12, 34], [140, 122, 12, 32]],
    buildings: [["pokemon-mansion", 70, 76], ["gym", 140, 78], ["pokemon-lab", 226, 112], ["poke-mart", 106, 156], ["poke-center", 182, 156]],
    palms: [[196, 34], [36, 132], [146, 164], [34, 62], [272, 150]], signs: [[100, 108]], lamps: [[160, 112]] },
  "indigo-plateau": { ground: "grass", border: "rock", exit: null, sideTrees: [44, 176],
    paths: [[58, 140, 62, 10], [200, 140, 64, 10]],
    buildings: [["league", 160, 78], ["poke-center", 74, 138], ["poke-mart", 246, 138]],
    decals: [["league-plaza", 160, 77]], rocks: [[40, 96], [282, 96], [36, 170], [290, 170]], signs: [[104, 132]], lamps: [[122, 140], [198, 140]] },
};
