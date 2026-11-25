import assert from "node:assert/strict";
import test from "node:test";

test("requireTregProspect module exports guards", async () => {
  const mod = await import("./treg-prospect-auth");
  assert.equal(typeof mod.requireTregProspect, "function");
  assert.equal(typeof mod.requireBusinessOwner, "function");
});