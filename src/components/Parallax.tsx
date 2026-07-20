"use client";

import { useEffect, useRef } from "react";

/**
 * Two-layer parallax: wrap the slower background layer.
 * `speed` < 1 moves slower than scroll (classic background drift).
 * Static under prefers-reduced-motion (CSS kills the transform).
 */
export default function Parallax({
  speed = 0.35,
  className = "",
  children,
}: {
  speed?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        // Offset relative to element entering viewport
        const offset = (window.innerHeight - r.top) * (1 - speed) * 0.25;
        el.style.transform = `translateY(${offset.toFixed(1)}px)`;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [speed]);

  return (
    <div ref={ref} className={`parallax-layer will-change-transform ${className}`}>
      {children}
    </div>
  );
}
