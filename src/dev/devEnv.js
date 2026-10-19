/**
 * devEnv.js – detekce vývojového (local) prostředí.
 *
 * Dev menu (Dev sekce v Nastavení ⚙) se ZAPOJUJE do UI jen na localhostu. Na
 * ostré verzi (GitHub/GitLab Pages) se soubory sice fyzicky nahrají, ale dev UI
 * se nikde nevytvoří – hráč dev menu neuvidí ani k němu nemá tlačítko.
 *
 * Přenositelnost: celé Dev menu žije v repu (složka `src/dev/`), takže na
 * jakémkoli počítači stačí spustit lokální server (localhost) a dev menu je k
 * dispozici; na produkční doméně se nezobrazí. Žádný build-krok není potřeba –
 * rozhoduje se za běhu podle `location.hostname`.
 */

/**
 * Běží hra v lokálním (dev) prostředí?
 * True pro localhost / 127.0.0.1 / IPv6 loopback / otevření přes file:// (prázdný
 * hostname). Vše ostatní (ostrá doména Pages) = false.
 * @returns {boolean}
 */
export function isDevEnv() {
  const h = (typeof location !== "undefined" && location.hostname) || "";
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "";
}
