/**
 * UI: panel Battle Area (pravá horní část).
 * Krok 0 = jen kostra. Vizuální souboj, HP bary a animace přijdou v Kroku 3.
 */

/**
 * Vykreslí panel battle do zadaného elementu.
 * @param {HTMLElement} root
 */
export function renderBattle(root) {
  root.innerHTML = `
    <h2 class="panel-title">Battle Area</h2>
    <p class="placeholder">
      Zatím žádný souboj.<br />
      Zde se bude odehrávat vizuální (automatický i manuální) souboj tvého týmu.
    </p>
  `;
}
