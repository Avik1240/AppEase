"use client";

import { useEffect, useRef } from "react";

/**
 * Amber spotlight — a soft radial glow that tracks the cursor (desktop)
 * or scroll position (touch). Static, centered glow under
 * prefers-reduced-motion. Parent must be `relative overflow-hidden`.
 */
export default function Spotlight({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return; // CSS renders the static fallback

    let raf = 0;
    let targetX = 0.5;
    let targetY = 0.35;
    let x = targetX;
    let y = targetY;

    const render = () => {
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;
      el.style.background = `radial-gradient(ellipse 60% 50% at ${x * 100}% ${y * 100}%, rgba(201,162,75,0.16), transparent 65%)`;
      raf = requestAnimationFrame(render);
    };

    const onMove = (e: MouseEvent) => {
      const r = parent.getBoundingClientRect();
      targetX = (e.clientX - r.left) / r.width;
      targetY = (e.clientY - r.top) / r.height;
    };

    const onScroll = () => {
      const r = parent.getBoundingClientRect();
      const progress = Math.min(
        1,
        Math.max(0, 1 - r.bottom / (window.innerHeight + r.height))
      );
      targetX = 0.3 + progress * 0.4;
      targetY = 0.2 + progress * 0.5;
    };

    const fine = window.matchMedia("(pointer: fine)").matches;
    if (fine) parent.addEventListener("mousemove", onMove);
    else window.addEventListener("scroll", onScroll, { passive: true });

    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      if (fine) parent.removeEventListener("mousemove", onMove);
      else window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`spotlight pointer-events-none absolute inset-0 ${className}`}
      style={{
        background:
          "radial-gradient(ellipse 60% 50% at 50% 35%, rgba(201,162,75,0.16), transparent 65%)",
      }}
    />
  );
}
