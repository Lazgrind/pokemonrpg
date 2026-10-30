"""
gen_odkazy.py – z docs/SPRITES-TODO-GEN<N>.md vygeneruje soubor na odkazy obrázků
docs/gen<N>_odkazy.txt (formát pro tools/dl_web.py, viz CLAUDE.md „Obrázky z odkazů").

Formát výstupu:
  ## gym-leaders          ← druh obrázku = cílová složka assets/gen<N>/<typ>/
  # falkner               ← id ze hry
  Violet City (…)         ← popis (řádek bez http se při stahování ignoruje)
  https://…               ← sem vlož odkaz(y) na obrázek

Bere jen NEHOTOVÉ řádky (`- [ ]`). Když soubor už existuje, odkazy, které v něm
autor vyplnil, se ZACHOVAJÍ (lze pouštět opakovaně po úpravě TODO).

Použití:  python tools/gen_odkazy.py            (Gen 2)
          python tools/gen_odkazy.py --gen 3
"""

import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

# Nadpis sekce v TODO (začátek po čísle) → typ = složka v assets/gen<N>/.
SECTION_TYPES = [
    ("gym lead", "gym-leaders"),
    ("elite four", "gym-leaders"),
    ("odznaky", "badges"),
    ("budovy", "buildings"),
    ("npc", "npc"),
    ("třídy trenérů", "trainers"),
]
TYPE_ORDER = ["gym-leaders", "badges", "buildings", "npc", "trainers"]


def section_type(title):
    t = title.lower()
    for key, typ in SECTION_TYPES:
        if key in t:
            return typ
    return None


def parse_todo(path):
    """[(typ, id, popis)] z nehotových řádků `- [ ] `id`, `id2` — popis`."""
    items, typ = [], None
    for line in open(path, encoding="utf-8"):
        if line.startswith("## "):
            typ = section_type(re.sub(r"^##\s*\d*\.?\s*", "", line))
            continue
        m = re.match(r"\s*- \[ \] (.+)", line)
        if not (typ and m):
            continue
        body = m.group(1)
        ids = re.findall(r"`([a-z0-9-]+)`", body.split(" — ")[0])
        desc = body.split(" — ", 1)[1].strip() if " — " in body else ""
        for i in ids:
            items.append((typ, i, desc))
    return items


def existing_urls(path):
    """{(typ, id): [url, …]} z už vyplněného souboru odkazů."""
    out, typ, cur = {}, None, None
    if not os.path.exists(path):
        return out
    for line in open(path, encoding="utf-8"):
        t = line.strip()
        if t.startswith("## "):
            typ, cur = t[3:].strip(), None
        elif t.startswith("# "):
            cur = (typ, t[2:].strip())
        elif t.lower().startswith("http") and cur:
            out.setdefault(cur, []).append(t)
    return out


def main():
    gen = int(sys.argv[sys.argv.index("--gen") + 1]) if "--gen" in sys.argv else 2
    todo = os.path.join(ROOT, "docs", f"SPRITES-TODO-GEN{gen}.md")
    out = os.path.join(ROOT, "docs", f"gen{gen}_odkazy.txt")
    items = parse_todo(todo)
    keep = existing_urls(out)

    lines = [
        f"Odkazy na obrázky Gen {gen} – vygenerováno z docs/SPRITES-TODO-GEN{gen}.md (tools/gen_odkazy.py).",
        "Pod každé `# id` vlož odkaz(y) na obrázek. Stáhnout: python tools/dl_web.py " + f"docs/gen{gen}_odkazy.txt",
        "",
    ]
    filled = 0
    for typ in TYPE_ORDER:
        group = [(i, d) for t, i, d in items if t == typ]
        if not group:
            continue
        lines.append(f"## {typ}")
        for sid, desc in group:
            lines.append(f"# {sid}")
            if desc:
                lines.append(desc)
            urls = keep.get((typ, sid), [])
            filled += bool(urls)
            lines.extend(urls)
            lines.append("")
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))
    print(f"Zapsáno docs/gen{gen}_odkazy.txt: {len(items)} položek, {filled} s odkazy.")


if __name__ == "__main__":
    main()
