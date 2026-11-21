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
            <path d="M .17 0 L .83 0 Q .86 0 .87 .03 L .99 .43 Q 1 .46 1 .5 Q 1 .54 .99 .57 L .87 .97 Q .86 1 .83 1 L .17 1 Q .14 1 .13 .97 L .01 .57 Q 0 .54 0 .5 Q 0 .46 .01 .43 L .13 .03 Q .14 0 .17 0 Z" />
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
              sizes="(max-width: 767px) 64vw, 360px"
              className="hero-artifact__image-sharp"
              preload={slideIndex === 0}
              style={{ opacity: imageVisible ? 1 : 0 }}
            />
            <Image
              src={slide.src}
              alt=""
              fill
              sizes="(max-width: 767px) 64vw, 360px"
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
              d="M 17 0 L 83 0 Q 86 0 87 3 L 99 43 Q 100 46 100 50 Q 100 54 99 57 L 87 97 Q 86 100 83 100 L 17 100 Q 14 100 13 97 L 1 57 Q 0 54 0 50 Q 0 46 1 43 L 13 3 Q 14 0 17 0 Z"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>
      <span className="sr-only">{slide.label}</span>
    </div>
  );
}