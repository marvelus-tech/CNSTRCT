"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { HERO_BUSINESS_SLIDES, HERO_CROSSHAIR_COORDS } from "@/lib/hero-business-slides";

const MOVE_MS = 1050;
const HOLD_MS = 420;
const DISPLAY_MS = 2200;
const HIDE_MS = 280;
const VOID_HALF_VB = 5.2;

function clampCoord(value: number) {
  return Math.min(88, Math.max(12, value));
}

export function HeroCrosshairShowcase() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [coordIndex, setCoordIndex] = useState(0);
  const [imageVisible, setImageVisible] = useState(true);
  const [linesMoving, setLinesMoving] = useState(false);
  const timeoutsRef = useRef<number[]>([]);
  const slideIndexRef = useRef(0);
  const coordIndexRef = useRef(0);
  const runCycleRef = useRef<() => void>(() => {});

  const slide = HERO_BUSINESS_SLIDES[slideIndex] ?? HERO_BUSINESS_SLIDES[0];
  const coord = reducedMotion
    ? HERO_CROSSHAIR_COORDS[0]
    : (HERO_CROSSHAIR_COORDS[coordIndex] ?? HERO_CROSSHAIR_COORDS[0]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timeoutsRef.current.push(id);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const runCycle = useCallback(() => {
    clearTimeouts();
    setImageVisible(false);
    setLinesMoving(true);

    const nextCoord = (coordIndexRef.current + 1) % HERO_CROSSHAIR_COORDS.length;
    const nextSlide = (slideIndexRef.current + 1) % HERO_BUSINESS_SLIDES.length;
    coordIndexRef.current = nextCoord;
    slideIndexRef.current = nextSlide;
    setCoordIndex(nextCoord);

    schedule(() => {
      setLinesMoving(false);
      setSlideIndex(nextSlide);
      schedule(() => {
        setImageVisible(true);
        schedule(() => {
          setImageVisible(false);
          schedule(() => runCycleRef.current(), HIDE_MS);
        }, DISPLAY_MS);
      }, HOLD_MS);
    }, MOVE_MS);
  }, [clearTimeouts, schedule]);

  useEffect(() => {
    runCycleRef.current = runCycle;
  }, [runCycle]);

  useEffect(() => {
    if (reducedMotion) {
      clearTimeouts();
      return;
    }
    schedule(() => runCycle(), DISPLAY_MS);
    return () => clearTimeouts();
  }, [reducedMotion, clearTimeouts, runCycle, schedule]);

  const x = clampCoord(coord.x);
  const y = clampCoord(coord.y);

  return (
    <div
      className="hero-crosshair-panel relative min-h-[360px] w-full overflow-hidden rounded-2xl border border-border bg-card md:min-h-[480px]"
      role="region"
      aria-label="Business types CNSTRCT can spin up"
    >
      <div className="hero-grain pointer-events-none absolute inset-0" aria-hidden />

      <svg
        className="absolute inset-0 h-full w-full text-foreground/22"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <g
          style={{
            transition: linesMoving ? `all ${MOVE_MS}ms cubic-bezier(0.45, 0, 0.2, 1)` : undefined,
          }}
        >
          <line x1={0} y1={y} x2={Math.max(0, x - VOID_HALF_VB)} y2={y} stroke="currentColor" strokeWidth={0.35} vectorEffect="non-scaling-stroke" />
          <line x1={Math.min(100, x + VOID_HALF_VB)} y1={y} x2={100} y2={y} stroke="currentColor" strokeWidth={0.35} vectorEffect="non-scaling-stroke" />
          <line x1={x} y1={0} x2={x} y2={Math.max(0, y - VOID_HALF_VB)} stroke="currentColor" strokeWidth={0.35} vectorEffect="non-scaling-stroke" />
          <line x1={x} y1={Math.min(100, y + VOID_HALF_VB)} x2={x} y2={100} stroke="currentColor" strokeWidth={0.35} vectorEffect="non-scaling-stroke" />
        </g>
      </svg>

      <div
        className="hero-crosshair-void absolute"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          width: "var(--hero-void-size, 5.5rem)",
          height: "var(--hero-void-size, 5.5rem)",
          transform: "translate(-50%, -50%)",
          transition:
            reducedMotion || !linesMoving
              ? undefined
              : `left ${MOVE_MS}ms cubic-bezier(0.45, 0, 0.2, 1), top ${MOVE_MS}ms cubic-bezier(0.45, 0, 0.2, 1)`,
        }}
      >
        <div
          className={`relative h-full w-full overflow-hidden bg-background ring-1 ring-border ${
            imageVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{ transition: reducedMotion ? undefined : "opacity 0.35s ease" }}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            sizes="120px"
            className="object-cover"
            priority={slideIndex === 0}
          />
        </div>
      </div>

      <p className="absolute bottom-4 left-4 right-4 text-center text-xs font-medium tracking-wide text-muted">{slide.label}</p>
    </div>
  );
}