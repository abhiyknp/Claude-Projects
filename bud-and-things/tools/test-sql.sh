#!/bin/sh
# Runs supabase/schema.sql on a throw-away real PostgreSQL and checks place_order (live shipping quotes) with
# tools/test-place-order.sql. Needs the PostgreSQL server programs (the postgresql package) and a normal user (not root).
# Skips with a message when they are not there. Usage: sh bud-and-things/tools/test-sql.sh
HERE=$(cd "$(dirname "$0")" && pwd)
BIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1)
if [ -z "$BIN" ] || [ ! -x "$BIN/initdb" ]; then echo "SQL checks skipped: no PostgreSQL server programs found."; exit 0; fi
if [ "$(id -u)" = "0" ]; then echo "SQL checks skipped: run as a normal user (PostgreSQL will not start as root)."; exit 0; fi
D=$(mktemp -d); PORT=55$(( $$ % 90 + 10 ))
cleanup() { "$BIN/pg_ctl" -D "$D/data" stop -m immediate >/dev/null 2>&1; rm -rf "$D"; }
trap cleanup EXIT
"$BIN/initdb" -D "$D/data" -A trust >/dev/null 2>&1 || { echo "FAIL: initdb"; exit 1; }
"$BIN/pg_ctl" -D "$D/data" -o "-p $PORT -k $D" -l "$D/log" -w start >/dev/null 2>&1 || { echo "FAIL: could not start PostgreSQL"; exit 1; }
P="$BIN/psql -h $D -p $PORT -d postgres -q"
$P -f "$HERE/pg-supabase-stub.sql" >"$D/stub.out" 2>&1
$P -f "$HERE/../supabase/schema.sql" >"$D/schema.out" 2>&1
# everything in schema.sql must apply, except the file-storage lines that need Supabase's storage schema
BAD=$(grep -i "error" "$D/schema.out" | grep -v -i "storage")
if [ -n "$BAD" ]; then echo "FAIL: schema.sql did not apply:"; echo "$BAD" | head -5; exit 1; fi
OUT=$($P -v ON_ERROR_STOP=1 -f "$HERE/test-place-order.sql" 2>&1) || { echo "FAIL:"; echo "$OUT" | tail -8; exit 1; }
echo "$OUT" | grep -q "place_order checks passed" || { echo "FAIL:"; echo "$OUT" | tail -8; exit 1; }
echo "ok   schema.sql applies on PostgreSQL, and place_order: live quote, weight band, expiry, flat fee, total check"
echo "SQL checks passed."
