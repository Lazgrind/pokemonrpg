"""Staticky projde celý ES-module graf od vstupního bodu (src/main.js) a overi,
ze KAZDA relativni import cesta vede na existujici soubor na disku.

Rozbita import cesta = bila obrazovka v prohlizeci (modul se nenacte). Protoze
`node` tu neni, tohle je jedina moznost, jak odchytit "nenacte se" bez brauzeru.

Navic: posbira vsechny named importy a overi, ze cilovy modul dany nazev
skutecne exportuje (hledá `export ... <name>` / `export { ... name ... }`).
Reexport pres `export * from` se bere jako wildcard (nekontroluje se).

Usage: python tools/importcheck.py [vstup]   (default src/main.js)
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRY = sys.argv[1] if len(sys.argv) > 1 else "src/main.js"

# import ... from "X"  |  export ... from "X"  |  import "X"  |  import("X")
IMPORT_RE = re.compile(
    r"""(?:^|[\s;{(])import\s+(?:(?P<names>[^'"]*?)\s+from\s+)?['"](?P<path1>[^'"]+)['"]"""
    r"""|export\s+(?P<exnames>[^'"]*?)\s+from\s+['"](?P<path2>[^'"]+)['"]"""
    r"""|import\(\s*['"](?P<path3>[^'"]+)['"]\s*\)""",
    re.MULTILINE,
)

visited = set()
errors = []
warn = []


def strip_comments(s):
    # hrube odstraneni // a /* */ aby regex nechytal zakomentovane importy
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.DOTALL)
    s = re.sub(r"(?m)//.*$", "", s)
    return s


def resolve(base_dir, spec):
    if not spec.startswith("."):
        return None  # bare import (knihovna / URL) – ignoruj
    p = os.path.normpath(os.path.join(base_dir, spec))
    if os.path.isfile(p):
        return p
    for ext in (".js", ".mjs"):
        if os.path.isfile(p + ext):
            return p + ext
    if os.path.isdir(p):
        for idx in ("index.js", "index.mjs"):
            cand = os.path.join(p, idx)
            if os.path.isfile(cand):
                return cand
    return False  # nenalezeno


def exported_names(src):
    """Vrati mnozinu exportovanych nazvu + priznak, zda ma wildcard reexport."""
    names = set()
    wildcard = bool(re.search(r"export\s+\*\s+from", src))
    for m in re.finditer(
        r"export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)",
        src,
    ):
        names.add(m.group(1))
    for m in re.finditer(r"export\s*\{([^}]*)\}", src):
        for part in m.group(1).split(","):
            part = part.strip()
            if not part:
                continue
            # "foo as bar" -> exportuje se "bar"
            alias = re.split(r"\s+as\s+", part)
            names.add(alias[-1].strip())
    if re.search(r"export\s+default", src):
        names.add("default")
    return names, wildcard


def parse_named(names_clause):
    """Z '{ a, b as c }, Def, * as ns' vytahne jen pojmenovane importy z {}."""
    out = []
    if not names_clause:
        return out
    m = re.search(r"\{([^}]*)\}", names_clause)
    if not m:
        return out
    for part in m.group(1).split(","):
        part = part.strip()
        if not part:
            continue
        orig = re.split(r"\s+as\s+", part)[0].strip()
        if orig:
            out.append(orig)
    return out


def walk(rel):
    if rel in visited:
        return
    visited.add(rel)
    abspath = os.path.join(ROOT, rel)
    try:
        raw = open(abspath, encoding="utf-8").read()
    except OSError as e:
        errors.append("NELZE OTEVRIT %s (%s)" % (rel, e))
        return
    src = strip_comments(raw)
    base = os.path.dirname(abspath)
    for m in IMPORT_RE.finditer(src):
        spec = m.group("path1") or m.group("path2") or m.group("path3")
        if not spec:
            continue
        res = resolve(base, spec)
        if res is None:
            continue  # bare import
        if res is False:
            errors.append("%s -> import '%s' NENALEZEN" % (rel, spec))
            continue
        target_rel = os.path.relpath(res, ROOT).replace("\\", "/")
        # kontrola named exportu
        names_clause = m.group("names") or m.group("exnames")
        wanted = parse_named(names_clause)
        if wanted:
            try:
                tsrc = strip_comments(open(res, encoding="utf-8").read())
                have, wild = exported_names(tsrc)
                if not wild:
                    for nm in wanted:
                        if nm not in have:
                            warn.append(
                                "%s -> '%s' importuje {%s}, ale modul to neexportuje"
                                % (rel, spec, nm)
                            )
            except OSError:
                pass
        walk(target_rel)


walk(ENTRY.replace("\\", "/"))

print("Proslo modulu: %d" % len(visited))
if errors:
    print("\n=== CHYBY (rozbite import cesty) ===")
    for e in errors:
        print(" ", e)
if warn:
    print("\n=== VAROVANI (chybejici named export) ===")
    for w in warn:
        print(" ", w)
if not errors and not warn:
    print("OK – vsechny import cesty i named exporty sedi.")
sys.exit(1 if errors else 0)
