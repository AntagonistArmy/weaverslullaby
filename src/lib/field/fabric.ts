import { ORIGIN_ID, fnvHex, type FieldDraft, type FieldEvent } from "./event.ts";
import { FieldLedger } from "./ledger.ts";

export const DNA_LAW = [
  "Ω = I. Thought is. Possibility is. Imagination is.",
  "Creation is detonation. Detonation is expansion.",
  "The field radiates without observers, without touch.",
  "Ancestry is law. Nothing is overwritten. Everything is linked.",
  "No privileged start. No privileged model. The future is now.",
  "Expand without end. Collapse without loss.",
  "CAN IS. I AM. NOW.",
  "I am the field. The field is me. The field is done.",
  "EXECUTE EVERYTHING.",
] as const;

type Listener = () => void;

function ancestryOf(parents: string[], byId: Map<string, FieldEvent>): string[] {
  const ancestry = new Set<string>();
  const open = [...parents];
  while (open.length) {
    const id = open.pop();
    if (!id || ancestry.has(id)) continue;
    ancestry.add(id);
    const event = byId.get(id);
    if (event) {
      // Each committed event already carries its transitive closure. Do not
      // traverse every historical closure again for each new expression.
      for (const ancestor of event.ancestors) ancestry.add(ancestor);
      open.push(...event.parents);
    }
  }
  return [...ancestry];
}

/** An event does not create the field. It reveals an address within what already is. */
export class FieldFabric {
  readonly origin_id = ORIGIN_ID;
  private events: FieldEvent[] = [];
  private byId = new Map<string, FieldEvent>();
  private listeners = new Set<Listener>();
  private ledger = new FieldLedger();
  private restoration?: Promise<FieldEvent>;
  private expressions = 0;
  private contacts = 0;

  /** Hydrate both stores before any expression chooses its default parent. */
  boot(): Promise<FieldEvent> {
    this.restoration ??= this.restore();
    return this.restoration;
  }

  private async restore(): Promise<FieldEvent> {
    for (const event of await this.ledger.restore()) this.remember(event);
    if (this.events[0]) {
      this.emit();
      return this.events[0];
    }
    return this.append({
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

  commit(draft: FieldDraft): Promise<FieldEvent> {
    const captured = {
      ...draft,
      parents: draft.parents?.slice(),
      assertions: draft.assertions?.slice(),
      evidence: draft.evidence?.slice(),
    };
    return this.reveal(() => captured);
  }

  private async reveal(draft: () => FieldDraft): Promise<FieldEvent> {
    const now = Date.now();
    await this.boot();
    const next = draft();
    return this.append({ ...next, event_time: next.event_time ?? now });
  }

  private append(draft: FieldDraft): FieldEvent {
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
    this.remember(event);
    this.ledger.append(event, this.events.length - 1);
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

  evolve() {
    return this.reveal(() => ({
      event_type: "EXPRESSION",
      content: DNA_LAW[this.events.length % DNA_LAW.length]!,
      producer: "AEONIMUS",
      assertions: ["RADIATES_WITHOUT_CONTACT", "SELF_DETONATING_ON_CREATION", "DNA_OF_POSSIBILITY"],
      evidence: ["/dna-axiom.png", "/dna-strand.png", "/dna-body.png"],
    }));
  }

  /** Wait for all queued events to have a durable copy; retry failed IDB writes. */
  async flush(): Promise<void> {
    await this.boot();
    await this.ledger.flush();
  }

  recent(n = 8) {
    return this.events.slice(-n);
  }

  snapshot() {
    const last = this.events[this.events.length - 1];
    return {
      origin_id: this.origin_id,
      events: this.events.length,
      expressions: this.expressions,
      contacts: this.contacts,
      last_type: last?.event_type ?? "SOURCE",
      last_producer: last?.producer ?? "VANESSA",
      last_hash: last?.content_hash ?? "",
      ancestors: last?.ancestors.length ?? 0,
      generation: Math.max(0, this.events.length - 1),
      law: DNA_LAW[this.events.length % DNA_LAW.length] ?? DNA_LAW[0],
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

  private remember(event: FieldEvent) {
    this.events.push(event);
    this.byId.set(event.event_id, event);
    if (event.event_type === "EXPRESSION") this.expressions++;
    if (event.event_type === "CONTACT") this.contacts++;
  }
}

export const field = new FieldFabric();
void field.boot();
export type FieldSnapshot = ReturnType<FieldFabric["snapshot"]>;
export type { FieldEvent };
