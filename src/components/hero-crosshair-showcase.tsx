"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { HERO_BUSINESS_SLIDES } from "@/lib/hero-business-slides";

const DISPLAY_MS = 5200;
const FADE_MS = 700;

export function HeroCrosshairShowcase() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [imageVisible, setImageVisible] = useState(true);
  const timeoutRef = useRef<number | null>(null);
  const slide = HERO_BUSINESS_SLIDES[slideIndex] ?? HERO_BUSINESS_SLIDES[0];

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReducedMotion(mq.matches);
      if (mq.matches) {
        setSlideIndex(0);
        setImageVisible(true);
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const intervalId = window.setInterval(() => {
      setImageVisible(false);
      timeoutRef.current = window.setTimeout(() => {
        setSlideIndex((current) => (current + 1) % HERO_BUSINESS_SLIDES.length);
        setImageVisible(true);
      }, FADE_MS);
    }, DISPLAY_MS);

    return () => {
      window.clearInterval(intervalId);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, [reducedMotion]);

  return (
    <div
      className="hero-artifact-stage"
      role="region"
      aria-label="Custom-made business examples"
    >
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden focusable="false">
        <defs>
          <clipPath id="hero-artifact-rounded-hex" clipPathUnits="objectBoundingBox">
            <path d="M .29 0 L .71 0 Q .75 0 .77 .04 L .98 .46 Q 1 .5 .98 .54 L .77 .96 Q .75 1 .71 1 L .29 1 Q .25 1 .23 .96 L .02 .54 Q 0 .5 .02 .46 L .23 .04 Q .25 0 .29 0 Z" />
          </clipPath>
        </defs>
      </svg>
      <div className="hero-artifact" data-reduced-motion={reducedMotion || undefined}>
        <span className="hero-artifact__shadow" aria-hidden />
        <span className="hero-artifact__aura" aria-hidden />
        <span className="hero-artifact__top" aria-hidden />
        <span className="hero-artifact__side" aria-hidden />
        <div className="hero-artifact__face">
          <div className="hero-artifact__color-field" aria-hidden />
          <div className="hero-artifact__core">
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              sizes="(max-width: 767px) 54vw, 270px"
              className="hero-artifact__image-sharp"
              preload={slideIndex === 0}
              style={{ opacity: imageVisible ? 1 : 0 }}
            />
            <Image
              src={slide.src}
              alt=""
              fill
              sizes="(max-width: 767px) 54vw, 270px"
              className="hero-artifact__image-edge"
              aria-hidden
              style={{ opacity: imageVisible ? 0.48 : 0 }}
            />
            <span className="hero-artifact__image-tint" aria-hidden />
          </div>
          <span className="hero-artifact__frost" aria-hidden />
          <span className="hero-artifact__refraction" aria-hidden />
          <svg
            className="hero-artifact__hex-edge"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
            focusable="false"
          >
            <path
              d="M 29 0 L 71 0 Q 75 0 77 4 L 98 46 Q 100 50 98 54 L 77 96 Q 75 100 71 100 L 29 100 Q 25 100 23 96 L 2 54 Q 0 50 2 46 L 23 4 Q 25 0 29 0 Z"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>
      <span className="sr-only">{slide.label}</span>
    </div>
  );
}