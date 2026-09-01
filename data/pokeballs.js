/**
 * DATA: typy Poké Ballů. Čistá data + jejich herní vlastnosti.
 *
 * Ball je násobitel šance na chycení (klasický princip). Výpočet finální šance
 * a vyhodnocení podmíněných bonusů žije v `src/systems/pokeballSystem.js`.
 * Přidání dalšího ballu = jen přidat objekt sem.
 *
 * Odemykání: `tier` říká, od které úrovně postupu (lokality na mapě) je ball
 * k dispozici v obchodě. `tier: null` = speciální, neprodejný (Master Ball).
 *
 * Bonusy (deklarativní; vyhodnocuje pokeballSystem.ballMultiplier):
 *  - { type:"types", value:string[], mult }  násobek proti daným typům nepřítele
 *  - { type:"lowLevel" }                     tím lepší, čím nižší level nepřítele
 *  - { type:"firstTurn", mult }              násobek v 1. kole souboje
 *  - { type:"timer" }                        roste s počtem kol (max ×4)
 *  - { type:"owned", mult }                  násobek na druh, který už vlastníš
 *  - { type:"levelRatio" }                   bonus dle poměru tvůj/soupeřův level
 *  - { type:"fastSpecies", mult }            násobek na rychlé druhy (base speed ≥ 100)
 *
 * @typedef {Object} Pokeball
 * @property {string} id
 * @property {string} name
 * @property {string} icon
 * @property {number|null} tier   úroveň odemčení (null = neprodejný/speciální)
 * @property {number|null} price  cena v goldu (null = nekupitelný)
 * @property {number} [mult]      základní násobek šance (výchozí 1)
 * @property {boolean} [guaranteed] jistota chycení (Master Ball)
 * @property {object} [bonus]     podmíněný bonus (viz výše)
 * @property {boolean} [comingSoon] rezervováno – sprite existuje, ale mechanika
 *                                  ještě není; ball se NEobjevuje v obchodě ani
 *                                  v souboji (tier:null/price:null to zajistí),
 *                                  jen si drží id → napojený obrázek. Až mechaniku
 *                                  přidáme, stačí doplnit tier/price/bonus.
 * @property {string} desc        krátký popis efektu (do obchodu)
 */

/** @type {Pokeball[]} */
export const POKEBALLS = [
  // --- Tier 1: startovní sada (dostupná od začátku / Route 1) ---
  { id: "poke", name: "Poké Ball", icon: "🔴", tier: 1, price: 20, mult: 1,
    desc: "Standard ball." },
  { id: "great", name: "Great Ball", icon: "🔵", tier: 1, price: 40, mult: 1.5,
    desc: "×1.5 catch rate." },
  { id: "quick", name: "Quick Ball", icon: "⚡", tier: 1, price: 60, mult: 1,
    bonus: { type: "firstTurn", mult: 5 }, desc: "×5 on the first turn." },
  { id: "nest", name: "Nest Ball", icon: "🪺", tier: 1, price: 60, mult: 1,
    bonus: { type: "lowLevel" }, desc: "Better against low-level enemies." },
  { id: "heal", name: "Heal Ball", icon: "💗", tier: 1, price: 30, mult: 1,
    desc: "Cosmetic — caught Pokémon arrive at full HP anyway." },

  // --- Tier 2: odemkne se v pozdější lokalitě ---
  { id: "ultra", name: "Ultra Ball", icon: "🟡", tier: 2, price: 80, mult: 2,
    desc: "×2 catch rate." },
  { id: "net", name: "Net Ball", icon: "🕸️", tier: 2, price: 60, mult: 1,
    bonus: { type: "types", value: ["water", "bug"], mult: 3.5 },
    desc: "×3.5 against Water/Bug types." },
  { id: "repeat", name: "Repeat Ball", icon: "🔁", tier: 2, price: 60, mult: 1,
    bonus: { type: "owned", mult: 3.5 },
    desc: "×3.5 on species you already own (great for IV/shiny hunting)." },
  { id: "timer", name: "Timer Ball", icon: "⏱️", tier: 2, price: 60, mult: 1,
    bonus: { type: "timer" }, desc: "Better the longer the battle lasts (up to ×4)." },

  // --- Tier 3: odemkne se ještě dál ---
  { id: "level", name: "Level Ball", icon: "📊", tier: 3, price: 60, mult: 1,
    bonus: { type: "levelRatio" }, desc: "Better when your Pokémon out-levels the enemy." },
  { id: "fast", name: "Fast Ball", icon: "💨", tier: 3, price: 60, mult: 1,
    bonus: { type: "fastSpecies", mult: 4 }, desc: "×4 on fast species (base speed ≥ 100)." },
  { id: "luxury", name: "Luxury Ball", icon: "🎀", tier: 3, price: 60, mult: 1,
    desc: "Cosmetic — friendship isn't implemented yet." },

  // --- Speciální: neprodejný, jistota chycení ---
  { id: "master", name: "Master Ball", icon: "🟣", tier: null, price: null, guaranteed: true,
    desc: "Never fails. Not for sale — a reward for reaching milestones." },

  // --- Rezervováno na budoucnost (comingSoon) ---------------------------------
  // Sprity už máme v assets/pokeballs/<id>-ball.png. Tyhle bally se zatím NIKDE
  // neukazují (tier:null + price:null → mimo obchod; nedají se vlastnit → mimo
  // souboj). Až doděláme příslušnou mechaniku, ballu se doplní tier/price/bonus
  // a přesune se nahoru mezi prodejné. `desc` drží zamýšlený efekt.
  { id: "premier", name: "Premier Ball", icon: "⚪", tier: null, price: null, mult: 1, comingSoon: true,
    desc: "Coming soon — kosmetický ball (odměna za hromadný nákup)." },
  { id: "friend", name: "Friend Ball", icon: "💚", tier: null, price: null, mult: 1, comingSoon: true,
    desc: "Coming soon — zvýší friendship chyceného Pokémona." },
  { id: "love", name: "Love Ball", icon: "💞", tier: null, price: null, mult: 1, comingSoon: true,
    desc: "Coming soon — bonus proti opačnému pohlaví druhu, který už vlastníš." },
  { id: "heavy", name: "Heavy Ball", icon: "🏋️", tier: null, price: null, mult: 1, comingSoon: true,
    desc: "Coming soon — bonus na těžké druhy (hmotnost)." },
  { id: "lure", name: "Lure Ball", icon: "🎣", tier: null, price: null, mult: 1, comingSoon: true,
    desc: "Coming soon — bonus při rybaření." },
  { id: "moon", name: "Moon Ball", icon: "🌙", tier: null, price: null, mult: 1, comingSoon: true,
    desc: "Coming soon — bonus na druhy vyvíjené Měsíčním kamenem." },
  { id: "dusk", name: "Dusk Ball", icon: "🌑", tier: null, price: null, mult: 1, comingSoon: true,
    desc: "Coming soon — bonus v noci a v jeskyních." },
  { id: "dive", name: "Dive Ball", icon: "🌊", tier: null, price: null, mult: 1, comingSoon: true,
    desc: "Coming soon — bonus v podvodních oblastech." },
  { id: "dream", name: "Dream Ball", icon: "💤", tier: null, price: null, mult: 1, comingSoon: true,
    desc: "Coming soon — bonus proti spícím / se stavovým postižením." },
  { id: "safari", name: "Safari Ball", icon: "🌴", tier: null, price: null, mult: 1, comingSoon: true,
    desc: "Coming soon — event ball do Safari zóny." },
  { id: "sport", name: "Sport Ball", icon: "🐛", tier: null, price: null, mult: 1, comingSoon: true,
    desc: "Coming soon — event ball do Bug-Catching soutěže." },
  { id: "park", name: "Park Ball", icon: "🏞️", tier: null, price: null, mult: 1, comingSoon: true,
    desc: "Coming soon — event/přenosový ball." },
  { id: "cherish", name: "Cherish Ball", icon: "🎁", tier: null, price: null, mult: 1, comingSoon: true,
    desc: "Coming soon — speciální event / dárkový ball." },
];

/** Rychlé vyhledání ballu podle id. */
const BALL_BY_ID = new Map(POKEBALLS.map((b) => [b.id, b]));

/**
 * Vrátí definici ballu podle id (nebo undefined).
 * @param {string} id
 * @returns {Pokeball | undefined}
 */
export function getPokeball(id) {
  return BALL_BY_ID.get(id);
}
