#!/bin/sh
# Weekly copy of the shop database, for when the Supabase plan has no backups (Free) or as your own copy next to them.
# Saves one file (the public schema: products, stock, orders, invoices, customers' profiles, settings, reviews) and checks it.
#   BT_DB_URL='<connection string from Supabase: Project settings > Database > Connection string > URI>' \
#   sh bud-and-things/tools/backup-export.sh [folder]        (folder defaults to ~/BT-backups)
# The connection string holds your database password: keep it only in your terminal or password manager, never in the
# repo, a chat or a screenshot. This script never prints it and never writes it into the backup.
# Not included: login records (Supabase's separate "auth" schema) and the photo files (kept on Cloudinary: keep the originals).
set -eu
: "${BT_DB_URL:?Set BT_DB_URL first (see the comment at the top of this file).}"
command -v pg_dump >/dev/null 2>&1 || { echo "pg_dump not found. Mac: brew install libpq && brew link --force libpq. Windows: install PostgreSQL, tick Command Line Tools." >&2; exit 2; }
DIR=${1:-"$HOME/BT-backups"}
mkdir -p "$DIR"
chmod 700 "$DIR" 2>/dev/null || true
OUT="$DIR/bt-db-$(date +%Y-%m-%d).sql.gz"
TMP="$OUT.partial"
trap 'rm -f "$TMP"' EXIT
pg_dump "$BT_DB_URL" --schema=public --no-owner --no-privileges --quote-all-identifiers | gzip -9 > "$TMP"
gzip -t "$TMP"
# a real dump of this shop has tables and rows: refuse a file that is empty or has none
TABLES=$(gzip -dc "$TMP" | grep -c '^CREATE TABLE ' || true)
COPIES=$(gzip -dc "$TMP" | grep -c '^COPY ' || true)
[ "$TABLES" -ge 20 ] || { echo "FAILED: the file has only $TABLES tables (expected 20 or more). Nothing was saved." >&2; exit 1; }
mv "$TMP" "$OUT"; trap - EXIT
chmod 600 "$OUT" 2>/dev/null || true
echo "Saved $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes, $TABLES tables, $COPIES tables with rows)."
echo "Now move it to your private Drive folder (2-step sign-in on). Keep the last 4. Do not email it or put it in the repo."
# keep only the last 8 files in the local folder
ls -1t "$DIR"/bt-db-*.sql.gz 2>/dev/null | tail -n +9 | while read -r f; do rm -f "$f"; done
