#!/bin/sh
# Builds a local preview of the prototype in bud-and-things/.preview and serves it on http://localhost:8765/page.html
#   PORT=8766      serve on another port
set -e
HERE=$(cd "$(dirname "$0")/.." && pwd)
OUT=${OUT:-$HERE/.preview}
rm -rf "$OUT" && mkdir -p "$OUT" && cp -r "$HERE/prototype/." "$OUT/"
# the page is written as page content (it is also published as a Claude artifact); give it a document shell
{ printf '%s' '<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>'
  cat "$HERE/prototype/index.html"
  printf '%s' '</body></html>'; } > "$OUT/page.html"
# the same security policy as the published site, also allowing the local test database
BT_CSP_CONNECT="http://localhost:54321" node "$HERE/tools/add-csp.js" "$OUT/page.html" >/dev/null
cd "$OUT" && echo "Serving http://localhost:${PORT:-8765}/page.html" && exec python3 -m http.server "${PORT:-8765}"
