import assert from "node:assert/strict";
import test from "node:test";

import { LANDING_PROOF_KICKER, LANDING_PROOF_SOURCES, LANDING_PROOF_STATS } from "./landing-stats";

test("landing proof strip config matches plan: three survey cards only", () => {
  assert.equal(LANDING_PROOF_STATS.length, 3);
  assert.equal(LANDING_PROOF_STATS.every((stat) => stat.kind === "survey"), true);

  const values = LANDING_PROOF_STATS.map((stat) => stat.value);
  assert.deepEqual(values, ["89%", "28%", "2.4×"]);

  assert.equal(LANDING_PROOF_SOURCES.length, 3);
  assert.equal(LANDING_PROOF_KICKER.includes("BizOS"), true);
  assert.equal(LANDING_PROOF_KICKER.includes("—") || LANDING_PROOF_KICKER.includes("–"), false);
});