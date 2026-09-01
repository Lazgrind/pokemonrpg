/**
 * gender.js – zobrazení pohlaví jedince (♂/♀).
 *
 * Pohlaví je uloženo na jedinci jako "m" | "f" | "genderless" (viz
 * pokemonSystem.rollGender). Bezpohlavní druhy (např. Ditto) žádný symbol
 * nemají, tak vrátíme prázdný řetězec, ať se v UI nic nekreslí.
 */

/**
 * Vrátí HTML se symbolem pohlaví, nebo prázdný řetězec pro genderless/neznámé.
 * @param {"m"|"f"|"genderless"|undefined|null} gender
 * @param {{ size?: number }} [opts]  volitelná velikost písma v px
 * @returns {string}
 */
export function genderSymbolHtml(gender, opts = {}) {
  if (gender !== "m" && gender !== "f") return "";
  const sym = gender === "m" ? "♂" : "♀";
  const cls = gender === "m" ? "male" : "female";
  const label = gender === "m" ? "Samec" : "Samice";
  const style = opts.size ? ` style="font-size:${opts.size}px"` : "";
  return `<span class="gender ${cls}" title="${label}"${style}>${sym}</span>`;
}
