/**
 * DATA: typy KANTO (generace 1) – jak byly v Red/Blue/Yellow.
 * chart   = tabulka účinnosti (útočící → { bránící: násobek }, jen odchylky od 1);
 *           obsahuje jen typy, které v generaci 1 existují.
 * species = typy Pokémonů, které se v této generaci LIŠÍ od data/genN/pokemon.js.
 * moves   = typy útoků, které se LIŠÍ od data/moves.js (null = útok bez typu „???").
 * Používá je jedinec chycený v Kanto a souboj v Kanto (viz ../types.js).
 * Generováno: tools/fetch_classic_types.py → tools/convert_classic_types.py. Ručně needitovat.
 */
export const TYPES_GEN1 = {
  chart: {
    Normal: { Rock: 0.5, Ghost: 0 },
    Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5 },
    Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
    Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
    Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5 },
    Ice: { Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2 },
    Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0 },
    Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Bug: 2, Rock: 0.5, Ghost: 0.5 },
    Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2 },
    Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5 },
    Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5 },
    Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 2, Flying: 0.5, Psychic: 2, Ghost: 0.5 },
    Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2 },
    Ghost: { Normal: 0, Psychic: 0, Ghost: 2 },
    Dragon: { Dragon: 2 },
  },
  species: {
    clefairy: ["Normal"],
    clefable: ["Normal"],
    jigglypuff: ["Normal"],
    wigglytuff: ["Normal"],
    magnemite: ["Electric"],
    magneton: ["Electric"],
    "mr-mime": ["Psychic"],
  },
  moves: {
    bite: "Normal",
    charm: "Normal",
    curse: null,
    gust: "Normal",
    "karate-chop": "Normal",
    moonlight: "Normal",
    "sand-attack": "Normal",
    "sweet-kiss": "Normal",
  },
};
