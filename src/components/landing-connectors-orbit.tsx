"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BusinessHexMark } from "@/components/business-hex-mark";
import {
  depthFromTheta,
  ORBIT_OUTER_DIAMETER,
  ORBIT_PERIOD_MS,
  ORBIT_PHASE_OFFSET,
  ORBIT_RX,
  ORBIT_RY,
  orbitThetaForIndex,
  positionOnProjectedEllipse,
  thetaAtTime,
} from "@/lib/connectors-orbit-math";
import {
  LANDING_CONNECTORS,
  LANDING_CONNECTOR_COUNT,
  LANDING_CONNECTOR_TOOL_NAMES,
} from "@/lib/landing-connectors";

type NodeMotion = {
  transform: string;
  zIndex: number;
  opacity: number;
};

function buildAriaLabel(): string {
  return `Connected tools orbiting the BizOS hub: ${LANDING_CONNECTOR_TOOL_NAMES.join(", ")}`;
}

function motionAtTheta(theta: number): NodeMotion {
  const { x, y } = positionOnProjectedEllipse(theta, ORBIT_RX, ORBIT_RY);
  const depth = depthFromTheta(theta, y, ORBIT_RY);
  return {
    transform: `translate3d(${x}px, ${y}px, 0) scale(${depth.scale})`,
    zIndex: depth.zIndex,
    opacity: depth.opacity,
  };
}

function trainMotionsAtLead(leadTheta: number): NodeMotion[] {
  return LANDING_CONNECTORS.map((_, index) =>
    motionAtTheta(orbitThetaForIndex(leadTheta, index, LANDING_CONNECTOR_COUNT)),
  );
}

export function LandingConnectorsOrbit() {
  const stageRef = useRef<HTMLDivElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const inViewRef = useRef(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [nodes, setNodes] = useState<NodeMotion[]>(() =>
    trainMotionsAtLead(ORBIT_PHASE_OFFSET),
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
      const targetFill = 0.87;
      const maxScale = 2.65;
      const minScale = 0.55;
      let scale = width > 0 ? (width * targetFill) / ORBIT_OUTER_DIAMETER : 1;
      scale = Math.min(maxScale, Math.max(minScale, scale));
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
    if (reducedMotion) {
      setNodes(trainMotionsAtLead(ORBIT_PHASE_OFFSET));
      return;
    }

    startRef.current = performance.now();

    const tick = (now: number) => {
      if (!inViewRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const leadTheta = thetaAtTime(
        ORBIT_PHASE_OFFSET,
        ORBIT_PERIOD_MS,
        now,
        startRef.current,
      );
      setNodes(trainMotionsAtLead(leadTheta));
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
                <ellipse
                  cx={0}
                  cy={0}
                  rx={ORBIT_RX}
                  ry={ORBIT_RY}
                  className="connectors-orbit-guide"
                />
              </svg>
            </div>
          </div>

          <div className="connectors-orbit-screen-layer">
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

            <div className="connectors-orbit-planet" aria-hidden="true">
              <BusinessHexMark
                className="connectors-orbit-planet-hex"
                shapeClassName="connectors-orbit-planet-hex__shape"
                aria-hidden
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}