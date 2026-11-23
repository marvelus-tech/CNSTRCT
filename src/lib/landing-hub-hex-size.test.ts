import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirrors :root --landing-hub-hex-size in globals.css */
export function landingHubHexRenderedPx(viewportWidthPx: number): number {
  const contentWidth = viewportWidthPx - 32; // landing section px-4
  const raw = (84 * contentWidth * 0.87) / 352;
  const minPx = 4.125 * 16;
  const maxPx = 5.875 * 16;
  return Math.min(maxPx, Math.max(minPx, raw));
}

describe("landing-hub-hex-size", () => {
  it("matches connectors orbit hub footprint near 390px viewport", () => {
    const size = landingHubHexRenderedPx(390);
    assert.ok(size >= 73 && size <= 75, `expected ~74px, got ${size}`);
  });

  it("clamps at min and max", () => {
    assert.equal(landingHubHexRenderedPx(200), 4.125 * 16);
    assert.equal(landingHubHexRenderedPx(2000), 5.875 * 16);
  });
});