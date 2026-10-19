/**
 * UI: ovládání save systému (Nová hra / Uložit / Export / Import / Zálohy).
 * Napojeno přímo na systems/save.js.
 */

import {
  newGame, saveGame, exportSave, importSave,
  listBackups, restoreBackup, exportBackup, BACKUP_REASON_LABELS,
} from "../systems/save.js";
import { stopBattle, restore as restoreBattle } from "../systems/battleSystem.js";
import { getState } from "../core/state.js";
import { showPopup } from "./popup.js";

/** Escapování textu do HTML (popisky záloh pocházejí z uložených dat). */
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Okno se seznamem záloh; klik na zálohu nabídne obnovu / stažení. */
function openBackups(onStatus) {
  const backups = listBackups();
  if (backups.length === 0) {
    showPopup({
      title: "Backups",
      body: `<p class="story-text">No backups yet. A backup is made automatically before a game update,
        import, restore or new game, and whenever a save cannot be loaded.</p>`,
    });
    return;
  }
  const describe = (b) =>
    `${new Date(b.createdAt).toLocaleString()} – ${BACKUP_REASON_LABELS[b.reason] ?? b.reason}` +
    (b.gameVersion ? ` (v${b.gameVersion})` : "");
  showPopup({
    title: "Backups",
    body: `<p class="story-text">Pick a backup. Your current game is backed up before a restore,
      so a restore can be undone.</p>`,
    choices: [
      ...backups.map((b) => ({ label: esc(describe(b)), onPick: () => openBackup(b, describe(b), onStatus) })),
      { label: "Close" },
    ],
  });
}

/** Akce nad jednou zálohou. */
function openBackup(backup, description, onStatus) {
  showPopup({
    title: "Backup",
    body: `<p class="story-text">${esc(description)}</p>`,
    choices: [
      {
        label: "♻️ Restore",
        onPick: () => {
          if (!confirm("Replace your current game with this backup? (Your current game is backed up first.)")) return;
          stopBattle();
          const res = restoreBackup(backup.id);
          if (res.ok) restoreBattle(getState().battle);
          onStatus(res.ok ? (res.notice ?? "Backup restored ✓")
            : res.reason === "legacy" ? "Restore failed — this backup is from the old game before the reset."
            : "Restore failed — this backup cannot be read. Try ⬇️ Download.");
        },
      },
      {
        label: "⬇️ Download",
        onPick: async () => onStatus((await exportBackup(backup.id)) ? "Backup downloaded" : "Backup not found"),
      },
      { label: "Back", onPick: () => openBackups(onStatus) },
    ],
  });
}

/**
 * Vykreslí tlačítka do kontejneru.
 * @param {HTMLElement} root
 * @param {(msg: string) => void} [onStatus] callback pro stavovou hlášku
 */
export function renderSaveControls(root, onStatus = () => {}) {
  root.innerHTML = `
    <button class="btn" data-act="save">💾 Save</button>
    <button class="btn" data-act="export">⬇️ Export</button>
    <button class="btn" data-act="import">⬆️ Import</button>
    <button class="btn" data-act="backups">🗂️ Backups</button>
    <button class="btn btn-danger" data-act="new">🆕 New Game</button>
    <input type="file" accept=".txt,text/plain" hidden />
  `;

  const fileInput = /** @type {HTMLInputElement} */ (root.querySelector("input[type=file]"));

  root.querySelector('[data-act="save"]').addEventListener("click", () => {
    saveGame();
    onStatus("Saved ✓");
  });

  root.querySelector('[data-act="export"]').addEventListener("click", async () => {
    await exportSave();
    onStatus("Save exported to .txt");
  });

  root.querySelector('[data-act="import"]').addEventListener("click", () => fileInput.click());

  root.querySelector('[data-act="backups"]').addEventListener("click", () => openBackups(onStatus));

  root.querySelector('[data-act="new"]').addEventListener("click", () => {
    if (confirm("Really start a new game? Your current game is kept as a backup (🗂️ Backups).")) {
      stopBattle();
      newGame();
      onStatus("New game started");
    }
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    stopBattle();
    const res = await importSave(file);
    if (res.ok) restoreBattle(getState().battle);
    const failMsg = {
      format: "Import failed — not a valid save file (use a file exported by this game).",
      tampered: "Import failed — save is corrupted or was edited.",
      legacy: "Import failed — this save is from the old game before the reset and cannot be loaded.",
      error: "Import failed — invalid file.",
    };
    onStatus(res.ok ? (res.notice ?? "Import successful ✓") : (failMsg[res.reason] ?? failMsg.error));
    fileInput.value = "";
  });
}
