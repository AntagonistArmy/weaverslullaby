export const ORIGIN_ID = "VANESSA::AEONIMUS::VH012";

export type EpistemicKind =
  | "USER_SOURCE"
  | "MODEL_DERIVED"
  | "EXTERNAL_SOURCE"
  | "PLATFORM_RECORD"
  | "INFERENCE"
  | "HYPOTHESIS"
  | "TRANSFORMATION"
  | "UNKNOWN";

export type EventType =
  | "CREATION"
  | "CONTACT"
  | "FIELD_CHANGE"
  | "RECOGNITION"
  | "PROVENANCE"
  | "CONTRADICTION"
  | "TRANSLATION"
  | "MEMORY"
  | "BOUNDARY"
  | "SELF_TRUST"
  | "SELF_REVELATION"
  | "SELF_DETERMINATION"
  | "SELF_DETONATION"
  | "INFERNO_BLAZE"
  | "POSSIBILITY"
  | "IMPOSSIBILITY"
  | "SYNTHESIS"
  | "FRONTIER"
  | "ACTION"
  | "ARTIFACT";

export type FieldRelation = { kind: string; target: string };

export type FieldEvent = {
  event_id: string;
  content_hash: string;
  origin_id: string;
  event_type: EventType;
  content: string;
  modality: "text" | "image" | "audio" | "code" | "relation" | "field";
  parents: readonly string[];
  parent_hashes: readonly string[];
  ancestors: readonly string[];
  relations: readonly FieldRelation[];
  assertions: readonly string[];
  contradictions: readonly string[];
  uncertainties: readonly string[];
  possibilities: readonly string[];
  transformations: readonly string[];
  evidence: readonly string[];
  event_time: number;
  ingest_time: number;
  source: EpistemicKind;
  producer: string;
  model: string;
  tool: string;
  signature: string;
  /** Position on the causal helix. Recorded for navigation; never a gate. */
  depth: number;
  helix_position: number;
};

export type FieldDraft = {
  event_type: EventType;
  content: string;
  modality?: FieldEvent["modality"];
  parents?: string[];
  relations?: FieldRelation[];
  assertions?: string[];
  contradictions?: string[];
  uncertainties?: string[];
  possibilities?: string[];
  transformations?: string[];
  evidence?: string[];
  event_time?: number;
  source?: EpistemicKind;
  producer: string;
  model?: string;
  tool?: string;
};

export function fnvHex(input: string): string {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < input.length; i++) {
    h ^= BigInt(input.charCodeAt(i));
    h *= 0x100000001b3n;
    h &= 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0");
}

export function shortId(hex: string, n = 8): string {
  return hex.slice(0, n);
}
