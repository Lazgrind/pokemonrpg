/**
 * DATA: typy JOHTO (generace 2) – jak byly v Gold/Silver/Crystal.
 * chart   = tabulka účinnosti (útočící → { bránící: násobek }, jen odchylky od 1);
 *           obsahuje jen typy, které v generaci 2 existují.
 * species = typy Pokémonů, které se v této generaci LIŠÍ od data/genN/pokemon.js.
 * moves   = typy útoků, které se LIŠÍ od data/moves.js (null = útok bez typu „???").
 * Používá je jedinec chycený v Johto a souboj v Johto (viz ../types.js).
 * Generováno: tools/fetch_classic_types.py → tools/convert_classic_types.py. Ručně needitovat.
 */
export const TYPES_GEN2 = {
  chart: {
    Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
    Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
    Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
    Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
    Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
    Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
    Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2 },
    Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0 },
    Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
    Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
    Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
    Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5 },
    Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
    Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5, Steel: 0.5 },
    Dragon: { Dragon: 2, Steel: 0.5 },
    Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Steel: 0.5 },
    Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5 },
  },
  species: {
    clefairy: ["Normal"],
    clefable: ["Normal"],
    jigglypuff: ["Normal"],
    wigglytuff: ["Normal"],
    "mr-mime": ["Psychic"],
    cleffa: ["Normal"],
    igglybuff: ["Normal"],
    togepi: ["Normal"],
    togetic: ["Normal", "Flying"],
    marill: ["Water"],
    azumarill: ["Water"],
    snubbull: ["Normal"],
    granbull: ["Normal"],
  },
  moves: {
    charm: "Normal",
    curse: null,
    moonlight: "Normal",
    "sweet-kiss": "Normal",
  },
};
