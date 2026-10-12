"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Horizontal row of project cards on native scroll-snap (swipe, trackpad and Tab all work), with
 * previous/next buttons that move one card. The buttons disable at the ends and hide when nothing overflows.
 */
export function ProjectCarousel({ children }: { children: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  const update = () => {
    const t = track.current;
    if (!t) return;
    setEdge({ start: t.scrollLeft <= 4, end: t.scrollLeft + t.clientWidth >= t.scrollWidth - 4 });
  };

  useEffect(() => {
    update();
    if (typeof ResizeObserver === "undefined" || !track.current) return;
    const ro = new ResizeObserver(update);
    ro.observe(track.current);
    return () => ro.disconnect();
  }, []);

  const go = (dir: 1 | -1) => {
    const t = track.current;
    if (!t) return;
    const card = t.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + parseFloat(getComputedStyle(t).columnGap || "0") : t.clientWidth;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    t.scrollBy({ left: dir * step, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="pcar" role="region" aria-roledescription="carousel" aria-label="Featured projects">
      <div className="pcar-track" ref={track} onScroll={update}>
        {children}
      </div>
      {!(edge.start && edge.end) && (
        <div className="pcar-ctl">
          <button type="button" onClick={() => go(-1)} disabled={edge.start} aria-label="Previous projects">
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => go(1)} disabled={edge.end} aria-label="Next projects">
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
