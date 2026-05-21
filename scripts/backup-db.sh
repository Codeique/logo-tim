#!/usr/bin/env bash
# Daily PostgreSQL backup with 7-day rolling retention.
# Install as a cron job: crontab -e
#   0 3 * * * /opt/logotim/scripts/backup-db.sh >> /var/log/logotim-backup.log 2>&1
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/logotim/backups}"
CONTAINER="${CONTAINER:-logotim-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-logotim}"
KEEP_DAYS="${KEEP_DAYS:-7}"

mkdir -p "${BACKUP_DIR}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTFILE="${BACKUP_DIR}/logotim_${TIMESTAMP}.sql.gz"

echo "[$(date -Iseconds)] Starting backup → ${OUTFILE}"

docker exec "${CONTAINER}" pg_dump -U "${DB_USER}" "${DB_NAME}" \
  | gzip > "${OUTFILE}"

echo "[$(date -Iseconds)] Backup complete ($(du -sh "${OUTFILE}" | cut -f1))"

# Remove backups older than KEEP_DAYS
find "${BACKUP_DIR}" -name "logotim_*.sql.gz" -mtime +"${KEEP_DAYS}" -delete
echo "[$(date -Iseconds)] Old backups pruned (kept last ${KEEP_DAYS} days)"
