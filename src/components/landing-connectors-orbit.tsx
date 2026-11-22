"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BusinessHexMark } from "@/components/business-hex-mark";
import {
  depthFromTheta,
  ORBIT_RING_CONFIG,
  positionOnProjectedEllipse,
  thetaAtTime,
} from "@/lib/connectors-orbit-math";
import { LANDING_CONNECTORS, LANDING_CONNECTOR_TOOL_NAMES } from "@/lib/landing-connectors";

type NodeMotion = {
  transform: string;
  zIndex: number;
  opacity: number;
};

function buildAriaLabel(): string {
  return `Connected tools orbiting the BizOS hub: ${LANDING_CONNECTOR_TOOL_NAMES.join(", ")}`;
}

function motionAtTheta(theta: number, rx: number, ry: number): NodeMotion {
  const { x, y } = positionOnProjectedEllipse(theta, rx, ry);
  const depth = depthFromTheta(theta);
  return {
    transform: `translate3d(${x}px, ${y}px, 0) scale(${depth.scale})`,
    zIndex: depth.zIndex,
    opacity: depth.opacity,
  };
}

export function LandingConnectorsOrbit() {
  const stageRef = useRef<HTMLDivElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const inViewRef = useRef(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [nodes, setNodes] = useState<NodeMotion[]>(() =>
    LANDING_CONNECTORS.map((c) => {
      const ring = ORBIT_RING_CONFIG[c.orbitIndex];
      const theta = (c.angleDeg * Math.PI) / 180;
      return motionAtTheta(theta, ring.rx, ring.ry);
    }),
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const arena = arenaRef.current;
    if (!arena) return;

    const syncScale = () => {
      const width = arena.clientWidth;
      const scale = width > 0 ? Math.min(1, width / 400) : 1;
      arena.style.setProperty("--orbit-scale", scale.toFixed(4));
    };

    syncScale();
    const ro = new ResizeObserver(syncScale);
    ro.observe(arena);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry?.isIntersecting ?? true;
      },
      { rootMargin: "80px", threshold: 0.05 },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    startRef.current = performance.now();

    const tick = (now: number) => {
      if (!inViewRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const next = LANDING_CONNECTORS.map((connector) => {
        const ring = ORBIT_RING_CONFIG[connector.orbitIndex];
        const startAngle = (connector.angleDeg * Math.PI) / 180;
        const theta = thetaAtTime(startAngle, ring.durationMs, now, startRef.current);
        return motionAtTheta(theta, ring.rx, ring.ry);
      });
      setNodes(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion]);

  return (
    <div
      ref={stageRef}
      className="connectors-orbit-stage hero-grain"
      aria-label={buildAriaLabel()}
    >
      <div ref={arenaRef} className="connectors-orbit-arena">
        <div className="connectors-orbit-scale-wrap">
          <div className="connectors-orbit-guides-layer" aria-hidden="true">
            <div className="connectors-orbit-guides-tilt">
              <svg
                className="connectors-orbit-guides"
                viewBox="-200 -110 400 220"
                focusable="false"
              >
                {ORBIT_RING_CONFIG.map((ring, index) => (
                  <ellipse
                    key={index}
                    cx={0}
                    cy={0}
                    rx={ring.rx}
                    ry={ring.ry}
                    className="connectors-orbit-guide"
                  />
                ))}
              </svg>
            </div>
          </div>

          <div className="connectors-orbit-screen-layer">
          <div className="connectors-orbit-hub-halo" aria-hidden="true" />

          {LANDING_CONNECTORS.map((connector, index) => {
            const motion = nodes[index];
            return (
              <div
                key={connector.id}
                className="connectors-orbit-node"
                style={{
                  transform: motion.transform,
                  zIndex: motion.zIndex,
                  opacity: motion.opacity,
                }}
                aria-hidden="true"
                title={connector.name}
              >
                <div className="connectors-orbit-disc">
                  <Image
                    src={`/integrations/${connector.id}.svg`}
                    alt=""
                    width={22}
                    height={22}
                    className="connectors-orbit-logo"
                    unoptimized
                  />
                </div>
              </div>
            );
          })}

          <div className="connectors-orbit-hub">
            <div className="connectors-orbit-hub-disc">
              <BusinessHexMark
                className="connectors-orbit-hub-hex"
                shapeClassName="connectors-orbit-hub-hex__shape"
                aria-hidden
              />
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}