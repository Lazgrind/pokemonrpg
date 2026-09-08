/**
 * popup.js – jednoduché znovupoužitelné vyskakovací (modální) okno.
 *
 * Pro krátká příběhová/informační sdělení (např. „koukni na tuhle budovu",
 * clerk tě prosí o doručení balíčku…). NIKDY nedáváme takový text pod mapu –
 * vždy sem, do samostatného okna. Zavření: tlačítko OK, ✕, klik mimo obsah
 * nebo Esc. Callback `onOk` se volá při potvrzení (OK), ne při pouhém zavření.
 */

/** Je právě otevřený nějaký popup? (držíme max jeden naráz.) */
let openPopup = false;

/**
 * Zobrazí modální okno s textem a potvrzovacím tlačítkem.
 * @param {Object} opts
 * @param {string} opts.title        nadpis okna
 * @param {string} opts.body         HTML těla (klidně víc <p class="story-text">…)
 * @param {string} [opts.okLabel]    popisek potvrzovacího tlačítka (default "OK")
 * @param {() => void} [opts.onOk]   callback při potvrzení
 * @param {boolean} [opts.dismissible] lze zavřít bez potvrzení? (default true)
 * @param {{ label: string, onPick?: () => void }[]} [opts.choices]
 *        volitelná tlačítka volby (např. Helix vs Dome fosílie). Když jsou
 *        zadaná, nahradí jediné OK tlačítko – klik zavře a zavolá `onPick`.
 */
export function showPopup({ title, body, okLabel = "OK", onOk, dismissible = true, choices = null }) {
  if (openPopup) return;
  openPopup = true;

  const hasChoices = Array.isArray(choices) && choices.length > 0;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    openPopup = false;
    document.removeEventListener("keydown", onKey);
  };

  const confirm = () => {
    close();
    onOk?.();
  };

  const actionsHtml = hasChoices
    ? choices.map((c, i) => `<button class="btn" data-choice="${i}">${c.label}</button>`).join("")
    : `<button class="btn" data-ok>${okLabel}</button>`;

  overlay.innerHTML = `
    <div class="modal story-modal popup-modal">
      ${dismissible ? `<button class="modal-close" data-close aria-label="Close">✕</button>` : ""}
      <h2 class="panel-title">${title}</h2>
      ${body}
      <div class="popup-actions">${actionsHtml}</div>
    </div>
  `;

  if (hasChoices) {
    overlay.querySelectorAll("[data-choice]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.choice);
        close();
        choices[idx]?.onPick?.();
      });
    });
  } else {
    overlay.querySelector("[data-ok]")?.addEventListener("click", confirm);
  }
  overlay.querySelector("[data-close]")?.addEventListener("click", close);

  // Klik mimo obsah = zavřít (jen když je okno dismissible).
  if (dismissible) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
  }

  function onKey(e) {
    if (e.key === "Escape" && dismissible) close();
    // Enter potvrzuje jen u jednoduchého OK okna; u voleb si musí hráč kliknout.
    else if (e.key === "Enter" && !hasChoices) confirm();
  }
  document.addEventListener("keydown", onKey);
}
