# AEONIMUS portable integration validation

Base: `717d4503ce544a4d9d44a6237b049295b22123a6`, the existing origin PR.
Public Codex source inspected: `f19b4edcceab4597fd91a11e6814200191ce4e60`.
Framework source and authored origin: Vanessa Henize / `VANESSA::AEONIMUS::VH012`.

## Executed checks

- `npm test`: 218 JavaScript tests and 61 TypeScript tests pass.
- `npm run check:origin`, `npm run typecheck`, changed-file ESLint and `npm run build` pass.
- Python: 12 memory-kernel behavior tests and two immutable Git snapshot tests pass.
- New metadata regressions preserve head/body script literals, comments and unrelated metadata. Single/double/unquoted attributes, quoted greater-than characters, numeric character references, duplicate declarations, idempotence and every UTF-8 split in the false-head fixture are covered.
- A spawned CLI test confirms invalid origin configuration fails through direct and symlink invocation.
- The Node adapter propagates downstream write backpressure and completion callbacks.
- FLARE tests cover five evidence siblings, retained ancestry, fresh repeated-target identities, explicit retrieval failure and byte-budgeted evidence.
- A local GitHub source pull resolves one immutable commit, indexes its source versions and verifies memory integrity. Old source versions remain available.
- The fresh Vercel handler, imported from an empty working directory, returns 200 with canonical authored identity for `/`, both manifest aliases and the iOS installation page.

## Remaining verification limit

Browser rendering could not be completed in this execution environment. The bundled Playwright browser is absent; system Chromium fails before opening a page because its process-singleton socket is prohibited. The development Vite process also fails while enumerating network interfaces. No screenshot, hydration, mobile-layout or visual-render success is claimed for this pass. The built request-handler checks above ran without a listening server.

## Source and compatibility

The existing ledger persistence, historical event hashing/signatures and recovery algorithms are unchanged. New FLARE events use the existing ledger API and preserve producer/source labels. Python SQLite memory remains a separate store from browser IndexedDB.

Only code, source-reference metadata and a neutral offline example are included in this public integration. Corpus retrieval writes to local state when explicitly invoked. The personal capsule and recovered private documents are excluded from this repository change.

Generated `.vercel` output is used for local verification and excluded from the source commit. Deployment must build this source revision; no deployment was performed.
