"""Kontrola map měst shora (data/cityMaps.js) – spouštět po každé změně mapy nebo budov města.

    python tools/citymapcheck.py

Běží v Node (tools/citymapcheck.mjs); Node se vezme ze systému, jinak z VS Code (jako savecheck.py).
"""
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from savecheck import find_node  # noqa: E402  (stejné hledání Node jako testy savů)

HERE = Path(__file__).resolve().parent


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    cmd, env = find_node()
    r = subprocess.run(cmd + ["--no-warnings", str(HERE / "citymapcheck.mjs")], env=env, cwd=HERE.parent,
                       capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=120)
    print(r.stdout.strip() or r.stderr.strip())
    if r.returncode and r.stderr.strip() and r.stdout.strip():
        print(r.stderr.strip(), file=sys.stderr)
    sys.exit(r.returncode)


if __name__ == "__main__":
    main()
