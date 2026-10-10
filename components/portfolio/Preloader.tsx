"use client";

import { useEffect, useRef, useState } from "react";

// Timings (ms) follow the prototype exactly. See docs/DESIGN_SYSTEM.md#preloader.
const LOAD_MS = 2600;
const RING = 326.7;
const SEEN_KEY = "mw-intro-seen";

type Phase = "loading" | "hello" | "done";

const letters = (text: string, offset: number) =>
  [...text].map((c, i) => ({ c, delay: (i + offset) * 0.05 }));

function storageGet(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Private mode: the intro will simply play again next time.
  }
}

/**
 * Intro overlay: progress ring, "Hello Everyone" → "Hello World", then the owner's name.
 * Plays once per browser session and never for reduced-motion users. The page underneath is
 * fully rendered and reachable by assistive technology the whole time (the overlay is aria-hidden),
 * and a CSS failsafe hides the overlay even if this script never runs.
 */
export function Preloader({ name }: { name: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [loaderOff, setLoaderOff] = useState(false);
  const [word, setWord] = useState<{ c: string; delay: number }[]>([]);
  const [helloOut, setHelloOut] = useState(false);
  const [stage, setStage] = useState<"" | "nm" | "nm nm2">("");
  const [out, setOut] = useState(false);
  const pct = useRef<HTMLElement>(null);
  const ring = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || storageGet(SEEN_KEY)) {
      root.dataset.intro = "done";
      const skip = requestAnimationFrame(() => setPhase("done"));
      return () => cancelAnimationFrame(skip);
    }
    root.dataset.intro = "playing";

    const timers: ReturnType<typeof setTimeout | typeof setInterval>[] = [];
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
    let raf = 0;
    let cancelled = false;

    const hello = () => {
      setLoaderOff(true);
      later(() => {
        setPhase("hello");
        setWord(letters("Everyone", 6));
        later(() => {
          let remaining = "Everyone".length;
          const del = setInterval(() => {
            remaining -= 1;
            setWord(letters("Everyone".slice(0, remaining), 6));
            if (remaining > 0) return;
            clearInterval(del);
            later(() => {
              let k = 0;
              const type = setInterval(() => {
                k += 1;
                setWord(letters("World".slice(0, k), 0).map((l) => ({ ...l, delay: 0 })));
                if (k === 5) clearInterval(type);
              }, 110);
              timers.push(type);
            }, 260);
          }, 70);
          timers.push(del);
        }, 1700);
        later(() => {
          setHelloOut(true);
          setStage("nm");
        }, 3900);
        later(() => setStage("nm nm2"), 5300);
        later(() => {
          setOut(true);
          root.dataset.intro = "done";
          storageSet(SEEN_KEY, "1");
        }, 7000);
        later(() => setPhase("done"), 7900);
      }, 500);
    };

    const t0 = performance.now();
    const tick = (ts: number) => {
      if (cancelled) return;
      const u = Math.min(1, (ts - t0) / LOAD_MS);
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      const n = Math.round(e * 100);
      if (pct.current) pct.current.textContent = `${n}%`;
      ring.current?.setAttribute("stroke-dashoffset", (RING * (1 - n / 100)).toFixed(1));
      if (u < 1) raf = requestAnimationFrame(tick);
      else later(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(() => !cancelled && hello()), 250);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timers.forEach((t) => clearTimeout(t));
      root.dataset.intro = "done";
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div className={`pre ${stage} ${out ? "out" : ""}`} aria-hidden="true" data-testid="preloader">
      <div className={`loader ${loaderOff ? "off" : ""}`}>
        <div className="pre-ring">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="1.5" />
            <circle ref={ring} cx="60" cy="60" r="52" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={RING} transform="rotate(-90 60 60)" />
          </svg>
          <b ref={pct}>0%</b>
        </div>
        <span className="mono">Loading assets...</span>
      </div>
      {phase === "hello" && (
        <h2 className={helloOut ? "x" : ""}>
          {letters("Hello ", 0).map((l, i) => (
            <span key={`h${i}`} style={{ animationDelay: `${l.delay}s` }}>{l.c}</span>
          ))}
          {word.map((l, i) => (
            <span key={`w${i}${l.c}`} style={{ animationDelay: `${l.delay}s` }}>{l.c}</span>
          ))}
          <i className="cr" />
        </h2>
      )}
      <p className="name">{name}</p>
    </div>
  );
}
