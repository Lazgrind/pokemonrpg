/**
 * CROSS-GEN evoluce generace 2 (Johto).
 *
 * Některé druhy gen 2 se vyvíjejí ze staršího (gen 1) předka: Crobat z Golbata,
 * Steelix z Onixe, Espeon/Umbreon z Eevee… Tyto evoluce NEPATŘÍ do dat gen 1
 * (v Kantu gen-2 forma existovat nesmí – „gen 2 pokémon nemůže být v gen 1"),
 * ale do gen 2, protože gen-1 druh v Johtu být SMÍ a teprve tam se má vyvinout.
 *
 * Proto je tu drží gen 2 jako „patch": aggregator (data/pokemon.js) je přimerguje
 * do `evolutions[]` příslušného rodiče, ale JEN když je gen 2 aktivní. Když je
 * gen 2 vypnutá (produkce před vydáním), patch neexistuje → rodič (Golbat…) žádnou
 * gen-2 evoluci nezná a Kanto zůstává čisté.
 *
 * Runtime navíc hlídá region: evoluce se nabídne, jen když je generace CÍLE ≤
 * generaci aktuálního regionu (viz src/systems/evolutionSystem.js). Takže i se
 * zapnutou gen 2 se Golbat v Kantu na Crobata nevyvine – až v Johtu.
 *
 * Formát shodný s `evolutions[]` v pokemon.js:
 *   { toId, method: "item"|"trade"|"happiness"|"happiness-day"|"happiness-night", item? }
 * Trade řešíme (stejně jako gen 1) přes item Linking Cord, ne skutečnou výměnou.
 *
 * @type {Record<string, {toId: string, method: string, item?: string}[]>}
 */
export const EVOLUTION_PATCHES_GEN2 = {
  golbat: [{ toId: "crobat", method: "happiness" }],
  gloom: [{ toId: "bellossom", method: "item", item: "sun-stone" }],
  poliwhirl: [{ toId: "politoed", method: "trade" }],
  slowpoke: [{ toId: "slowking", method: "trade" }],
  onix: [{ toId: "steelix", method: "trade" }],
  scyther: [{ toId: "scizor", method: "trade" }],
  seadra: [{ toId: "kingdra", method: "trade" }],
  porygon: [{ toId: "porygon2", method: "trade" }],
  chansey: [{ toId: "blissey", method: "happiness" }],
  eevee: [
    { toId: "espeon", method: "happiness-day" },
    { toId: "umbreon", method: "happiness-night" },
  ],
};
