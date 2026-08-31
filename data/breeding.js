/**
 * DATA: breeding podle egg groups (R-022).
 *
 * Dva Pokémoni vložení do Školky vyprodukují po čase vejce, pokud jsou
 * kompatibilní: sdílejí alespoň jednu egg group, NEBO je jeden z nich žolík
 * (Ditto, egg group "ditto"). Druhy s "no-eggs" se nemnoží a dva žolíci spolu
 * také ne. Vejce může zdědit lepší IV od rodičů a je shiny s vyšší šancí
 * (Masuda-styl). Sama produkce a inkubace žije v systémech (breedingSystem.js,
 * eggSystem.js); zde jsou jen laditelná data a čistá pravidla nad daty druhů.
 */

/** Základní doba (minuty), za kterou kompatibilní pár vyprodukuje jedno vejce. */
export const BREED_MINUTES = 30;

/** Doba produkce vejce v sekundách (počítá se aktivně i offline). */
export const BREED_SECONDS = BREED_MINUTES * 60;

/** Kolik IV se zdědí od rodičů (zbytek se hodí náhodně). Laditelné jedním
 *  číslem; budoucí item Destiny Knot tuto hodnotu zvedne (viz BACKLOG). */
export const INHERIT_IV_COUNT = 3;

/** Šance na shiny u vylíhnutého breeding vejce (Masuda-styl, 2× oproti 1/8192). */
export const BREED_SHINY_CHANCE = 1 / 4096;

/** Egg group žolíka (Ditto) – páří se s čímkoli, co může mít vejce. */
export const WILDCARD_EGG_GROUP = "ditto";

/** Egg group druhů, které se nemnoží. */
export const NO_EGGS_GROUP = "no-eggs";

/** Egg groups druhu (bezpečně). */
function groups(species) {
  return species?.eggGroups ?? [];
}

/** Je druh žolík (Ditto)? */
export function isWildcard(species) {
  return groups(species).includes(WILDCARD_EGG_GROUP);
}

/** Může se druh vůbec množit (má vejce)? */
export function canBreedSpecies(species) {
  return !!species && !groups(species).includes(NO_EGGS_GROUP);
}

/**
 * Jsou dva druhy kompatibilní pro breeding?
 * @param {import("./pokemon.js").Species|undefined} spA
 * @param {import("./pokemon.js").Species|undefined} spB
 * @returns {boolean}
 */
export function areCompatible(spA, spB) {
  if (!canBreedSpecies(spA) || !canBreedSpecies(spB)) return false;
  const wA = isWildcard(spA);
  const wB = isWildcard(spB);
  if (wA && wB) return false; // dva žolíci (Ditto × Ditto) spolu nejdou
  if (wA || wB) return true; // žolík + cokoli, co může mít vejce
  return groups(spA).some((g) => groups(spB).includes(g));
}

/**
 * Druh potomka. Bez pohlaví: je-li jeden rodič žolík, potomek je ten druhý;
 * jinak náhodně jeden z rodičů. (Zatím bez evolučních linií – potomek = druh
 * rodiče; jakmile přibudou evoluce, měla by se rodit základní forma.)
 * @param {import("./pokemon.js").Species} spA
 * @param {import("./pokemon.js").Species} spB
 * @returns {string} id druhu potomka
 */
export function chooseChildSpeciesId(spA, spB) {
  if (isWildcard(spA)) return spB.id;
  if (isWildcard(spB)) return spA.id;
  return Math.random() < 0.5 ? spA.id : spB.id;
}
