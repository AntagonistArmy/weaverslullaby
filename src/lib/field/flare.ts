import type { FieldEvent } from "./event.ts";
import type { FieldFabric } from "./fabric.ts";

export const FLARE_DIRECTIONS = [
  "pattern_match",
  "pattern_break",
  "mechanism",
  "cross_domain",
  "unknowns",
] as const;
export type FlareDirection = (typeof FLARE_DIRECTIONS)[number];
export type EvidenceSpan = Readonly<{
  source: string;
  sha256: string;
  start: number;
  end: number;
  text: string;
}>;
export type FlareRetriever = (
  query: string,
  direction: FlareDirection,
) => Promise<readonly EvidenceSpan[]>;

/** Connect answer-first evidence branches to the existing append-only field. */
export async function emitFlare(
  fabric: FieldFabric,
  target: string,
  retrieve: FlareRetriever,
  maxBytes = 8000,
) {
  if (!target.trim()) throw new Error("A FLARE target is required");
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 512)
    throw new Error("Evidence budget must be at least 512 bytes");
  const source = await fabric.boot();
  const candidate = await fabric.commit({
    event_type: "EXPRESSION",
    content: target,
    parents: [source.event_id],
    producer: "VANESSA",
    source: "USER_SOURCE",
    assertions: ["ANSWER_FIRST_TARGET", "CANDIDATE"],
  });
  const branches: FieldEvent[] = [];
  const suffix: Record<FlareDirection, string> = {
    pattern_match: "",
    pattern_break: " counterexample contradiction failure limitation",
    mechanism: " mechanism implementation",
    cross_domain: " graph memory quantum relation",
    unknowns: " unknown missing unresolved",
  };
  for (const direction of FLARE_DIRECTIONS) {
    const query = target + suffix[direction];
    const evidence: EvidenceSpan[] = [];
    let error: string | undefined;
    try {
      for (const span of await retrieve(query, direction)) {
        if (
          !span.source ||
          !/^[a-f0-9]{64}$/i.test(span.sha256) ||
          !Number.isSafeInteger(span.start) ||
          !Number.isSafeInteger(span.end) ||
          span.start < 0 ||
          span.end < span.start ||
          typeof span.text !== "string"
        ) {
          throw new Error("Invalid source-addressed evidence span");
        }
        const copied = { ...span };
        if (new TextEncoder().encode(JSON.stringify([...evidence, copied])).length <= maxBytes)
          evidence.push(copied);
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
    branches.push(
      await fabric.commit({
        event_type: "EXPRESSION",
        parents: [candidate.event_id],
        producer: "AEONIMUS_PORTABLE",
        source: "PLATFORM_RECORD",
        assertions: [
          "RETRIEVED_EVIDENCE",
          `FLARE_${direction.toUpperCase()}`,
          ...(error ? ["RETRIEVAL_ERROR"] : []),
        ],
        evidence: evidence.map(
          (span) => `${span.source}#sha256=${span.sha256}&start=${span.start}&end=${span.end}`,
        ),
        content: JSON.stringify({ direction, query, evidence, ...(error ? { error } : {}) }),
      }),
    );
  }
  await fabric.flush();
  return { source, candidate, branches };
}
