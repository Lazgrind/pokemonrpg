/**
 * DATA: Unown formy (gen2 / Ruins of Alph).
 *
 * Unown je v národním Pokédexu JEN JEDNOU (#201) – jednotlivé formy NEJSOU
 * samostatné druhy a neřeší se přes kolekci (platí R-018: 1 kus/druh). Místo toho
 * má Unown vlastní sběratelský tracker (state.unownForms), který žije MIMO dex:
 * hráč v Ruins of Alph postupně nachytá všech 26 písmen (A–Z).
 *
 * Forma je NÁHODNÁ, ale VIDITELNÁ: při spawnu divokého Unowna se vylosuje forma
 * (`rollUnownForm` – rovnoměrně ze všech 26, viz src/systems/unownSystem.js),
 * encounter i chytací okno ji ukážou („Unown (A)") a chytíš PŘESNĚ tu viditelnou
 * formu. Tracker tedy zaznamená konkrétní vylosované písmeno – kompletace abecedy
 * závisí na RNG spawnů (žádné deterministické A→Z pořadí), ale hráč aspoň vidí,
 * co zrovna loví, takže cíleně dochytává chybějící formy.
 *
 * Pozn.: vykřičník „!" a otazník „?" přišly až v gen3 (FRLG/Emerald); pro Johto
 * je kánon 26 forem. Až přijde gen3, stačí sem doplnit "!" a "?" – tracker i UI
 * je pobere automaticky (počítají z UNOWN_FORMS.length).
 */

/** Oblast, kde se Unown formy chytají (gatuje záznam do trackeru). */
export const UNOWN_RUINS_AREA_ID = "ruins-of-alph";

/** Druh, jehož formy tracker sleduje (#201). */
export const UNOWN_SPECIES_ID = "unown";

/** Všechny formy Unowna (abecední pořadí = jen pořadí zobrazení v trackeru; losuje se náhodně). */
export const UNOWN_FORMS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
];
