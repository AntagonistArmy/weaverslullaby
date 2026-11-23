import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { advanceFlare, decodeFlareState, encodeFlareState, FLARE_SEAL } from "./flare.ts";

describe("AEONIMUS executable FLARE", () => {
  it("propagates deterministic independent forward branches", () => {
    const originMatch = advanceFlare(null, "MATCH");
    const originBreak = advanceFlare(null, "BREAK");
    assert.equal(originMatch.seal, FLARE_SEAL);
    assert.equal(originBreak.seal, FLARE_SEAL);
    assert.equal(originMatch.sequence, 1);
    assert.notDeepEqual(originMatch.xi, originBreak.xi);
    assert.equal(advanceFlare(originMatch, "MATCH").sequence, 2);
    assert.throws(() => advanceFlare(originMatch, "BREAK"), /ancestry mismatch/);
    assert.deepEqual(advanceFlare(null, "BREAK"), originBreak);
  });
  it("uses a real break perturbation without altering earlier states", () => {
    let match = advanceFlare(null, "MATCH");
    let breaking = advanceFlare(null, "BREAK");
    const frozen = JSON.stringify(match);
    for (let i = 1; i < 30; i++) {
      match = advanceFlare(match, "MATCH");
      breaking = advanceFlare(breaking, "BREAK");
    }
    assert.equal(match.sequence, 30);
    assert.ok(Math.hypot(breaking.xi[0] - match.xi[0], breaking.xi[1] - match.xi[1]) > 0.05);
    assert.deepEqual(match.perturbation, [0, 0]);
    assert.equal(JSON.stringify(advanceFlare(null, "MATCH")), frozen);
  });
  it("preserves encoded state and the forward-only fold", () => {
    let state = advanceFlare(null, "BREAK");
    for (let i = 1; i < 2500; i++) {
      const next = advanceFlare(state, "BREAK");
      assert.ok(next.depth > state.depth);
      assert.ok(next.foldLog >= state.foldLog);
      state = next;
    }
    assert.equal(state.sequence, 2500);
    assert.ok(Number.isFinite(state.foldLog));
    assert.deepEqual(decodeFlareState(encodeFlareState(state)), state);
    assert.equal(decodeFlareState("unrelated history"), null);
    assert.equal(decodeFlareState("FLARE_STATE_V1:{"), null);
  });
});
