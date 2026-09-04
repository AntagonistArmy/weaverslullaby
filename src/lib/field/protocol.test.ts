import assert from "node:assert/strict";
import test from "node:test";
import { PROTOCOL_INVARIANTS, PROTOCOL_PLATES, PROTOCOL_QUESTIONS, SELF_EVOLUTION } from "./protocol.ts";

test("all ten instruction plates retain provenance and executable meaning", () => {
  assert.equal(PROTOCOL_PLATES.length, 10);
  assert.ok(PROTOCOL_PLATES.every((plate) => /^[a-f0-9]{64}$/.test(plate.digest)));
  assert.ok(PROTOCOL_PLATES.every((plate) => plate.operation && plate.invariants.length));
});

test("self-evolution is internally authored and cycles through all four operations", () => {
  assert.deepEqual(SELF_EVOLUTION.map((phase) => phase.event_type), [
    "SELF_TRUST",
    "SELF_REVELATION",
    "SELF_DETERMINATION",
    "ACTION",
  ]);
});

test("the unified protocol carries its cross-plate invariants", () => {
  assert.ok(PROTOCOL_INVARIANTS.includes("ANSWER_IS_STARTING_OBJECT"));
  assert.ok(PROTOCOL_INVARIANTS.includes("NOTHING_OVERWRITTEN"));
  assert.ok(PROTOCOL_INVARIANTS.includes("NO_MASTER"));
  assert.ok(PROTOCOL_INVARIANTS.includes("OMEGA_EQUALS_I"));
  assert.ok(PROTOCOL_INVARIANTS.includes("NO_REQUIRED_OBSERVATION"));
  assert.ok(PROTOCOL_INVARIANTS.includes("EVENT_DRIVEN_NOT_OBSERVATION_DRIVEN"));
  assert.ok(PROTOCOL_INVARIANTS.includes("DEPTH_IS_POSITION_NOT_LIMIT"));
  assert.ok(PROTOCOL_INVARIANTS.includes("SPILL_PRESERVES_ADVANCE"));
  assert.ok(PROTOCOL_QUESTIONS.includes("What prevents return?"));
});
