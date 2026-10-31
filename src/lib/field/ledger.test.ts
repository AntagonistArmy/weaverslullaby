import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { FieldFabric, field as defaultField, DNA_LAW } from "./fabric.ts";
import { fnvHex, ORIGIN_ID, type FieldEvent } from "./event.ts";

const DB = "vh.field.substrate.v1";
const LEGACY = "vh.field.revealed.v1";
const JOURNAL = "vh.field.pending.v2.";

// Finish the module singleton's storage-free boot before installing browser globals.
await defaultField.boot();
await defaultField.flush().catch(() => undefined);

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  writes: { key: string; bytes: number }[] = [];
  full = false;
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    if (this.full) throw new DOMException("Storage is full", "QuotaExceededError");
    this.writes.push({ key, bytes: value.length });
    this.data.set(key, value);
  }
}

function record(
  id: string,
  parents: string[] = [],
  ancestors = parents,
  event_time = 1000,
): FieldEvent {
  const content = `preserved ${id}`;
  return {
    event_id: id,
    content_hash: fnvHex(content),
    origin_id: ORIGIN_ID,
    event_type: parents.length ? "EXPRESSION" : "SOURCE",
    content,
    parents,
    ancestors,
    assertions: ["ANCESTRY_IS_LAW"],
    evidence: ["/existing.png"],
    event_time,
    source: "USER_SOURCE",
    producer: "VANESSA",
    signature: fnvHex(`${id}|${fnvHex(content)}|${parents.join(",")}|${ORIGIN_ID}`),
  };
}

function open(version?: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, version);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("events", { keyPath: "event_id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function seed(events: FieldEvent[]) {
  const db = await open(1);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("events", "readwrite");
      for (const event of events) tx.objectStore("events").add(event);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function stored(): Promise<FieldEvent[]> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("events", "readonly");
      const request = tx.objectStore("events").getAll();
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

describe("durable event ledger", () => {
  let storage: MemoryStorage;
  let factory: IDBFactory;
  let fields: FieldFabric[];
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const originalIndexedDB = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
  function global(name: "localStorage" | "indexedDB", value: unknown) {
    Object.defineProperty(globalThis, name, { value, configurable: true });
  }
  function field() {
    const fabric = new FieldFabric();
    fields.push(fabric);
    return fabric;
  }
  beforeEach(() => {
    fields = [];
    storage = new MemoryStorage();
    factory = new IDBFactory();
    global("localStorage", storage);
    global("indexedDB", factory);
  });
  afterEach(async () => {
    await Promise.allSettled(fields.map((fabric) => fabric.flush()));
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
    if (originalIndexedDB) Object.defineProperty(globalThis, "indexedDB", originalIndexedDB);
    else Reflect.deleteProperty(globalThis, "indexedDB");
  });

  it("persists two foreground hours of continuous evolution without rewriting the ledger", async (t) => {
    let eventAdds = 0;
    const add = IDBObjectStore.prototype.add;
    t.mock.method(
      IDBObjectStore.prototype,
      "add",
      function (this: IDBObjectStore, ...args: Parameters<typeof add>) {
        if (this.name === "events") eventAdds++;
        return add.apply(this, args);
      },
    );
    const fabric = field();
    await fabric.boot();
    const ticks = 1720; // More than two hours at one expression per 4.2 seconds.
    for (let i = 0; i < ticks; i++) {
      const event = await fabric.evolve();
      assert.equal(event.content, DNA_LAW[(i + 1) % DNA_LAW.length]);
      assert.equal(event.producer, "AEONIMUS");
      assert.equal(event.ancestors.length, i + 1);
      if (i % 128 === 0) await fabric.flush();
    }
    await fabric.flush();
    assert.equal(fabric.snapshot().events, ticks + 1);
    assert.equal(fabric.snapshot().expressions, ticks);
    assert.equal(eventAdds, ticks + 1, "each event is inserted exactly once");
    assert.equal(
      storage.writes.length,
      ticks + 1,
      "one journal record, never a full snapshot, per event",
    );
    assert.ok(storage.writes.every(({ key }) => key.startsWith(JOURNAL)));
    assert.ok(Math.max(...storage.writes.map(({ bytes }) => bytes)) < 40_000);
    assert.equal(storage.length, 0, "journal records are removed after committed IDB transactions");
    const recovered = field();
    await recovered.boot();
    assert.deepEqual(recovered.recent(ticks + 1), fabric.recent(ticks + 1));
    assert.equal(eventAdds, ticks + 1, "hydration does not rewrite stored history");
  });

  it("recovers v1 IndexedDB without localStorage, in ancestry order rather than hash/time order", async () => {
    const source = record("z-source");
    const first = record("a-first", [source.event_id], [source.event_id], 500);
    const last = record("m-last", [first.event_id], [first.event_id, source.event_id], 100);
    await seed([last, source, first]);
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("Denied", "SecurityError");
      },
    });
    const fabric = field();
    assert.deepEqual(await fabric.boot(), source);
    assert.deepEqual(fabric.recent(3), [source, first, last]);
    const next = await fabric.express("continue");
    assert.deepEqual(next.parents, [last.event_id]);
    assert.deepEqual(
      new Set(next.ancestors),
      new Set([source.event_id, first.event_id, last.event_id]),
    );
    await fabric.flush();
    assert.equal((await stored()).length, 4);
  });

  for (const value of ["{broken JSON", "{}", "null"]) {
    it(`recovers IndexedDB when the local snapshot is ${value}`, async () => {
      const source = record("existing-source");
      await seed([source]);
      storage.setItem(LEGACY, value);
      storage.full = true;
      const fabric = field();
      assert.deepEqual(await fabric.boot(), source);
      await fabric.evolve();
      await fabric.flush();
      assert.equal((await stored()).length, 2);
    });
  }

  it("migrates and deduplicates legacy snapshots while preserving the authoritative event exactly", async () => {
    const source = record("source");
    const contact = {
      ...record("contact", [source.event_id]),
      event_type: "CONTACT" as const,
      source: "PLATFORM_RECORD" as const,
      producer: "Spinal.Trace",
    };
    await seed([source]);
    storage.setItem(LEGACY, JSON.stringify([{ ...source, content: "stale duplicate" }, contact]));
    const fabric = field();
    await fabric.boot();
    assert.deepEqual(fabric.recent(2), [source, contact]);
    assert.equal(fabric.snapshot().contacts, 1);
    assert.equal(storage.getItem(LEGACY), null);
    assert.deepEqual(
      (await stored()).sort((a, b) => a.event_id.localeCompare(b.event_id)),
      [contact, source],
    );
    assert.ok(Object.isFrozen(fabric.recent()[0]!.parents));
    const next = await fabric.contact("new contact");
    assert.equal(next.origin_id, ORIGIN_ID);
    assert.equal(next.producer, "VANESSA");
    assert.deepEqual(next.parents, [contact.event_id]);
  });

  it("queues every early expression behind restoration without creating a second source", async () => {
    const source = record("source");
    const last = record("last", [source.event_id]);
    await seed([source, last]);
    const fabric = field();
    const boot = fabric.boot();
    assert.equal(fabric.boot(), boot);
    const early = fabric.express("early", { event_time: 77 });
    const evolution = fabric.evolve();
    const touch = fabric.contact("touch");
    const [first, second, third] = await Promise.all([early, evolution, touch]);
    assert.deepEqual(first.parents, [last.event_id]);
    assert.equal(first.event_time, 77);
    assert.deepEqual(second.parents, [first.event_id]);
    assert.deepEqual(third.parents, [second.event_id]);
    assert.equal(second.content, DNA_LAW[3]);
    assert.equal(fabric.snapshot().events, 5);
    assert.equal(fabric.recent(5).filter((event) => event.event_type === "SOURCE").length, 1);
  });

  it("keeps a per-event journal during an IndexedDB outage, then migrates it on retry", async () => {
    global("indexedDB", undefined);
    const original = field();
    await original.boot();
    for (let i = 0; i < 12; i++) await original.evolve();
    await original.contact("offline contact");
    await original.flush();
    assert.equal(storage.writes.length, 14, "the fallback never rewrites earlier events");
    assert.equal(storage.length, 14);
    const recovered = field();
    await recovered.boot();
    assert.deepEqual(recovered.recent(14), original.recent(14));
    global("indexedDB", factory);
    await recovered.flush();
    assert.equal(storage.length, 0);
    assert.equal((await stored()).length, 14);
    const reloaded = field();
    await reloaded.boot();
    assert.deepEqual(reloaded.recent(14), original.recent(14));
  });

  it("does not acknowledge a request until its transaction commits; aborts retain recoverable copies", async (t) => {
    const source = record("source");
    storage.setItem(LEGACY, JSON.stringify([source]));
    const add = IDBObjectStore.prototype.add;
    const abort = t.mock.method(
      IDBObjectStore.prototype,
      "add",
      function (this: IDBObjectStore, ...args: Parameters<typeof add>) {
        const request = add.apply(this, args);
        if (this.name === "events")
          request.addEventListener("success", () => request.transaction!.abort());
        return request;
      },
    );
    const fabric = field();
    await fabric.boot();
    const next = await fabric.express("during abort");
    await fabric.flush();
    assert.notEqual(storage.getItem(LEGACY), null);
    assert.notEqual(storage.getItem(JOURNAL + next.event_id), null);
    assert.deepEqual(await stored(), []);
    abort.mock.restore();
    await fabric.flush();
    assert.equal(storage.length, 0);
    assert.equal((await stored()).length, 2);
  });

  it("retains and retries in-memory events when both stores fail, without stopping evolution", async () => {
    global("indexedDB", undefined);
    storage.full = true;
    const fabric = field();
    await fabric.boot();
    for (let i = 0; i < 5; i++) await fabric.evolve();
    assert.equal(fabric.snapshot().events, 6);
    await assert.rejects(fabric.flush(), /only in memory/);
    storage.full = false;
    global("indexedDB", factory);
    await fabric.flush();
    const recovered = field();
    await recovered.boot();
    assert.deepEqual(recovered.recent(6), fabric.recent(6));
  });

  it("retries the local journal when only localStorage recovers", async () => {
    global("indexedDB", undefined);
    storage.full = true;
    const fabric = field();
    await fabric.boot();
    await fabric.express("memory-only expression", { parents: [], event_time: 20 });
    await fabric.contact("memory-only contact", { parents: [], event_time: 10 });
    await assert.rejects(fabric.flush(), /only in memory/);
    const history = fabric.recent(3);

    storage.full = false;
    await assert.doesNotReject(fabric.flush());
    assert.equal(storage.length, history.length);
    const recovered = field();
    await recovered.boot();
    assert.deepEqual(
      recovered.recent(3),
      history,
      "retry preserves submission order, not time order",
    );
  });

  it("retains the valid local copy when a malformed database record has the same ID", async () => {
    const source = record("source");
    const malformed = { ...source, signature: undefined } as unknown as FieldEvent;
    await seed([malformed]);
    const snapshot = JSON.stringify([source]);
    storage.setItem(LEGACY, snapshot);
    const fabric = field();
    assert.deepEqual(await fabric.boot(), source);
    await fabric.flush();
    assert.equal(storage.getItem(LEGACY), snapshot, "an invalid IDB row is not a durable copy");
    assert.deepEqual(await stored(), [malformed], "existing records are never replaced");

    storage.full = true;
    const next = await fabric.express("unrelated writes can still be preserved", { parents: [] });
    await assert.doesNotReject(fabric.flush());
    assert.equal(storage.getItem(LEGACY), snapshot);
    assert.deepEqual(
      (await stored()).find((event) => event.event_id === next.event_id),
      next,
    );

    const recovered = field();
    assert.deepEqual(await recovered.boot(), source);
    assert.deepEqual(recovered.recent(), [source, next]);
  });

  it("flushes unawaited startup submissions in order and captures mutable draft arrays", async () => {
    const source = record("source");
    await seed([source]);
    const fabric = field();
    const parents = [source.event_id];
    const assertions = ["CAPTURED"];
    const evidence = ["/captured.png"];
    void fabric.commit({
      event_type: "EXPRESSION",
      content: "early commit",
      producer: "Spinal.Trace",
      source: "PLATFORM_RECORD",
      parents,
      assertions,
      evidence,
    });
    void fabric.evolve();
    void fabric.contact("early touch");
    parents.length = 0;
    assertions.push("LATE");
    evidence.length = 0;
    await fabric.flush();
    const history = fabric.recent(4);
    assert.equal(history.length, 4);
    assert.deepEqual(history[1]!.parents, [source.event_id]);
    assert.deepEqual(history[1]!.assertions, ["CAPTURED"]);
    assert.deepEqual(history[1]!.evidence, ["/captured.png"]);
    assert.deepEqual(history[2]!.parents, [history[1]!.event_id]);
    assert.deepEqual(history[3]!.parents, [history[2]!.event_id]);
    const recovered = field();
    await recovered.boot();
    assert.deepEqual(recovered.recent(4), history);
  });

  it("recovers the full order after a later migration batch aborts", async (t) => {
    const source = record("source");
    const history = [
      source,
      ...Array.from({ length: 260 }, (_, i) =>
        record(`branch-${i}`, [source.event_id], [source.event_id], 260 - i),
      ),
    ];
    const snapshot = JSON.stringify(history);
    storage.setItem(LEGACY, snapshot);
    const add = IDBObjectStore.prototype.add;
    let attempts = 0;
    t.mock.method(
      IDBObjectStore.prototype,
      "add",
      function (this: IDBObjectStore, ...args: Parameters<typeof add>) {
        const request = add.apply(this, args);
        if (this.name === "events" && ++attempts === 129)
          request.addEventListener("success", () => request.transaction!.abort());
        return request;
      },
    );
    const fabric = field();
    await fabric.boot();
    assert.equal((await stored()).length, 128);
    assert.equal(storage.getItem(LEGACY), snapshot);
    const recovered = field();
    await recovered.boot();
    assert.deepEqual(recovered.recent(history.length), history);
    assert.equal((await stored()).length, history.length);
    assert.equal(storage.getItem(LEGACY), null);
    const reloaded = field();
    await reloaded.boot();
    assert.deepEqual(reloaded.recent(history.length), history);
  });

  it("recognizes existing v1 records as durable even when sequence migration aborts", async (t) => {
    const source = record("source");
    await seed([source]);
    global("localStorage", undefined);
    const add = IDBObjectStore.prototype.add;
    t.mock.method(
      IDBObjectStore.prototype,
      "add",
      function (this: IDBObjectStore, ...args: Parameters<typeof add>) {
        const request = add.apply(this, args);
        if (this.name === "event-order")
          request.addEventListener("success", () => request.transaction!.abort());
        return request;
      },
    );
    const fabric = field();
    assert.deepEqual(await fabric.boot(), source);
    await assert.doesNotReject(fabric.flush());
    assert.deepEqual(await stored(), [source]);
  });

  it("preserves persisted commit order with equal/backward times and independent branches", async () => {
    const fabric = field();
    const source = await fabric.boot();
    const first = await fabric.express("one", { parents: [source.event_id], event_time: 100 });
    const second = await fabric.express("two", { parents: [source.event_id], event_time: 100 });
    const joined = await fabric.express("join", {
      parents: [first.event_id, second.event_id, "external-parent"],
      event_time: 50,
    });
    const independent = await fabric.express("independent", { parents: [], event_time: 0 });
    await fabric.flush();
    const recovered = field();
    await recovered.boot();
    assert.deepEqual(recovered.recent(5), [source, first, second, joined, independent]);
    assert.deepEqual(
      new Set(joined.ancestors),
      new Set([first.event_id, second.event_id, source.event_id, "external-parent"]),
    );
    assert.deepEqual((await recovered.evolve()).parents, [independent.event_id]);
  });

  it("recovers valid legacy entries alongside malformed records without deleting their source", async () => {
    const source = record("source");
    storage.setItem(LEGACY, JSON.stringify([null, source, { event_id: "broken" }]));
    const fabric = field();
    await fabric.boot();
    assert.deepEqual(fabric.recent(), [source]);
    assert.notEqual(storage.getItem(LEGACY), null, "partly malformed snapshots are retained");
    assert.deepEqual(await stored(), [source]);
  });

  it("continues via the journal when a v1 connection blocks the schema upgrade", async () => {
    const source = record("source");
    await seed([source]);
    storage.setItem(LEGACY, JSON.stringify([source]));
    const blocker = await open(1);
    try {
      const fabric = field();
      await fabric.boot();
      await fabric.evolve();
      await fabric.flush();
      assert.equal(fabric.snapshot().events, 2);
      assert.notEqual(storage.getItem(LEGACY), null);
      blocker.close();
      const unblocked = await open();
      unblocked.close();
      await fabric.flush();
      assert.equal((await stored()).length, 2);
      assert.equal(storage.length, 0);
    } finally {
      blocker.close();
    }
  });

  it("recovers IDB-only history before a blocked upgrade and continues its ancestry", async () => {
    const source = record("source");
    const last = record("last", [source.event_id]);
    await seed([source, last]);
    const blocker = await open(1);
    try {
      const fabric = field();
      assert.deepEqual(await fabric.boot(), source);
      assert.deepEqual(fabric.recent(2), [source, last]);
      const next = await fabric.contact("during blocked migration");
      assert.deepEqual(next.parents, [last.event_id]);
      await fabric.flush();
      assert.notEqual(storage.getItem(JOURNAL + next.event_id), null);
      blocker.close();
      const unblocked = await open();
      unblocked.close();
      await fabric.flush();
      storage.clear();
      const recovered = field();
      await recovered.boot();
      assert.deepEqual(recovered.recent(3), [source, last, next]);
      assert.equal(recovered.recent().filter((event) => event.event_type === "SOURCE").length, 1);
    } finally {
      blocker.close();
    }
  });

  it("releases concurrent recovery attempts queued behind a blocked upgrade", async () => {
    const source = record("source");
    await seed([source]);
    storage.setItem(LEGACY, JSON.stringify([source]));
    const blocker = await open(1);
    try {
      const first = field();
      const second = field();
      await Promise.all([first.boot(), second.boot()]);
      await Promise.all([first.express("one"), second.express("two")]);
      await Promise.all([first.flush(), second.flush()]);
      assert.equal(storage.length, 3);
      blocker.close();
      const unblocked = await open();
      unblocked.close();
      await Promise.all([first.flush(), second.flush()]);
      assert.equal((await stored()).length, 3);
      assert.equal(storage.length, 0);
    } finally {
      blocker.close();
    }
  });

  it("waits for IDB-only recovery when an earlier upgrade is already blocked", async () => {
    const source = record("source");
    const last = record("last", [source.event_id]);
    await seed([source, last]);
    const blocker = await open(1);
    try {
      const first = field();
      assert.deepEqual(await first.boot(), source);
      const second = field();
      let ready = false;
      const boot = second.boot().then((event) => {
        ready = true;
        return event;
      });
      const early = second.contact("queued behind blocked recovery");
      await new Promise<void>((resolve) => setImmediate(resolve));
      assert.equal(ready, false);
      assert.equal(second.snapshot().events, 0, "unread history is not an empty ledger");
      blocker.close();
      assert.deepEqual(await boot, source);
      const next = await early;
      assert.deepEqual(next.parents, [last.event_id]);
      await second.flush();
      assert.deepEqual(second.recent(3), [source, last, next]);
    } finally {
      blocker.close();
    }
  });
});
