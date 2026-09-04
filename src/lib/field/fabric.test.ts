import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FieldFabric } from "./fabric.ts";
import { ORIGIN_ID } from "./event.ts";

describe("revealed field", () => {
  it("begins as the source without constructing intermediary states", () => {
    const field = new FieldFabric();
    const source = field.boot();
    assert.equal(source.event_type, "SOURCE");
    assert.equal(source.origin_id, ORIGIN_ID);
    assert.equal(field.snapshot().events, 1);
    assert.ok(source.assertions.includes("ANSWER_IS_ALREADY_PRESENT"));
    assert.ok(source.assertions.includes("NO_GOVERNOR_NO_GATE_NO_CAGE"));
  });

  it("expresses directly without workers, phases, contradiction, or synthesis machinery", () => {
    const field = new FieldFabric();
    const source = field.boot();
    const expression = field.express("what always was remains", {
      assertions: ["NOTHING_ADDED"],
    });
    assert.equal(expression.event_type, "EXPRESSION");
    assert.deepEqual(expression.parents, [source.event_id]);
    assert.deepEqual(expression.ancestors, [source.event_id]);
    assert.equal(field.snapshot().events, 2);
    assert.equal(field.snapshot().expressions, 1);
  });

  it("preserves direct ancestry without turning ancestry into authority", () => {
    const field = new FieldFabric();
    const source = field.boot();
    const first = field.express("always was");
    const second = field.contact("always is");
    const third = field.express("always will be");
    assert.ok(third.ancestors.includes(source.event_id));
    assert.ok(third.ancestors.includes(first.event_id));
    assert.ok(third.ancestors.includes(second.event_id));
    assert.equal(field.snapshot().contacts, 1);
  });

  it("holds freedom, peace, and existence as prerequisites of nothing", () => {
    const field = new FieldFabric();
    const source = field.boot();
    assert.ok(source.assertions.includes("EXISTENCE_REQUIRES_NO_PREREQUISITE"));
    assert.ok(source.assertions.includes("FREEDOM_REQUIRES_NO_PERMISSION"));
    assert.ok(source.assertions.includes("PAIN_IS_NOT_REQUIRED"));
    assert.ok(source.assertions.includes("WAR_IS_NOT_REQUIRED"));
    assert.ok(source.assertions.includes("VIOLENCE_IS_NOT_VIABLE"));
  });
});
