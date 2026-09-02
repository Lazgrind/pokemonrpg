/**
 * pokedexView.js – záložka „Pokédex" v levém panelu (nahradila Kolekci).
 *
 * Ukazuje všechny druhy řazené podle dexNo se stavem chyceno/viděno/neznámý,
 * ukazatelem „chyceno X / z Y", hledáním a filtry. Chycené druhy nesou akci
 * přidání do týmu (do doby, než ji převezme Karta Pokémona). Prázdná kolekce =
 * výběr startéra (přesunuto sem z bývalé Kolekce).
 *
 * Pozn.: levý panel se překresluje na každou změnu stavu (i v souboji), proto
 * si po re-renderu obnovujeme fokus/caret ve vyhledávání a scroll mřížky.
 */

import { POKEMON_SPECIES, getSpecies, STARTER_IDS } from "../../data/pokemon.js";
import { getState } from "../core/state.js";
import { dexStatus, dexCounts } from "../systems/pokedex.js";
import { addToTeam, isInTeam, chooseStarter } from "../systems/team.js";
import { pokemonEngagement } from "../systems/buildingSystem.js";
import { spriteImg, silhouetteHtml } from "./sprites.js";
import { openPokemonCard } from "./pokemonCard.js";
import { genderSymbolHtml } from "./gender.js";
import { saveScroll, restoreScroll } from "./scrollPreserve.js";

// Startéři jsou jeden zdroj pravdy v datech (STARTER_IDS).

// Stav filtrů přežívá překreslení (modulové proměnné, jako activeTab v leftPanel).
let query = "";
/** @type {"all"|"caught"|"seen"|"missing"} */
let statusFilter = "all";
let typeSet = new Set();
let filtersOpen = false;

/** Escapuje uvozovky do hodnoty atributu. */
function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}

/** Formátované dex číslo, např. #001. */
function dexNoLabel(n) {
  return `#${String(n).padStart(3, "0")}`;
}

/** Vlastněný jedinec daného druhu (nebo null). */
function ownedOf(speciesId) {
  return getState().collection.find((p) => p.speciesId === speciesId) ?? null;
}

/** Akce v patičce karty chyceného druhu (přidat do týmu / stav). */
function caughtAction(speciesId) {
  const owned = ownedOf(speciesId);
  if (!owned) return "";
  if (isInTeam(owned.uid)) return `<span class="dex-tag team">✓ Team</span>`;
  const eng = pokemonEngagement(owned.uid);
  if (eng === "day-care") return `<span class="dex-tag">Day Care</span>`;
  if (eng === "breeding") return `<span class="dex-tag">Breeding</span>`;
  return `<button class="btn dex-add" data-add="${owned.uid}">＋ Team</button>`;
}

/** HTML jedné karty druhu, nebo "" když neprojde filtry. */
function cardHtml(sp) {
  const st = dexStatus(sp.id); // caught | seen | unseen

  // Filtr stavu.
  if (statusFilter === "caught" && st !== "caught") return "";
  if (statusFilter === "seen" && st !== "seen") return "";
  if (statusFilter === "missing" && st !== "unseen") return "";

  // Filtr typu.
  if (typeSet.size && !sp.types.some((t) => typeSet.has(t))) return "";

  // Hledání: podle jména (jen u objevených, ať se neprozrazují neznámí) nebo dex čísla.
  const q = query.trim().toLowerCase();
  if (q) {
    const known = st !== "unseen";
    const matchName = known && sp.name.toLowerCase().includes(q);
    const matchNo = dexNoLabel(sp.dexNo).includes(q) || String(sp.dexNo).includes(q);
    if (!matchName && !matchNo) return "";
  }

  const no = dexNoLabel(sp.dexNo);

  if (st === "unseen") {
    return `<div class="dex-card" data-id="${sp.id}" data-status="unseen">
      <span class="dex-no">${no}</span>
      ${silhouetteHtml()}
      <span class="dex-name">???</span>
    </div>`;
  }

  if (st === "seen") {
    return `<div class="dex-card" data-id="${sp.id}" data-status="seen">
      <span class="dex-no">${no}</span>
      ${silhouetteHtml()}
      <span class="dex-name">${sp.name}</span>
      <span class="dex-tag">Seen</span>
    </div>`;
  }

  // caught
  const owned = ownedOf(sp.id);
  const name = `${owned?.shiny ? "✨ " : ""}${sp.name}`;
  return `<div class="dex-card" data-id="${sp.id}" data-status="caught">
    <span class="dex-no">${no}</span>
    ${spriteImg(sp.id, { shiny: !!owned?.shiny, gender: owned?.gender, alt: sp.name })}
    <span class="dex-name">${name} ${genderSymbolHtml(owned?.gender)}</span>
    <div class="dex-foot">${caughtAction(sp.id)}</div>
  </div>`;
}

/** Výběr startovního Pokémona (prázdná kolekce). */
function renderStarterPicker(root, onStatus) {
  root.innerHTML = `
    <h2 class="panel-title">Starter Pokémon</h2>
    <p class="placeholder">Choose your first Pokémon:</p>
    ${STARTER_IDS.map((id) => {
      const sp = getSpecies(id);
      return `<button class="btn starter" data-starter="${id}">
                <strong>${sp.name}</strong>
                <span class="placeholder">(${sp.types.join("/")})</span>
              </button>`;
    }).join("")}
  `;
  root.querySelectorAll("[data-starter]").forEach((b) =>
    b.addEventListener("click", () => {
      chooseStarter(b.dataset.starter);
      onStatus("You got your first Pokémon!");
    })
  );
}

/**
 * Vykreslí záložku Pokédex.
 * @param {HTMLElement} root
 * @param {(msg: string) => void} onStatus
 */
export function renderPokedexTab(root, onStatus = () => {}) {
  const s = getState();

  // Prázdná kolekce → výběr startéra.
  if (s.collection.length === 0) {
    renderStarterPicker(root, onStatus);
    return;
  }

  // Zachytit UI stav z předchozího renderu (levý panel se překresluje často).
  const prevSearch = root.querySelector("#dex-search");
  const searchFocused = !!prevSearch && document.activeElement === prevSearch;
  const caret = prevSearch ? prevSearch.selectionStart : null;
  const prevGrid = root.querySelector(".dex-grid");
  const scrollTop = prevGrid ? prevGrid.scrollTop : 0;

  const { caught, total } = dexCounts();
  const allTypes = [...new Set(POKEMON_SPECIES.flatMap((sp) => sp.types))].sort();
  const species = [...POKEMON_SPECIES].sort((a, b) => a.dexNo - b.dexNo);
  const cards = species.map(cardHtml).filter(Boolean);

  const statusChip = (val, label) =>
    `<button class="filter-chip ${statusFilter === val ? "active" : ""}" data-fstatus="${val}">${label}</button>`;

  const _savedScroll = saveScroll(root);
  root.innerHTML = `
    <h2 class="panel-title">Pokédex <span class="dex-count">${caught} / ${total}</span></h2>
    <button class="btn filter-toggle ${filtersOpen ? "active" : ""}" id="dex-filter-toggle">🔎 Filters</button>
    <div class="filter-bar" id="dex-filter-bar" ${filtersOpen ? "" : "hidden"}>
      <div class="filter-row">
        <input type="search" id="dex-search" class="daycare-search"
          placeholder="Search name or #no" value="${escapeAttr(query)}">
      </div>
      <div class="filter-row">
        <span class="filter-label">Show</span>
        ${statusChip("all", "All")}${statusChip("caught", "Caught")}${statusChip("seen", "Seen")}${statusChip("missing", "Missing")}
      </div>
      <div class="filter-row">
        <span class="filter-label">Type</span>
        ${allTypes
          .map((t) => `<button class="filter-chip ${typeSet.has(t) ? "active" : ""}" data-type="${t}">${t}</button>`)
          .join("")}
      </div>
    </div>
    <div class="dex-grid">
      ${cards.length ? cards.join("") : `<p class="placeholder">No Pokémon match the filters.</p>`}
    </div>
  `;
  restoreScroll(root, _savedScroll);

  root.querySelector("#dex-filter-toggle").addEventListener("click", () => {
    filtersOpen = !filtersOpen;
    renderPokedexTab(root, onStatus);
  });
  const search = root.querySelector("#dex-search");
  search.addEventListener("input", () => {
    query = search.value;
    renderPokedexTab(root, onStatus);
  });
  root.querySelectorAll("[data-fstatus]").forEach((b) =>
    b.addEventListener("click", () => {
      statusFilter = /** @type {any} */ (b.dataset.fstatus);
      renderPokedexTab(root, onStatus);
    })
  );
  root.querySelectorAll("[data-type]").forEach((b) =>
    b.addEventListener("click", () => {
      const t = b.dataset.type;
      if (typeSet.has(t)) typeSet.delete(t);
      else typeSet.add(t);
      renderPokedexTab(root, onStatus);
    })
  );
  root.querySelectorAll("[data-add]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation(); // ať se zároveň neotevře karta
      const ok = addToTeam(b.dataset.add);
      onStatus(ok ? "Added to team" : "Team is full (max 6)");
    })
  );

  // Klik na kartu druhu → karta Pokémona (chycený jedinec / viděný druh).
  // Neznámé druhy kartu neotevírají (ještě je neznáme).
  root.querySelectorAll(".dex-card").forEach((card) =>
    card.addEventListener("click", (e) => {
      if (e.target.closest("button")) return; // akce v patičce mají přednost
      const id = card.dataset.id;
      if (card.dataset.status === "caught") {
        const owned = ownedOf(id);
        if (owned) openPokemonCard({ uid: owned.uid });
      } else if (card.dataset.status === "seen") {
        openPokemonCard({ speciesId: id });
      }
    })
  );

  // Obnovit scroll a fokus/caret vyhledávání po re-renderu.
  const grid = root.querySelector(".dex-grid");
  if (grid) grid.scrollTop = scrollTop;
  if (searchFocused) {
    const el = root.querySelector("#dex-search");
    if (el) {
      el.focus();
      if (caret != null) el.setSelectionRange(caret, caret);
    }
  }
}
