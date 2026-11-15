import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { IDBFactory } from "fake-indexeddb";
import { FieldFabric } from "./fabric.ts";
import { emitFlare, FLARE_DIRECTIONS } from "./flare.ts";
import { ORIGIN_ID } from "./event.ts";

const span = { source: "codex.md", sha256: "a".repeat(64), start: 7, end: 18, text: "source span" };
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

test("FLARE retains a candidate followed by five typed evidence siblings and original ancestry", async () => {
  const field = new FieldFabric();
  const source = await field.boot();
  const before = JSON.stringify(source);
  const queries: string[] = [];
  const result = await emitFlare(field, "Preserve source", async (query) => {
    queries.push(query);
    return [span];
  });
  assert.equal(JSON.stringify(source), before);
  assert.equal(result.source.event_id, source.event_id);
  assert.equal(result.candidate.source, "USER_SOURCE");
  assert.deepEqual(result.candidate.parents, [source.event_id]);
  assert.equal(result.branches.length, 5);
  assert.match(queries[1]!, /counterexample contradiction/);
  for (const branch of result.branches) {
    assert.equal(branch.origin_id, ORIGIN_ID);
    assert.equal(branch.source, "PLATFORM_RECORD");
    assert.deepEqual(branch.parents, [result.candidate.event_id]);
    assert.ok(branch.ancestors.includes(source.event_id));
    assert.deepEqual(JSON.parse(branch.content).evidence, [span]);
  }
  assert.deepEqual(
    result.branches.map((branch) => JSON.parse(branch.content).direction),
    [...FLARE_DIRECTIONS],
  );
});

test("repeating a target creates fresh siblings with one stable source ancestor", async () => {
  const field = new FieldFabric();
  const first = await emitFlare(field, "Same target", async () => []);
  const second = await emitFlare(field, "Same target", async () => []);
  assert.equal(first.source.event_id, second.source.event_id);
  const ids = [first.candidate, ...first.branches, second.candidate, ...second.branches].map(
    (event) => event.event_id,
  );
  assert.equal(new Set(ids).size, 12);
});

test("retrieval failure is recorded and later directions still emit", async () => {
  const field = new FieldFabric();
  const result = await emitFlare(field, "Target", async (_query, direction) => {
    if (direction === "pattern_break") throw new Error("source unavailable");
    return [span];
  });
  assert.equal(result.branches.length, 5);
  assert.match(result.branches[1]!.content, /source unavailable/);
  assert.ok(result.branches[1]!.assertions.includes("RETRIEVAL_ERROR"));
  assert.deepEqual(JSON.parse(result.branches[4]!.content).evidence, [span]);
});

test("retrieval packets obey the serialized byte budget and reject malformed addresses", async () => {
  const field = new FieldFabric();
  const result = await emitFlare(
    field,
    "Target",
    async (_query, direction) =>
      direction === "unknowns"
        ? [{ ...span, start: -1 }]
        : [span, { ...span, text: "Ω".repeat(1000) }],
    512,
  );
  for (const branch of result.branches) {
    assert.ok(
      new TextEncoder().encode(JSON.stringify(JSON.parse(branch.content).evidence)).length <= 512,
    );
  }
  assert.ok(result.branches[4]!.assertions.includes("RETRIEVAL_ERROR"));
});
