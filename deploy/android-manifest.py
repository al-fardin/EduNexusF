"""Inspect a signed APK and create matching update metadata; never signs or publishes."""
import argparse
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess


def metadata(apk, sdk):
    tools = sdk / 'build-tools' / '36.0.0'
    aapt = tools / ('aapt.exe' if os.name == 'nt' else 'aapt')
    signer = tools / 'lib' / 'apksigner.jar'
    if not aapt.is_file() or not signer.is_file():
        raise ValueError('Android build-tools 36.0.0 are required')
    badging = subprocess.run([str(aapt), 'dump', 'badging', str(apk)], check=True, capture_output=True, text=True, encoding='utf-8', errors='replace').stdout
    package = re.search(r"package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'", badging)
    minimum = re.search(r"sdkVersion:'(\d+)'", badging)
    if not package or package[1] != 'com.edunexus.mobile' or not minimum or int(minimum[1]) < 24 or 'application-debuggable' in badging:
        raise ValueError('Use a non-debuggable EduNexus release APK for Android 7+')
    result = subprocess.run([shutil.which('java') or 'java', '-jar', str(signer), 'verify', '--verbose', '--print-certs', str(apk)], check=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if re.search(r'certificate DN:.*(?:Android Debug|EduNexus Debug)', result.stdout, re.IGNORECASE):
        raise ValueError('A production signing key is required')
    certificates = re.findall(r'Signer #\d+ certificate SHA-256 digest: ([a-fA-F0-9]{64})', result.stdout)
    if len(certificates) != 1:
        raise ValueError('A single verified release signing certificate is required')
    return int(package[2]), package[3], certificates[0].lower(), int(minimum[1])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('apk', type=pathlib.Path)
    parser.add_argument('output', type=pathlib.Path)
    parser.add_argument('--sdk', type=pathlib.Path, default=pathlib.Path(os.environ.get('ANDROID_HOME', 'release-builds/android-sdk')))
    parser.add_argument('--notes', default='Semester workflows, academic reviews and verified app updates.')
    args = parser.parse_args()
    size = args.apk.stat().st_size
    if not 0 < size <= 100 * 1024 * 1024 or len(args.notes) > 2000:
        raise ValueError('APK exceeds 100 MB or release notes exceed 2000 characters')
    code, name, certificate, minimum = metadata(args.apk, args.sdk)
    properties = dict(line.split('=', 1) for line in (pathlib.Path(__file__).resolve().parent.parent / 'android-app/version.properties').read_text(encoding='utf-8').splitlines() if '=' in line)
    if code != int(properties['versionCode']) or name != properties['versionName']:
        raise ValueError('APK version does not match version.properties')
    digest = hashlib.sha256()
    with args.apk.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    manifest = dict(version_code=code, version_name=name, url='/downloads/EduNexus-release.apk', sha256=digest.hexdigest(), certificate_sha256=certificate, size_bytes=size, min_sdk=minimum, notes=args.notes)
    args.output.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print('Verified release metadata created')


if __name__ == '__main__':
    main()
