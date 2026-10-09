#!/bin/sh
# Builds a local preview of the prototype in bud-and-things/.preview and serves it on http://localhost:8765/page.html
#   LOCAL_THREE=1  use a local copy of three.js (from npm) instead of the CDN, for machines that cannot reach it
#   PORT=8766      serve on another port
set -e
HERE=$(cd "$(dirname "$0")/.." && pwd)
OUT=${OUT:-$HERE/.preview}
rm -rf "$OUT" && mkdir -p "$OUT" && cp -r "$HERE/prototype/." "$OUT/"
SED='s#^##'
if [ "${LOCAL_THREE:-0}" = 1 ]; then
  (cd "$OUT" && npm pack three@0.160.0 -q >/dev/null && tar xzf three-0.160.0.tgz && mv package three && rm three-0.160.0.tgz)
  SED='s#https://cdn.jsdelivr.net/npm/three@0.160.0/#./three/#g'
fi
# the page is written as page content (it is also published as a Claude artifact); give it a document shell
{ printf '%s' '<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>'
  sed "$SED" "$HERE/prototype/index.html"
  printf '%s' '</body></html>'; } > "$OUT/page.html"
cd "$OUT" && echo "Serving http://localhost:${PORT:-8765}/page.html" && exec python3 -m http.server "${PORT:-8765}"
