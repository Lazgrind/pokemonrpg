/**
 * DATA: knihovna pozadí soubojů podle prostředí („biome").
 *
 * Klíčové rozhodnutí: obrázky pozadí jsou **sdílené a nezávislé na konkrétní
 * oblasti**. Žijí naplocho v `assets/backgrounds/` s popisnými názvy a víc
 * oblastí stejného prostředí je sdílí (Route 1 i Route 3 = „grassland" → stejný
 * pool). Oblast se na prostředí odkazuje přes `area.biome` (viz `data/areas.js`),
 * NE naopak – pozadí nepatří oblasti.
 *
 * Standard obrázků: poměr ~**3:2 na šířku** (scéna je širší než vyšší), aby se
 * vešly celé do bojového okna bez ošklivého ořezu (viz assets/backgrounds/README.md).
 *
 * @typedef {string} BiomeId
 */

/** biome → seznam souborů v `assets/backgrounds/`. */
export const BACKGROUND_BIOMES = {
  grassland: ["grass-forest.png", "grass-path.png", "grass-field.png"],
};

/**
 * URL pozadí daného prostředí (varianty). Prázdné pole = biome nemá obrázky.
 * @param {BiomeId} biome
 * @returns {string[]}
 */
export function biomeBackgrounds(biome) {
  const files = BACKGROUND_BIOMES[biome] ?? [];
  return files.map((f) => `assets/backgrounds/${f}`);
}
