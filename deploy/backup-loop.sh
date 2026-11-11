#!/bin/sh
set -eu
interval=${BACKUP_INTERVAL_SECONDS:-86400}
case "$interval" in ''|*[!0-9]*) echo 'Invalid backup interval' >&2; exit 2;; esac
test "$interval" -ge 300
while :; do
  if sh /backup.sh; then
    latest=$(find /backups -maxdepth 1 -name 'edunexus-*.dump' -type f | sort | tail -n 1)
    if sh /verify-backup.sh "$latest"; then
      date -u +%Y-%m-%dT%H:%M:%SZ > /backups/last-verified.txt
      sleep "$interval"
    else
      echo 'Backup verification failed; will retry in 5 minutes' >&2
      sleep 300
    fi
  else
    echo 'Backup failed; will retry in 5 minutes' >&2
    sleep 300
  fi
done
