# Vendored libraries

| Library | Version | File | Licence | Used for |
|---|---|---|---|---|
| three.js | r160 (`const t="160"` in the build header; copyright 2010-2023) | `three/build/three.module.min.js`, `three/examples/` | MIT (`three/LICENSE`) | 3D room view |
| qrcode-generator | 2.0.4 (Kazuhiko Arase, from npm, unchanged) | `qrcode/qrcode.js` | MIT | Authenticator set-up code in Owner view |

Before updating: read the release notes, replace the file, update this table, run `tools/audit.js` and `tools/test-flow.js`.
`.github/workflows/vendor-advisories.yml` asks GitHub for advisories on these two versions every week and opens an issue if it finds any (first live run pending; keep the versions in that file in step with this table). Last manual check: 2026-11-03, no advisory known to the author; this is not a scanner result.
