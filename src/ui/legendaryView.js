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
import { ownsSpeciesInRegion } from "../systems/team.js";
import { getSpecies } from "../../data/pokemon.js";
import { spriteImg } from "./sprites.js";
import { setHtmlReuseSprites } from "./domReuse.js";
import { openMainTab } from "./mainPanel.js";
import { saveScroll, restoreScroll } from "./scrollPreserve.js";

/** Vykreslí obsah záložky Legendary do zadaného elementu. */
export function renderLegendaryTab(root, onStatus = () => {}) {
  const area = getActiveArea();
  const leg = legendaryForArea(area?.id);
  if (!leg) {
    const _savedScroll = saveScroll(root);
    root.innerHTML = `<h2 class="panel-title">Legendary</h2><p class="placeholder">No legendary Pokémon dwells here.</p>`;
    restoreScroll(root, _savedScroll);
    return;
  }

  const sp = getSpecies(leg.speciesId);
  // displayName umožní zobrazit jiné jméno, než nese druh v dexu (Red Gyarados → #130).
  const name = leg.displayName ?? sp?.name ?? leg.speciesId;
  const types = (sp?.types ?? []).join(" / ");
  const sprite = spriteImg(leg.speciesId, { view: "front", alt: name, extraClass: "legendary-mon", shiny: !!leg.shiny, dataKey: `legendary:${leg.speciesId}:${leg.shiny ? 1 : 0}` });

  // Shiny-hunt režim: druh už v tomto regionu vlastníš → setkání zůstává
  // opakovatelné, ale čistě kosmetické (lov shiny varianty), bez odměn. JEDNORÁZOVÁ
  // setkání (leg.oneTime, Red Gyarados) tohle nemají – chytíš je jednou, s odměnami.
  const owned = !leg.oneTime && ownsSpeciesInRegion(leg.speciesId);
  let intro;
  if (owned) {
    intro = `You've already caught ${name}. It can be challenged again as a shiny hunt — no rewards, just the chance at a ✨ shiny variant. Your caught one is kept; a shiny catch upgrades it (toggle the look on its card).`;
  } else if (leg.shiny) {
    intro = `A one-of-a-kind shiny ${name} waits here — a single encounter. Catch it and it joins your collection; let it faint and you can try again. You can still battle wild Pokémon on this area anytime from the Battle tab.`;
  } else {
    intro = `A one-of-a-kind Pokémon waits here. You can still battle wild Pokémon on this area anytime from the Battle tab.`;
  }
  const buttonLabel = owned ? "Shiny hunt" : leg.button;
  const metaTag = owned ? " · ✨ shiny hunt" : leg.shiny ? " · ✨ always shiny" : "";

  const _savedScroll = saveScroll(root);
  setHtmlReuseSprites(root, `
    <section class="legendary-section">
      <h2 class="panel-title">${leg.tabIcon} ${leg.title}</h2>
      <p class="placeholder">${intro}</p>
      <div class="legendary-card">
        ${sprite}
        <div class="legendary-meta">
          <div class="legendary-name">${name} <span class="placeholder">· Lv ${leg.level}${types ? ` · ${types}` : ""}${metaTag}</span></div>
          <p class="story-text">${leg.intro}</p>
          <p class="story-text">${leg.lore}</p>
        </div>
      </div>
      <button class="btn legendary-fight" data-face-legendary>${leg.tabIcon} ${buttonLabel}</button>
    </section>`);
  restoreScroll(root, _savedScroll);

  root.querySelector("[data-face-legendary]")?.addEventListener("click", () => {
    // Shiny-hunt (už vlastníš) = opakovatelné, ale bez odměn (viz battleSystem).
    // Jednorázové (leg.oneTime) = owned je vždy false → odměny zůstávají; leg.shiny
    // vynutí barvu; claimFlag se při chycení nastaví a tab pak zmizí (mainPanel).
    const res = startStaticEncounter(leg.speciesId, leg.level, {
      noRewards: owned,
      shiny: leg.shiny ? true : undefined,
      claimFlag: leg.claimFlag,
    });
    if (!res.ok) {
      onStatus(res.reason ?? "Can't start the battle.");
      return;
    }
    openMainTab("battle");
  });
}
