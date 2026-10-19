"""Kontrola vyvazenosti zavorek pro JS VCETNE vnorenych template literalu
(backtick uvnitr ${...}). Doplnek k jscheck.py (ten vnorene literaly neumi).

Usage: python tools/jscheck2.py <soubor> [<soubor> ...]
"""
import sys

BACK = chr(92)  # backslash
TICK = chr(96)  # backtick


def check(path):
    s = open(path, encoding="utf-8").read()
    i, n = 0, len(s)
    line = 1
    # Zasobnik kontextu: "code" = bezny kod, "tmpl" = uvnitr template literalu.
    # Pro parovani zavorek drzime jeden spolecny zasobnik zavorek se znackou kontextu.
    ctx = ["code"]
    stack = []  # (char, line, is_template_expr_marker)
    pairs = {")": "(", "]": "[", "}": "{"}

    while i < n:
        c = s[i]
        if c == "\n":
            line += 1
            i += 1
            continue

        if ctx[-1] == "tmpl":
            # Uvnitr template literalu: hleda se konec (`) nebo zacatek vyrazu ${.
            if c == BACK:
                i += 2
                continue
            if c == TICK:
                ctx.pop()
                i += 1
                continue
            if c == "$" and i + 1 < n and s[i + 1] == "{":
                ctx.append("code")
                stack.append(("{", line, True))  # marker: ${ expr
                i += 2
                continue
            i += 1
            continue

        # ctx == "code"
        if c == "/" and i + 1 < n and s[i + 1] == "/":
            while i < n and s[i] != "\n":
                i += 1
            continue
        if c == "/" and i + 1 < n and s[i + 1] == "*":
            i += 2
            while i + 1 < n and not (s[i] == "*" and s[i + 1] == "/"):
                if s[i] == "\n":
                    line += 1
                i += 1
            i += 2
            continue
        if c in "\"'":
            q = c
            i += 1
            while i < n:
                if s[i] == BACK:
                    i += 2
                    continue
                if s[i] == "\n":
                    line += 1
                    return "%s:%d nezakoncena %s retezec" % (path, line, q)
                if s[i] == q:
                    break
                i += 1
            i += 1
            continue
        if c == TICK:
            ctx.append("tmpl")
            i += 1
            continue
        if c in "([{":
            stack.append((c, line, False))
            i += 1
            continue
        if c in pairs:
            if not stack:
                return "%s:%d prebyva %s" % (path, line, c)
            o, ol, marker = stack.pop()
            if o != pairs[c]:
                return "%s:%d nesparovano %s vs %s (radek %d)" % (path, line, c, o, ol)
            if c == "}" and marker:
                # Konec ${ ... } vyrazu -> zpet do template kontextu.
                if ctx[-1] == "code":
                    ctx.pop()
            i += 1
            continue
        i += 1

    if stack:
        o, ol, _ = stack[-1]
        return "%s:%d nezavrena %s" % (path, ol, o)
    if len(ctx) != 1:
        return "%s: nezavreny template literal (kontext=%s)" % (path, ctx)
    return None


bad = False
for f in sys.argv[1:]:
    r = check(f)
    if r:
        print("CHYBA:", r)
        bad = True
    else:
        print("OK   :", f)
sys.exit(1 if bad else 0)
