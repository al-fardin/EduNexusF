"""Example teacher tester: Python solution reads two integers and prints their sum.

Build a self-contained console EXE with:
python -m PyInstaller --onefile --console --name Sum-Tester sum_tester.py
"""
import json
import os
from pathlib import Path
import runpy
import subprocess
import sys


def main():
    if len(sys.argv) == 3 and sys.argv[1] == "--solution":
        source = Path(sys.argv[2]).resolve()
        os.chdir(source.parent)
        sys.path.insert(0, str(source.parent))
        sys.argv = [str(source)]
        runpy.run_path(str(source), run_name="__main__")
        return
    request = json.load(sys.stdin)
    if request.get("protocol") != "edunexus.tester.v1" or request.get("language") != "python":
        print("This example supports Python solutions only", file=sys.stderr)
        sys.exit(2)
    entry = Path(request["source_dir"]) / request["entry"]
    command = [sys.executable]
    if not getattr(sys, "frozen", False):
        command.append(str(Path(__file__).resolve()))
    command.extend(["--solution", str(entry)])
    cases = []
    for index, (text, expected) in enumerate([("2 3\n", "5"), ("-4 7\n", "3"), ("0 0\n", "0"), ("1000000 999999\n", "1999999")], 1):
        try:
            process = subprocess.run(command, input=text, text=True, capture_output=True,
                                     timeout=3, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            ok = process.returncode == 0 and process.stdout.strip() == expected
            cases.append({"name": f"Case {index}", "status": "passed" if ok else "failed",
                          "message": "" if ok else (process.stderr[:500] or "Output does not match")})
        except subprocess.TimeoutExpired:
            cases.append({"name": f"Case {index}", "status": "timeout", "message": "3-second case limit exceeded"})
    print(json.dumps({"passed": sum(c["status"] == "passed" for c in cases), "total": len(cases), "cases": cases}))


if __name__ == "__main__":
    main()
