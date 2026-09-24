"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Carousel universal: auto-slide tiap `interval` ms, swipe kiri/kanan (touch),
 * dot navigasi, pause saat disentuh/hover. Slide = children array (ReactNode).
 */
export function Carousel({
  items,
  interval = 5000,
  className = "",
  dotsClassName = "bottom-2.5",
  dotColor = "bg-white",
  dotInactive = "bg-white/40",
  ariaLabel = "Karusel",
}: {
  items: React.ReactNode[];
  interval?: number;
  className?: string;
  dotsClassName?: string;
  dotColor?: string;
  dotInactive?: string;
  ariaLabel?: string;
}) {
  const count = items.length;
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (i: number) => setIdx(((i % count) + count) % count),
    [count]
  );

  useEffect(() => {
    if (paused || count <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % count), interval);
    return () => clearInterval(t);
  }, [paused, count, interval]);

  if (count === 0) return null;
  if (count === 1) return <>{items[0]}</>;

  return (
    <div
      className={`group relative overflow-hidden ${className}`}
      role="region"
      aria-label={ariaLabel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        setPaused(false);
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {items.map((item, i) => (
          <div key={i} className="w-full shrink-0">
            {item}
          </div>
        ))}
      </div>

      {/* Panah kiri/kanan (desktop hover) */}
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Sebelumnya"
            onClick={() => go(idx - 1)}
            className="absolute left-2 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-black/50 sm:flex"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Berikutnya"
            onClick={() => go(idx + 1)}
            className="absolute right-2 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-black/50 sm:flex"
          >
            ›
          </button>
        </>
      )}

      {/* Dots */}
      <div className={`absolute left-1/2 z-10 flex -translate-x-1/2 gap-1.5 ${dotsClassName}`}>
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => go(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? `w-4 ${dotColor}` : `w-1.5 ${dotInactive}`
            }`}
          />
        ))}
      </div>
    </div>
  );
}
