/**
 * UI: jednorázové oznámení „Johto je otevřené" (vydání 2.0.0).
 *
 * Hráč, který už má titul Champion z Kanta a ještě nikdy do Johta neplul, by se o nové
 * plavbě S.S. Anne jinak nedozvěděl (nabídka je jen v okně lodi ve Vermilionu). Ukáže se
 * jednou po vstupu do hry (story flag `johtoAnnounced`), až nebude otevřené jiné okno
 * (offline souhrn, vylíhnutá vejce…). Text je dialog → bez emoji (CLAUDE.md).
 */

import { getState, commit } from "../core/state.js";
import { GEN2_ENABLED } from "../../data/gameConfig.js";
import { showPopup } from "./popup.js";

/** Má se oznámení ukázat? */
function shouldAnnounce() {
  if (!GEN2_ENABLED) return false;
  const s = getState();
  const st = s.story ?? {};
  return !!st.isChampion && !st.johtoAnnounced && !st.johtoCustomsSeen && (s.progress?.region ?? "kanto") === "kanto";
}

/** Zavolat po vstupu do hry (po title screenu). Počká, až nebude otevřené jiné okno. */
export function maybeAnnounceJohto() {
  if (!shouldAnnounce()) return;
  if (document.querySelector(".modal-overlay")) {
    setTimeout(maybeAnnounceJohto, 1000);
    return;
  }
  const s = getState();
  if (!s.story) s.story = {};
  s.story.johtoAnnounced = true;
  commit();
  showPopup({
    title: "A new region awaits: Johto",
    body: `<p class="story-text">Word travels fast in Vermilion City: the <strong>S.S. Anne</strong> is back in port, and her captain is looking for the Champion. Across the sea lies <strong>Johto</strong>, a whole new region to explore.</p>
      <p class="story-text"><strong>100 new Pokémon</strong>, eight new Gyms, a new rival, Team Rocket's return, the legendary beasts, Lugia, Ho-Oh and the Johto Pokémon League are waiting for you. Professor Elm in New Bark Town will give you your first Johto partner.</p>
      <p class="story-text">Head to <strong>Vermilion City</strong> and board the <strong>S.S. Anne</strong> to set sail. Your Kanto team waits safely in the PC, and the S.S. Aqua from Olivine City brings you back any time.</p>`,
    okLabel: "Set a course for Johto",
  });
}
