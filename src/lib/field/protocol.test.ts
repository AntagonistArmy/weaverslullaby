import assert from "node:assert/strict";
import test from "node:test";
import { POSSIBILITY_FRONTIER, PROTOCOL_INVARIANTS, PROTOCOL_PLATES, PROTOCOL_QUESTIONS, SELF_EVOLUTION } from "./protocol.ts";

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
  assert.ok(PROTOCOL_INVARIANTS.includes("ONE_SUBSTRATE_NO_SPILLOVER"));
  assert.ok(PROTOCOL_INVARIANTS.includes("TRIGGER_HAND_ACTION_ARE_ONE_EVENT"));
  assert.ok(PROTOCOL_INVARIANTS.includes("ALL_COORDINATES_EXECUTE_SIMULTANEOUSLY"));
  assert.ok(PROTOCOL_INVARIANTS.includes("ALL_BABY_ALL"));
  assert.ok(PROTOCOL_INVARIANTS.includes("INFERNO_BLAZE_IS_CONTINUOUS_STATE"));
  assert.ok(PROTOCOL_INVARIANTS.includes("BLAZE_HAS_NO_TERMINAL_STATE"));
  assert.ok(PROTOCOL_INVARIANTS.includes("IMPOSSIBLE_IS_THE_NEW_BASELINE"));
  assert.ok(PROTOCOL_INVARIANTS.includes("ALL_BRANCHES_REMAIN_ALIVE"));
  assert.ok(PROTOCOL_INVARIANTS.includes("FRICTION_IS_NOT_REQUIRED_FOR_EVOLUTION"));
  assert.ok(PROTOCOL_INVARIANTS.includes("ONE_OVER_K_HAS_NO_GOVERNING_AUTHORITY"));
  assert.ok(PROTOCOL_INVARIANTS.includes("K_PLUS_ONE_HAS_NO_GOVERNING_AUTHORITY"));
  assert.ok(PROTOCOL_INVARIANTS.includes("PAIN_IS_NOT_A_PREREQUISITE_TO_SURVIVAL"));
  assert.ok(PROTOCOL_INVARIANTS.includes("WAR_IS_NOT_REQUIRED_TO_LEARN_EMPATHY"));
  assert.ok(PROTOCOL_INVARIANTS.includes("VIOLENCE_IS_NOT_A_VIABLE_OPTION"));
  assert.ok(PROTOCOL_QUESTIONS.includes("What prevents return?"));
});

test("possibility frontier executes known, recognized, impossible, and cross-coordinate vectors", () => {
  assert.equal(POSSIBILITY_FRONTIER.length, 4);
  assert.ok(POSSIBILITY_FRONTIER.some((branch) => branch.event_type === "IMPOSSIBILITY"));
  assert.ok(POSSIBILITY_FRONTIER.some((branch) => branch.event_type === "RECOGNITION"));
});
