"use client";

import { useEffect, useRef } from "react";

type Dot = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
};

export function OpportunitySpaceField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let dots: Dot[] = [];
    let width = 0;
    let height = 0;

    function resize() {
      if (!canvas || !ctx) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.floor((width * height) / 9000);
      dots = Array.from({ length: Math.min(120, Math.max(40, count)) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        z: 0.2 + Math.random() * 0.8,
        vx: -0.15 - Math.random() * 0.35,
        vy: 0.05 + Math.random() * 0.2,
      }));
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (const dot of dots) {
        if (!reduceMotion) {
          dot.x += dot.vx * dot.z;
          dot.y += dot.vy * dot.z;
          if (dot.x < -4) dot.x = width + 4;
          if (dot.y > height + 4) dot.y = -4;
        }
        const alpha = 0.12 + dot.z * 0.35;
        const size = 0.6 + dot.z * 1.4;
        ctx.fillStyle = `rgba(28, 25, 21, ${alpha})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, size, 0, Math.PI * 2);
        ctx.fill();
        // occasional digital sparkle
        if (dot.z > 0.65 && frame % 90 === dot.x % 90) {
          ctx.strokeStyle = `rgba(194, 65, 12, ${alpha * 0.7})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(dot.x - 3, dot.y);
          ctx.lineTo(dot.x + 3, dot.y);
          ctx.moveTo(dot.x, dot.y - 3);
          ctx.lineTo(dot.x, dot.y + 3);
          ctx.stroke();
        }
      }
      // subtle motion streaks (top-right, ref-inspired)
      ctx.strokeStyle = "rgba(28, 25, 21, 0.06)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const sx = width * 0.55 + i * width * 0.11;
        const sy = height * 0.08 + i * 12;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 48 + i * 8, sy - 28 - i * 6);
        ctx.stroke();
      }
      frame++;
      if (!reduceMotion) requestAnimationFrame(draw);
    }

    resize();
    draw();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement!);
    window.addEventListener("resize", resize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}