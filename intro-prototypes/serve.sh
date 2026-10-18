#!/bin/sh
# Serves the intro prototypes on http://localhost:8770/page.html (PORT=… for another port).
# index.html is written as page content, so this wraps it in a full HTML document first.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
{ printf '%s' '<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>'
  cat "$HERE/index.html"
  printf '%s' '</body></html>'; } > "$HERE/page.html"
cd "$HERE" && echo "Serving http://localhost:${PORT:-8770}/page.html" && exec python3 -m http.server "${PORT:-8770}"
