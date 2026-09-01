/**
 * changelogView.js – okno „Co je nového" (přehled změn po verzích).
 *
 * Zdroj pravdy je jeden: soubor CHANGELOG.md v kořeni projektu. Načteme ho za
 * běhu (fetch) a vykreslíme lehkým převodem Markdownu, ať se seznam změn nemusí
 * udržovat na dvou místech. Funguje lokálně i na GitHub Pages (relativní cesta).
 */

/** Escapuje HTML speciální znaky (bezpečnost při vkládání textu). */
function esc(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Inline Markdown: **tučně** a [odkaz](url). Vstup musí být už escapovaný. */
function inline(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

/**
 * Převede blok řádků (uvnitř jedné verze nebo preambule) na HTML.
 * Podporuje: ### nadpisy, odrážky "- ", prázdné řádky a inline formát.
 * @param {string[]} lines
 * @returns {string}
 */
function renderBlock(lines) {
  const out = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^###\s+/.test(line)) {
      closeList();
      out.push(`<h4>${inline(esc(line.replace(/^###\s+/, "")))}</h4>`);
    } else if (/^#\s+/.test(line)) {
      // (běžně jen titul „# CHANGELOG" v preambuli)
      closeList();
      out.push(`<h2>${inline(esc(line.replace(/^#\s+/, "")))}</h2>`);
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(esc(line.replace(/^[-*]\s+/, "")))}</li>`);
    } else if (line === "") {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(esc(line))}</p>`);
    }
  }
  closeList();
  return out.join("\n");
}

/**
 * Velmi lehký převod našeho CHANGELOG.md na HTML. Každá verze (nadpis "## ") se
 * vykreslí jako sbalitelný blok (<details>), ať se nemusí scrollovat – vidíš
 * seznam verzí a obsah se ukáže až po kliknutí. Všechny verze jsou sbalené
 * (žádná není rozbalená). Text před první verzí (titul + úvod) se vykreslí
 * normálně nahoře.
 * @param {string} md
 * @returns {string}
 */
function renderMarkdown(md) {
  const lines = md.split(/\r?\n/);

  // Rozdělit na preambuli a jednotlivé verze podle nadpisů "## ".
  const preamble = [];
  /** @type {{ title: string, body: string[] }[]} */
  const sections = [];
  let current = null;
  for (const raw of lines) {
    if (/^##\s+/.test(raw)) {
      current = { title: raw.replace(/^##\s+/, "").trimEnd(), body: [] };
      sections.push(current);
    } else if (current) {
      current.body.push(raw);
    } else {
      preamble.push(raw);
    }
  }

  const out = [];
  const pre = renderBlock(preamble).trim();
  if (pre) out.push(pre);

  // Všechny verze jsou sbalené – žádná se nerozbaluje automaticky.
  sections.forEach((s) => {
    const body = renderBlock(s.body).trim();
    const empty = body === "";
    out.push(
      `<details class="changelog-ver">
        <summary>${inline(esc(s.title))}${empty ? ' <span class="cl-empty">(nothing yet)</span>' : ""}</summary>
        <div class="changelog-ver-body">${body}</div>
      </details>`
    );
  });

  return out.join("\n");
}

/** Otevře modal s přehledem změn; obsah načte z CHANGELOG.md. */
export function openChangelog() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal changelog-modal">
      <h2 class="panel-title">What's new</h2>
      <div class="changelog-body"><p class="placeholder">Loading changes…</p></div>
      <button class="btn btn-close" data-act="close">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);

  function close() {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  }
  function onKey(e) {
    if (e.key === "Escape") close();
  }
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('[data-act="close"]').addEventListener("click", close);

  const body = overlay.querySelector(".changelog-body");
  fetch("CHANGELOG.md")
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then((md) => {
      body.innerHTML = renderMarkdown(md);
    })
    .catch((err) => {
      body.innerHTML = `<p class="placeholder">Failed to load the changelog (${esc(String(err.message))}).</p>`;
    });
}
