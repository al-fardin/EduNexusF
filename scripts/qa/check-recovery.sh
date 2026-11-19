#!/bin/sh
set -eu
# Run only after loading recovery-fixtures.sql into a new disposable database.
test "${PGDATABASE:-}" = edunexus_features
scratch=$(mktemp -d)
trap 'rm -rf -- "$scratch"' EXIT HUP INT TERM
root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
verify="$root/deploy/verify-backup.sh"
mkdir -p "$scratch/uploads/materials/22222222-2222-4222-8222-222222222222" "$scratch/uploads/messages"
printf 'recovery material' > "$scratch/uploads/materials/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333"
printf 'recovery message' > "$scratch/uploads/messages/44444444-4444-4444-8444-444444444444"
tar -czf "$scratch/uploads.tar.gz" -C "$scratch/uploads" .
sha256sum "$scratch/uploads.tar.gz" > "$scratch/uploads.tar.gz.sha256"
pg_dump -Fc -f "$scratch/recovery.dump"
sha256sum "$scratch/recovery.dump" > "$scratch/recovery.dump.sha256"
BACKUP_EXPECTED_USERS=2 sh "$verify" "$scratch/recovery.dump" "$scratch/uploads.tar.gz"
# Failure cases must not publish or overwrite the successful restore report.
unset BACKUP_RESTORE_REPORT BACKUP_RESTORE_UPLOADS_DIR
# Missing blobs, tampering, checksum substitution and archive links must fail.
tar -czf "$scratch/missing.tar.gz" -C "$scratch/uploads" messages
sha256sum "$scratch/missing.tar.gz" > "$scratch/missing.tar.gz.sha256"
if sh "$verify" "$scratch/recovery.dump" "$scratch/missing.tar.gz"; then exit 1; fi
mkdir "$scratch/linked"
ln -s /tmp "$scratch/linked/escape"
tar -czf "$scratch/linked.tar.gz" -C "$scratch/linked" .
sha256sum "$scratch/linked.tar.gz" > "$scratch/linked.tar.gz.sha256"
if sh "$verify" "$scratch/recovery.dump" "$scratch/linked.tar.gz"; then exit 1; fi
tar -czf "$scratch/traversal.tar.gz" --transform='s,^,../,' -C "$scratch/uploads" .
sha256sum "$scratch/traversal.tar.gz" > "$scratch/traversal.tar.gz.sha256"
if sh "$verify" "$scratch/recovery.dump" "$scratch/traversal.tar.gz"; then exit 1; fi
cp "$scratch/uploads.tar.gz" "$scratch/tampered.tar.gz"
cp "$scratch/uploads.tar.gz.sha256" "$scratch/tampered.tar.gz.sha256"
printf 'tamper' >> "$scratch/tampered.tar.gz"
if sh "$verify" "$scratch/recovery.dump" "$scratch/tampered.tar.gz"; then exit 1; fi
echo 'PASS database/upload pair restore; missing blob, link, traversal and checksum attacks rejected'
