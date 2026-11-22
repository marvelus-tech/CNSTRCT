import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  depthFromTheta,
  ORBIT_HUB_Z_INDEX,
  ORBIT_Y_COMPRESS,
  positionOnEllipse,
  positionOnProjectedEllipse,
  smoothstep,
  thetaAtTime,
} from "./connectors-orbit-math";

describe("connectors-orbit-math", () => {
  it("positionOnEllipse places θ=0 on +x", () => {
    const p = positionOnEllipse(0, 100, 50);
    assert.equal(p.x, 100);
    assert.equal(p.y, 0);
  });

  it("depthFromTheta curves behind and in front of hub", () => {
    const far = depthFromTheta(-Math.PI / 2);
    const near = depthFromTheta(Math.PI / 2);
    const mid = depthFromTheta(0);

    assert.ok(far.zIndex < ORBIT_HUB_Z_INDEX);
    assert.ok(near.zIndex > ORBIT_HUB_Z_INDEX);
    assert.ok(far.scale < near.scale);
    assert.ok(far.opacity < near.opacity);
    assert.ok(far.scale >= 0.72 && far.scale <= 0.85);
    assert.ok(near.scale >= 1 && near.scale <= 1.12);
    assert.ok(mid.zIndex >= ORBIT_HUB_Z_INDEX);
  });

  it("depthFromTheta changes smoothly around the ellipse", () => {
    const a = depthFromTheta(-Math.PI / 2 + 0.05);
    const b = depthFromTheta(-Math.PI / 2 + 0.1);
    assert.ok(Math.abs(a.scale - b.scale) < 0.08);
    assert.ok(Math.abs(a.opacity - b.opacity) < 0.12);
    assert.ok(Math.abs(a.zIndex - b.zIndex) <= 2);
  });

  it("smoothstep is 0 at 0 and 1 at 1", () => {
    assert.equal(smoothstep(0), 0);
    assert.equal(smoothstep(1), 1);
    assert.ok(smoothstep(0.5) > 0.4 && smoothstep(0.5) < 0.6);
  });

  it("positionOnProjectedEllipse compresses y", () => {
    const flat = positionOnEllipse(Math.PI / 2, 100, 50);
    const projected = positionOnProjectedEllipse(Math.PI / 2, 100, 50);
    assert.equal(projected.x, flat.x);
    assert.ok(projected.y < flat.y);
    assert.ok(Math.abs(projected.y / flat.y - ORBIT_Y_COMPRESS) < 1e-6);
  });

  it("thetaAtTime wraps by duration", () => {
    const start = 1_000;
    const t0 = thetaAtTime(0, 10_000, start, start);
    const t1 = thetaAtTime(0, 10_000, start + 10_000, start);
    assert.ok(Math.abs(t1 - t0) < 1e-6 || Math.abs(t1 - t0 - Math.PI * 2) < 1e-6);
  });
});