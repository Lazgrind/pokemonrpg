/**
 * pcSystem.js – PC boxy: úložiště vlastněných jedinců, kteří nejsou v týmu.
 *
 * Model: `state.collection` zůstává jediný zdroj pravdy (objekty jedinců),
 * `state.team` drží uid jedinců v týmu. PC boxy drží uid VŠECH ostatních
 * jedinců, každý ve svém konkrétním slotu (uspořádání si řídí hráč přes
 * drag & drop). Aby se pole nikdy nerozešlo se skutečností (přidání úlovku,
 * změna týmu, vývoj), volá se před každým čtením `reconcile()`:
 *   - založí Box 1, když žádný box není,
 *   - vyprázdní sloty s uid, které už do boxů nepatří (jsou v týmu / neexistují),
 *   - odstraní duplicity (uid smí být max v 1 slotu),
 *   - doplní jedince mimo tým, kteří ještě ve slotu nejsou (do 1. volného;
 *     když nikde není místo, přidá nový box).
 *
 * reconcile() mutuje `state.pcBoxes` TIŠE (bez commit()) – běží uvnitř renderu
 * vyvolaného STATE_CHANGED, takže vlastní commit by způsobil smyčku. Změny se
 * uloží při nejbližším saveGame(). Operace vyvolané hráčem (swap/přesun/nový box)
 * naopak commit() volají.
 */

import { getState, commit, PC_BOX_SIZE, PC_BOX_COUNT } from "../core/state.js";

/** Prázdný box s daným jménem. */
function emptyBox(name) {
  return { name, slots: Array(PC_BOX_SIZE).fill(null) };
}

/**
 * Sladí `state.pcBoxes` se skutečným obsahem kolekce a týmu. Mutuje tiše.
 * @param {import("../core/state.js").GameState} s
 */
function reconcile(s) {
  if (!Array.isArray(s.pcBoxes)) s.pcBoxes = [];

  // Normalizace tvaru boxů (délka slotů, jméno) pro jistotu.
  s.pcBoxes.forEach((box, i) => {
    if (!box || typeof box !== "object") s.pcBoxes[i] = emptyBox(`Box ${i + 1}`);
    const b = s.pcBoxes[i];
    if (typeof b.name !== "string") b.name = `Box ${i + 1}`;
    if (!Array.isArray(b.slots)) b.slots = Array(PC_BOX_SIZE).fill(null);
    if (b.slots.length < PC_BOX_SIZE) {
      b.slots = b.slots.concat(Array(PC_BOX_SIZE - b.slots.length).fill(null));
    } else if (b.slots.length > PC_BOX_SIZE) {
      b.slots.length = PC_BOX_SIZE;
    }
  });

  // Pevný počet boxů: dorovnej na PC_BOX_COUNT (boxy se nepřidávají ručně).
  while (s.pcBoxes.length < PC_BOX_COUNT) {
    s.pcBoxes.push(emptyBox(`Box ${s.pcBoxes.length + 1}`));
  }

  const teamSet = new Set(s.team);
  const collectionUids = new Set(s.collection.map((p) => p.uid));
  // Jedinci, kteří PATŘÍ do boxů = vlastnění a nejsou v týmu.
  const belong = new Set([...collectionUids].filter((uid) => !teamSet.has(uid)));

  // 1) Vyčisti neplatné a duplicitní sloty.
  const seen = new Set();
  for (const box of s.pcBoxes) {
    for (let i = 0; i < box.slots.length; i++) {
      const uid = box.slots[i];
      if (uid == null) continue;
      if (!belong.has(uid) || seen.has(uid)) {
        box.slots[i] = null; // v týmu, neexistuje, nebo už jinde
      } else {
        seen.add(uid);
      }
    }
  }

  // 2) Doplň chybějící jedince (patří do boxu, ale nejsou v žádném slotu).
  const missing = [...belong].filter((uid) => !seen.has(uid));
  for (const uid of missing) {
    placeInFirstFree(s, uid);
  }
}

/** Umístí uid do prvního volného slotu; když není, přidá nový box. */
function placeInFirstFree(s, uid) {
  for (const box of s.pcBoxes) {
    const i = box.slots.indexOf(null);
    if (i !== -1) {
      box.slots[i] = uid;
      return;
    }
  }
  const box = emptyBox(`Box ${s.pcBoxes.length + 1}`);
  box.slots[0] = uid;
  s.pcBoxes.push(box);
}

/**
 * Vrátí sladěné PC boxy (volat před vykreslením). Nemutuje kolekci ani tým.
 * @returns {Array<{ name: string, slots: Array<string|null> }>}
 */
export function getBoxes() {
  const s = getState();
  reconcile(s);
  return s.pcBoxes;
}

/** Počet uložených jedinců napříč všemi boxy. */
export function storedCount() {
  return getBoxes().reduce((n, b) => n + b.slots.filter(Boolean).length, 0);
}

/**
 * Prohodí obsah dvou slotů ve stejném boxu (přesun i na prázdný slot). Používá
 * drag & drop v rámci jednoho boxu.
 * @param {number} boxIndex
 * @param {number} from
 * @param {number} to
 * @returns {boolean}
 */
export function swapSlots(boxIndex, from, to) {
  const s = getState();
  reconcile(s);
  const box = s.pcBoxes[boxIndex];
  if (!box) return false;
  if (from === to) return false;
  if (from < 0 || to < 0 || from >= box.slots.length || to >= box.slots.length) return false;
  [box.slots[from], box.slots[to]] = [box.slots[to], box.slots[from]];
  commit();
  return true;
}

/**
 * Přesune jedince (uid) do prvního volného slotu cílového boxu (bez zadání slotu).
 * Používá drag & drop na jiný box (přes navigaci ◀/▶). Když je cílový box plný,
 * vrátí false (žádné tiché vytváření boxů). Přesun do vlastního boxu je no-op.
 * @param {string} uid
 * @param {number} toBox
 * @returns {boolean}
 */
export function moveToBox(uid, toBox) {
  const s = getState();
  reconcile(s);
  const dest = s.pcBoxes[toBox];
  if (!dest) return false;
  const free = dest.slots.indexOf(null);
  if (free === -1) return false; // cílový box je plný
  return moveToSlot(uid, toBox, free);
}

/**
 * Přejmenuje box. Prázdné/whitespace jméno se ignoruje; ořízne se na 24 znaků.
 * @param {number} boxIndex
 * @param {string} name
 * @returns {boolean}
 */
export function renameBox(boxIndex, name) {
  const s = getState();
  reconcile(s);
  const box = s.pcBoxes[boxIndex];
  if (!box) return false;
  const clean = String(name ?? "").trim().slice(0, 24);
  if (!clean) return false;
  box.name = clean;
  commit();
  return true;
}

/**
 * Přesune jedince (uid) do konkrétního slotu daného boxu. Když je cíl obsazený,
 * obsah se prohodí. Zvládá i přesun mezi boxy (podle uid, ne indexu).
 * @param {string} uid
 * @param {number} toBox
 * @param {number} toSlot
 * @returns {boolean}
 */
export function moveToSlot(uid, toBox, toSlot) {
  const s = getState();
  reconcile(s);
  const dest = s.pcBoxes[toBox];
  if (!dest || toSlot < 0 || toSlot >= dest.slots.length) return false;

  // Najdi současnou pozici uid.
  let fromBox = -1;
  let fromSlot = -1;
  for (let bi = 0; bi < s.pcBoxes.length; bi++) {
    const si = s.pcBoxes[bi].slots.indexOf(uid);
    if (si !== -1) {
      fromBox = bi;
      fromSlot = si;
      break;
    }
  }
  if (fromBox === -1) return false;
  if (fromBox === toBox && fromSlot === toSlot) return false;

  const occupant = dest.slots[toSlot];
  dest.slots[toSlot] = uid;
  s.pcBoxes[fromBox].slots[fromSlot] = occupant; // prohození (occupant může být null)
  commit();
  return true;
}
