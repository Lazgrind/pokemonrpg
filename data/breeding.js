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

// Import druhů pro funkcionalitu básní formy – toto NEOBSAHUJE cyklickou závislost,
// protože pokemon.js NEIMPORTUJE breeding.js (breeding.js je čistá datová vrstva,
// bez závislostí na systémech). Pokud by cyklická závislost vznikla, lze baseFormOf
// přesunout do breedingSystem.js místo toho.
import { POKEMON_SPECIES } from "./pokemon.js";

/** Základní doba (minuty), za kterou kompatibilní pár vyprodukuje jedno vejce. */
export const BREED_MINUTES = 30;

/** Doba produkce vejce v sekundách (počítá se aktivně i offline). */
export const BREED_SECONDS = BREED_MINUTES * 60;

/** Kolik IV se zdědí od rodičů (zbytek se hodí náhodně). Laditelné jedním
 *  číslem; item Destiny Knot tuto hodnotu zvedne na DESTINY_KNOT_IV_COUNT. */
export const INHERIT_IV_COUNT = 3;

/** Kolik IV se zdědí od rodičů, když jeden z nich drží Destiny Knot. */
export const DESTINY_KNOT_IV_COUNT = 5;

/** Id itemu Destiny Knot (drží ho rodič ve Školce, zvyšuje dědičnost IV). */
export const DESTINY_KNOT_ID = "destiny-knot";

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
 * Vrátí základní formu (kořen) evoluční linie daného druhu. Základní forma je
 * ten druh, na který NEUKAZUJE ŽÁDNÝ jiný druh evolucí (tj. nemá předka).
 * Procházíme evoluční historii směrem zpět (hledáme druhy, jejichž `evolvesTo`
 * ukazuje na daný druh) a iterujeme, pokud existuje. Fallback: původní speciesId
 * (např. neznámý druh nebo chyba v datech).
 * @param {string} speciesId
 * @returns {string} id základní formy (nebo původní speciesId, je-li neznámý)
 */
export function baseFormOf(speciesId) {
  if (!speciesId) return speciesId;

  // Hledáme kořen evoluční linie iteračně směrem zpět.
  // currentId = aktuální druh, hledáme jeho předchůdce (druh, jehož evolvesTo === currentId).
  let currentId = speciesId;
  let iterations = 0;
  const maxIterations = 100; // bezpečnost před nekonečnými smyčkami

  while (currentId && iterations < maxIterations) {
    iterations++;
    let foundPredecessor = null;

    // Hledej druh, jehož evolvesTo ukazuje na currentId.
    for (const sp of POKEMON_SPECIES) {
      if (sp.evolvesTo === currentId) {
        foundPredecessor = sp.id;
        break;
      }
    }

    if (!foundPredecessor) {
      // Žádný druh na currentId neodkazuje – currentId je kořen.
      return currentId;
    }

    // Pokračuj směrem zpět (nahoru v hierarchii).
    currentId = foundPredecessor;
  }

  // Fallback (neznámý druh nebo chyba v datech).
  return speciesId;
}

/**
 * Druh potomka. Bez pohlaví: je-li jeden rodič žolík, potomek je ten druhý;
 * jinak náhodně jeden z rodičů. POTOMEK SE RODÍ V ZÁKLADNÍ FORMĚ (kořen
 * evoluční linie vybraného NE-Ditto rodiče).
 * @param {import("./pokemon.js").Species} spA
 * @param {import("./pokemon.js").Species} spB
 * @returns {string} id druhu potomka (základní forma)
 */
export function chooseChildSpeciesId(spA, spB) {
  let childSpeciesId;
  if (isWildcard(spA)) {
    childSpeciesId = spB.id;
  } else if (isWildcard(spB)) {
    childSpeciesId = spA.id;
  } else {
    childSpeciesId = Math.random() < 0.5 ? spA.id : spB.id;
  }
  // Vrátí základní formu vybraného druhu.
  return baseFormOf(childSpeciesId);
}
