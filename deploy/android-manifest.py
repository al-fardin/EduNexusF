"""Create release metadata after APK signature verification by the build script."""
import hashlib
import json
import pathlib
import sys

apk, output = map(pathlib.Path, sys.argv[1:3])
manifest = {
    "version_code": 5,
    "version_name": "1.3.1",
    "url": "/downloads/EduNexus-release.apk",
    "sha256": hashlib.sha256(apk.read_bytes()).hexdigest(),
    "notes": "Realtime messaging, file previews and device notifications.",
}
output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
