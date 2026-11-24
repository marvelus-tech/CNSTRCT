import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirrors breakpoint --landing-hub-hex-size in globals.css */
export function landingHubHexRenderedPx(viewportWidthPx: number): number {
  if (viewportWidthPx >= 1024) return 5.875 * 16;
  if (viewportWidthPx >= 768) return 5.25 * 16;
  if (viewportWidthPx >= 640) return 4.625 * 16;
  return 4.125 * 16;
}

describe("landing-hub-hex-size", () => {
  it("matches connectors orbit hub footprint near 390px viewport", () => {
    const size = landingHubHexRenderedPx(390);
    assert.ok(size >= 65 && size <= 67, `expected ~66px (4.125rem), got ${size}`);
  });

  it("steps up at sm, md, and lg breakpoints", () => {
    assert.equal(landingHubHexRenderedPx(639), 4.125 * 16);
    assert.equal(landingHubHexRenderedPx(640), 4.625 * 16);
    assert.equal(landingHubHexRenderedPx(744), 4.625 * 16);
    assert.equal(landingHubHexRenderedPx(768), 5.25 * 16);
    assert.equal(landingHubHexRenderedPx(820), 5.25 * 16);
    assert.equal(landingHubHexRenderedPx(1024), 5.875 * 16);
  });
});