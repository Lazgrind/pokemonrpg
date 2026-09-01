/**
 * statusBadge.js – malý sdílený UI helper pro odznak stavového efektu
 * (otrava / popálení / paralýza). Používá ho Battle Area, Team i karta Pokémona,
 * ať vypadá stav všude stejně.
 */

/** Krátké popisky statusů pro odznak. */
export const STATUS_LABEL = { poison: "PSN", burn: "BRN", paralysis: "PAR" };

/**
 * Vrátí HTML odznaku stavu (s úvodní mezerou, aby šel rovnou nalepit za jméno),
 * nebo prázdný řetězec, když jedinec žádný status nemá.
 * @param {{ kind: string }|null|undefined} status
 * @returns {string}
 */
export function statusBadge(status) {
  if (!status || !STATUS_LABEL[status.kind]) return "";
  return ` <span class="status-badge status-${status.kind}">${STATUS_LABEL[status.kind]}</span>`;
}
