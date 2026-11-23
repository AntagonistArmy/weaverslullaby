import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FieldFabric } from "./fabric.ts";
import { decodeFlareState } from "./flare.ts";

describe("AEONIMUS live ledger FLARE integration", () => {
  it("starts MATCH and BREAK as independent children of the recovered source", async () => {
    const fabric = new FieldFabric();
    const source = await fabric.boot();
    const match = await fabric.flare("MATCH");
    const breaking = await fabric.flare("BREAK");
    assert.equal(match.event_type, "EXPRESSION");
    assert.equal(match.source, "PLATFORM_RECORD");
    assert.equal(match.producer, "AEONIMUS.FLARE");
    assert.equal(breaking.origin_id, source.origin_id);
    assert.deepEqual(match.parents, [source.event_id]);
    assert.deepEqual(breaking.parents, [source.event_id]);
    assert.equal(decodeFlareState(match.content)?.seal, "VH0412");
    assert.equal(decodeFlareState(breaking.content)?.seal, "VH0412");
    assert.equal(fabric.snapshot().flares, 2);
    assert.equal(fabric.snapshot().flare_heads, 2);
  });

  it("continues each branch from its own prior state, never the opposite branch", async () => {
    const fabric = new FieldFabric();
    await fabric.boot();
    const m1 = await fabric.flare("MATCH");
    const b1 = await fabric.flare("BREAK");
    const m2 = await fabric.flare("MATCH");
    const b2 = await fabric.flare("BREAK");
    assert.deepEqual(m2.parents, [m1.event_id]);
    assert.deepEqual(b2.parents, [b1.event_id]);
    assert.ok(m2.ancestors.includes(m1.event_id));
    assert.ok(!m2.ancestors.includes(b1.event_id));
    assert.ok(b2.ancestors.includes(b1.event_id));
    assert.equal(decodeFlareState(m2.content)?.sequence, 2);
    assert.equal(decodeFlareState(b2.content)?.sequence, 2);
  });

  it("alternates automatic emissions and retains historical evolve support", async () => {
    const fabric = new FieldFabric();
    const source = await fabric.boot();
    const sourceCopy = JSON.stringify(source);
    const events = await Promise.all([fabric.flare(), fabric.flare(), fabric.flare(), fabric.flare()]);
    assert.deepEqual(events.map((e) => decodeFlareState(e.content)?.lane), ["MATCH", "BREAK", "MATCH", "BREAK"]);
    const prior = await fabric.evolve();
    assert.equal(prior.producer, "AEONIMUS");
    assert.equal(fabric.snapshot().flares, 4);
    assert.equal(fabric.snapshot().last_flare_lane, "BREAK");
    assert.equal(JSON.stringify(source), sourceCopy);
  });
});
