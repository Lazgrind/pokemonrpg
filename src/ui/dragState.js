/**
 * dragState.js – sdílený stav drag & dropu jedinců napříč panely.
 *
 * PC boxy (pcView) a Tým (teamView) se renderují do RŮZNÝCH DOM kontejnerů, ale
 * jsou v dokumentu naráz, takže se dá táhnout z jednoho do druhého. HTML5
 * dataTransfer se dá číst až při dropu (ne při dragover), proto si „co se táhne"
 * držíme v modulové proměnné – oba panely ji sdílejí importem.
 *
 * `source` říká, ODKUD se táhne ("pc" | "team"), ať cíl ví, jestli má jen
 * přeuspořádat, nebo přesunout mezi týmem a boxem.
 */

/** @type {{ uid: string|null, source: "pc"|"team"|null }} */
export const dragState = { uid: null, source: null };

/** Začátek tažení jedince. */
export function beginDrag(uid, source) {
  dragState.uid = uid;
  dragState.source = source;
}

/** Konec tažení (drop i zrušení). */
export function endDrag() {
  dragState.uid = null;
  dragState.source = null;
}
