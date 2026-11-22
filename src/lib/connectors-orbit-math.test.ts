import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  depthFromTheta,
  ORBIT_Y_COMPRESS,
  positionOnEllipse,
  positionOnProjectedEllipse,
  thetaAtTime,
} from "./connectors-orbit-math";

describe("connectors-orbit-math", () => {
  it("positionOnEllipse places θ=0 on +x", () => {
    const p = positionOnEllipse(0, 100, 50);
    assert.equal(p.x, 100);
    assert.equal(p.y, 0);
  });

  it("depthFromTheta marks top half as far", () => {
    const far = depthFromTheta(-Math.PI / 2);
    assert.equal(far.zIndex, 1);
    assert.ok(far.scale < 1);
    const near = depthFromTheta(Math.PI / 2);
    assert.equal(near.zIndex, 20);
    assert.equal(near.scale, 1);
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