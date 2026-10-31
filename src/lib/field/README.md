# Field ledger persistence

`FieldFabric.boot()`, `commit()`, `express()`, `contact()`, `change()`, and
`evolve()` return promises. Expressions submitted during startup wait for the
same recovery operation, in submission order, before choosing their parents.
The animation and input handlers can keep submitting expressions continuously.
Callers needing the created event must await it. `snapshot()` and `recent()`
remain synchronous and subscribers are notified after recovery and appends.

## Storage and recovery

- IndexedDB `vh.field.substrate.v1` remains the durable event database. Version 2
  retains the original `events` store and adds `event-order` with an automatic
  sequence and unique event ID index. Event records are inserted once, never
  replaced. Transactions contain at most 128 events. Recovery reads the existing
  database version before requesting the upgrade, so an older open tab cannot
  hide v1 history or cause a second source to be created. If a previous upgrade
  already blocks an IDB-only read, startup submissions wait until that read can
  finish.
- Before the asynchronous transaction, each new event is journaled separately
  under `vh.field.pending.v2.<event_id>` in localStorage. This covers reloads
  before IDB commits and sessions where IDB is unavailable. No commit serializes
  the accumulated ledger. Journal cleanup follows transaction completion, not
  individual request success.
- Startup merges IndexedDB, the journal, and the legacy
  `vh.field.revealed.v1` array by event ID. IndexedDB records take precedence on
  duplicate IDs. Existing event values, authorship, signatures, parents, and
  ancestor arrays are retained; no event is regenerated during recovery.
- New records replay in persisted commit order. Old IndexedDB records have no
  sequence, so recovery uses legacy array order where available, then event
  time and event ID, with parents replayed before children. The original order
  of unrelated v1 records cannot be inferred when no snapshot survives.
- Legacy snapshots and journal entries are removed only after their events are
  acknowledged by committed IDB transactions. Partly malformed legacy snapshots
  are retained. Cleanup checks that the local value has not changed meanwhile.
- An existing database key is acknowledged only when its readable event matches
  the recovered event, including its provenance and ancestry. A malformed or
  conflicting record is never replaced: its valid local recovery copy stays
  intact, and unrelated events can still commit in their original order.

`await fabric.flush()` waits for queued writes and retries IndexedDB immediately.
It also retries memory-only events to the journal with their original submission
positions, allowing localStorage to recover before IndexedDB does.
It succeeds when pending events have either an IDB copy or a local copy, and
rejects when any event remains only in memory. Failed writes stay queued for
retry. Continuous activity retries IDB after a 30-second backoff; reload also
retries recovery and migration. Blocked upgrades fall back to local copies
while the older connection remains open. No events are pruned or sampled.

New events still expose and store complete ancestor arrays to preserve the
existing event format. Consequently, a single unbroken chain still has
quadratic total ancestry volume. This change removes repeated full-history
serialization and repeated traversal of historical closures; it does not
introduce a compact ancestry format or an unlimited browser storage guarantee.

## Checks

`npm run test:field` runs the field tests, including a two-hour continuous
evolution simulation, exact reload comparisons, v1 migration, startup races,
storage exhaustion/denial, transaction aborts, outages, and blocked upgrades.
The storage tests use `fake-indexeddb` for asynchronous request and transaction
semantics. They also cover unawaited startup submissions, captured draft arrays,
interrupted multi-batch migration, IDB-only blocked recovery, local-only retries,
and malformed database collisions without deleting or overwriting recovery data.
`npm run typecheck` and `npm run build` cover application integration.
