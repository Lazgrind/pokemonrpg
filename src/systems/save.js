/**
 * save.js – ukládání a načítání hry + kompatibilita savů mezi verzemi.
 *
 * Save žije v localStorage hráče (SAVE_KEY). Nová verze hry nasazená na Pages
 * ho nesmaže – musí ho ale umět přečíst. Každé načtení (start hry, import,
 * obnova zálohy) jde JEDNOU cestou – prepareSave():
 *   0) EPOCHA   – save ze hry před úplným resetem (saveEpoch ≠ SAVE_EPOCH) se
 *                 nenačte, jen zazálohuje (LegacySaveError → začne se načisto).
 *   1) ZÁLOHA   – save z jiné verze hry (meta.gameVersion ≠ VERSION) se před
 *                 jakoukoli úpravou odloží do zálohy (viz Zálohy níže).
 *   2) MIGRACE  – kroky z MIGRATIONS pro saveVersion < CURRENT_SAVE_VERSION,
 *                 postupně 1→2→3… Jen pro změny, které nejdou udělat samy
 *                 (přejmenování / přesun / jiný typ nebo význam pole).
 *   3) DOPLNĚNÍ – chybějící pole se doplní z createNewGame() (fillDefaults).
 *                 Nové pole tedy migraci NEPOTŘEBUJE.
 *
 * PRAVIDLA pro změny datového modelu (podrobně docs/NOTES.md „Save kompatibilita"):
 *  - nové pole            → jen přidat do createNewGame(), doplní se samo
 *                           (POZOR: mapy id → hodnota v MAP_PATHS se nedoplňují po klíčích)
 *  - přejmenování / přesun / změna typu nebo významu
 *                         → CURRENT_SAVE_VERSION + 1 a nový krok na KONEC MIGRATIONS;
 *                           vydaný krok se už nikdy needituje ani nemaže
 *  - id v datech (Pokémon, item, oblast, flag), na která save odkazuje, se
 *    nemažou ani nepřejmenovávají bez migrace
 *  - save hráče se nikdy nepřepíše naslepo: při chybě se zazálohuje
 */

import {
  getState,
  setState,
  createNewGame,
  CURRENT_SAVE_VERSION,
  SAVE_EPOCH,
} from "../core/state.js";
import { VERSION } from "../core/version.js";

/** Klíč v localStorage. */
const SAVE_KEY = "pokemonIdleRpg.save";

// ---------------------------------------------------------------------------
// Migrace
// ---------------------------------------------------------------------------

/**
 * Kroky migrace datového modelu. Krok `{ to: N }` převede save z verze N-1 na N.
 * Musí jít souvisle od 2 a poslední `to` = CURRENT_SAVE_VERSION (hlídá
 * tools/savecheck). Doplnění NOVÝCH polí sem nepatří – to dělá fillDefaults.
 *
 * Vzor (přejmenování pole):
 *   {
 *     to: 2,
 *     note: "settings.speed → settings.gameSpeed",
 *     run(data) {
 *       if (data.settings && "speed" in data.settings) {
 *         data.settings.gameSpeed = data.settings.speed;
 *         delete data.settings.speed;
 *       }
 *     },
 *   },
 *
 * @type {{ to: number, note: string, run: (data: any) => void }[]}
 */
export const MIGRATIONS = [
  {
    to: 2,
    note: "Sprout Tower a Dragon's Den už nejsou oblasti mapy (jen budovy ve Violet City / Blackthornu)",
    run(data) {
      const moved = { "sprout-tower": "violet-city", "dragons-den": "blackthorn-city" };
      const p = data.progress;
      if (p) {
        if (moved[p.activeAreaId]) p.activeAreaId = moved[p.activeAreaId];
        for (const r of Object.keys(p.lastAreaByRegion ?? {})) if (moved[p.lastAreaByRegion[r]]) p.lastAreaByRegion[r] = moved[p.lastAreaByRegion[r]];
        if (Array.isArray(p.visited)) p.visited = p.visited.filter((id) => !moved[id]);
      }
      for (const id of Object.keys(moved)) if (data.mapPositions) delete data.mapPositions[id];
    },
  },
];

/**
 * Mapy „id → hodnota" (a seznamy flagů): fillDefaults do nich nedoplňuje
 * jednotlivé klíče, jen celou mapu, když chybí. Hra z nich klíče maže (item
 * spotřebovaný na 0, odvolaný flag) – doplnění by je hráči vracelo.
 */
const MAP_PATHS = new Set([
  "resources.balls",
  "resources.items",
  "mapPositions",
  "johtoSafari.layouts",
  "nuzlockeCaught",
  "city.buildings",
  "story",
  "achievements.unlocked",
  "achievements.stats.speciesCatchCounts",
]);

/** Prostý objekt (ne pole, ne null)? */
function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Doplní do `target` chybějící klíče z `defaults` (rekurzivně jen přes prosté
 * objekty). Existující hodnoty nepřepisuje – ani když mají jiný typ.
 */
function fillDefaults(target, defaults, path = "") {
  for (const [key, def] of Object.entries(defaults)) {
    const p = path ? `${path}.${key}` : key;
    if (target[key] === undefined) target[key] = def; // defaults jsou čerstvé z createNewGame
    else if (isPlainObject(def) && isPlainObject(target[key]) && !MAP_PATHS.has(p)) fillDefaults(target[key], def, p);
  }
}

/** Save ze hry před úplným resetem (jiná epocha) – nenačítá se. */
export class LegacySaveError extends Error {
  constructor() {
    super("Save je ze hry před resetem (jiná epocha).");
    this.name = "LegacySaveError";
  }
}

/**
 * Převede načtená data savu na aktuální model (záloha → migrace → doplnění).
 * Vyhodí chybu jen u nepoužitelných dat (pak se nic nezměnilo): LegacySaveError
 * u savu z jiné epochy, jinak Error.
 * @param {any} data   rozparsovaný save
 * @param {string} raw původní text savu (pro zálohu)
 * @param {{ migrations?: typeof MIGRATIONS, target?: number }} [opts]  jen pro testy
 * @returns {{ state: import("../core/state.js").GameState, notice: string|null }}
 */
export function prepareSave(data, raw, { migrations = MIGRATIONS, target = CURRENT_SAVE_VERSION } = {}) {
  if (!isPlainObject(data)) throw new Error("Neplatná struktura save.");
  if (data.saveEpoch !== SAVE_EPOCH) throw new LegacySaveError();
  const from = Number.isInteger(data.saveVersion) && data.saveVersion > 0 ? data.saveVersion : 1;
  const fromGame = isPlainObject(data.meta) && typeof data.meta.gameVersion === "string" ? data.meta.gameVersion : null;
  let notice = null;

  if (from > target) {
    // Save z NOVĚJŠÍ verze (typicky návrat na starší nasazení). Dolů migrovat
    // neumíme: data i jejich saveVersion necháme, jen doplníme, co potřebujeme.
    backupRaw(raw, "newer", { gameVersion: fromGame, saveVersion: from });
    notice = "This save comes from a newer game version – a backup was kept.";
  } else if (from < target || (fromGame && fromGame !== VERSION)) {
    backupRaw(raw, "update", { gameVersion: fromGame, saveVersion: from, note: `${fromGame ?? "?"} → ${VERSION}` });
  }

  data.saveVersion = from;
  for (const m of migrations) {
    if (m.to > data.saveVersion && m.to <= target) {
      m.run(data);
      data.saveVersion = m.to;
    }
  }
  fillDefaults(data, createNewGame());
  if (data.saveVersion < target) data.saveVersion = target; // chybějící krok = jen doplnění
  return { state: data, notice };
}

// ---------------------------------------------------------------------------
// Zálohy
//
// Každá záloha = původní text savu pod vlastním klíčem + záznam v indexu
// (seznam jde vypsat bez parsování velkých savů). Stejný obsah se nezálohuje
// dvakrát. Od každého druhu se drží jen pár posledních (BACKUP_LIMITS), a když
// v localStorage dojde místo, mažou se nejstarší zálohy – nikdy save.
// ---------------------------------------------------------------------------

const BACKUP_INDEX_KEY = "pokemonIdleRpg.backups";
const BACKUP_KEY_PREFIX = "pokemonIdleRpg.backup.";

/** Kolik posledních záloh kterého druhu držet. */
const BACKUP_LIMITS = {
  update: 3,
  legacy: 1,
  unreadable: 3,
  newer: 2,
  "before-import": 2,
  "before-restore": 2,
  "before-new-game": 2,
};

/** Popisky druhů záloh pro UI. */
export const BACKUP_REASON_LABELS = {
  update: "Before game update",
  legacy: "Old game (before the reset)",
  unreadable: "Unreadable save",
  newer: "From a newer game version",
  "before-import": "Before import",
  "before-restore": "Before restore",
  "before-new-game": "Before new game",
};

/**
 * @typedef {Object} BackupEntry
 * @property {string} id
 * @property {string} reason        klíč z BACKUP_LIMITS
 * @property {number} createdAt
 * @property {number} size          délka textu savu
 * @property {string|null} gameVersion  verze hry, která save uložila
 * @property {number|null} saveVersion
 * @property {string} note
 */

/** @returns {BackupEntry[]} */
function readIndex() {
  try {
    const list = JSON.parse(localStorage.getItem(BACKUP_INDEX_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** @param {BackupEntry[]} list */
function writeIndex(list) {
  localStorage.setItem(BACKUP_INDEX_KEY, JSON.stringify(list));
}

function isQuotaError(err) {
  return err instanceof DOMException && (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED" || err.code === 22);
}

/** setItem; když dojde místo, maže nejstarší zálohy a zkusí to znovu. */
function setItemMakingRoom(key, value) {
  for (;;) {
    try {
      localStorage.setItem(key, value);
      return;
    } catch (err) {
      if (!isQuotaError(err)) throw err;
      const list = readIndex().sort((a, b) => a.createdAt - b.createdAt);
      const victim = list.find((b) => BACKUP_KEY_PREFIX + b.id !== key);
      if (!victim) throw err;
      localStorage.removeItem(BACKUP_KEY_PREFIX + victim.id);
      writeIndex(list.filter((b) => b.id !== victim.id));
      console.warn("Málo místa pro save – smazána nejstarší záloha:", victim.id);
    }
  }
}

/** Verze z textu savu (pro popis zálohy); u nečitelného savu null. */
function infoFromRaw(raw) {
  try {
    const d = JSON.parse(raw);
    return { gameVersion: d?.meta?.gameVersion ?? null, saveVersion: d?.saveVersion ?? null };
  } catch {
    return { gameVersion: null, saveVersion: null };
  }
}

/**
 * Uloží text savu jako zálohu. Nikdy nevyhodí chybu (záloha nesmí shodit hru).
 * @param {string|null} raw
 * @param {keyof BACKUP_LIMITS} reason
 * @param {{ gameVersion?: string|null, saveVersion?: number|null, note?: string }} [info]
 * @returns {BackupEntry|null}
 */
function backupRaw(raw, reason, info = infoFromRaw(raw ?? "")) {
  if (!raw) return null;
  try {
    if (readIndex().some((b) => b.size === raw.length && localStorage.getItem(BACKUP_KEY_PREFIX + b.id) === raw)) {
      return null; // stejný obsah už zálohovaný (opakované načtení, restart)
    }
    /** @type {BackupEntry} */
    const entry = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      reason,
      createdAt: Date.now(),
      size: raw.length,
      gameVersion: info.gameVersion ?? null,
      saveVersion: info.saveVersion ?? null,
      note: info.note ?? "",
    };
    setItemMakingRoom(BACKUP_KEY_PREFIX + entry.id, raw);
    let list = readIndex(); // setItemMakingRoom mohl index zmenšit
    list.push(entry);
    const same = list.filter((b) => b.reason === reason).sort((a, b) => a.createdAt - b.createdAt);
    const drop = same.slice(0, Math.max(0, same.length - (BACKUP_LIMITS[reason] ?? 2)));
    for (const old of drop) localStorage.removeItem(BACKUP_KEY_PREFIX + old.id);
    list = list.filter((b) => !drop.includes(b));
    writeIndex(list);
    return entry;
  } catch (err) {
    console.warn("Zálohu savu se nepodařilo vytvořit:", err);
    return null;
  }
}

/** Zálohy od nejnovější. */
export function listBackups() {
  return readIndex()
    .filter((b) => localStorage.getItem(BACKUP_KEY_PREFIX + b.id) !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Zazálohuje aktuální save v localStorage (před jeho nahrazením). */
function backupCurrent(reason) {
  if (hasState()) saveGame(); // ať záloha obsahuje i posledních ≤30 s od autosave
  return backupRaw(localStorage.getItem(SAVE_KEY), reason);
}

/** Je stav hry už inicializovaný? */
function hasState() {
  try {
    getState();
    return true;
  } catch {
    return false;
  }
}

/**
 * Obnoví zálohu (projde stejnou cestou jako načtení). Aktuální save se předtím
 * sám zazálohuje, takže obnova jde vrátit.
 * @param {string} id
 * @returns {{ ok: boolean, notice?: string|null, reason?: "missing"|"legacy"|"error" }}
 */
export function restoreBackup(id) {
  const raw = localStorage.getItem(BACKUP_KEY_PREFIX + id);
  if (raw === null) return { ok: false, reason: "missing" };
  let prepared;
  try {
    prepared = prepareSave(JSON.parse(raw), raw);
  } catch (err) {
    if (err instanceof LegacySaveError) return { ok: false, reason: "legacy" };
    console.error("Zálohu nejde načíst:", err);
    return { ok: false, reason: "error" };
  }
  backupCurrent("before-restore");
  setState(prepared.state);
  saveGame();
  return { ok: true, notice: prepared.notice };
}

/**
 * Stáhne zálohu jako podepsaný .txt (stejný formát jako Export, jde importovat).
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function exportBackup(id) {
  const raw = localStorage.getItem(BACKUP_KEY_PREFIX + id);
  if (raw === null) return false;
  const stamp = new Date(readIndex().find((b) => b.id === id)?.createdAt ?? Date.now()).toISOString().slice(0, 10);
  await downloadSigned(raw, `pokemon-idle-backup-${stamp}.txt`);
  return true;
}

// ---------------------------------------------------------------------------
// Uložení / načtení
// ---------------------------------------------------------------------------

/** Je v localStorage uložená hra? */
export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

/** Uloží aktuální stav do localStorage. */
export function saveGame() {
  const state = getState();
  // Pojistka: během tutoriálového DEMO-souboje je stav dočasně „naaranžovaný"
  // (tutorial-Pokémon vložený do collection/team apod.). Nesmí se uložit –
  // autosave (30 s / beforeunload) i ruční Save ho tu přeskočí; čistý stav
  // uloží tutorial sám po demu (přes restore snapshotu). Flag drží tutorial.js.
  if (state.tutorialDemoActive) return false;
  state.meta.lastSaved = Date.now();
  state.meta.gameVersion = VERSION; // podle ní se po aktualizaci hry pozná, že je čas na zálohu
  try {
    setItemMakingRoom(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error("Uložení hry selhalo:", err);
    return false;
  }
}

/**
 * Načte hru z localStorage.
 *  - "loaded"     – načteno (notice = případná zpráva pro hráče)
 *  - "none"       – žádný save
 *  - "legacy"     – save ze hry před resetem; zazálohován, nic se nepřepsalo
 *  - "unreadable" – save nejde přečíst; zůstal v localStorage i v záloze,
 *                   nic se nepřepsalo
 * @returns {{ status: "loaded"|"none"|"legacy"|"unreadable", notice?: string|null }}
 */
export function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return { status: "none" };
  try {
    const { state, notice } = prepareSave(JSON.parse(raw), raw);
    setState(state);
    return { status: "loaded", notice };
  } catch (err) {
    if (err instanceof LegacySaveError) {
      backupRaw(raw, "legacy");
      return { status: "legacy" };
    }
    console.error("Save nejde načíst – ukládám ho do zálohy:", err);
    backupRaw(raw, "unreadable");
    return { status: "unreadable" };
  }
}

/** Založí novou hru a rovnou ji uloží (předchozí save se zazálohuje). */
export function newGame() {
  backupCurrent("before-new-game");
  setState(createNewGame());
  saveGame();
}

// ---------------------------------------------------------------------------
// Export / import save – podepsaný, neprůhledný formát (anti-cheat, casual).
//
// POZOR – realistická úroveň ochrany: hra běží celá v prohlížeči, takže tenhle
// podpis NENÍ skutečné zabezpečení. Kdo si otevře náš JS (F12 → Sources), najde
// SAVE_SECRET a umí si save sám podepsat; přes devtools/localStorage jde stejně
// cheatovat cokoli. Cíl je JEN zavřít casual cestu „otevřu .txt v Notepadu,
// přepíšu gold a naimportuju" – payload je base64 (nečitelný) + HMAC podpis, a
// import odmítne cokoli, co nesedí (upravený soubor i starý čistý JSON export).
// ---------------------------------------------------------------------------

/** Prefix (magic) podepsaného exportu + verze formátu. */
const SAVE_MAGIC = "PIRPG1";
/**
 * Klíč pro HMAC podpis exportu. Není to tajemství v kryptografickém smyslu
 * (viz komentář výše) – jen „sůl", aby přepočítání podpisu nebylo triviální.
 */
const SAVE_SECRET = "pkmn-idle-rpg::save-integrity::v1::do-not-cheat-your-own-game";

/** UTF-8 string → Uint8Array (kvůli přezdívkám/emoji, `btoa` samo Unicode neumí). */
function utf8ToBytes(str) {
  return new TextEncoder().encode(str);
}

/** Uint8Array → base64. */
function bytesToBase64(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** base64 → Uint8Array. */
function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** base64 (UTF-8 payload) → původní string. */
function base64ToUtf8(b64) {
  return new TextDecoder().decode(base64ToBytes(b64));
}

/** HMAC-SHA256(message, SAVE_SECRET) → hex řetězec (přes Web Crypto). */
async function hmacHex(message) {
  const key = await crypto.subtle.importKey(
    "raw",
    utf8ToBytes(SAVE_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, utf8ToBytes(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Porovnání řetězců v konstantním čase (proti časovacím trikům). */
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Podepsaný obsah exportu: `PIRPG1|<base64(json)>|<hmac hex>`. */
export async function encodeSignedSave(json) {
  const payload = bytesToBase64(utf8ToBytes(json));
  const sig = await hmacHex(payload);
  return `${SAVE_MAGIC}|${payload}|${sig}`;
}

/** Stáhne JSON savu jako podepsaný .txt soubor. */
async function downloadSigned(json, filename) {
  const blob = new Blob([await encodeSignedSave(json)], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Stáhne aktuální save jako podepsaný .txt.
 * @returns {Promise<void>}
 */
export async function exportSave() {
  const stamp = new Date().toISOString().slice(0, 10);
  await downloadSigned(JSON.stringify(getState()), `pokemon-idle-save-${stamp}.txt`);
}

/**
 * Načte save z nahraného .txt souboru. Bere JEN podepsaný formát (PIRPG1);
 * upravený soubor i starý čistý JSON export se odmítnou.
 * @param {File} file
 * Starší export projde migrací stejně jako save v localStorage.
 * Export ze hry před resetem (jiná epocha) se odmítne (reason "legacy").
 * @returns {Promise<{ ok: boolean, notice?: string|null, reason?: "format"|"tampered"|"legacy"|"error" }>}
 */
export async function importSave(file) {
  try {
    const text = (await file.text()).trim();
    const parts = text.split("|");
    if (parts.length !== 3 || parts[0] !== SAVE_MAGIC) {
      // Neznámý formát – typicky starý čistý-JSON export nebo cizí soubor.
      console.error("Import: nepodporovaný formát save (očekávám podepsaný export).");
      return { ok: false, reason: "format" };
    }
    const [, payload, sig] = parts;
    const expected = await hmacHex(payload);
    if (!safeEqual(sig, expected)) {
      console.error("Import: podpis nesedí – save je poškozený nebo upravený.");
      return { ok: false, reason: "tampered" };
    }
    const json = base64ToUtf8(payload);
    const { state, notice } = prepareSave(JSON.parse(json), json);
    backupCurrent("before-import"); // import jde vrátit přes zálohy
    setState(state);
    saveGame();
    return { ok: true, notice };
  } catch (err) {
    if (err instanceof LegacySaveError) return { ok: false, reason: "legacy" };
    console.error("Import save selhal:", err);
    return { ok: false, reason: "error" };
  }
}
