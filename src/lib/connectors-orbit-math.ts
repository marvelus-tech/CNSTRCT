export type EllipsePosition = {
  x: number;
  y: number;
};

export type OrbitDepth = {
  zIndex: number;
  scale: number;
  opacity: number;
};

export const ORBIT_HUB_Z_INDEX = 10;
export const ORBIT_HUB_HALO_Z_INDEX = 9;

export const ORBIT_RING_CONFIG = [
  { rx: 96, ry: 40, durationMs: 48_000 },
  { rx: 140, ry: 56, durationMs: 62_000 },
  { rx: 184, ry: 76, durationMs: 76_000 },
] as const;

/** Horizontal span of the outer ring in design units (scale-wrap is 400×220). */
export const ORBIT_OUTER_DIAMETER = ORBIT_RING_CONFIG[2].rx * 2;

/** Matches tilted ring foreshortening (~rotateX(58deg)). */
export const ORBIT_Y_COMPRESS = Math.cos((58 * Math.PI) / 180);

const DEPTH_SCALE_FAR = 0.78;
const DEPTH_SCALE_NEAR = 1.1;
const DEPTH_OPACITY_FAR = 0.58;
const DEPTH_OPACITY_NEAR = 1;
const DEPTH_Z_FAR = 2;
const DEPTH_Z_NEAR = 21;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Smooth hermite ease for planet/moon depth — no stepped far/near. */
export function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export function positionOnEllipse(theta: number, rx: number, ry: number): EllipsePosition {
  return {
    x: rx * Math.cos(theta),
    y: ry * Math.sin(theta),
  };
}

/** Screen-space ellipse: nodes stay circular billboards over projected paths. */
export function positionOnProjectedEllipse(
  theta: number,
  rx: number,
  ry: number,
  yCompress = ORBIT_Y_COMPRESS,
): EllipsePosition {
  return {
    x: rx * Math.cos(theta),
    y: ry * Math.sin(theta) * yCompress,
  };
}

/**
 * Continuous depth along the orbit: sin(theta) maps back arc (behind hub) to front arc
 * (overlapping hub rim). Hub stays at z-index 10; halo at 9.
 */
export function depthFromTheta(theta: number, projectedY?: number, orbitRy?: number): OrbitDepth {
  const sin = Math.sin(theta);
  const t = (sin + 1) / 2;
  const eased = smoothstep(t);

  let scale = lerp(DEPTH_SCALE_FAR, DEPTH_SCALE_NEAR, eased);
  const opacity = lerp(DEPTH_OPACITY_FAR, DEPTH_OPACITY_NEAR, eased);
  let zIndex = Math.round(lerp(DEPTH_Z_FAR, DEPTH_Z_NEAR, eased));

  if (projectedY !== undefined && orbitRy !== undefined && orbitRy > 0) {
    const yNorm = projectedY / (orbitRy * ORBIT_Y_COMPRESS);
    const farOnPath = Math.max(0, -yNorm);
    scale *= 1 - 0.05 * farOnPath;
    zIndex = Math.round(zIndex - 2 * farOnPath);
  }

  return {
    zIndex: Math.min(22, Math.max(1, zIndex)),
    scale: Math.min(1.14, Math.max(0.72, scale)),
    opacity: Math.min(1, Math.max(0.5, opacity)),
  };
}

export function thetaAtTime(
  startAngleRad: number,
  durationMs: number,
  nowMs: number,
  startTimeMs: number,
): number {
  const elapsed = nowMs - startTimeMs;
  const phase = ((elapsed % durationMs) / durationMs) * Math.PI * 2;
  return phase + startAngleRad;
}