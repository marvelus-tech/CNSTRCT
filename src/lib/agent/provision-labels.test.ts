import assert from "node:assert/strict";
import test from "node:test";

import { provisionStatusLabel, provisioningJobLabel } from "./provision-labels";

test("provisionStatusLabel maps owner-facing copy", () => {
  assert.equal(provisionStatusLabel("ready"), "Ready");
  assert.equal(provisionStatusLabel("pending"), "Desk connecting");
  assert.equal(provisionStatusLabel("failed"), "Needs retry");
});

test("provisioningJobLabel names providers", () => {
  assert.equal(provisioningJobLabel("orgo", "succeeded"), "Orgo ready");
  assert.equal(provisioningJobLabel("composio", "failed"), "Composio needs retry");
});