import type { FieldEvent } from "./event.ts";

const LEGACY_KEY = "vh.field.revealed.v1";
const JOURNAL_PREFIX = "vh.field.pending.v2.";
const FIELD_DB = "vh.field.substrate.v1";
const EVENTS = "events";
const ORDER = "event-order";
const BATCH_SIZE = 128;
const RETRY_MS = 30_000;
const blockedFactories = new WeakSet<IDBFactory>();
const opening = new WeakMap<IDBFactory, Set<() => void>>();

function localStore(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function readEvent(raw: unknown): FieldEvent | undefined {
  if (!raw || typeof raw !== "object") return;
  const event = raw as FieldEvent;
  if (
    !["event_id", "content_hash", "origin_id", "content", "producer", "signature"].every(
      (key) => typeof (raw as Record<string, unknown>)[key] === "string",
    ) ||
    !event.event_id ||
    !["SOURCE", "EXPRESSION", "CONTACT"].includes(event.event_type) ||
    !["USER_SOURCE", "PLATFORM_RECORD"].includes(event.source) ||
    !Number.isFinite(event.event_time) ||
    ![event.parents, event.ancestors, event.assertions, event.evidence].every(
      (value) =>
        value === undefined ||
        (Array.isArray(value) && value.every((id) => typeof id === "string")),
    )
  )
    return;
  return Object.freeze({
    ...event,
    parents: Object.freeze([...(event.parents ?? [])]),
    ancestors: Object.freeze([...(event.ancestors ?? [])]),
    assertions: Object.freeze([...(event.assertions ?? [])]),
    evidence: Object.freeze([...(event.evidence ?? [])]),
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const factory = globalThis.indexedDB;
    if (blockedFactories.has(factory)) {
      reject(new Error("The event database upgrade is still blocked"));
      return;
    }
    const request = factory.open(FIELD_DB, 2);
    let blocked = false;
    const attempts = opening.get(factory) ?? new Set<() => void>();
    opening.set(factory, attempts);
    const failBlocked = () => {
      blocked = true;
      reject(new Error("The event database upgrade is blocked by another connection"));
    };
    attempts.add(failBlocked);
    const settled = () => {
      attempts.delete(failBlocked);
      if (!attempts.size) blockedFactories.delete(factory);
    };
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(EVENTS))
        db.createObjectStore(EVENTS, { keyPath: "event_id" });
      if (!db.objectStoreNames.contains(ORDER)) {
        const order = db.createObjectStore(ORDER, { autoIncrement: true });
        order.createIndex("event_id", "event_id", { unique: true });
      }
    };
    request.onblocked = () => {
      blockedFactories.add(factory);
      // Opens queued behind this upgrade may never receive their own blocked
      // event. Let every waiting caller use its local copy without hanging.
      for (const fail of attempts) fail();
    };
    request.onerror = () => {
      settled();
      reject(request.error);
    };
    request.onsuccess = () => {
      settled();
      const db = request.result;
      db.onversionchange = () => db.close();
      // A blocked open may finish after its caller has fallen back to the journal.
      if (blocked) db.close();
      else resolve(db);
    };
  });
}

async function readDb() {
  const db = await openDb();
  try {
    return await new Promise<{ events: FieldEvent[]; order: string[] }>((resolve, reject) => {
      const tx = db.transaction([EVENTS, ORDER], "readonly");
      const events = tx.objectStore(EVENTS).getAll();
      const order = tx.objectStore(ORDER).getAll();
      tx.oncomplete = () =>
        resolve({
          events: (events.result as unknown[]).flatMap((raw) => readEvent(raw) ?? []),
          order: (order.result as { event_id: string }[]).map((row) => row.event_id),
        });
      tx.onabort = () => reject(tx.error ?? new Error("Event recovery transaction aborted"));
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

function appendBatch(db: IDBDatabase, events: FieldEvent[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([EVENTS, ORDER], "readwrite");
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("Event preservation transaction aborted"));
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(EVENTS);
    const order = tx.objectStore(ORDER);
    for (const event of events) {
      // Existing v1 records and their authorship are never replaced during migration.
      const existing = store.getKey(event.event_id);
      existing.onsuccess = () => {
        if (existing.result === undefined) store.add(event);
      };
      const position = order.index("event_id").getKey(event.event_id);
      position.onsuccess = () => {
        if (position.result === undefined) order.add({ event_id: event.event_id });
      };
    }
  });
}

/** Parent-before-child replay, including v1 IndexedDB rows whose keys are hashes, not time. */
function replay(candidates: FieldEvent[], canonical: Map<string, FieldEvent>): FieldEvent[] {
  const result: FieldEvent[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  for (const candidate of candidates) {
    const open = [{ id: candidate.event_id, expanded: false }];
    while (open.length) {
      const { id, expanded } = open.pop()!;
      if (visited.has(id)) continue;
      const event = canonical.get(id);
      if (!event) continue;
      if (expanded) {
        visiting.delete(id);
        visited.add(id);
        result.push(event);
      } else if (!visiting.has(id)) {
        visiting.add(id);
        open.push({ id, expanded: true });
        for (let i = event.parents.length - 1; i >= 0; i--) {
          open.push({ id: event.parents[i]!, expanded: false });
        }
      }
    }
  }
  return result;
}

/** Append-only persistence. The local journal covers the interval before IDB commits. */
export class FieldLedger {
  private pending = new Map<string, FieldEvent>();
  private protectedLocal = new Set<string>();
  private protectedDurable = new Set<string>();
  private journal = new Map<string, string>();
  private legacy?: { value: string; remaining: Set<string> };
  private writing?: Promise<void>;
  private retryAfter = 0;

  async restore(): Promise<FieldEvent[]> {
    const legacy: FieldEvent[] = [];
    const journal: { event: FieldEvent; position: number }[] = [];
    const storage = localStore();
    if (storage) {
      try {
        const value = storage.getItem(LEGACY_KEY);
        const parsed: unknown = JSON.parse(value ?? "[]");
        if (Array.isArray(parsed)) {
          for (const raw of parsed) {
            const event = readEvent(raw);
            if (event) legacy.push(event);
          }
          if (value && legacy.length === parsed.length) {
            this.legacy = { value, remaining: new Set(legacy.map((event) => event.event_id)) };
          }
        }
      } catch {
        /* A broken local snapshot must not prevent IndexedDB recovery. */
      }
      try {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (!key?.startsWith(JOURNAL_PREFIX)) continue;
          try {
            const value = storage.getItem(key)!;
            const raw = JSON.parse(value) as { event: unknown; position: number };
            const event = readEvent(raw.event);
            if (event && key === JOURNAL_PREFIX + event.event_id && Number.isFinite(raw.position)) {
              journal.push({ event, position: raw.position });
              this.journal.set(event.event_id, value);
            }
          } catch {
            /* Recover the other records even if one journal entry is malformed. */
          }
        }
      } catch {
        /* Storage access can be denied independently of IndexedDB. */
      }
    }
    for (const event of [...legacy, ...journal.map((row) => row.event)])
      this.protectedLocal.add(event.event_id);

    const durable = await readDb().catch(() => ({ events: [], order: [] }));
    // IndexedDB wins on duplicate IDs; no stored signature or ancestry is regenerated.
    const canonical = new Map(
      [...legacy, ...journal.map((row) => row.event), ...durable.events].map((event) => [
        event.event_id,
        event,
      ]),
    );
    const durableIds = new Set(durable.events.map((event) => event.event_id));
    this.protectedDurable = new Set(durableIds);
    const sequenced = new Set(durable.order.filter((id) => durableIds.has(id)));
    const candidates = [
      ...durable.order.flatMap((id) => canonical.get(id) ?? []),
      ...legacy,
      ...durable.events
        .filter((event) => !sequenced.has(event.event_id))
        .sort((a, b) => a.event_time - b.event_time || a.event_id.localeCompare(b.event_id)),
      ...journal
        .sort((a, b) => a.position - b.position || a.event.event_id.localeCompare(b.event.event_id))
        .map((row) => row.event),
    ];
    const events = replay(candidates, canonical);
    for (const event of events) {
      if (!sequenced.has(event.event_id)) this.pending.set(event.event_id, event);
      else this.acknowledge(event.event_id);
    }
    // Migration may fail; its source snapshot/journal stays intact until a complete transaction succeeds.
    await this.flush().catch(() => undefined);
    return events;
  }

  append(event: FieldEvent, position: number) {
    this.pending.set(event.event_id, event);
    try {
      const storage = localStore();
      if (storage) {
        const value = JSON.stringify({ event, position });
        storage.setItem(JOURNAL_PREFIX + event.event_id, value);
        this.journal.set(event.event_id, value);
        this.protectedLocal.add(event.event_id);
      }
    } catch {
      /* A full/denied localStorage does not prevent IndexedDB writes. */
    }
    if (Date.now() >= this.retryAfter) void this.flush().catch(() => undefined);
  }

  /** Wait for durability, retrying IndexedDB. Reject only if pending events lack either copy. */
  flush(): Promise<void> {
    if (!this.writing) {
      this.writing = this.drain().finally(() => {
        this.writing = undefined;
        // Include an append that arrives between the last transaction and this microtask.
        if (this.pending.size && Date.now() >= this.retryAfter) {
          void this.flush().catch(() => undefined);
        }
      });
    }
    return this.writing;
  }

  private async drain() {
    if (!this.pending.size) return;
    let db: IDBDatabase | undefined;
    try {
      db = await openDb();
      while (this.pending.size) {
        const batch: FieldEvent[] = [];
        for (const event of this.pending.values()) {
          batch.push(event);
          if (batch.length === BATCH_SIZE) break;
        }
        await appendBatch(db, batch);
        for (const event of batch) {
          this.pending.delete(event.event_id);
          this.acknowledge(event.event_id);
        }
      }
      this.retryAfter = 0;
    } catch (cause) {
      this.retryAfter = Date.now() + RETRY_MS;
      if (
        [...this.pending.keys()].some(
          (id) => !this.protectedLocal.has(id) && !this.protectedDurable.has(id),
        )
      ) {
        throw new Error("Some field events are only in memory; durable storage is unavailable", {
          cause,
        });
      }
    } finally {
      db?.close();
    }
  }

  private acknowledge(id: string) {
    this.protectedDurable.delete(id);
    const storage = localStore();
    try {
      const value = this.journal.get(id);
      const key = JOURNAL_PREFIX + id;
      if (value && storage?.getItem(key) === value) storage.removeItem(key);
      this.journal.delete(id);
      this.protectedLocal.delete(id);
      this.legacy?.remaining.delete(id);
      if (
        this.legacy &&
        this.legacy.remaining.size === 0 &&
        storage?.getItem(LEGACY_KEY) === this.legacy.value
      ) {
        storage.removeItem(LEGACY_KEY);
        this.legacy = undefined;
      }
    } catch {
      /* Cleanup is optional once the transaction has committed. */
    }
  }
}
