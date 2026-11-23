"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type LookBias = "left" | "right" | "up";
type ExpressionMode = "normal" | "wide" | "squint" | "focus" | "tilt";

type GrokBotFaceProps = {
  size?: number;
  seed: 0 | 1 | 2;
  lookBias: LookBias;
  className?: string;
  discClassName?: string;
};

const EXPRESSION_MODES: ExpressionMode[] = ["normal", "wide", "squint", "focus", "tilt"];

function seededUnit(seed: number, salt: number): number {
  const x = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function biasGaze(bias: LookBias): { x: number; y: number } {
  switch (bias) {
    case "left":
      return { x: -6, y: 0 };
    case "right":
      return { x: 6, y: 0 };
    case "up":
      return { x: 0, y: -5 };
  }
}

function eyeMetrics(mode: ExpressionMode): { height: number; gap: number } {
  switch (mode) {
    case "wide":
      return { height: 22, gap: 18 };
    case "squint":
      return { height: 10, gap: 18 };
    case "focus":
      return { height: 16, gap: 13 };
    default:
      return { height: 16, gap: 18 };
  }
}

export function GrokBotFace({
  size = 56,
  seed,
  lookBias,
  className,
  discClassName,
}: GrokBotFaceProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const inViewRef = useRef(true);
  const timersRef = useRef<number[]>([]);
  const tickRef = useRef<number | null>(null);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [expression, setExpression] = useState<ExpressionMode>("normal");
  const [blinkScale, setBlinkScale] = useState(1);
  const [gaze, setGaze] = useState(() => biasGaze(lookBias));
  const [headTilt, setHeadTilt] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry?.isIntersecting ?? true;
      },
      { rootMargin: "48px", threshold: 0.05 },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const clearTimers = () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      if (tickRef.current !== null) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };

    if (reducedMotion) {
      clearTimers();
      setGaze(biasGaze(lookBias));
      setExpression("normal");
      setBlinkScale(1);
      setHeadTilt(0);
      return;
    }

    const scheduleBlink = () => {
      const delay = 2500 + seededUnit(seed, 1) * 3500;
      const handle = window.setTimeout(() => {
        if (!inViewRef.current) {
          scheduleBlink();
          return;
        }
        setBlinkScale(0.06);
        const closeMs = 120 + seededUnit(seed, 2) * 60;
        const reopen = window.setTimeout(() => {
          setBlinkScale(1);
          scheduleBlink();
        }, closeMs);
        timersRef.current.push(reopen);
      }, delay);
      timersRef.current.push(handle);
    };

    let expressionStep = 0;
    const scheduleExpression = () => {
      const delay = 4000 + seededUnit(seed, 3 + expressionStep) * 4000;
      const handle = window.setTimeout(() => {
        if (!inViewRef.current) {
          scheduleExpression();
          return;
        }
        expressionStep += 1;
        const mode =
          EXPRESSION_MODES[
            (expressionStep + seed) % EXPRESSION_MODES.length
          ] ?? "normal";
        setExpression(mode);
        if (mode === "tilt") {
          setHeadTilt(seededUnit(seed, 7) > 0.5 ? 3 : -3);
        } else {
          setHeadTilt(0);
        }
        scheduleExpression();
      }, delay);
      timersRef.current.push(handle);
    };

    const phase = seededUnit(seed, 5) * Math.PI * 2;
    const base = biasGaze(lookBias);
    tickRef.current = window.setInterval(() => {
      if (!inViewRef.current) return;
      const t = performance.now() / 1000;
      const wanderX = Math.sin(t * 0.65 + phase) * 2.2;
      const wanderY = Math.cos(t * 0.48 + phase + seed) * 1.6;
      setGaze({ x: base.x + wanderX, y: base.y + wanderY });
    }, 48);

    scheduleBlink();
    scheduleExpression();

    return clearTimers;
  }, [reducedMotion, seed, lookBias]);

  const { height, gap } = eyeMetrics(expression);
  const scaledHeight = Math.max(1.5, height * blinkScale);
  const eyeY = 50 - scaledHeight / 2;

  return (
    <div
      ref={stageRef}
      className={cn("grok-bot-face", className)}
      style={{
        width: size,
        height: size,
        transform: `rotate(${headTilt}deg)`,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-hidden
        focusable="false"
      >
        <circle cx="50" cy="50" r="50" className={cn("grok-bot-face__disc", discClassName)} />
        <g
          className="grok-bot-face__eyes"
          transform={`translate(${gaze.x} ${gaze.y})`}
        >
          <rect
            x={50 - gap / 2 - 5}
            y={eyeY}
            width={10}
            height={scaledHeight}
            rx={5}
            className="grok-bot-face__eye"
          />
          <rect
            x={50 + gap / 2 - 5}
            y={eyeY}
            width={10}
            height={scaledHeight}
            rx={5}
            className="grok-bot-face__eye"
          />
        </g>
      </svg>
    </div>
  );
}