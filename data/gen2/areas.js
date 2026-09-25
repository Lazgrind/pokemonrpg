/**
 * DATA: oblasti (uzly mapy) generace 2 – Johto. Zatím PLACEHOLDER: jen první
 * město New Bark Town (bez soubojů) jako záchytný bod po připlutí ze S.S. Anne.
 * Sem přibývají další Johto uzly. Formát viz typedef Area v ../areas.js.
 *
 * Pozn.: dokud gen2/index.js nemá mapImage (assets/gen2/map/johto.webp ještě není),
 * mapView vykreslí uzly nad barevným „placeholder" plátnem – viz mapView.js.
 */

export const AREAS_GEN2 = [
  {
    id: "new-bark-town",
    name: "New Bark Town",
    type: "city",
    region: "Johto",
    order: 0,
    // Pozice na placeholder plátně (% šířky/výšky). Doladí se, až bude mapa Johta.
    x: 50,
    y: 55,
    unlock: { start: true }, // vždy dostupné, jakmile je hráč v Johtu
    recommendedLevel: 5,
    description:
      "The town where the winds of new beginnings blow. Prof. Elm's Lab stands here — the start of your Johto journey.",
    species: [], // zatím žádní divocí Pokémoni (placeholder město)
    drops: [],
  },
];
