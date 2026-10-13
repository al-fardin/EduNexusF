#!/usr/bin/env sh
# Developer packaging only; built output must be signed/notarized on macOS.
set -eu
cd "$(dirname "$0")"
python3 -m pip install -r requirements.txt pyinstaller
python3 -m PyInstaller --noconfirm --clean --windowed --name EduNexus-Secure-Exam --onefile client.py
printf 'Unsigned local executable: %s\n' "$(pwd)/dist/EduNexus-Secure-Exam"
