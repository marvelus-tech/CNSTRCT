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
        </div>
      </div>
      <span className="sr-only">{slide.label}</span>
    </div>
  );
}