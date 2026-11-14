"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { HERO_BUSINESS_SLIDES, HERO_CROSSHAIR_COORDS } from "@/lib/hero-business-slides";

const FADE_MS = 380;
const MOVE_MS = 1100;
const HOLD_MS = 320;
const DISPLAY_MS = 2400;
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

    const nextCoord = (coordIndexRef.current + 1) % HERO_CROSSHAIR_COORDS.length;
    const nextSlide = (slideIndexRef.current + 1) % HERO_BUSINESS_SLIDES.length;

    schedule(() => {
      coordIndexRef.current = nextCoord;
      slideIndexRef.current = nextSlide;
      setLinesMoving(true);
      setCoordIndex(nextCoord);

      schedule(() => {
        setLinesMoving(false);
        setSlideIndex(nextSlide);
        schedule(() => {
          setImageVisible(true);
          schedule(() => {
            runCycleRef.current();
          }, DISPLAY_MS);
        }, HOLD_MS);
      }, MOVE_MS);
    }, FADE_MS);
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
  const moveTransition = reducedMotion
    ? undefined
    : `left ${MOVE_MS}ms cubic-bezier(0.4, 0, 0.15, 1), top ${MOVE_MS}ms cubic-bezier(0.4, 0, 0.15, 1)`;

  return (
    <div
      className="hero-crosshair-panel relative min-h-[360px] w-full md:min-h-[480px]"
      role="region"
      aria-label="Business types CNSTRCT can spin up"
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-foreground/22"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <g
          style={{
            transition: linesMoving && !reducedMotion ? `all ${MOVE_MS}ms cubic-bezier(0.4, 0, 0.15, 1)` : undefined,
          }}
        >
          <line x1={0} y1={y} x2={Math.max(0, x - VOID_HALF_VB)} y2={y} stroke="currentColor" strokeWidth={0.35} vectorEffect="non-scaling-stroke" />
          <line x1={Math.min(100, x + VOID_HALF_VB)} y1={y} x2={100} y2={y} stroke="currentColor" strokeWidth={0.35} vectorEffect="non-scaling-stroke" />
          <line x1={x} y1={0} x2={x} y2={Math.max(0, y - VOID_HALF_VB)} stroke="currentColor" strokeWidth={0.35} vectorEffect="non-scaling-stroke" />
          <line x1={x} y1={Math.min(100, y + VOID_HALF_VB)} x2={x} y2={100} stroke="currentColor" strokeWidth={0.35} vectorEffect="non-scaling-stroke" />
        </g>
      </svg>

      <div
        className="pointer-events-none absolute flex flex-col items-center"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: "translate(-50%, -50%)",
          transition: linesMoving ? moveTransition : undefined,
        }}
      >
        <div
          className="relative shrink-0 overflow-hidden bg-background"
          style={{
            width: "var(--hero-void-size, 5.5rem)",
            height: "var(--hero-void-size, 5.5rem)",
            opacity: imageVisible ? 1 : 0,
            transition: reducedMotion ? undefined : "opacity 0.38s ease",
          }}
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
        <p
          className="mt-2 max-w-[11rem] text-center text-[11px] font-medium leading-snug tracking-wide text-muted"
          style={{
            opacity: imageVisible ? 1 : 0,
            transition: reducedMotion ? undefined : "opacity 0.38s ease",
          }}
        >
          {slide.label}
        </p>
      </div>
    </div>
  );
}