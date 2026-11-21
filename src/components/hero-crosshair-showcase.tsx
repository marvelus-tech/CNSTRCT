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
            <path d="M .36 .02 C .3 .02 .27 .05 .23 .11 L .03 .42 C .01 .45 0 .48 0 .5 C 0 .53 .01 .56 .03 .59 L .23 .9 C .27 .96 .3 .98 .36 .98 H .64 C .7 .98 .73 .95 .77 .89 L .97 .58 C .99 .55 1 .52 1 .5 C 1 .47 .99 .44 .97 .41 L .77 .1 C .73 .04 .7 .02 .64 .02 Z" />
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
              sizes="(max-width: 767px) 50vw, 235px"
              className="hero-artifact__image-sharp"
              preload={slideIndex === 0}
              style={{ opacity: imageVisible ? 1 : 0 }}
            />
            <Image
              src={slide.src}
              alt=""
              fill
              sizes="(max-width: 767px) 50vw, 235px"
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
              d="M 36 2 C 30 2 27 5 23 11 L 3 42 C 1 45 0 48 0 50 C 0 53 1 56 3 59 L 23 90 C 27 96 30 98 36 98 H 64 C 70 98 73 95 77 89 L 97 58 C 99 55 100 52 100 50 C 100 47 99 44 97 41 L 77 10 C 73 4 70 2 64 2 Z"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>
      <span className="sr-only">{slide.label}</span>
    </div>
  );
}