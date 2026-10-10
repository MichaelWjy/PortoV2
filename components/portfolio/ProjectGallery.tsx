"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { PublicImage } from "@/lib/services/public";

const INTERVAL_MS = 5000;

/**
 * Project images (cover first, then gallery) in one card. Advances every 5 s; pauses while hovered or
 * focused, when the tab is hidden, when the visitor presses pause, and never auto-plays for reduced motion.
 * Prev/next buttons, dots, arrow keys and swipe all work.
 */
export function ProjectGallery({ images, title }: { images: PublicImage[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [reduced, setReduced] = useState(false);
  const swipeStart = useRef<number | null>(null);
  const count = images.length;

  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    const first = requestAnimationFrame(update);
    mq.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(first);
      mq.removeEventListener("change", update);
    };
  }, []);

  const playing = count > 1 && !stopped && !hovered && !focused && !reduced;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % count);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [playing, count]);

  const go = (i: number) => setIndex(((i % count) + count) % count);

  if (count === 0) return null;
  if (count === 1) {
    return (
      <div className="cover gallery single">
        <Image src={images[0].url} alt={images[0].alt || title} fill priority sizes="(max-width: 1240px) 100vw, 1240px" />
      </div>
    );
  }

  return (
    <section
      className="cover gallery"
      aria-roledescription="carousel"
      aria-label={`${title} images`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        else if (e.key === "ArrowLeft") go(index - 1);
      }}
      onPointerDown={(e) => (swipeStart.current = e.clientX)}
      onPointerUp={(e) => {
        if (swipeStart.current === null) return;
        const dx = e.clientX - swipeStart.current;
        swipeStart.current = null;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      {/* Announce changes only when the visitor drives them, not on every automatic advance. */}
      <div className="gallery-track" aria-live={playing ? "off" : "polite"}>
        {images.map((img, i) => (
          <div
            key={img.url}
            className={`gallery-slide ${i === index ? "on" : ""}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== index}
          >
            <Image src={img.url} alt={img.alt || `${title}, image ${i + 1}`} fill priority={i === 0} sizes="(max-width: 1240px) 100vw, 1240px" />
          </div>
        ))}
      </div>

      <button type="button" className="gallery-nav prev" onClick={() => go(index - 1)} aria-label="Previous image">
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <button type="button" className="gallery-nav next" onClick={() => go(index + 1)} aria-label="Next image">
        <ChevronRight size={18} aria-hidden="true" />
      </button>

      <div className="gallery-bar">
        <button type="button" className="gallery-play" onClick={() => setStopped((s) => !s)} aria-label={stopped ? "Play slideshow" : "Pause slideshow"}>
          {stopped ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
        </button>
        <div className="gallery-dots">
          {images.map((img, i) => (
            <button key={img.url} type="button" className={i === index ? "on" : ""} aria-label={`Show image ${i + 1} of ${count}`} aria-current={i === index} onClick={() => go(i)} />
          ))}
        </div>
        <span className="gallery-count mono" aria-hidden="true">
          {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </span>
      </div>
    </section>
  );
}
