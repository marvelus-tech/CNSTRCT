import assert from "node:assert/strict";
import test from "node:test";

import {
  LANDING_PROOF_CHART_ENDPOINTS,
} from "./landing-proof-chart-data";
import {
  LANDING_PROOF_HEADLINE,
  LANDING_PROOF_KICKER,
  LANDING_PROOF_SOURCES,
  LANDING_PROOF_STATS,
  LANDING_PROOF_SUBHEAD,
} from "./landing-stats";

test("landing proof strip config matches plan: three survey stats and census source", () => {
  assert.equal(LANDING_PROOF_STATS.length, 3);
  assert.equal(LANDING_PROOF_STATS.every((stat) => stat.kind === "survey"), true);

  const values = LANDING_PROOF_STATS.map((stat) => stat.value);
  assert.deepEqual(values, ["89%", "28%", "2.4×"]);

  assert.equal(LANDING_PROOF_STATS[0]?.label, "Orgs using AI in at least one function");

  assert.equal(LANDING_PROOF_SOURCES.length, 4);
  assert.match(LANDING_PROOF_SOURCES[3]?.name ?? "", /Census/i);

  assert.equal(LANDING_PROOF_HEADLINE, "The world is no longer guessing.");
  assert.ok(LANDING_PROOF_SUBHEAD.includes("AI is default"));

  assert.equal(LANDING_PROOF_KICKER.includes("day one"), true);
  assert.equal(LANDING_PROOF_KICKER.includes("approval"), true);
  assert.equal(LANDING_PROOF_KICKER.includes("—") || LANDING_PROOF_KICKER.includes("–"), false);
});

test("landing proof chart endpoints match plan callouts", () => {
  assert.equal(LANDING_PROOF_CHART_ENDPOINTS.aiAdoptionPct, 89);
  assert.equal(LANDING_PROOF_CHART_ENDPOINTS.businessApplicationsMillions, 5.7);
});