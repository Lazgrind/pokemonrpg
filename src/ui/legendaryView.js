/**
 * UI: záložka Legendary (samostatný „gateway" tab pro statická legendární setkání).
 *
 * Ukáže se JEN když je hráč na oblasti s legendárním (data/legendaries.js →
 * legendaryForArea), je splněná story-podmínka a druh ještě nevlastníš (řídí
 * mainPanel.visibleTabs). Legendární NENÍ náhodné setkání – je to výzva, kterou
 * si hráč vyvolá KLIKEM. Souboj běží v Battle tabu přes
 * battleSystem.startStaticEncounter (vždy manuál, chytatelný). Divoké souboje na
 * téhle oblasti jdou pořád (Battle tab), tenhle tab jen přidává legendárního.
 */

import { legendaryForArea } from "../../data/legendaries.js";
import { getActiveArea, startStaticEncounter } from "../systems/battleSystem.js";
import { getSpecies } from "../../data/pokemon.js";
import { spriteImg } from "./sprites.js";
import { openMainTab } from "./mainPanel.js";

/** Vykreslí obsah záložky Legendary do zadaného elementu. */
export function renderLegendaryTab(root, onStatus = () => {}) {
  const area = getActiveArea();
  const leg = legendaryForArea(area?.id);
  if (!leg) {
    root.innerHTML = `<h2 class="panel-title">Legendary</h2><p class="placeholder">No legendary Pokémon dwells here.</p>`;
    return;
  }

  const sp = getSpecies(leg.speciesId);
  const name = sp?.name ?? leg.speciesId;
  const types = (sp?.types ?? []).join(" / ");
  const sprite = spriteImg(leg.speciesId, { view: "front", alt: name, extraClass: "legendary-mon" });

  root.innerHTML = `
    <section class="legendary-section">
      <h2 class="panel-title">${leg.tabIcon} ${leg.title}</h2>
      <p class="placeholder">A one-of-a-kind Pokémon waits here. You can still battle wild Pokémon on this area anytime from the Battle tab.</p>
      <div class="legendary-card">
        ${sprite}
        <div class="legendary-meta">
          <div class="legendary-name">${name} <span class="placeholder">· Lv ${leg.level}${types ? ` · ${types}` : ""}</span></div>
          <p class="story-text">${leg.intro}</p>
          <p class="story-text">${leg.lore}</p>
        </div>
      </div>
      <button class="btn legendary-fight" data-face-legendary>${leg.tabIcon} ${leg.button}</button>
    </section>`;

  root.querySelector("[data-face-legendary]")?.addEventListener("click", () => {
    const res = startStaticEncounter(leg.speciesId, leg.level);
    if (!res.ok) {
      onStatus(res.reason ?? "Can't start the battle.");
      return;
    }
    openMainTab("battle");
  });
}
