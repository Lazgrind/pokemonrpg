/**
 * unownSystem.js – sběratelský tracker Unown forem (gen2 / Ruins of Alph).
 *
 * Unown má v dexu 1 slot (#201), ale 26 forem (A–Z). Formy se NEukládají do
 * kolekce (R-018), ale do samostatného pole `state.unownForms` – seznam písmen,
 * která hráč už nachytal. Zdroj pravdy je tenhle tracker, ne kolekce.
 *
 * Model chytání (dle zadání): NÁHODNÉ je jen to, které písmeno se v Ruins of Alph
 * objeví (losuje se při spawnu divokého Unowna – `rollUnownForm`). Hráč pak
 * FYZICKY VIDÍ, s jakou formou bojuje (encounter i chytací okno ukazují „Unown (A)")
 * a chytí PŘESNĚ tu viditelnou formu – battle catch-flow zapíše konkrétní písmeno
 * přes `recordUnownForm`. Žádné skryté přiřazení po chycení, žádný výběr dopředu.
 *
 * Gen-specifická data (seznam forem, id oblasti, id druhu) žijí v
 * data/gen2/unown.js; tenhle systém je jen čistá logika nad nimi – future gens
 * nic nemění (Unown je unikát gen2).
 */

import { getState, commit } from "../core/state.js";
import { UNOWN_FORMS } from "../../data/gen2/unown.js";

/** Pole nachytaných písmen (lazy default, save-safe pro staré save soubory). */
export function getUnownForms() {
  const s = getState();
  if (!Array.isArray(s.unownForms)) s.unownForms = [];
  return s.unownForms;
}

/** Má hráč nachycené dané písmeno? */
export function hasUnownForm(letter) {
  return getUnownForms().includes(letter);
}

/** Postup trackeru: { caught, total }. */
export function unownProgress() {
  return { caught: getUnownForms().length, total: UNOWN_FORMS.length };
}

/** Nachytal hráč všech 26 forem? */
export function isUnownComplete() {
  return getUnownForms().length >= UNOWN_FORMS.length;
}

/**
 * Vylosuje NÁHODNOU formu, která se objeví v divokém setkání (rovnoměrně ze všech
 * 26 forem – „herní pravděpodobnost"). Losuje se při spawnu, aby hráč hned viděl,
 * s jakým písmenem bojuje. Může padnout i už nachycené písmeno (coupon-collector
 * grind je záměr: náhodné je to, co se objeví, ne co chytíš).
 * @returns {string}
 */
export function rollUnownForm() {
  return UNOWN_FORMS[Math.floor(Math.random() * UNOWN_FORMS.length)];
}

/**
 * Zaznamená chycení KONKRÉTNÍ formy (té, se kterou hráč právě bojoval a viděl ji).
 * Volá se z battle catch-flow po úspěšném chycení Unowna v Ruins. Nové písmeno
 * přidá do trackeru; duplikát je no-op (progress se nezmění). Vrací info pro log.
 * @param {string} letter  písmeno, které bylo vidět v souboji (enemy.ref.unownForm)
 * @returns {{ letter: string, isNew: boolean }|null}
 */
export function recordUnownForm(letter) {
  if (!letter || !UNOWN_FORMS.includes(letter)) return null;
  const forms = getUnownForms();
  const isNew = !forms.includes(letter);
  if (isNew) {
    forms.push(letter);
    commit();
  }
  return { letter, isNew };
}
