/**
 * UI: panel Města (levá část obrazovky).
 * Krok 0 = jen kostra s placeholdery budov. Logika města přijde později.
 */

/** Ukázkové budovy pro vizuální kostru (nejsou to zatím funkční data). */
const PLACEHOLDER_BUILDINGS = ["Town Hall", "Pokémon Center", "Poké Mart"];

/**
 * Vykreslí panel města do zadaného elementu.
 * @param {HTMLElement} root
 */
export function renderCity(root) {
  root.innerHTML = `
    <h2 class="panel-title">Město</h2>
    <p class="placeholder">Zde bude tvé město, které půjde rozšiřovat.</p>
    ${PLACEHOLDER_BUILDINGS.map(
      (name) => `<div class="card">🏛️ ${name} <em style="color:var(--text-dim)">– brzy</em></div>`
    ).join("")}
  `;
}
