import assert from "node:assert/strict";
import test from "node:test";

import { LANDING_PROOF_KICKER, LANDING_PROOF_SOURCES, LANDING_PROOF_STATS } from "./landing-stats";

test("landing proof strip config matches plan: four cards and three survey sources", () => {
  assert.equal(LANDING_PROOF_STATS.length, 4);
  assert.equal(LANDING_PROOF_STATS.filter((stat) => stat.kind === "survey").length, 3);
  assert.equal(LANDING_PROOF_STATS.filter((stat) => stat.kind === "product").length, 1);

  const product = LANDING_PROOF_STATS.find((stat) => stat.kind === "product");
  assert.equal(product?.value, "3");

  const values = LANDING_PROOF_STATS.map((stat) => stat.value);
  assert.deepEqual(values, ["89%", "28%", "2.4×", "3"]);

  assert.equal(LANDING_PROOF_SOURCES.length, 3);
  assert.equal(LANDING_PROOF_KICKER.includes("BizOS"), true);
  assert.equal(LANDING_PROOF_KICKER.includes("—") || LANDING_PROOF_KICKER.includes("–"), false);
});