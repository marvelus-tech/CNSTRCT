import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

process.env.CNSTRCT_DATA_DIR = mkdtempSync(path.join(tmpdir(), "cnstrct-api-"));

test("live template gate accepts mobile-detailing", async () => {
  const { TEMPLATES } = await import("../templates");
  const detailing = TEMPLATES.find((item) => item.id === "mobile-detailing");
  assert.ok(detailing?.live);
  const estate = TEMPLATES.find((item) => item.id === "estate-clearance");
  assert.equal(estate?.live, false);
});