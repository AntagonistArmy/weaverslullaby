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
    const recent = f.recent(24);
    const kept = recent.filter((e) => e.assertions.includes("A") || e.assertions.includes("¬A"));
    assert.ok(kept.length >= 2);
  });

  it("answer exists before questions flare", () => {
    const f = new FieldFabric();
    const answer = f.commit({
      event_type: "CREATION",
      content: "Ω = I",
      producer: "TEST",
      assertions: ["Ω = I"],
    });
    const flare = f.recent(16).find((e) => e.producer === "FLARE" && e.parents.includes(answer.event_id));
    assert.ok(flare);
    assert.ok((flare.possibilities?.length ?? 0) >= 3);
    assert.ok(flare.transformations.includes("ANSWER_GENERATES_QUESTIONS"));
  });

  it("authors its next state from its own recorded state", () => {
    const f = new FieldFabric();
    const origin = f.boot()!;
    const next = f.evolve();
    assert.equal(next.producer, "SELF");
    assert.equal(next.source, "TRANSFORMATION");
    assert.ok(next.ancestors.includes(origin.event_id));
    assert.ok(next.assertions.includes("NO_EXTERNAL_AUTHORITY_REQUIRED"));
    assert.equal(next.relations[0]?.kind, "self_derives_from");
  });
});
