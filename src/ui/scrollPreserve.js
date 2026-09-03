/**
 * Sdílené helpery pro zachování scroll pozice napříč přepsáním `innerHTML`.
 *
 * PROČ: modaly i panely překreslují svůj obsah přes `el.innerHTML = ...` při
 * každém `STATE_CHANGED` (např. když idle tick přičte zlato). Tím se scrollovací
 * kontejnery resetují nahoru a UI „skáče". Scroll přitom NEbývá na vnějším
 * `.modal`/rootu (ten často nemá overflow), ale na VNITŘNÍCH kontejnerech
 * (`.ball-shop`, `.upgrade-list`, `.bag-list`, `.mon-card-body`, `.dex-grid`…).
 *
 * Proto ukládáme scrollTop VŠECH odscrollovaných potomků (klíč = jejich
 * `className`) a po přepsání je podle třídy obnovíme. Ukládáme jen ty se
 * scrollTop > 0, takže na nescrollovaný obsah nemá helper žádný vliv.
 */

/**
 * Uloží scroll pozice všech odscrollovaných elementů uvnitř `root`.
 * @param {HTMLElement} root  kontejner, jehož innerHTML se chystáme přepsat
 * @returns {Array<[string, number]>} páry [className, scrollTop]
 */
export function saveScroll(root) {
  const saved = [];
  if (!root) return saved;
  // Pozor: scrollovací element může být SÁM root (např. `.mon-card-body`),
  // nejen jeho potomci – proto kontrolujeme i root.
  const check = (el) => {
    if (el.scrollTop > 0 && typeof el.className === "string" && el.className) {
      saved.push([el.className, el.scrollTop]);
    }
  };
  check(root);
  root.querySelectorAll("*").forEach(check);
  return saved;
}

/**
 * Obnoví scroll pozice uložené přes {@link saveScroll} (po přepsání innerHTML).
 * @param {HTMLElement} root
 * @param {Array<[string, number]>} saved
 */
export function restoreScroll(root, saved) {
  if (!root || !saved) return;
  for (const [cls, top] of saved) {
    const sel = "." + cls.trim().split(/\s+/).join(".");
    let el = null;
    try {
      // Root může být sám scrollovací element – zkontroluj ho dřív než potomky.
      if (root.matches && root.matches(sel)) el = root;
      else el = root.querySelector(sel);
    } catch {
      el = null; // neplatný selektor (nečekaná třída) – tiše přeskoč
    }
    if (el) el.scrollTop = top;
  }
}

/* -------------------------------------------------------------------------- *
 * Odložení překreslení během aktivního scrollování
 * -------------------------------------------------------------------------- *
 * PROČ: každý idle tik (1×/s) překreslí obsah oken/panelů přes `innerHTML`.
 * Když to padne DOPROSTŘED scrollu kolečkem, prohlížeč probíhající scroll
 * přeruší – element, na kterém kolečko „jede", se zničí a nahradí novým.
 * Uživatel to vnímá jako zásek: musí pustit kolečko a scrollovat znovu.
 * `restoreScroll` sice vrátí pozici, ale rozjetý scroll už neobnoví.
 *
 * Řešení: dokud uživatel scrolluje, překreslení NEprovádíme – jen si ho
 * poznamenáme a naplánujeme jediný „flush", jakmile se scroll na chvíli
 * uklidní. Víc ticků během scrollu se tak sloučí do jednoho překreslení.
 * Živé prvky (progress bary, počítadla) na okamžik „zamrznou", ale plynulý
 * scroll má přednost – po zastavení kolečka se vše dorovná.
 */

/** Časové razítko posledního scroll/wheel eventu (ms). */
let _lastScrollTs = 0;
/** Jak dlouho po posledním scroll eventu ho ještě považujeme za „aktivní". */
const SCROLL_IDLE_MS = 200;

if (typeof window !== "undefined") {
  const mark = () => { _lastScrollTs = Date.now(); };
  // capture + passive: zachytíme scroll na LIBOVOLNÉM vnitřním kontejneru
  // (scroll nebublá), aniž bychom samotný scroll jakkoli blokovali.
  const opts = { capture: true, passive: true };
  window.addEventListener("wheel", mark, opts);
  window.addEventListener("scroll", mark, opts);
  window.addEventListener("touchmove", mark, opts);
}

/** @returns {boolean} true, když uživatel právě (< SCROLL_IDLE_MS) scrolloval. */
export function isScrolling() {
  return Date.now() - _lastScrollTs < SCROLL_IDLE_MS;
}

/**
 * Obalí render callback tak, aby se NEprovedl během aktivního scrollování.
 * Vrací funkci vhodnou přímo do `bus.on(STATE_CHANGED, ...)`. Přijde-li
 * překreslení během scrollu, jen se poznamená a naplánuje jediný flush po
 * uklidnění scrollu (coalescing: víc ticků → jedno překreslení). Přímá volání
 * `render()` po akci uživatele obalovat NETŘEBA – ta mají proběhnout hned.
 * @param {() => void} renderFn
 * @returns {() => void}
 */
export function scrollAware(renderFn) {
  let pending = false;
  let timer = null;
  const flush = () => {
    timer = null;
    if (!pending) return;
    if (isScrolling()) { schedule(); return; } // pořád scrolluje → počkej dál
    pending = false;
    renderFn();
  };
  const schedule = () => {
    if (timer == null) timer = setTimeout(flush, SCROLL_IDLE_MS);
  };
  return () => {
    if (isScrolling()) { pending = true; schedule(); return; }
    renderFn();
  };
}
