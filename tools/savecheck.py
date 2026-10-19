"""Testy kompatibility savů (tools/savecheck.js) – spouštět PŘED každým pushem,
který mění datový model savu (src/core/state.js / src/systems/save.js).

    python tools/savecheck.py

Běží v Node (tools/savecheck_node.mjs). Node tu běžně není, proto se vezme
i Node vestavěný ve VS Code (Code.exe s ELECTRON_RUN_AS_NODE=1). Ručně jde
spustit i v prohlížeči: tools/savecheck.html.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
VSCODE = [
    Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Microsoft VS Code" / "Code.exe",
    Path(r"C:\Program Files\Microsoft VS Code\Code.exe"),
]


def find_node():
    """(příkaz, env) – systémový node, jinak Node z VS Code."""
    node = shutil.which("node")
    if node:
        return [node], None
    for code in VSCODE:
        if code.is_file():
            return [str(code)], dict(os.environ, ELECTRON_RUN_AS_NODE="1")
    sys.exit("Nenasel jsem Node.js (ani VS Code). Otevri tools/savecheck.html v prohlizeci pres python -m http.server.")


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")    # konzole Windows (cp1250) neumí → apod.
    cmd, env = find_node()
    r = subprocess.run(cmd + ["--no-warnings", str(HERE / "savecheck_node.mjs")], env=env, cwd=HERE.parent,
                       capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=300)
    print(r.stdout.strip() or r.stderr.strip())
    if r.returncode and r.stderr.strip() and r.stdout.strip():
        print(r.stderr.strip(), file=sys.stderr)
    sys.exit(r.returncode)


if __name__ == "__main__":
    main()
