#!/bin/sh
# Tests backup-export.sh with a fake pg_dump (no database needed): a good dump is saved, an empty one is refused,
# a missing connection string is refused, and the password never appears in the output.
set -eu
HERE=$(cd "$(dirname "$0")" && pwd); T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
mkdir "$T/bin"
cat > "$T/bin/pg_dump" <<'EOS'
#!/bin/sh
if [ "${FAKE:-good}" = good ]; then i=1; while [ $i -le 22 ]; do echo "CREATE TABLE \"public\".\"t$i\" (id int);"; echo "COPY \"public\".\"t$i\" (id) FROM stdin;"; i=$((i+1)); done; else echo "-- empty"; fi
EOS
chmod +x "$T/bin/pg_dump"; export PATH="$T/bin:$PATH"
fail() { echo "FAIL: $1"; exit 1; }
out=$(BT_DB_URL='postgres://u:SECRETPASS@h/db' FAKE=good sh "$HERE/backup-export.sh" "$T/out" 2>&1) || fail "good dump refused: $out"
echo "$out" | grep -q 'Saved' || fail "no Saved line"
echo "$out" | grep -q SECRETPASS && fail "password printed"
[ "$(ls "$T/out"/bt-db-*.sql.gz | wc -l)" = 1 ] || fail "file not saved"
rm -f "$T/out"/*
if BT_DB_URL='postgres://u:SECRETPASS@h/db' FAKE=empty sh "$HERE/backup-export.sh" "$T/out" >/dev/null 2>&1; then fail "empty dump accepted"; fi
ls "$T/out"/*.sql.gz >/dev/null 2>&1 && fail "empty dump left a file"
if env -u BT_DB_URL sh "$HERE/backup-export.sh" "$T/out" >/dev/null 2>&1; then fail "missing url accepted"; fi
echo "Backup export checks passed."
