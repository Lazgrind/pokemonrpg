/**
 * DATA: oblasti světa (uzly klikací mapy).
 *
 * Mapa je klikací (viz src/ui/mapView.js): každý uzel má pozici `x`/`y` v %
 * na obrázku mapy (assets/gen1/map/kanto.webp – gen-specifické) a hráč na něj klikne, čímž se
 * „přesune" – nastaví se aktivní oblast (state.progress.activeAreaId) a
 * souboje pak spawnují nepřátele odsud (viz battleSystem.getActiveArea).
 *
 * Postup je LINEÁRNÍ přes NÁVŠTĚVY (nintendo styl): uzel se odemkne, když hráč
 * navštívil (klikl na) předchozí uzel v řetězu – `unlock.visited = "<id>"`.
 * `unlock.start = true` = odemčeno od začátku. Navštívené uzly drží
 * state.progress.visited (plní se v battleSystem.setActiveArea).
 *
 * Řetěz MVP (po Pewter City = 1. gym):
 *   Pallet Town (start) → Route 1 (start) → [vstup na Route 1] → Viridian City
 *   → [vstup do Viridianu] → Route 2 + Route 22 → [vstup na Route 2] →
 *   Viridian Forest → [vstup do lesa] → Pewter City.
 * Route 22 je volitelná západní odbočka (odemkne se vstupem do Viridianu).
 * Gymy později připíšou odznak (state.progress.badges) – přidá se jako další
 * podmínka; návštěvní logika zůstane. (Diglett's Cave a Route 3 jsou až za
 * Pewter → přibudou později.)
 *
 * @typedef {Object} Drop
 * @property {string} resource  klíč do state.resources (např. "pokeballs")
 * @property {number} chance    pravděpodobnost dropu za jednoho poraženého (0–1)
 * @property {number} amount    kolik se přičte při dropu
 *
 * @typedef {Object} Area
 * @property {string} id
 * @property {string} name
 * @property {"route"|"city"} type  route = bojová cesta (má species); city = město
 *                               (zatím bez soubojů, později obchody/gym)
 * @property {string} region
 * @property {number} order      pořadí v příběhovém řetězu (jen pro přehled)
 * @property {number} x          pozice markeru na mapě, vodorovně v % (0–100)
 * @property {number} y          pozice markeru na mapě, svisle v % (0–100)
 * @property {{ start?: boolean, visited?: string, badge?: string }} unlock  podmínka odemčení:
 *   `start` = odemčeno od začátku; `visited` = odemkne se po návštěvě daného uzlu;
 *   `badge` = navíc vyžaduje daný odznak (id) z gymu (state.progress.badges).
 *   `visited` + `badge` platí zároveň (AND) – např. route za Pewter až po Brockovi.
 * @property {number} recommendedLevel
 * @property {string} description
 * @property {(string|{id:string, rarity:"uncommon"|"rare"|"veryrare"})[]} species
 *   druhy Pokémonů v oblasti (nepřátelé i druh vajíčka); u měst prázdné. Položka je
 *   buď prostý string (tier "common"), nebo objekt `{ id, rarity }` s vyšší vzácností
 *   (viz RARITY_WEIGHTS + areaEncounters – vážený náhodný výběr ve spawnEnemy).
 * @property {Drop[]} drops     loot tabulka oblasti (zadání, sekce 6)
 * @property {string} [biome]   prostředí oblasti → sdílený pool pozadí souboje
 *   (viz `data/backgrounds.js`, `BACKGROUND_BIOMES`). Víc oblastí stejného biome
 *   sdílí stejná pozadí. Při každém novém setkání se z poolu náhodně vybere jedno.
 *   Když biome chybí/nemá obrázky, prosvítá fallback gradient.
 */

import { getHm } from "./hms.js";
import { getState } from "../src/core/state.js";
import { GENERATIONS } from "./generations.js";

/**
 * Oblasti (uzly mapy) VŠECH aktivních generací. Data jsou po generacích ve
 * složkách data/genN/areas.js; tady se jen sloučí. Každá oblast má `region`
 * (kanto/johto) – mapa i přechod mezi regiony (S.S. Anne → Johto) filtrují podle něj.
 * @type {Area[]}
 */
export const AREAS = GENERATIONS.flatMap((g) => g.areas);

/**
 * Váhy raritních tierů pro vážený výběr divokého druhu v oblasti. Vyšší váha =
 * častější výskyt. Záznam v `area.species` může být buď prostý string (= tier
 * "common"), nebo objekt `{ id, rarity }` s jedním z tierů níže. Kánon Gen 1:
 * běžní ptáci/hlodavci jsou "common", speciality (Pikachu, Chansey, Dratini,
 * Kangaskhan, Scyther, Pinsir…) "rare"/"veryrare".
 * @type {Record<string, number>}
 */
export const RARITY_WEIGHTS = {
  common: 40,
  uncommon: 15,
  rare: 5,
  veryrare: 1,
};

/**
 * Znormalizuje `area.species` (mix stringů a objektů `{ id, rarity }`) na jednotný
 * seznam `{ id, weight }` pro vážený náhodný výběr. Neznámý/chybějící tier =
 * "common". Prázdné/neplatné položky se vyfiltrují.
 * @param {Area} area
 * @returns {{ id: string, weight: number }[]}
 */
export function areaEncounters(area) {
  const list = Array.isArray(area?.species) ? area.species : [];
  return list
    .map((e) => {
      if (typeof e === "string") return { id: e, weight: RARITY_WEIGHTS.common };
      const weight = RARITY_WEIGHTS[e?.rarity] ?? RARITY_WEIGHTS.common;
      return { id: e?.id, weight };
    })
    .filter((e) => e.id);
}

/**
 * Level ranges `[min, max]` (INKLUZIVNĚ) divokých Pokémonů per oblast. Rozšiřuje
 * dřívější chování (jen `recommendedLevel`..`+1` pro celou oblast) na kanonické
 * pásmo, aby souboje napříč Kantem líp odrážely postup příběhem. Klíč = `area.id`;
 * chybí-li oblast tady, `areaLevelRange` spadne na `[recommendedLevel,
 * recommendedLevel+1]` (zpětně kompatibilní). Města (bez `species`) neuvádíme.
 * Hodnoty jsou 1 tabulka k snadnému doladění (jako RARITY_WEIGHTS).
 * @type {Record<string, [number, number]>}
 */
export const AREA_LEVELS = {
  "route-01": [2, 4],
  "route-22": [2, 5],
  "route-02": [3, 5],
  "viridian-forest": [3, 6],
  "route-03": [7, 11],
  "mt-moon": [8, 12],
  "route-04": [8, 12],
  "route-24": [10, 14],
  "route-25": [11, 15],
  "route-05": [10, 14],
  "route-06": [11, 15],
  "route-11": [12, 16],
  "digletts-cave": [16, 22],
  "route-09": [11, 15],
  "rock-tunnel": [13, 18],
  "route-10": [14, 18],
  "power-plant": [20, 26],
  "route-08": [14, 19],
  "route-07": [14, 19],
  "route-16": [17, 22],
  "route-17": [20, 25],
  "route-18": [22, 26],
  "safari-zone": [22, 28],
  "route-15": [21, 26],
  "route-14": [21, 26],
  "route-13": [22, 27],
  "route-12": [22, 27],
  "route-19": [28, 33],
  "route-20": [28, 33],
  "seafoam-islands": [28, 35],
  "route-21": [28, 34],
  "route-23": [34, 40],
  "victory-road": [36, 44],
  "cerulean-cave": [46, 60],
};

/**
 * Vrátí `[min, max]` level divokého Pokémona pro oblast (inkluzivně, min ≥ 1,
 * max ≥ min). Explicitní pásmo z `AREA_LEVELS`, jinak fallback na staré chování
 * (`recommendedLevel`..`recommendedLevel+1`).
 * @param {Area} area
 * @returns {[number, number]}
 */
export function areaLevelRange(area) {
  const explicit = AREA_LEVELS[area?.id];
  if (Array.isArray(explicit) && explicit.length === 2) {
    const min = Math.max(1, Math.floor(explicit[0]));
    const max = Math.max(min, Math.floor(explicit[1]));
    return [min, max];
  }
  const rec = Math.max(1, Math.floor(area?.recommendedLevel ?? 1));
  return [rec, rec + 1];
}

/**
 * Náhodný level v pásmu oblasti (rovnoměrně, inkluzivně obě meze).
 * @param {Area} area
 * @returns {number}
 */
export function rollAreaLevel(area) {
  const [min, max] = areaLevelRange(area);
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Vytáhne čisté id druhu z jedné položky `species` (string nebo `{ id, rarity }`).
 * @param {string|{id:string}} entry
 * @returns {string|undefined}
 */
export function speciesEntryId(entry) {
  return typeof entry === "string" ? entry : entry?.id;
}

/**
 * Seznam id druhů oblasti BEZ rarity (ploché stringy). Pro místa, která pracují
 * jen s druhy (pooly route trenérů, líhnutí vajec, „kde chytit" v Pokédexu),
 * a NEzajímá je váha. Vyfiltruje prázdné položky.
 * @param {Area} area
 * @returns {string[]}
 */
export function areaSpeciesIds(area) {
  const list = Array.isArray(area?.species) ? area.species : [];
  return list.map(speciesEntryId).filter(Boolean);
}

/**
 * Najde oblast podle id.
 * @param {string} id
 * @returns {Area|null}
 */
export function getArea(id) {
  return AREAS.find((a) => a.id === id) ?? null;
}

/**
 * Je oblast odemčená? Odemčení řídí NÁVŠTĚVY (progress.visited): `start` uzel
 * je vždy dostupný, ostatní až po návštěvě uzlu v `unlock.visited`. Volitelně
 * `unlock.badge` navíc vyžaduje daný odznak (gym) a `unlock.trainer` navíc
 * vyžaduje poraženého trenéra/rivala (gate mini-boss) – obojí platí zároveň
 * s `visited` (AND).
 * @param {Area} area
 * @param {string[]} visited  id navštívených oblastí (state.progress.visited)
 * @param {string[]} badges   získané odznaky (state.progress.badges)
 * @param {string[]} defeatedTrainers  poražení trenéři (state.progress.defeatedTrainers)
 * @param {Record<string, boolean>} story  příběhové flagy (state.story) – pro `unlock.story`
 * @returns {boolean}
 */
export function isAreaUnlocked(area, visited = [], badges = [], defeatedTrainers = [], story = {}) {
  if (!area) return false;
  const u = area.unlock ?? {};
  // Odznak (gym gating) musí sedět vždy, když je požadovaný.
  if (u.badge && !(badges ?? []).includes(u.badge)) return false;
  // Gate mini-boss (rival/trenér) musí být poražen, když je požadovaný.
  if (u.trainer && !(defeatedTrainers ?? []).includes(u.trainer)) return false;
  // Příběhová podmínka (jednorázový event, např. doručení Oak's Parcel).
  if (u.story && !(story ?? {})[u.story]) return false;
  // HM field-gating (Cut/Surf/Strength/Flash) – centralizované přes tabulku HMS:
  // `unlock.hm = <číslo HM>` se přeloží na příslušný story flag (getHm(n).flag),
  // takže v datech oblastí nejsou magické stringy „hasSurf" apod.
  // ROBUSTNOST: gate splní i pouhé VLASTNICTVÍ HM itemu, ne jen story flag –
  // staré savy mohly dostat HM item, aniž se nastavil flag (dřívější grant nebyl
  // atomický), takže hráč se stal držitelem HM, ale cesta zůstala zamčená. HM item
  // je pravdivý doklad „mám tenhle HM", proto stačí kterékoli z obou.
  if (u.hm != null) {
    const hm = getHm(u.hm);
    const flag = hm?.flag;
    const ownsHmItem = hm && (getState().resources?.items?.[hm.itemId] ?? 0) > 0;
    if (flag && !(story ?? {})[flag] && !ownsHmItem) return false;
  }
  if (u.start) return true;
  // `visited` může být string (1 podmínka) NEBO pole (OR – stačí jedna navštívená).
  // Pole se hodí na obousměrné cesty: uzel jde odemknout z kteréhokoli konce
  // (např. Cycling Road route-18 z route-17 i z fuchsia-city).
  if (u.visited) {
    const req = Array.isArray(u.visited) ? u.visited : [u.visited];
    return req.some((v) => (visited ?? []).includes(v));
  }
  return true; // bez podmínky = dostupné (jen odznak/trenér/story už prošli výše)
}
