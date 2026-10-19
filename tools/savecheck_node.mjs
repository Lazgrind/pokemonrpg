/**
 * savecheck_node.mjs – spustí testy savů (savecheck.js) v Node.
 *
 * Node nemá localStorage → náhrada se stejným API a limitem místa jako
 * prohlížeč (~5 M znaků na origin, QuotaExceededError), ať jde otestovat
 * i uvolňování místa mazáním záloh. Spouští tools/savecheck.py.
 */

const QUOTA_CHARS = 5_000_000;

class MemoryStorage {
  #map = new Map();
  #used = 0;
  get length() { return this.#map.size; }
  key(i) { return [...this.#map.keys()][i] ?? null; }
  getItem(k) { return this.#map.has(String(k)) ? this.#map.get(String(k)) : null; }
  setItem(k, v) {
    k = String(k); v = String(v);
    const delta = (k.length + v.length) - (this.#map.has(k) ? k.length + this.#map.get(k).length : 0);
    if (this.#used + delta > QUOTA_CHARS) throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    this.#map.set(k, v);
    this.#used += delta;
  }
  removeItem(k) {
    k = String(k);
    if (this.#map.has(k)) { this.#used -= k.length + this.#map.get(k).length; this.#map.delete(k); }
  }
  clear() { this.#map.clear(); this.#used = 0; }
}

globalThis.localStorage = new MemoryStorage();

const { runSaveChecks } = await import("./savecheck.js");
const { lines, fails } = await runSaveChecks();
console.log(lines.join("\n"));
process.exit(fails ? 1 : 0);
