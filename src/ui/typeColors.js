/**
 * typeColors.js – barvy typů Pokémonů (klasická paleta) pro UI.
 *
 * Jeden zdroj pravdy pro obarvení odznaků typů a tlačítek tahů. Obsahuje všech
 * 18 standardních typů, i když jich hra zatím používá jen pár – nové typy tak
 * budou obarvené automaticky, jakmile přibydou do dat.
 */

/** Typ → hex barva. */
export const TYPE_COLORS = {
  Normal: "#9099a1",
  Fire: "#ff9d55",
  Water: "#4d90d5",
  Grass: "#63bc5a",
  Electric: "#f4d23c",
  Ice: "#73cec0",
  Fighting: "#ce4069",
  Poison: "#ab6ac8",
  Ground: "#d97845",
  Flying: "#8fa9df",
  Psychic: "#fa7179",
  Bug: "#90c12c",
  Rock: "#c5b78c",
  Ghost: "#5269ac",
  Dragon: "#0b6dc3",
  Dark: "#5a5366",
  Steel: "#5a8ea1",
  Fairy: "#ec8fe6",
};

/** Barva typu (neznámý → neutrální šedá). */
export function typeColor(type) {
  return TYPE_COLORS[type] ?? "#6b7280";
}

/** Barevný odznak typu (sjednocený napříč UI). */
export function typeBadge(type) {
  return `<span class="type type-colored" style="--tc:${typeColor(type)}">${type}</span>`;
}
