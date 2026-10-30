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
 * { y?, x0?, x1?, left?, right? } (y = moře dole; left/right = pobřeží po celé výšce na té straně), river = { x, w } (most se kreslí sám), ponds = [cx, cy, rx, ry],
 * dock = [x, y, w, h], fountain = [cx, base], pens = výběhy [x, y, w, h], fences = [x0, base, x1],
 * flowers = záhony [x, y, w, h], rocks / palms / signs / lamps = [x, base], volcano = [cx, base, w, h].
 */

/** @type {Record<string, object>} */
export const CITY_MAPS_GEN1 = {
  "pallet-town": { ground: "grass", border: "round", exit: [150, 14], water: { y: 160, x1: 140 }, sideTrees: [44, 176],
    paths: [[150, 0, 14, 106], [70, 96, 170, 10], [190, 106, 12, 46]],
    buildings: [["player-home", 92, 94], ["rival-home", 214, 94], ["oak-lab", 196, 154]],
    fences: [[36, 124, 128]], flowers: [[40, 128, 84, 14], [110, 60, 30, 10], [240, 120, 40, 14]], signs: [[136, 42], [176, 124]] },
  // Rozložení podle pret/pokefirered (data/maps/<Město>/map.json – dveře budov, voda, východy),
  // zmenšené na 320×180; budovy si drží relativní polohu, posunuté jen kvůli velikosti spritů.
  // Viridian: Gym vpravo nahoře, dům vlevo od něj, Mart vpravo, Poké Center uprostřed dole, rybník
  // vlevo dole; Route 2 na sever, Route 1 na jih, Route 22 na západ.
  "viridian-city": { ground: "grass", border: "round", exit: [120, 14], sideTrees: [44, 176], roadGap: [98, 122],
    paths: [[120, 0, 14, 108], [0, 108, 270, 10], [150, 118, 14, 62]],
    buildings: [["viridian-trade-house", 176, 98], ["gym", 246, 98], ["poke-center", 196, 168], ["poke-mart", 262, 162]],
    ponds: [[90, 148, 24, 10]], flowers: [[40, 62, 40, 10], [180, 132, 30, 8]], signs: [[104, 122]], lamps: [[140, 108], [222, 108]] },
  // Pewter: muzeum nahoře, Gym vlevo, Mart vpravo, Poké Center dole; Route 2 na jih, Route 3 na východ.
  "pewter-city": { ground: "grass", border: "pine", exit: null, sideTrees: [44, 176], roadGap: [110, 130],
    paths: [[118, 118, 202, 10], [150, 128, 14, 52], [146, 84, 12, 34]],
    buildings: [["pewter-museum", 152, 84], ["gym", 84, 138], ["poke-mart", 216, 112], ["poke-center", 112, 178]],
    rocks: [[40, 66], [256, 60], [290, 70], [290, 160], [36, 170], [210, 168]], signs: [[176, 132], [70, 152]] },
  // Cerulean: řeka na západě (Route 4 přes most), Nugget Bridge na sever, Poké Center uprostřed,
  // dům vlevo, Gym vpravo dole, Mart dole; Route 9 na východ, Route 5 na jih.
  "cerulean-city": { ground: "grass", border: "round", exit: [176, 14], river: { x: 22, w: 18 }, sideTrees: [44, 176], roadGap: [96, 120], noLeftTrees: true,
    paths: [[176, 0, 14, 104], [0, 104, 320, 10], [118, 114, 14, 66]],
    buildings: [["cerulean-trade-house", 84, 100], ["poke-center", 140, 100], ["poke-mart", 160, 172], ["gym", 232, 174]],
    flowers: [[230, 60, 40, 10], [60, 140, 30, 10]], signs: [[100, 124], [200, 124]], lamps: [[110, 104], [210, 104]] },
  // Vermilion: moře na západě a na jihu, molo uprostřed k S.S. Anne; nahoře rybářská chatrč, Poké Center
  // a Mart, dole Gym a dům u přístavu; Route 6 na sever, Route 11 na východ.
  "vermilion-city": { ground: "grass", border: "round", exit: [150, 12], water: { y: 152, left: 52 }, sideTrees: [44, 140], roadGap: [80, 100],
    paths: [[150, 0, 12, 84], [56, 84, 264, 10], [150, 94, 12, 46]],
    buildings: [["vermilion-fishing-hut", 76, 82], ["poke-center", 118, 82], ["poke-mart", 220, 82], ["gym", 96, 150], ["vermilion-trade-house", 268, 140], ["ss-anne", 210, 180]],
    dock: [148, 136, 16, 24], signs: [[176, 98], [300, 98]], lamps: [[136, 84], [196, 84]] },
  // Lavender: Poké Center vlevo nahoře, Pokémon Tower vpravo nahoře, dům pana Fujiho uprostřed, Mart
  // vpravo dole; Route 10 na sever, Route 8 na západ, Route 12 na jih.
  "lavender-town": { ground: "dusk", border: "pine", dusk: true, mist: true, wisps: true, exit: [130, 14], sideTrees: [44, 176], roadGap: [104, 126],
    paths: [[130, 0, 14, 110], [0, 110, 270, 10], [154, 120, 14, 60]],
    buildings: [["poke-center", 84, 104], ["pokemon-tower", 240, 104], ["mr-fuji-house", 118, 168], ["poke-mart", 250, 168]],
    signs: [[176, 124], [258, 124]], lamps: [[110, 110], [200, 110]] },
  // Celadon: Dept. Store vlevo, Mansion uprostřed, Poké Center vpravo nahoře; jezírko a Game Corner
  // uprostřed dole, Gym vlevo dole za stromy, restaurace a hotel vpravo dole (tady Boost Center a Mart);
  // Route 16 na západ, Route 7 na východ.
  "celadon-city": { ground: "grass", border: "round", exit: null, sideTrees: null,
    paths: [[0, 100, 320, 10], [150, 110, 12, 70]],
    buildings: [["dept-store", 60, 98], ["celadon-mansion", 140, 96], ["poke-center", 236, 96],
      ["gym", 60, 176], ["game-corner", 200, 168], ["boost-center", 252, 176], ["poke-mart", 294, 176]],
    ponds: [[122, 134, 16, 7]], flowers: [[286, 60, 24, 10]], signs: [[176, 114]], lamps: [[104, 100], [186, 100], [276, 100]] },
  // Saffron: Silph Co. uprostřed, Fighting Dojo a Gym nahoře vpravo, Mart vpravo, Poké Center vlevo dole;
  // brány na všechny čtyři strany (Route 5, 6, 7, 8).
  "saffron-city": { ground: "paved", border: "round", exit: [154, 14], sideTrees: null,
    paths: [[154, 0, 14, 92], [0, 92, 320, 10], [118, 102, 12, 78]],
    buildings: [["fighting-dojo", 206, 88], ["gym", 266, 88], ["poke-center", 72, 176], ["silph-co", 170, 178], ["poke-mart", 250, 172]],
    signs: [[104, 106], [196, 106]], lamps: [[60, 92], [140, 92], [236, 92]] },
  // Fuchsia: výběhy Safari na severu (vstup do Safari Zone), Mart vlevo; dole Gym, Poké Center,
  // Wardenův dům a rybářský dům s jezírkem; Route 18 na západ, Route 15 na východ, Route 19 na jih.
  "fuchsia-city": { ground: "grass", border: "round", exit: [156, 14], sideTrees: [44, 176], roadGap: [100, 120],
    paths: [[156, 0, 14, 104], [0, 104, 320, 10], [140, 114, 14, 66]],
    buildings: [["poke-mart", 70, 100], ["gym", 64, 178], ["poke-center", 196, 176], ["warden-house", 244, 176], ["fuchsia-fishing-house", 286, 176]],
    pens: [[90, 46, 44, 30], [196, 46, 44, 30]], ponds: [[262, 132, 26, 7]], signs: [[176, 40], [124, 118]], lamps: [[130, 104], [190, 104]] },
  // Cinnabar: ostrov obklopený mořem (západ, jih, východ); Pokémon Mansion vlevo nahoře, Gym vpravo
  // nahoře, Pokémon Lab vlevo, Poké Center a Mart dole; Route 21 na sever, Route 20 na východ.
  "cinnabar-island": { ground: "sand", border: "palm", exit: null, water: { y: 162, left: 40, right: 290 },
    paths: [[176, 30, 12, 56], [44, 86, 242, 10], [140, 96, 12, 54]],
    buildings: [["pokemon-mansion", 100, 82], ["gym", 244, 86], ["pokemon-lab", 96, 146], ["poke-center", 186, 150], ["poke-mart", 248, 150]],
    palms: [[56, 40], [150, 56], [274, 150], [60, 154], [150, 158]], signs: [[164, 100]], lamps: [[130, 86], [210, 86]] },
  "indigo-plateau": { ground: "grass", border: "rock", exit: null, sideTrees: [44, 176],
    paths: [[58, 140, 62, 10], [200, 140, 64, 10]],
    buildings: [["league", 160, 78], ["poke-center", 74, 138], ["poke-mart", 246, 138]],
    decals: [["league-plaza", 160, 77]], rocks: [[40, 96], [282, 96], [36, 170], [290, 170]], signs: [[104, 132]], lamps: [[122, 140], [198, 140]] },
};
