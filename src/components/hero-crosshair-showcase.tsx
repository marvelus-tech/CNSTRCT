"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { HERO_BUSINESS_SLIDES, HERO_CROSSHAIR_COORDS } from "@/lib/hero-business-slides";

const FADE_MS = 380;
const MOVE_MS = 1100;
const HOLD_MS = 320;
const DISPLAY_MS = 2400;
/** Percent gap between line ends and void center (matches former viewBox void half). */
const VOID_GAP_PCT = 5.2;

const MOVE_EASE = "cubic-bezier(0.4, 0, 0.15, 1)";
const POSITION_TRANSITION = `left ${MOVE_MS}ms ${MOVE_EASE}, top ${MOVE_MS}ms ${MOVE_EASE}, width ${MOVE_MS}ms ${MOVE_EASE}, height ${MOVE_MS}ms ${MOVE_EASE}`;

function clampCoord(value: number) {
  return Math.min(88, Math.max(12, value));
}

export function HeroCrosshairShowcase() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [coordIndex, setCoordIndex] = useState(0);
  const [imageVisible, setImageVisible] = useState(true);
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
      setCoordIndex(nextCoord);

      schedule(() => {
        slideIndexRef.current = nextSlide;
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
  const gap = VOID_GAP_PCT;

  const leftHWidth = Math.max(0, x - gap);
  const rightHLeft = Math.min(100, x + gap);
  const rightHWidth = Math.max(0, 100 - rightHLeft);
  const topVHeight = Math.max(0, y - gap);
  const bottomVTop = Math.min(100, y + gap);
  const bottomVHeight = Math.max(0, 100 - bottomVTop);

  const lineMotionStyle = reducedMotion ? undefined : { transition: POSITION_TRANSITION };
  const anchorMotionStyle = reducedMotion
    ? undefined
  : {
      transition: `left ${MOVE_MS}ms ${MOVE_EASE}, top ${MOVE_MS}ms ${MOVE_EASE}`,
    };

  const lineBase = "pointer-events-none absolute bg-foreground/22";

  return (
    <div
      className="hero-crosshair-panel relative min-h-[360px] w-full md:min-h-[480px]"
      role="region"
      aria-label="Business types CNSTRCT can spin up"
    >
      <span
        aria-hidden
        className={`${lineBase} left-0 h-px`}
        style={{
          top: `${y}%`,
          width: `${leftHWidth}%`,
          transform: "translateY(-50%)",
          ...lineMotionStyle,
        }}
      />
      <span
        aria-hidden
        className={`${lineBase} h-px`}
        style={{
          left: `${rightHLeft}%`,
          top: `${y}%`,
          width: `${rightHWidth}%`,
          transform: "translateY(-50%)",
          ...lineMotionStyle,
        }}
      />
      <span
        aria-hidden
        className={`${lineBase} top-0 w-px`}
        style={{
          left: `${x}%`,
          height: `${topVHeight}%`,
          transform: "translateX(-50%)",
          ...lineMotionStyle,
        }}
      />
      <span
        aria-hidden
        className={`${lineBase} w-px`}
        style={{
          left: `${x}%`,
          top: `${bottomVTop}%`,
          height: `${bottomVHeight}%`,
          transform: "translateX(-50%)",
          ...lineMotionStyle,
        }}
      />

      <div
        className="pointer-events-none absolute flex flex-col items-center"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: "translate(-50%, -50%)",
          ...anchorMotionStyle,
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