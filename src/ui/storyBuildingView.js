/**
 * storyBuildingView.js – příběhová (interakční) okna městských budov.
 *
 * Na rozdíl od idle budov (buildingView.js – upgrady za gold) tyhle budovy
 * nemají level: klik otevře jednorázovou/flavour interakci věrnou hře. Zatím
 * Pallet Town: Oak's Lab (starter + Pokédex), Tvůj domov (dárek od mámy),
 * Rivalův dům (flavour). Další města přibudou v dalších krocích příběhu.
 *
 * Jednorázové eventy si značíme do `state.story` (mapa flag → true), ať se
 * dárek nedá vzít dvakrát a přežije to refresh/save.
 */

import { getState, commit } from "../core/state.js";
import { openMainTab } from "./mainPanel.js";
import { openStarterModal } from "./starterModal.js";
import { getStarterSpeciesId, acquirePokemon } from "../systems/team.js";
import { healTeam, teamNeedsHeal, startTrainerBattle } from "../systems/battleSystem.js";
import { createPokemon } from "../systems/pokemonSystem.js";
import { getSpecies } from "../../data/pokemon.js";

/** Kolik Potionů dá máma (jednorázově). Poké Bally už hráč má ve startu. */
const MOM_POTIONS = 5;

/** Je otevřené story okno? (jen jedno naráz) */
let open = false;

/** Vrátí jméno rivala z tohoto playthrough (fallback, když ho hráč nezadal). */
function rivalName() {
  return getState().player?.rivalName?.trim() || "your rival";
}

/** Přečte story-flag. */
function storyFlag(key) {
  return !!getState().story?.[key];
}

/** Zapíše story-flag (lazy init kontejneru). */
function setStoryFlag(key) {
  const s = getState();
  if (!s.story) s.story = {};
  s.story[key] = true;
}

/**
 * Otevře příběhové okno budovy podle story-klíče.
 * @param {string} storyKey  "oak-lab" | "player-home" | "rival-home"
 * @param {(msg: string) => void} [onStatus]
 */
export function openStoryBuilding(storyKey, onStatus = () => {}) {
  if (open) return;
  open = true;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    open = false;
  };

  // Klik mimo obsah = zavřít (story okna nejsou povinná).
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  // Vykreslení + napojení; některé akce překreslí (např. po vzetí dárku).
  const render = () => {
    const view = VIEWS[storyKey] ?? unknownView;
    const { title, body } = view();
    overlay.innerHTML = `
      <div class="modal story-modal">
        <button class="modal-close" data-close aria-label="Close">✕</button>
        <h2 class="panel-title">${title}</h2>
        ${body}
      </div>
    `;
    overlay.querySelector("[data-close]")?.addEventListener("click", close);
    wire(storyKey, overlay, onStatus, render, close);
  };

  render();
}

/* ------------------------------- Pohledy --------------------------------- */

const VIEWS = {
  "oak-lab": oakLabView,
  "player-home": playerHomeView,
  "rival-home": rivalHomeView,
  "pewter-museum": pewterMuseumView,
  "ss-anne": ssAnneView,
};

/** Level oživené fosílie (Omanyte/Kabuto) v Museum of Science. */
const FOSSIL_REVIVE_LEVEL = 20;

/** Fosílie → oživený druh (data/items.js special item id → speciesId). */
const FOSSIL_TO_SPECIES = {
  "helix-fossil": "omanyte",
  "dome-fossil": "kabuto",
};

/** Poké Bally jako odměna za doručení Oak's Parcel (věrné kánonu). */
const PARCEL_BALLS = 5;

/** Jednorázová odměna za první návštěvu Musea of Science (Pewter). */
const MUSEUM_POTIONS = 3;

function oakLabView() {
  const starterId = getStarterSpeciesId();
  const hasStarter = getState().collection.length > 0 && starterId;
  const starterName = hasStarter ? getSpecies(starterId)?.name ?? starterId : null;

  // Oak's Parcel má přednost: máš balíček a ještě jsi ho nedoručil.
  const parcelPending = storyFlag("oakParcelGiven") && !storyFlag("oakParcelDelivered");
  if (parcelPending) {
    return {
      title: "🔬 Oak's Lab",
      body: `
        <p class="story-text">Professor Oak: "Ah, that's my Parcel from the Poké Mart! You brought it all the way from Viridian? Thank you!"</p>
        <p class="story-text">"Here — take these to help you catch more Pokémon. The road north through Viridian is open to you now."</p>
        <button class="btn" data-deliver-parcel>📦 Hand over Oak's Parcel (get ${PARCEL_BALLS}× Poké Ball)</button>
      `,
    };
  }

  const action = hasStarter
    ? `<p class="story-text">"So, how's your <strong>${starterName}</strong> doing? Remember, the Pokédex is your faithful companion on the road."</p>
       <button class="btn" data-open-pokedex>📕 Open Pokédex</button>`
    : `<p class="story-text">"Welcome! Choose your very first partner."</p>
       <button class="btn" data-choose-starter>Choose your starter</button>`;

  return {
    title: "🔬 Oak's Lab",
    body: `
      <p class="story-text">Professor Oak looks up from his research.</p>
      ${action}
    `,
  };
}

function playerHomeView() {
  const taken = storyFlag("momGift");
  const gift = taken
    ? `<p class="story-text">Mom: "Take good care of yourself out there!"</p>
       <p class="placeholder">✓ You've already taken Mom's gift.</p>`
    : `<p class="story-text">Mom: "Don't forget to take these — they'll come in handy on your journey!"</p>
       <button class="btn" data-take-gift>Take gift (${MOM_POTIONS}× Potion)</button>`;

  // Máma tě vždycky zadarmo doléčí – pojistka proti soft-locku (Pallet nemá Poké Center).
  const needsHeal = teamNeedsHeal();
  const rest = needsHeal
    ? `<button class="btn" data-rest>🛏️ Rest at home (heal team)</button>`
    : `<p class="placeholder">✓ Your team is fully rested.</p>`;

  return {
    title: "🏠 Your Home",
    body: `${gift}<hr class="story-sep">${rest}`,
  };
}

function rivalHomeView() {
  return {
    title: "🏡 Rival's Home",
    body: `<p class="story-text">The house where <strong>${rivalName()}</strong> lives. Nobody's home right now — they've probably already set off on their own journey.</p>`,
  };
}

function pewterMuseumView() {
  const claimed = storyFlag("pewterMuseumReward");
  const reward = claimed
    ? `<p class="story-text">The scientist smiles. "Come back any time — science never sleeps!"</p>
       <p class="placeholder">✓ You've already received the museum's welcome gift.</p>`
    : `<p class="story-text">A scientist greets you warmly. "A new trainer! Take these on the house — travelers should always be prepared."</p>
       <button class="btn" data-museum-reward>🎁 Accept welcome gift (${MUSEUM_POTIONS}× Potion)</button>`;

  // Oživení fosílií: kdo drží Helix/Dome fosílii, může ji tu nechat oživit na
  // Omanyte/Kabuto (fosílie se spotřebuje). Věrné duchu hry (revival lab).
  const items = getState().resources?.items ?? {};
  const revivable = Object.keys(FOSSIL_TO_SPECIES).filter((id) => (items[id] ?? 0) > 0);
  let fossilSection = "";
  if (revivable.length) {
    const buttons = revivable
      .map((id) => {
        const species = getSpecies(FOSSIL_TO_SPECIES[id])?.name ?? FOSSIL_TO_SPECIES[id];
        const fname = id === "dome-fossil" ? "Dome Fossil" : "Helix Fossil";
        return `<button class="btn" data-revive-fossil="${id}">🧬 Revive ${fname} → ${species}</button>`;
      })
      .join("");
    fossilSection = `<hr class="story-sep">
      <p class="story-text">The lead scientist eyes your bag. "Is that a <strong>fossil</strong>? Our machine can bring it back to life — would you like me to try?"</p>
      ${buttons}`;
  }

  return {
    title: "🏛️ Museum of Science",
    body: `<p class="story-text">Inside, glass cases display ancient <strong>fossils</strong>, a glittering <strong>Moon Stone</strong>, and — up on the second floor — a real piece of a <strong>space rocket</strong>.</p>
      <hr class="story-sep">
      ${reward}
      ${fossilSection}`,
  };
}

function ssAnneView() {
  if (storyFlag("ssAnneCleared")) {
    return {
      title: "🚢 S.S. Anne",
      body: `<p class="story-text">The great liner's horn sounds as it prepares to leave port. Sailors wave from the deck.</p>
        <p class="placeholder">✓ You've already explored the S.S. Anne and earned HM01 Cut.</p>`,
    };
  }
  const items = getState().resources?.items ?? {};
  const hasTicket = (items["ss-anne-ticket"] ?? 0) > 0;
  if (!hasTicket) {
    return {
      title: "🚢 S.S. Anne",
      body: `<p class="story-text">A sailor blocks the gangway. "No ticket, no boarding! This is a luxury cruise, you know."</p>
        <p class="placeholder">Find <strong>Bill</strong> at the end of <strong>Route 25</strong> (north of Cerulean) — he'll give you a S.S. Anne Ticket.</p>`,
    };
  }
  return {
    title: "🚢 S.S. Anne",
    body: `<p class="story-text">You show your ticket and step aboard the luxurious S.S. Anne. Wandering the decks, you run straight into <strong>${rivalName()}</strong>!</p>
      <p class="story-text">"Hey! You're too weak to be here. Let's battle!"</p>
      <button class="btn" data-ss-anne-battle>⚔️ Battle ${rivalName()}</button>`,
  };
}

function unknownView() {
  return { title: "…", body: `<p class="placeholder">Nothing here yet.</p>` };
}

/* -------------------------------- Wiring --------------------------------- */

function wire(storyKey, overlay, onStatus, render, close) {
  // Oak's Lab
  overlay.querySelector("[data-open-pokedex]")?.addEventListener("click", () => {
    close();
    openMainTab("pokedex");
  });
  overlay.querySelector("[data-choose-starter]")?.addEventListener("click", () => {
    close();
    openStarterModal();
  });

  // Oak's Lab – doručení Oak's Parcel: odemkne sever (Route 2) + Poké Bally.
  overlay.querySelector("[data-deliver-parcel]")?.addEventListener("click", () => {
    const s = getState();
    if (!s.resources.balls) s.resources.balls = {};
    s.resources.balls.poke = (s.resources.balls.poke ?? 0) + PARCEL_BALLS;
    setStoryFlag("oakParcelDelivered");
    commit();
    onStatus(`Delivered Oak's Parcel! +${PARCEL_BALLS}× Poké Ball. The road north is now open.`);
    render();
  });

  // Tvůj domov – jednorázový dárek od mámy.
  overlay.querySelector("[data-take-gift]")?.addEventListener("click", () => {
    const s = getState();
    if (!s.resources.items) s.resources.items = {};
    s.resources.items.potion = (s.resources.items.potion ?? 0) + MOM_POTIONS;
    setStoryFlag("momGift");
    commit();
    onStatus(`Mom gave you ${MOM_POTIONS}× Potion!`);
    render();
  });

  // Tvůj domov – bezplatné doléčení týmu (máma), pojistka proti soft-locku.
  overlay.querySelector("[data-rest]")?.addEventListener("click", () => {
    const n = healTeam();
    onStatus(n ? "Mom patched up your team. Fully rested!" : "Your team is already fine.");
    render();
  });

  // Museum of Science (Pewter) – jednorázová uvítací odměna.
  overlay.querySelector("[data-museum-reward]")?.addEventListener("click", () => {
    const s = getState();
    if (!s.resources.items) s.resources.items = {};
    s.resources.items.potion = (s.resources.items.potion ?? 0) + MUSEUM_POTIONS;
    setStoryFlag("pewterMuseumReward");
    commit();
    onStatus(`The museum gave you ${MUSEUM_POTIONS}× Potion!`);
    render();
  });

  // Museum of Science – oživení fosílie: spotřebuje fosílii, přidá Omanyte/Kabuto.
  overlay.querySelectorAll("[data-revive-fossil]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const fossilId = btn.getAttribute("data-revive-fossil");
      const speciesId = FOSSIL_TO_SPECIES[fossilId];
      const s = getState();
      const items = s.resources?.items ?? {};
      if (!speciesId || (items[fossilId] ?? 0) <= 0) return; // pojistka
      items[fossilId] -= 1;
      if (items[fossilId] <= 0) delete items[fossilId];
      commit();
      const mon = createPokemon(speciesId, FOSSIL_REVIVE_LEVEL);
      acquirePokemon(mon);
      const name = getSpecies(speciesId)?.name ?? speciesId;
      onStatus(`The machine whirs to life — your fossil was revived into ${name}!`);
      render();
    });
  });

  // S.S. Anne (Vermilion) – souboj s rivalem (povinně manuál). Po výhře dá HM Cut
  // (viz battleSystem.finishTrainerBattle → story.hasCut). Přepneme na Battle tab.
  overlay.querySelector("[data-ss-anne-battle]")?.addEventListener("click", () => {
    close();
    startTrainerBattle("rival-ss-anne", { forceManual: true });
    openMainTab("battle");
  });
}
