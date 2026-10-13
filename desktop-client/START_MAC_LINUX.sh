#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
command -v python3 >/dev/null || { echo 'Python 3 (with Tkinter) is required'; exit 1; }
[ -f .venv/bin/python ] || python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
exec .venv/bin/python client.py
