/**
 * domReuse.js – přestavba innerHTML BEZ problikávání spritů.
 *
 * Problém: spousta oken se překresluje na každý herní tik (STATE_CHANGED) nebo na
 * BATTLE_UPDATE přes `root.innerHTML = ...`. Tím se ZNIČÍ a znovu vytvoří i sprite
 * `<img>` uzly. Nově vytvořený `<img>` se musí znovu (byť z cache) načíst/dekódovat
 * a mezitím probleskne zástupný „?" glyph → postavy/sprity „blikají". Animované GIFy
 * se navíc restartují.
 *
 * Řešení: uzly označené `data-skey="<stabilní unikátní klíč>"` se před přepisem
 * posbírají a po přepisu vloží zpět na místo čerstvě vygenerovaných dvojníků se
 * stejným klíčem. Uzel tak fyzicky přežije překreslení – žádné nové načtení obrázku,
 * žádný záblesk, GIF běží dál. Vše ostatní (HP bary, texty, tlačítka) se přestaví
 * normálně (text neproblikává).
 *
 * Podmínky správného použití:
 *  - klíč `data-skey` musí být v rámci `root` UNIKÁTNÍ,
 *  - a STABILNÍ: stejný obrázek (druh + pohled + shiny + gender + varianta) musí mít
 *    napříč překresleními pořád stejný klíč. Když se obsah změní (jiný druh), změní
 *    se i klíč → použije se čerstvý uzel (správně se načte nový sprite).
 *
 * Sprite s klíčem se vyrobí přes `spriteImg(id, { ..., dataKey })` (viz sprites.js).
 */

/**
 * Nastaví `root.innerHTML = html`, ale zachová (znovupoužije) všechny uzly s
 * `data-skey`, které v novém HTML mají dvojníka se stejným klíčem.
 * @param {HTMLElement} root
 * @param {string} html
 */
export function setHtmlReuseSprites(root, html) {
  // 1) Posbírej staré klíčované uzly (první výskyt na klíč vyhrává).
  const old = new Map();
  root.querySelectorAll("[data-skey]").forEach((el) => {
    if (!old.has(el.dataset.skey)) old.set(el.dataset.skey, el);
  });

  // 2) Přepiš obsah (staré uzly se odpojí, ale díky Map je držíme = negcéčkují se).
  root.innerHTML = html;
  if (old.size === 0) return;

  // 3) Vlož staré uzly zpět na místo čerstvých dvojníků se stejným klíčem.
  root.querySelectorAll("[data-skey]").forEach((fresh) => {
    const prev = old.get(fresh.dataset.skey);
    if (prev && prev !== fresh) {
      old.delete(fresh.dataset.skey); // každý starý uzel použij max jednou
      fresh.replaceWith(prev);
    }
  });
}
