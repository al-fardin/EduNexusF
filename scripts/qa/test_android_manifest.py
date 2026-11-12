"""Regression checks for APK inspection without a real release key or device."""
import hashlib
import importlib.util
import json
import pathlib
import subprocess
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("android_manifest", ROOT / "deploy/android-manifest.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ManifestChecks(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.folder = pathlib.Path(self.temporary.name)
        self.apk = self.folder / "release.apk"
        self.apk.write_bytes(b"fixture archive content")
        self.sdk = self.folder / "sdk"
        tools = self.sdk / "build-tools/36.0.0"
        (tools / "lib").mkdir(parents=True)
        (tools / ("aapt.exe" if MODULE.os.name == "nt" else "aapt")).touch()
        (tools / "lib/apksigner.jar").touch()
        properties = dict(line.split("=", 1) for line in (ROOT / "android-app/version.properties").read_text().splitlines() if "=" in line)
        self.code = int(properties["versionCode"])
        self.name = properties["versionName"]
        self.badging = f"package: name='com.edunexus.mobile' versionCode='{self.code}' versionName='{self.name}'\nsdkVersion:'24'\n"
        self.certificate = "a" * 64
        self.signing = f"Signer #1 certificate DN: CN=Release Fixture\nSigner #1 certificate SHA-256 digest: {self.certificate}\n"

    def run_tool(self, badging=None, signing=None):
        return patch.object(MODULE.subprocess, "run", side_effect=[types.SimpleNamespace(stdout=badging or self.badging), types.SimpleNamespace(stdout=signing or self.signing)])

    def test_metadata_comes_from_verified_archive(self):
        with self.run_tool():
            self.assertEqual(MODULE.metadata(self.apk, self.sdk), (self.code, self.name, self.certificate, 24))

    def test_debuggable_or_wrong_package_is_rejected(self):
        for badging in [self.badging + "application-debuggable\n", self.badging.replace("com.edunexus.mobile", "other.package")]:
            with self.run_tool(badging=badging), self.assertRaises(ValueError):
                MODULE.metadata(self.apk, self.sdk)

    def test_debug_keys_and_multiple_signers_are_rejected(self):
        for signing in [self.signing.replace("Release Fixture", "EduNexus Debug"), self.signing + "Signer #2 certificate SHA-256 digest: " + "b" * 64]:
            with self.run_tool(signing=signing), self.assertRaises(ValueError):
                MODULE.metadata(self.apk, self.sdk)

    def test_signature_tool_failure_is_not_ignored(self):
        with patch.object(MODULE.subprocess, "run", side_effect=[types.SimpleNamespace(stdout=self.badging), subprocess.CalledProcessError(1, "apksigner")]), self.assertRaises(subprocess.CalledProcessError):
            MODULE.metadata(self.apk, self.sdk)

    def test_manifest_has_measured_size_hash_and_version(self):
        output = self.folder / "android.json"
        with self.run_tool(), patch.object(sys, "argv", ["android-manifest.py", str(self.apk), str(output), "--sdk", str(self.sdk)]):
            MODULE.main()
        value = json.loads(output.read_text())
        self.assertEqual(value["version_code"], self.code)
        self.assertEqual(value["size_bytes"], self.apk.stat().st_size)
        self.assertEqual(value["sha256"], hashlib.sha256(self.apk.read_bytes()).hexdigest())
        self.assertEqual(value["certificate_sha256"], self.certificate)


if __name__ == "__main__":
    unittest.main(verbosity=2)
