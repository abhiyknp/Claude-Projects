# 24 Code quality audit
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

- Tests: import, invoice, catalogue-live, page audit, end-to-end flow all run in CI and pass locally.
- No linter, type checker or dependency scanner in CI (F-10 partially closed: tests now run).
- Single large file; hard-coded SKU list (FE-04); vendored libs unversioned (F-17).
- CI flake investigation (FE-05): two mitigations merged (no literal script tag in JS string; preview serves script as a file). Root cause unproven.
- Coverage figures: NOT MEASURED.
