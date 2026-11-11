#!/bin/sh
set -eu
# Run inside the postgres container with /backups mounted and standard PG env.
stamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p /backups
umask 077
pg_dump -Fc -f "/backups/edunexus-$stamp.dump"
sha256sum "/backups/edunexus-$stamp.dump" > "/backups/edunexus-$stamp.dump.sha256"
if [ -d /uploads ]; then
  tar -czf "/backups/uploads-$stamp.tar.gz" -C /uploads .
  sha256sum "/backups/uploads-$stamp.tar.gz" > "/backups/uploads-$stamp.tar.gz.sha256"
  tar -tzf "/backups/uploads-$stamp.tar.gz" > /dev/null
fi
echo "Database backup created: edunexus-$stamp.dump"
