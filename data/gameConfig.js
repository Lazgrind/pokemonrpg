/**
 * DATA/CONFIG: přepínače obsahu hry (feature flags).
 *
 * Jediné místo, které rozhoduje, zda je aktivní generace 2 (Johto). Drží se tu,
 * aby šlo gen 2 vyvíjet „na pozadí": na produkci je skrytá, na localhostu se dá
 * testovat, a po dokončení se zapne jedním řádkem.
 *
 * ── Jak to funguje ────────────────────────────────────────────────────────────
 *  • Na localhostu (vývoj) je gen 2 VŽDY zapnutá → můžeš ji testovat.
 *  • Na produkci (GitHub Pages) se řídí konstantou GEN2_RELEASED:
 *      - GEN2_RELEASED = false → hráči gen 2 NEVIDÍ (čistá gen 1, dex 151).
 *      - GEN2_RELEASED = true  → gen 2 je živá pro všechny.
 *
 * ── Spuštění gen 2 na produkci ────────────────────────────────────────────────
 *  Až bude gen 2 hotová, stačí PŘEHODIT JEDEN ŘÁDEK: GEN2_RELEASED = true.
 *  Nic jiného se nemění (aggregator data/pokemon.js se přizpůsobí sám).
 */

/**
 * Vydat gen 2 i na produkci? Držet na `false`, dokud není Johto hotové.
 * @type {boolean}
 */
const GEN2_RELEASED = false;

/**
 * Běžíme lokálně (vývoj), ne na produkci? Poznáme podle hostname.
 * `file://` a lokální HTTP server (localhost/127.0.0.1) = vývoj.
 * @returns {boolean}
 */
function isLocalEnv() {
  if (typeof window === "undefined" || !window.location) return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h === "";
}

/**
 * Běžíme ve vývojovém prostředí (localhost/file://)? Pro provizorní dev-only
 * afordance (např. dočasné tlačítko „Zpět do Kanto" na mapě), které hráč na
 * produkci vidět nemá – dokud pro ně nevznikne řádná herní mechanika.
 * @type {boolean}
 */
export const IS_DEV = isLocalEnv();

/**
 * Master přepínač generace 2. `true` = gen 2 obsah je aktivní (data, dex, mapa,
 * transport). Na localhostu vždy, na produkci až po GEN2_RELEASED.
 * @type {boolean}
 */
export const GEN2_ENABLED = GEN2_RELEASED || isLocalEnv();

/**
 * Nejvyšší aktuálně aktivní generace. Slouží k iteraci per-generation logiky
 * (diplomy, filtr dexu podle regionu apod.).
 * @type {number}
 */
export const HIGHEST_GEN = GEN2_ENABLED ? 2 : 1;
