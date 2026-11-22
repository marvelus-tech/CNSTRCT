export type EllipsePosition = {
  x: number;
  y: number;
};

export type OrbitDepth = {
  zIndex: number;
  scale: number;
  opacity: number;
};

export const ORBIT_RING_CONFIG = [
  { rx: 88, ry: 36, durationMs: 48_000 },
  { rx: 128, ry: 52, durationMs: 62_000 },
  { rx: 168, ry: 68, durationMs: 76_000 },
] as const;

/** Matches tilted ring foreshortening (~rotateX(58deg)). */
export const ORBIT_Y_COMPRESS = Math.cos((58 * Math.PI) / 180);

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

/** sin(theta) < 0 → far arc (behind hub); otherwise near arc. */
export function depthFromTheta(theta: number): OrbitDepth {
  const sin = Math.sin(theta);
  if (sin < 0) {
    return { zIndex: 1, scale: 0.88, opacity: 0.55 };
  }
  return { zIndex: 20, scale: 1, opacity: 1 };
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