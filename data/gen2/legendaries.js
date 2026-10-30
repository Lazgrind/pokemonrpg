/**
 * DATA: legendární setkání generace 2 (Johto). Mapa areaId → setkání.
 * Formát i chování stejné jako gen1 (viz ../legendaries.js / ../gen1/legendaries.js):
 * tab „výzva žije v tabu", ukáže se jen při splnění requiresStory a dokud druh
 * nevlastníš. Jeden legendární na oblast.
 *
 * Umístění (kánon GSC, přizpůsobené existujícím oblastem v areas.js):
 * - Suicune → burned-tower (věž, kde se trojice probouzí)
 * - Raikou → route-42, Entei → route-37 (v kánonu roameři; engine je area-fixní,
 *   proto každý na vlastní route s flavourem „toulá se Johtem")
 *
 * Tři beasts (Suicune/Raikou/Entei) mají `requiresStory: "beastsAwakened"` – flag
 * se nastaví při PRVNÍM sestupu do sklepa Burned Tower (cinematika „probuzení", viz
 * battleSystem.setActiveArea „burned-tower-beasts" + mapView). Do té doby žádný z tří
 * tabů neexistuje (v kánonu je trojice ukrytá, dokud ji hráč neprobudí).
 * - Lugia → whirl-islands (nutný Whirlpool k proplutí jeskyní)
 * - Ho-Oh → ecruteak-city (Bell/Tin Tower); vrchol jako Mewtwo → gate isJohtoChampion
 * - Celebi → ilex-forest (svatyně v lese); post-game event → gate isJohtoChampion
 * - Red Gyarados → lake-of-rage: VÝJIMKA z pravidla „opakovatelný shiny-hunt".
 *   Je to jednorázové setkání (`oneTime`), VŽDY shiny (`shiny:true`). V Pokédexu je
 *   to pořád #130 gyarados (jen shiny varianta), a gyarados je i divoký/z evoluce –
 *   proto jednorázovost NELZE vázat na vlastnictví druhu, ale na vlastní story-flag
 *   `claimFlag` nastavený až při CHYCENÍ (KO ho nezablokuje, zkusíš znovu).
 */

export const LEGENDARY_GEN2 = {
  "burned-tower": {
    id: "suicune-burned-tower",
    areaId: "burned-tower",
    speciesId: "suicune",
    level: 50,
    // Trojice beasts se zpřístupní až po probuzení ve sklepě Burned Tower.
    requiresStory: "beastsAwakened",
    tabLabel: "Suicune",
    tabIcon: "💧",
    title: "Suicune — the Aurora Pokémon",
    intro:
      "In the charred shell of the Burned Tower, where the floor gave way long ago, three legendary beasts were once brought back to life. One of them — graceful, crowned with a flowing mane — fixes its calm gaze on you and does not flee.",
    lore:
      "Suicune embodies the compassion of pure spring water. It roams the land, racing north with the autumn wind, purifying fouled water wherever it passes. It alone of the three beasts has chosen to stand and test the trainer it deems worthy. Weaken it without letting it slip away, and spend your best Poké Balls. Make it faint and it will vanish on the wind, to be faced again another day.",
    button: "Face Suicune",
  },

  "route-42": {
    id: "raikou-route-42",
    areaId: "route-42",
    speciesId: "raikou",
    level: 50,
    // Probuzen ve sklepě Burned Tower → od té chvíle se toulá Johtem (tady na Route 42).
    requiresStory: "beastsAwakened",
    tabLabel: "Raikou",
    tabIcon: "⚡",
    title: "Raikou — the Thunder Pokémon",
    intro:
      "A storm that should not be here crackles over the road. Lightning splits the sky — and in the afterglow stands a beast wreathed in thunderclouds, muscles tensed to bolt. It has roamed Johto since the Burned Tower, and for a heartbeat it has stopped for you.",
    lore:
      "Raikou embodies the speed of lightning. The rain clouds it carries let it strike from anywhere, and its roar sends shock waves through the air. It never stays long — the moment it chooses, it is gone across the horizon. Weaken it fast and spend your best Poké Balls. Make it faint and it will tear away into the storm, to roam Johto and be faced again another day.",
    button: "Face Raikou",
  },

  "route-37": {
    id: "entei-route-37",
    areaId: "route-37",
    speciesId: "entei",
    level: 50,
    // Probuzen ve sklepě Burned Tower → od té chvíle se toulá Johtem (tady na Route 37).
    requiresStory: "beastsAwakened",
    tabLabel: "Entei",
    tabIcon: "🔥",
    title: "Entei — the Volcano Pokémon",
    intro:
      "The air shimmers with sudden heat. Scorch marks trail across the grass, and at their end a great beast stands wreathed in smoke, flame breathing from its back. It has roamed Johto since the Burned Tower, and now it turns to face you.",
    lore:
      "Entei embodies the passion of magma. It is said that a new Entei is born each time a volcano erupts, and that its fiery roar can shake the earth. Like its kin it never rests in one place for long. Weaken it before it bolts and spend your best Poké Balls. Make it faint and it will stride off into the distance, to roam Johto and be faced again another day.",
    button: "Face Entei",
  },

  "whirl-islands": {
    id: "lugia-whirl-islands",
    areaId: "whirl-islands",
    speciesId: "lugia",
    level: 70,
    tabLabel: "Lugia",
    tabIcon: "🌊",
    // Kánon HGSS: Whirlpool v terénu (HM06 + Glacier Badge) a vyčištěná Radio Tower
    // (v SoulSilver za to ředitel dá Silver Wing). Bez toho by šla Lugia (Lv 70)
    // chytit už kolem 5. gymu. requiresStory smí být i pole (všechny flagy).
    requiresStory: "radioTowerCleared", // Whirl Islands samy chtějí Whirlpool + Glacier Badge
    title: "Lugia — the Diving Pokémon",
    intro:
      "Far beneath the Whirl Islands, past whirlpools only the boldest can navigate, a vast silver chamber opens over the sea. From the dark water rises the guardian of the deep, wings spread wide — the legendary Lugia.",
    lore:
      "Lugia is the guardian of the seas, said to sleep in a deep sea trench and to surface only in the dead of night. A single beat of its wings can whip up a storm that lasts forty days. It will test you with the full force of the ocean — bring your strongest team, wear it down without being swept away, and spend your very best Poké Balls. Make it faint and it will dive back into the depths, to be faced again another day.",
    button: "Face Lugia",
  },

  "ecruteak-city": {
    id: "hooh-ecruteak",
    areaId: "ecruteak-city",
    speciesId: "ho-oh",
    level: 70,
    tabLabel: "Ho-Oh",
    tabIcon: "🌈",
    // Kánon: na vrcholu Bell/Tin Tower v Ecruteaku. Jako Mewtwo v gen1 je to vrchol
    // výzvy — zpřístupní se až JOHTO Championovi (flag isJohtoChampion; NE kantské
    // isChampion, které je true už po příjezdu do Johta přes S.S. Anne).
    requiresStory: "isJohtoChampion",
    title: "Ho-Oh — the Rainbow Pokémon",
    intro:
      "At the very top of the tower in Ecruteak, above the rooftops of the city, the clouds break into a rainbow of impossible colour. Descending through it on wings of fire comes the legendary guardian of the skies — Ho-Oh.",
    lore:
      "Ho-Oh is said to live at the end of a rainbow, its body glowing in seven colours, bringing happiness to any trainer pure of heart who sees it. It is the eternal counterpart of Lugia, and legend says it resurrected the three beasts of the Burned Tower. This is the ultimate trial of Johto: bring your very best, wear it down without letting its sacred fire overwhelm you, and spend your finest Poké Balls. Make it faint and it will ascend beyond the rainbow, to be faced again another day.",
    button: "Face Ho-Oh",
  },

  "ilex-forest": {
    id: "celebi-ilex-forest",
    areaId: "ilex-forest",
    speciesId: "celebi",
    level: 50,
    tabLabel: "Celebi",
    tabIcon: "🍃",
    // Kánon: u svatyně hluboko v Ilex Forest (GS Ball / cestování časem). Post-game
    // tajemství — zpřístupní se JOHTO Championovi (flag isJohtoChampion; NE kantské
    // isChampion, které je true už po příjezdu do Johta).
    requiresStory: "isJohtoChampion",
    title: "Celebi — the Time Travel Pokémon",
    intro:
      "Deep in the heart of Ilex Forest stands an ancient shrine, half-swallowed by moss and silence. As a Champion finally steps before it, the air folds, leaves spiral upward against the wind — and out of the green light drifts a tiny being from another time.",
    lore:
      "Celebi is the voice of the forest, a Pokémon that walks through time itself. It is said to appear only in peaceful eras, and that so long as it shows itself the future is assured to be bright. Drawn across time by a Champion's deeds, it has come to meet you. Weaken it gently but surely, and spend your best Poké Balls. Make it faint and it will slip away through the years, to be faced again another day.",
    button: "Face Celebi",
  },

  "lake-of-rage": {
    id: "red-gyarados-lake",
    areaId: "lake-of-rage",
    speciesId: "gyarados",
    level: 30,
    displayName: "Red Gyarados",
    scene: "red-gyarados", // scéna příchodu (src/ui/legendaryScene.js), jinak podle speciesId
    tabLabel: "Red Gyarados",
    tabIcon: "🐉",
    // VŽDY shiny (rudá varianta) a JEDNORÁZOVÉ. V dexu je to #130 gyarados (shiny);
    // jednorázovost řídí claimFlag (ne vlastnictví druhu – gyarados je i divoký).
    shiny: true,
    oneTime: true,
    claimFlag: "redGyaradosCaught",
    title: "The Red Gyarados — the Atrocious Pokémon",
    intro:
      "At the heart of the Lake of Rage the water will not settle. A swarm of Magikarp thrashes at the surface — and rising from the center, scales burning a furious red, is a Gyarados unlike any other. It should not even exist yet.",
    lore:
      "Something is forcing the lake's Magikarp to evolve before their time, and this crimson Gyarados is the result — a Pokémon driven to fury by whatever signal pulses out of Mahogany Town. Catch it and the mystery of its unnatural colour is yours to keep (it joins your collection as a shiny Gyarados). Let it faint and it will sink back beneath the churning water, to be faced again. But once caught, the lake grows calm — there is only one Red Gyarados.",
    button: "Face the Red Gyarados",
  },
};
