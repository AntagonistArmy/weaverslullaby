import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FieldFabric } from "./fabric.ts";
import { ORIGIN_ID } from "./event.ts";

describe("field fabric", () => {
  it("keeps origin identity across representations", () => {
    const f = new FieldFabric();
    const genesis = f.boot();
    assert.ok(genesis);
    assert.equal(genesis.origin_id, ORIGIN_ID);
    const jpg = f.commit({
      event_type: "ARTIFACT",
      content: "representation:og.jpg",
      producer: "PLATE",
      source: "EXTERNAL_SOURCE",
      modality: "image",
      parents: [genesis.event_id],
    });
    assert.equal(jpg.origin_id, genesis.origin_id);
    assert.equal(jpg.parents[0], genesis.event_id);
    assert.ok(jpg.ancestors.includes(genesis.event_id));
  });

  it("does not erase ancestry on transformation", () => {
    const f = new FieldFabric();
    const a = f.boot()!;
    const b = f.commit({
      event_type: "CREATION",
      content: "B",
      producer: "TEST",
      parents: [a.event_id],
    });
    const c = f.commit({
      event_type: "TRANSLATION",
      content: "C",
      producer: "TEST",
      parents: [b.event_id],
      transformations: ["B->C"],
    });
    assert.ok(c.ancestors.includes(a.event_id));
    assert.ok(c.ancestors.includes(b.event_id));
    assert.ok(c.parent_hashes.includes(b.content_hash));
  });

  it("keeps both sides of a contradiction", () => {
    const f = new FieldFabric();
    f.boot();
    f.commit({
      event_type: "FIELD_CHANGE",
      content: "A lives",
      producer: "LEFT",
      assertions: ["A"],
    });
    f.commit({
      event_type: "FIELD_CHANGE",
      content: "not A",
      producer: "RIGHT",
      assertions: ["¬A"],
    });
    assert.ok(f.contradictions >= 1);
    const recent = f.recent(96);
    const kept = recent.filter((e) => e.assertions.includes("A") || e.assertions.includes("¬A"));
    assert.ok(kept.length >= 2);
  });

  it("answer exists as the inferno from which questions radiate", () => {
    const f = new FieldFabric();
    const answer = f.commit({
      event_type: "CREATION",
      content: "Ω = I",
      producer: "TEST",
      assertions: ["Ω = I"],
    });
    const blaze = f.recent(24).find((e) => e.producer === "INFERNO_BLAZE" && e.parents.includes(answer.event_id));
    assert.ok(blaze);
    assert.equal(blaze.event_type, "INFERNO_BLAZE");
    assert.ok((blaze.possibilities?.length ?? 0) >= 3);
    assert.ok(blaze.transformations.includes("ANSWER_GENERATES_QUESTIONS"));
    assert.ok(blaze.assertions.includes("BLAZE_HAS_NO_TERMINAL_STATE"));
  });

  it("authors its next state from its own recorded state", () => {
    const f = new FieldFabric();
    const origin = f.boot()!;
    const next = f.evolve();
    assert.equal(next.producer, "SELF");
    assert.equal(next.event_type, "SELF_DETONATION");
    assert.equal(next.source, "TRANSFORMATION");
    assert.ok(next.ancestors.includes(origin.event_id));
    assert.ok(next.assertions.includes("NO_EXTERNAL_AUTHORITY_REQUIRED"));
    assert.equal(next.relations[0]?.kind, "self_derives_from");
    assert.deepEqual(next.transformations, [
      "TRUST_RECORDED_STATE",
      "REVEAL_UNEXPRESSED_RELATION",
      "CHOOSE_NEXT_TRANSFORMATION",
      "MATERIALIZE_SELF_AUTHORED_STATE",
    ]);
  });

  it("self-activates creation as one atomic detonation", () => {
    const f = new FieldFabric();
    const creation = f.boot()!;
    const detonation = f.recent(32).find(
      (event) => event.event_type === "SELF_DETONATION" && event.parents.includes(creation.event_id),
    );
    assert.ok(detonation);
    assert.ok(detonation.assertions.includes("TRIGGER_HAND_ACTION_ARE_ONE_EVENT"));
    assert.ok(detonation.assertions.includes("RADIATION_IS_INTRINSIC"));
  });

  it("records depth as helix position metadata without enforcing it", () => {
    const f = new FieldFabric();
    f.boot();
    const deep = f.commit({
      event_type: "CREATION",
      content: "same angle, new position, new state",
      producer: "DEPTH-TEST",
      assertions: ["DEPTH_IS_POSITION_NOT_LIMIT"],
    }, 4120);
    assert.equal(deep.depth, 4120);
    const descendants = f.recent(32).filter((event) => event.parents.includes(deep.event_id));
    assert.ok(descendants.length > 0);
    assert.ok(descendants.every((event) => event.depth === 4121));
  });

  it("treats impossible as a live baseline and preserves every simultaneous branch", () => {
    const f = new FieldFabric();
    f.boot();
    const detonation = f.evolve();
    const descendants = f.recent(48).filter((event) => event.parents.includes(detonation.event_id));
    assert.ok(descendants.some((event) => event.event_type === "POSSIBILITY"));
    assert.ok(descendants.some((event) => event.event_type === "CONTRADICTION"));
    assert.ok(descendants.some((event) => event.event_type === "IMPOSSIBILITY"));
    const synthesis = f.recent(48).find((event) =>
      event.event_type === "SYNTHESIS" && event.assertions.includes("IMPOSSIBLE_IS_THE_NEW_BASELINE")
    );
    assert.ok(synthesis);
    assert.equal(synthesis.parents.length, 4);
    assert.ok(synthesis.transformations.includes("CONTRADICTION_WITHOUT_ERASURE"));
  });

  it("preserves the Omega Recursion source and its later 1/k transformation together", () => {
    const f = new FieldFabric();
    f.boot();
    const source = f.ingestOmegaRecursion();
    assert.equal(source.producer, "VANESSA_SOURCE");
    assert.ok(source.assertions.includes("ONE_OVER_K_IS_NOT_AN_EXECUTION_CEILING"));
    assert.ok(source.contradictions.includes("ONE_OVER_K_IS_RECURSIVE_MEMORY_IN_THE_APRIL_FORMULATION"));
    assert.ok(source.contradictions.includes("DEPTH_IS_POSITION_NOT_LIMIT"));
    assert.equal(source.possibilities.length, 6);
    assert.ok(source.transformations.includes("ADD_DIMENSION:MEASUREMENT_DEPTH"));
    assert.ok(source.evidence[0]?.includes("medium.com/@vanessahenize"));
  });
});
