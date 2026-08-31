/**
 * events.js – minimální event sběrnice (pub/sub).
 *
 * Slouží k oddělení herní logiky od UI: systémy emitují události,
 * UI na ně reaguje, aniž by se navzájem přímo znaly.
 */

function createEventBus() {
  /** @type {Map<string, Set<Function>>} */
  const listeners = new Map();

  return {
    /**
     * Přihlásí posluchače. Vrací funkci pro odhlášení.
     * @param {string} event
     * @param {Function} callback
     * @returns {() => void}
     */
    on(event, callback) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(callback);
      return () => listeners.get(event)?.delete(callback);
    },

    /**
     * Vyvolá událost s volitelnými daty.
     * @param {string} event
     * @param {*} [payload]
     */
    emit(event, payload) {
      listeners.get(event)?.forEach((cb) => cb(payload));
    },
  };
}

/** Sdílená instance sběrnice pro celou hru. */
export const bus = createEventBus();

/** Názvy událostí na jednom místě, ať se nepřepisují stringy. */
export const EVENTS = {
  STATE_CHANGED: "state:changed",
  BATTLE_UPDATE: "battle:update",
};
