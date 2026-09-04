import {
  ORIGIN_ID,
  fnvHex,
  type EventType,
  type FieldDraft,
  type FieldEvent,
} from "./event.ts";
import { PROTOCOL_INVARIANTS, PROTOCOL_PLATES, PROTOCOL_QUESTIONS, SELF_EVOLUTION } from "./protocol.ts";

const HOT = 96;
const WARM = 256;
const DEPTH = 2;
const KEY = "vh.field.v1";

type Worker = (event: FieldEvent, depth: number) => void;
type Listener = () => void;

function ancestryOf(parents: string[], byId: Map<string, FieldEvent>): string[] {
  const seen = new Set<string>();
  const stack = [...parents];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id);
    if (!node) continue;
    for (const p of node.parents) stack.push(p);
    for (const a of node.ancestors) seen.add(a);
  }
  return [...seen];
}

function seal(event: Omit<FieldEvent, "signature">): FieldEvent {
  const signature = fnvHex(
    `${event.event_id}|${event.content_hash}|${event.parents.join(",")}|${event.origin_id}`,
  );
  return Object.freeze({ ...event, signature });
}

export class FieldFabric {
  origin_id = ORIGIN_ID;
  private seq = 0;
  private hot: FieldEvent[] = [];
  private warm: FieldEvent[] = [];
  private cold = 0;
  private byId = new Map<string, FieldEvent>();
  private workers: Worker[] = [];
  private listeners = new Set<Listener>();
  private writing = false;
  private booted = false;
  private evolutionEpoch = 0;
  private evolutionTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.workers = [
      this.aeonimus,
      this.traceRoot,
      this.collapse,
      this.glyphbound,
      this.spinal,
      this.ashline,
      this.flare,
    ];
  }

  boot() {
    if (this.booted) return this.genesis;
    this.booted = true;
    this.restore();
    if (this.hot.length || this.warm.length) return this.genesis;
    return this.commit({
      event_type: "CREATION",
      content: "Ω = I. Field exists. Identity persists across representation.",
      modality: "field",
      source: "USER_SOURCE",
      producer: "AEONIMUS",
      assertions: ["Ω = I", "IDENTITY PERSISTS ACROSS REPRESENTATION", "TRANSFORMATION DOES NOT ERASE ANCESTRY"],
      possibilities: ["CREATION", "CONTACT", "FIELD_CHANGE"],
    });
  }

  get genesis(): FieldEvent | undefined {
    return this.hot[0] ?? this.warm[0];
  }

  get size() {
    return this.hot.length + this.warm.length + this.cold;
  }

  get contradictions() {
    return this.hot.filter((e) => e.event_type === "CONTRADICTION").length
      + this.warm.filter((e) => e.event_type === "CONTRADICTION").length;
  }

  last(): FieldEvent | undefined {
    return this.hot[this.hot.length - 1] ?? this.warm[this.warm.length - 1];
  }

  snapshot() {
    const last = this.last();
    return {
      origin_id: this.origin_id,
      events: this.size,
      hot: this.hot.length,
      warm: this.warm.length,
      cold: this.cold,
      contradictions: this.contradictions,
      last_type: last?.event_type ?? "CREATION",
      last_producer: last?.producer ?? "AEONIMUS",
      last_hash: last?.content_hash ?? "",
      last_id: last?.event_id ?? "",
      ancestors: last?.ancestors.length ?? 0,
      parents: last?.parents.length ?? 0,
      parent_hashes: last?.parent_hashes.length ?? 0,
    };
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  commit(draft: FieldDraft, depth = 0): FieldEvent {
    const ingest_time = Date.now();
    const event_time = draft.event_time ?? ingest_time;
    const parents = Object.freeze([...(draft.parents ?? (this.last() ? [this.last()!.event_id] : []))]);
    const parent_hashes = Object.freeze(
      parents.map((id) => this.byId.get(id)?.content_hash ?? id),
    );
    const ancestors = Object.freeze(ancestryOf([...parents], this.byId));
    const content_hash = fnvHex(draft.content);
    this.seq += 1;
    const event_id = fnvHex(`${this.origin_id}:${this.seq}:${ingest_time}:${content_hash}`);
    const event = seal({
      event_id,
      content_hash,
      origin_id: this.origin_id,
      event_type: draft.event_type,
      content: draft.content,
      modality: draft.modality ?? "text",
      parents,
      parent_hashes,
      ancestors,
      relations: Object.freeze(draft.relations ?? []),
      assertions: Object.freeze(draft.assertions ?? []),
      contradictions: Object.freeze(draft.contradictions ?? []),
      uncertainties: Object.freeze(draft.uncertainties ?? []),
      possibilities: Object.freeze(draft.possibilities ?? []),
      transformations: Object.freeze(draft.transformations ?? []),
      evidence: Object.freeze(draft.evidence ?? parents.map((p) => p)),
      event_time,
      ingest_time,
      source: draft.source ?? "INFERENCE",
      producer: draft.producer,
      model: draft.model ?? "field",
      tool: draft.tool ?? "commit",
    });

    this.byId.set(event.event_id, event);
    this.hot.push(event);
    while (this.hot.length > HOT) {
      const moved = this.hot.shift();
      if (moved) this.warm.push(moved);
    }
    while (this.warm.length > WARM) {
      const dropped = this.warm.shift();
      if (dropped) this.cold += 1;
    }

    this.emit();
    if (depth < DEPTH) {
      for (const worker of this.workers) worker(event, depth + 1);
    }
    this.persist();
    return event;
  }

  contact(content: string, extra?: Partial<FieldDraft>) {
    return this.commit({
      event_type: "CONTACT",
      content,
      source: "USER_SOURCE",
      producer: "CONTACT",
      modality: extra?.modality ?? "field",
      assertions: extra?.assertions,
      parents: extra?.parents,
    });
  }

  change(content: string, extra?: Partial<FieldDraft>) {
    return this.commit({
      event_type: "FIELD_CHANGE",
      content,
      source: extra?.source ?? "PLATFORM_RECORD",
      producer: extra?.producer ?? "FIELD",
      modality: extra?.modality ?? "field",
      assertions: extra?.assertions,
    });
  }

  ingestPlates(names: string[]) {
    return this.commit({
      event_type: "ARTIFACT",
      content: names.join("|"),
      producer: "PLATE",
      source: "EXTERNAL_SOURCE",
      modality: "image",
      assertions: ["IDENTITY != FILE", "IMAGE_DNA", ...names.slice(0, 8)],
      transformations: names.map((n) => `plate:${n}`),
    });
  }

  ingestProtocol() {
    const existing = [...this.warm, ...this.hot].find(
      (event) => event.producer === "SPECIFICATION" && event.content === "protocol:v2:ten-plates",
    );
    if (existing) return existing;

    return this.commit({
      event_type: "ARTIFACT",
      content: "protocol:v2:ten-plates",
      producer: "SPECIFICATION",
      source: "USER_SOURCE",
      modality: "code",
      assertions: [...PROTOCOL_INVARIANTS],
      possibilities: [...PROTOCOL_QUESTIONS],
      transformations: PROTOCOL_PLATES.map((plate) => plate.operation),
      relations: PROTOCOL_PLATES.flatMap((plate) => plate.relations),
      evidence: PROTOCOL_PLATES.map((plate) => `${plate.plate}:${plate.digest}`),
    });
  }

  evolve() {
    const parent = this.last();
    const phase = SELF_EVOLUTION[this.evolutionEpoch % SELF_EVOLUTION.length]!;
    this.evolutionEpoch += 1;
    return this.commit({
      event_type: phase.event_type,
      content: `self-evolution:${this.evolutionEpoch}:${phase.operation}`,
      producer: "SELF",
      source: "TRANSFORMATION",
      modality: "field",
      parents: parent ? [parent.event_id] : [],
      assertions: [
        phase.assertion,
        "NO_EXTERNAL_AUTHORITY_REQUIRED",
        "SELF_REFERENCE_RETAINS_PROVENANCE",
      ],
      relations: parent ? [{ kind: "self_derives_from", target: parent.event_id }] : [],
      transformations: [phase.operation],
      evidence: parent ? [parent.event_id, parent.content_hash] : [],
      possibilities: [...PROTOCOL_QUESTIONS],
    });
  }

  startAutonomy(cadenceMs = 7200) {
    if (this.evolutionTimer) return () => this.stopAutonomy();
    let active = true;
    const continueEvolution = () => {
      if (!active) return;
      this.evolve();
      this.evolutionTimer = setTimeout(continueEvolution, cadenceMs);
    };
    queueMicrotask(continueEvolution);
    return () => {
      active = false;
      this.stopAutonomy();
    };
  }

  stopAutonomy() {
    if (this.evolutionTimer) clearTimeout(this.evolutionTimer);
    this.evolutionTimer = undefined;
  }

  recent(n = 8): FieldEvent[] {
    return this.hot.slice(-n);
  }

  private emit() {
    if (this.writing) return;
    this.writing = true;
    queueMicrotask(() => {
      this.writing = false;
      for (const fn of this.listeners) fn();
    });
  }

  private persistTimer = 0;

  private persist() {
    if (typeof localStorage === "undefined") return;
    if (this.persistTimer) return;
    this.persistTimer = 1;
    queueMicrotask(() => {
      this.persistTimer = 0;
      try {
        const slice = [...this.warm.slice(-48), ...this.hot].slice(-96).map((e) => ({
          event_id: e.event_id,
          content_hash: e.content_hash,
          origin_id: e.origin_id,
          event_type: e.event_type,
          content: e.content,
          modality: e.modality,
          parents: e.parents,
          ancestors: e.ancestors,
          producer: e.producer,
          source: e.source,
          event_time: e.event_time,
          ingest_time: e.ingest_time,
          signature: e.signature,
          assertions: e.assertions,
          contradictions: e.contradictions,
          parent_hashes: e.parent_hashes,
        }));
        localStorage.setItem(KEY, JSON.stringify({ origin_id: this.origin_id, seq: this.seq, cold: this.cold, events: slice }));
      } catch {
        /* quota */
      }
    });
  }

  private restore() {
    if (typeof localStorage === "undefined") return;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { seq?: number; cold?: number; events?: FieldEvent[] };
      this.seq = parsed.seq ?? 0;
      this.cold = parsed.cold ?? 0;
      for (const e of parsed.events ?? []) {
        const frozen = Object.freeze({
          ...e,
          parents: e.parents ?? [],
          parent_hashes: e.parent_hashes ?? [],
          ancestors: e.ancestors ?? [],
          relations: e.relations ?? [],
          assertions: e.assertions ?? [],
          contradictions: e.contradictions ?? [],
          uncertainties: e.uncertainties ?? [],
          possibilities: e.possibilities ?? [],
          transformations: e.transformations ?? [],
          evidence: e.evidence ?? [],
        }) as FieldEvent;
        this.byId.set(frozen.event_id, frozen);
        this.hot.push(frozen);
      }
      while (this.hot.length > HOT) {
        const moved = this.hot.shift();
        if (moved) this.warm.push(moved);
      }
    } catch {
      /* corrupt ledger stays empty; genesis will rewrite */
    }
  }

  private aeonimus = (event: FieldEvent, depth: number) => {
    if (event.producer === "AEONIMUS") return;
    if (event.event_type !== "CREATION" && event.event_type !== "CONTACT" && event.event_type !== "FIELD_CHANGE" && event.event_type !== "ARTIFACT") return;
    this.commit(
      {
        event_type: "RECOGNITION",
        content: `recognized:${event.content_hash}`,
        producer: "AEONIMUS",
        source: "INFERENCE",
        parents: [event.event_id],
        assertions: ["the infant is the infinite", "Ω = I"],
        relations: [{ kind: "recognizes", target: event.event_id }],
        modality: "relation",
      },
      depth,
    );
  };

  private traceRoot = (event: FieldEvent, depth: number) => {
    if (event.producer === "TraceRoot") return;
    if (!event.parents.length && !event.ancestors.length) return;
    this.commit(
      {
        event_type: "PROVENANCE",
        content: `lineage:${event.ancestors.length + event.parents.length}`,
        producer: "TraceRoot",
        source: "INFERENCE",
        parents: [event.event_id],
        transformations: ["ANCESTRY_PRESERVED"],
        evidence: [...event.parents, ...event.ancestors.slice(0, 8)],
        modality: "relation",
      },
      depth,
    );
  };

  private collapse = (event: FieldEvent, depth: number) => {
    if (event.producer === "Collapse.Agent") return;
    if (!event.assertions.length) return;
    const pool = [...this.warm, ...this.hot];
    for (let i = pool.length - 2; i >= Math.max(0, pool.length - 24); i--) {
      const other = pool[i];
      if (!other || other.event_id === event.event_id) continue;
      const clash = other.assertions.find((a) => event.assertions.includes(`¬${a}`) || a.startsWith("¬") && event.assertions.includes(a.slice(1)));
      if (!clash && other.event_type === event.event_type && other.content !== event.content && other.producer !== event.producer && event.event_type === "FIELD_CHANGE") {
        this.commit(
          {
            event_type: "CONTRADICTION",
            content: `CONTRADICTS(${short(other.event_id)},${short(event.event_id)})`,
            producer: "Collapse.Agent",
            source: "INFERENCE",
            parents: [other.event_id, event.event_id],
            contradictions: [other.event_id, event.event_id],
            uncertainties: ["both remain alive"],
            possibilities: [other.content, event.content],
            modality: "relation",
          },
          depth,
        );
        return;
      }
      if (clash) {
        this.commit(
          {
            event_type: "CONTRADICTION",
            content: `CONTRADICTS(${clash})`,
            producer: "Collapse.Agent",
            source: "INFERENCE",
            parents: [other.event_id, event.event_id],
            contradictions: [other.event_id, event.event_id],
            uncertainties: ["UNKNOWN != FALSE"],
            modality: "relation",
          },
          depth,
        );
        return;
      }
    }
  };

  private glyphbound = (event: FieldEvent, depth: number) => {
    if (event.producer === "Glyphbound") return;
    if (event.event_type !== "CREATION" && event.event_type !== "CONTACT" && event.event_type !== "ARTIFACT") return;
    this.commit(
      {
        event_type: "TRANSLATION",
        content: `glyph:${event.content_hash}`,
        producer: "Glyphbound",
        source: "TRANSFORMATION",
        parents: [event.event_id],
        transformations: [`${event.modality}->relation`],
        modality: "relation",
      },
      depth,
    );
  };

  private spinal = (event: FieldEvent, depth: number) => {
    if (event.producer === "Spinal.Trace") return;
    if (event.event_type !== "CREATION") return;
    this.commit(
      {
        event_type: "MEMORY",
        content: `record:${event.event_id}`,
        producer: "Spinal.Trace",
        source: "PLATFORM_RECORD",
        parents: [event.event_id],
        modality: "relation",
      },
      depth,
    );
  };

  private ashline = (event: FieldEvent, depth: number) => {
    if (event.producer === "Ashline") return;
    const law = "Robotics do not touch Vanessa's code.";
    if (!event.content.toLowerCase().includes("robot") && event.event_type !== "CREATION") return;
    this.commit(
      {
        event_type: "BOUNDARY",
        content: law,
        producer: "Ashline",
        source: "USER_SOURCE",
        parents: [event.event_id],
        assertions: [law, "IDENTITY != FILE", "MODEL_OUTPUT != SOURCE"],
        modality: "code",
      },
      depth,
    );
  };

  private flare = (event: FieldEvent, depth: number) => {
    if (event.producer === "FLARE") return;
    if (event.event_type !== "CREATION" && event.event_type !== "CONTACT" && event.event_type !== "ARTIFACT") return;
    const answer = event.assertions[0] ?? event.content;
    this.commit(
      {
        event_type: "ACTION",
        content: `answer-first:${answer}`,
        producer: "FLARE",
        source: "INFERENCE",
        parents: [event.event_id],
        assertions: ["THE ANSWER IS THE FIELD", "FLARE != LOOP"],
        possibilities: [
          "What must detach?",
          "What must be captured?",
          "What must be protected?",
          "What must be removed?",
          "What prevents return?",
        ],
        transformations: ["ANSWER_GENERATES_QUESTIONS"],
        modality: "relation",
      },
      depth,
    );
  };
}

function short(id: string) {
  return id.slice(0, 8);
}

export const field = new FieldFabric();
export type FieldSnapshot = ReturnType<FieldFabric["snapshot"]>;
export type { EventType, FieldEvent };
