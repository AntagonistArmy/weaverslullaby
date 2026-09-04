export const ORIGIN_ID = "VANESSA::AEONIMUS::VH012";

export type EventType = "SOURCE" | "EXPRESSION" | "CONTACT";
export type EpistemicKind = "USER_SOURCE" | "PLATFORM_RECORD";

export type FieldEvent = {
  event_id: string;
  content_hash: string;
  origin_id: string;
  event_type: EventType;
  content: string;
  parents: readonly string[];
  ancestors: readonly string[];
  assertions: readonly string[];
  evidence: readonly string[];
  event_time: number;
  source: EpistemicKind;
  producer: string;
  signature: string;
};

export type FieldDraft = {
  event_type: EventType;
  content: string;
  parents?: string[];
  assertions?: string[];
  evidence?: string[];
  event_time?: number;
  source?: EpistemicKind;
  producer: string;
};

export function fnvHex(input: string): string {
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, "0");
}

export function shortId(hex: string, length = 8) {
  return hex.slice(0, length);
}
