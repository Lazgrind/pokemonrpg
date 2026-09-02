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
