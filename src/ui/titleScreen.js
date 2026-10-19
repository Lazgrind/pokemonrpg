/**
 * titleScreen.js – úvodní obrazovka (title screen) jako BRÁNA do hry.
 *
 * Přes celou hru se při načtení položí obrázek `assets/Title_screen.png` se
 * dvěma tlačítky: CONTINUE (vstup do hry) a SETTINGS (otevře sdílené modální
 * nastavení). Herní stav i offline výpočet už proběhly pod overlayem, ale
 * uživateli VIDITELNÉ věci (offline souhrn, výběr startéra) se spustí až po
 * Continue – přes callback `onContinue`.
 */

import { openSettingsModal } from "./settingsView.js";

/**
 * Napojí tlačítka title screenu. Overlay `#title-screen` je v index.html a je
 * viditelný hned po načtení; tudy se vstupuje do hry.
 *
 * Robustní logika: klik KAMKOLI na overlay (kromě settings hotspotu) = CONTINUE
 * → overlay se schová a jednorázově se zavolá `onContinue`. Settings hotspot
 * otevře nastavení a zastaví propagaci, aby hru neodkryl.
 *
 * @param {() => void} [onContinue] callback spuštěný JEDNOU při vstupu do hry
 */
export function initTitleScreen(onContinue) {
  const overlay = document.getElementById("title-screen");
  if (!overlay) return;

  let entered = false;
  const enter = () => {
    if (entered) return; // jen jednou (klik na hotspot i na overlay by jinak volaly dvakrát)
    entered = true;
    overlay.classList.add("hidden");
    // Po doběhnutí fade-out ho vyřadíme z toku (ať nechytá klikání).
    setTimeout(() => {
      overlay.style.display = "none";
    }, 400);
    if (typeof onContinue === "function") onContinue();
  };

  // Settings hotspot: otevře modal + zastaví propagaci na overlay (neodkryje hru).
  const settingsBtn = overlay.querySelector('[data-act="settings"]');
  if (settingsBtn) {
    settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openSettingsModal();
    });
  }

  // Klik kamkoli na overlay (mimo settings) = CONTINUE. Pokrývá i continue
  // hotspot; robustní i kdyby souřadnice hotspotu neseděly.
  overlay.addEventListener("click", (e) => {
    if (e.target !== settingsBtn && !settingsBtn?.contains(e.target)) {
      enter();
    }
  });
}
