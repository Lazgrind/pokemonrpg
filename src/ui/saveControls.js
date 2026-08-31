/**
 * UI: ovládání save systému (Nová hra / Uložit / Export / Import).
 * Napojeno přímo na systems/save.js.
 */

import { newGame, saveGame, exportSave, importSave } from "../systems/save.js";
import { stopBattle, restore as restoreBattle } from "../systems/battleSystem.js";
import { getState } from "../core/state.js";

/**
 * Vykreslí tlačítka do kontejneru.
 * @param {HTMLElement} root
 * @param {(msg: string) => void} [onStatus] callback pro stavovou hlášku
 */
export function renderSaveControls(root, onStatus = () => {}) {
  root.innerHTML = `
    <button class="btn" data-act="save">💾 Uložit</button>
    <button class="btn" data-act="export">⬇️ Export</button>
    <button class="btn" data-act="import">⬆️ Import</button>
    <button class="btn btn-danger" data-act="new">🆕 Nová hra</button>
    <input type="file" accept=".txt,text/plain" hidden />
  `;

  const fileInput = /** @type {HTMLInputElement} */ (root.querySelector("input[type=file]"));

  root.querySelector('[data-act="save"]').addEventListener("click", () => {
    saveGame();
    onStatus("Uloženo ✓");
  });

  root.querySelector('[data-act="export"]').addEventListener("click", () => {
    exportSave();
    onStatus("Save vyexportován do .txt");
  });

  root.querySelector('[data-act="import"]').addEventListener("click", () => fileInput.click());

  root.querySelector('[data-act="new"]').addEventListener("click", () => {
    if (confirm("Opravdu založit novou hru? Neuložený postup se ztratí.")) {
      stopBattle();
      newGame();
      onStatus("Nová hra založena");
    }
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    stopBattle();
    const ok = await importSave(file);
    if (ok) restoreBattle(getState().battle);
    onStatus(ok ? "Import proběhl ✓" : "Import selhal – neplatný soubor");
    fileInput.value = "";
  });
}
