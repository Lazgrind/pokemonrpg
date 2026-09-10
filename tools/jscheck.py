"""Rychlá kontrola vyváženosti závorek a řetězců v JS (node tu není)."""
import sys

files = [
    "src/systems/pokemonSystem.js", "src/systems/battleSystem.js",
    "src/systems/breedingSystem.js", "src/systems/team.js",
    "src/systems/save.js", "src/core/state.js", "src/core/version.js",
    "src/ui/profileView.js", "src/ui/settingsView.js", "src/systems/devTools.js",
    "src/ui/diploma.js", "src/ui/popup.js",
    "src/ui/gymView.js", "src/ui/gymChallengeView.js",
    "data/areas.js",
    "data/moves.js", "data/items.js", "data/tms.js", "data/tmCompat.js",
    "data/hms.js", "data/hmCompat.js",
    "data/pokeballs.js",
    "src/systems/tmSystem.js", "src/systems/pokeballSystem.js",
    "src/systems/hmSystem.js",
    # POZN.: storyBuildingView.js A main.js vynechány – používají vnořené template
    # literály (backtick uvnitř ${...}) s apostrofy (It'll/don't), což tenhle naivní
    # tokenizer neumí sledovat a hlásil by false-positive. Kontroluj je očima.
]

BACK = chr(92)  # backslash


def check(path):
    src = open(path, encoding="utf-8").read()
    i = 0
    n = len(src)
    stack = []
    line = 1
    pairs = {')': '(', ']': '[', '}': '{'}
    op = set("([{")
    while i < n:
        c = src[i]
        if c == '\n':
            line += 1
            i += 1
            continue
        if c == '/' and i + 1 < n and src[i + 1] == '/':
            while i < n and src[i] != '\n':
                i += 1
            continue
        if c == '/' and i + 1 < n and src[i + 1] == '*':
            i += 2
            while i + 1 < n and not (src[i] == '*' and src[i + 1] == '/'):
                if src[i] == '\n':
                    line += 1
                i += 1
            i += 2
            continue
        if c in "\"'`":
            q = c
            i += 1
            while i < n:
                if src[i] == BACK:
                    i += 2
                    continue
                if src[i] == '\n':
                    line += 1
                    if q != '`':
                        return "%s:%d nezakoncena %s retezec" % (path, line, q)
                if src[i] == q:
                    break
                i += 1
            i += 1
            continue
        if c in op:
            stack.append((c, line))
            i += 1
            continue
        if c in pairs:
            if not stack:
                return "%s:%d prebyva %s" % (path, line, c)
            o, ol = stack.pop()
            if o != pairs[c]:
                return "%s:%d nesparovano %s vs %s (radek %d)" % (path, line, c, o, ol)
            i += 1
            continue
        i += 1
    if stack:
        o, ol = stack[-1]
        return "%s:%d nezavrena %s" % (path, ol, o)
    return None


bad = False
for f in files:
    r = check(f)
    if r:
        print("CHYBA:", r)
        bad = True
    else:
        print("OK   :", f)
sys.exit(1 if bad else 0)
