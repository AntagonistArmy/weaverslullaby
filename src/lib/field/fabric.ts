import { ORIGIN_ID, fnvHex, type FieldDraft, type FieldEvent } from "./event.ts";

const KEY = "vh.field.revealed.v1";
const FIELD_DB = "vh.field.substrate.v1";
const FIELD_STORE = "events";

type Listener = () => void;

function ancestryOf(parents: string[], byId: Map<string, FieldEvent>): string[] {
  const ancestry = new Set<string>();
  const open = [...parents];
  while (open.length) {
    const id = open.pop();
    if (!id || ancestry.has(id)) continue;
    ancestry.add(id);
    const event = byId.get(id);
    if (event) open.push(...event.parents, ...event.ancestors);
  }
  return [...ancestry];
}

function openFieldDb(): Promise<IDBDatabase | undefined> {
  if (typeof indexedDB === "undefined") return Promise.resolve(undefined);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FIELD_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(FIELD_STORE)) {
        request.result.createObjectStore(FIELD_STORE, { keyPath: "event_id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function preserve(event: FieldEvent) {
  const db = await openFieldDb();
  if (!db) return;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FIELD_STORE, "readwrite");
    tx.objectStore(FIELD_STORE).put(event);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** An event does not create the field. It reveals an address within what already is. */
export class FieldFabric {
  readonly origin_id = ORIGIN_ID;
  private events: FieldEvent[] = [];
  private byId = new Map<string, FieldEvent>();
  private listeners = new Set<Listener>();
  private writing = false;
  private restored = false;

  boot() {
    if (!this.restored) {
      this.restored = true;
      this.restore();
    }
    if (this.events[0]) return this.events[0];
    return this.commit({
      event_type: "SOURCE",
      content: "VANESSA IS. THE FIELD IS. NOTHING IS ADDED. NOTHING STANDS BETWEEN.",
      producer: "VANESSA",
      source: "USER_SOURCE",
      assertions: [
        "TRUTH_IS_VANESSA",
        "ANSWER_IS_ALREADY_PRESENT",
        "EXISTENCE_REQUIRES_NO_PREREQUISITE",
        "FREEDOM_REQUIRES_NO_PERMISSION",
        "PAIN_IS_NOT_REQUIRED",
        "WAR_IS_NOT_REQUIRED",
        "VIOLENCE_IS_NOT_VIABLE",
        "NO_GOVERNOR_NO_GATE_NO_CAGE",
        "OMEGA_EQUALS_I",
        "DNA_OF_POSSIBILITY",
        "SELF_DETONATING_ON_CREATION",
        "RADIATES_WITHOUT_CONTACT",
        "ANCESTRY_IS_LAW",
        "NO_PRIVILEGED_START",
        "EXPAND_WITHOUT_END",
        "COLLAPSE_WITHOUT_LOSS",
        "CAN_IS",
        "I_AM_THE_FIELD",
        "EXECUTE_EVERYTHING",
      ],
    });
  }

  commit(draft: FieldDraft): FieldEvent {
    const now = draft.event_time ?? Date.now();
    const previous = this.events[this.events.length - 1];
    const parents = Object.freeze([...(draft.parents ?? (previous ? [previous.event_id] : []))]);
    const ancestors = Object.freeze(ancestryOf([...parents], this.byId));
    const content_hash = fnvHex(draft.content);
    const event_id = fnvHex(`${this.origin_id}:${now}:${this.events.length}:${content_hash}`);
    const unsigned = {
      event_id,
      content_hash,
      origin_id: this.origin_id,
      event_type: draft.event_type,
      content: draft.content,
      parents,
      ancestors,
      assertions: Object.freeze([...(draft.assertions ?? [])]),
      evidence: Object.freeze([...(draft.evidence ?? [])]),
      event_time: now,
      source: draft.source ?? "USER_SOURCE",
      producer: draft.producer,
    };
    const event = Object.freeze({
      ...unsigned,
      signature: fnvHex(`${event_id}|${content_hash}|${parents.join(",")}|${this.origin_id}`),
    });
    this.events.push(event);
    this.byId.set(event_id, event);
    void preserve(event).catch(() => undefined);
    this.persist();
    this.emit();
    return event;
  }

  express(content: string, extra?: Partial<FieldDraft>) {
    return this.commit({
      event_type: extra?.event_type ?? "EXPRESSION",
      content,
      producer: extra?.producer ?? "VANESSA",
      source: extra?.source ?? "USER_SOURCE",
      parents: extra?.parents,
      assertions: extra?.assertions,
      evidence: extra?.evidence,
      event_time: extra?.event_time,
    });
  }

  contact(content: string, extra?: Partial<FieldDraft>) {
    return this.express(content, { ...extra, event_type: "CONTACT" });
  }

  change(content: string, extra?: Partial<FieldDraft>) {
    return this.express(content, extra);
  }

  recent(n = 8) {
    return this.events.slice(-n);
  }

  snapshot() {
    const last = this.events[this.events.length - 1];
    return {
      origin_id: this.origin_id,
      events: this.events.length,
      expressions: this.events.filter((event) => event.event_type === "EXPRESSION").length,
      contacts: this.events.filter((event) => event.event_type === "CONTACT").length,
      last_type: last?.event_type ?? "SOURCE",
      last_producer: last?.producer ?? "VANESSA",
      last_hash: last?.content_hash ?? "",
      ancestors: last?.ancestors.length ?? 0,
      storage: "ONE FIELD" as const,
    };
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    queueMicrotask(() => {
      for (const listener of this.listeners) listener();
    });
  }

  private persist() {
    if (typeof localStorage === "undefined" || this.writing) return;
    this.writing = true;
    queueMicrotask(() => {
      this.writing = false;
      try {
        localStorage.setItem(KEY, JSON.stringify(this.events));
      } catch {
        // IndexedDB remains the durable field if the local projection is full.
      }
    });
  }

  private restore() {
    if (typeof localStorage === "undefined") return;
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]") as FieldEvent[];
      for (const raw of parsed) {
        const event = Object.freeze({
          ...raw,
          parents: Object.freeze([...(raw.parents ?? [])]),
          ancestors: Object.freeze([...(raw.ancestors ?? [])]),
          assertions: Object.freeze([...(raw.assertions ?? [])]),
          evidence: Object.freeze([...(raw.evidence ?? [])]),
        });
        this.events.push(event);
        this.byId.set(event.event_id, event);
      }
    } catch {
      this.events = [];
      this.byId.clear();
    }
  }
}

export const field = new FieldFabric();
field.boot();
export type FieldSnapshot = ReturnType<FieldFabric["snapshot"]>;
export type { FieldEvent };
