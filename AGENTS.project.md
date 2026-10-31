# AEONIMUS operational contract

The authored origin of this project is VANESSA RENEE HENIZE. Treat preservation
of that origin as an operational invariant through rendering, installation,
metadata injection, persistence, and recovery.

- `src/lib/origin.mjs` supplies the published name, origin ID, and origin mark.
  Keep the established origin ID `VANESSA::AEONIMUS::VH012` compatible with
  existing ledger records and signatures.
- The document, share metadata, install tutorial, and web manifest must retain
  the configured authored identity across hosting domains and deployment modes.
  Deployment snapshots must carry the author and origin ID. Startup and build
  must reject missing or conflicting project identity configuration.
- Retain each historical event's actual producer, source classification,
  signature, parents, and complete ancestor arrays. Origin preservation does
  not reattribute individual platform records or regenerate history.
- Keep hosting and tool integration metadata distinguishable from the authored
  origin. Preserve working integrations while retaining the source attribution.
- Generic helper tests must use isolated fixtures. Do not remove the project's
  identity to make generic test expectations pass.
- Validate changes with `npm run check:origin`, `npm test`, `npm run typecheck`,
  changed-file lint, and `npm run build`. Exercise installation and metadata
  on development and built output when those paths change.
