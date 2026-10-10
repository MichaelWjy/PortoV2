"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PublicMilestone } from "@/lib/services/public";
import {
  cameraTarget,
  driveFromInput,
  easeAngle,
  nearestStop,
  padPosition,
  ROUTE_START,
  stepCar,
  stopDistances,
  viewSize,
  type CarState,
} from "@/lib/roadmap/engine";
import { track } from "@/lib/analytics-client";
import { Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { Car, Road, sampleRoad, Sky, Stop } from "./Road";
import { raisedPads, timeOfDay, TIME_LABELS, type TimeOfDay } from "@/lib/roadmap/time-of-day";
import { generateTrees, type Tree } from "./scenery";
import { Multiline } from "@/components/portfolio/Multiline";

type Props = {
  milestones: PublicMilestone[];
  copy: { eyebrow: string; headline: string; description: string };
};

type Geometry = { total: number; stops: { L: number; x: number; y: number; pad: { x: number; y: number } }[]; trees: Tree[] };

const KEYMAP: Record<string, "f" | "b"> = { d: "f", w: "f", ArrowRight: "f", a: "b", s: "b", ArrowLeft: "b" };

const TIME_ICON = { dawn: Sunrise, day: Sun, dusk: Sunset, night: Moon } as const;
const DUST = 10;

function isEditable(el: EventTarget | null) {
  return el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

export function JourneyMap({ milestones, copy }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const roadRef = useRef<SVGPathElement>(null);
  const carRef = useRef<SVGGElement>(null);
  const bodyRef = useRef<SVGGElement>(null);
  const dustRef = useRef<SVGGElement>(null);

  const [geo, setGeo] = useState<Geometry | null>(null);
  const [active, setActive] = useState(-1);
  const [visited, setVisited] = useState<ReadonlySet<number>>(new Set());
  const [hint, setHint] = useState<{ start: boolean; next: number }>({ start: true, next: 0 });
  const [raised, setRaised] = useState<ReadonlySet<number>>(new Set());
  // Server renders daylight; the visitor's own clock picks the palette after mount.
  const [clock, setClock] = useState<{ tod: TimeOfDay; label: string } | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock({ tod: timeOfDay(now.getHours()), label: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
    };
    const first = requestAnimationFrame(tick);
    const id = setInterval(tick, 60_000);
    return () => {
      cancelAnimationFrame(first);
      clearInterval(id);
    };
  }, []);

  // Per-frame simulation state lives in a ref: no React re-render per frame.
  const sim = useRef({
    car: { L: 0, v: 0, target: null } as CarState,
    ang: 0,
    cam: { ...ROUTE_START },
    keys: { f: false, b: false },
    hold: { f: false, b: false },
    keysActive: false,
    visible: false,
    active: -1,
    start: true,
    reduced: false,
    visited: new Set<number>(),
    raisedKey: "",
    time: 0,
    dust: Array.from({ length: DUST }, () => ({ x: 0, y: 0, age: 1 })),
    dustClock: 0,
    driveTo: null as null | ((L: number) => void),
  });

  // Measure the road once in the browser; the server render has no geometry.
  useEffect(() => {
    const sampled = sampleRoad(roadRef.current);
    if (!sampled) return;
    const road = roadRef.current!;
    const stops = stopDistances(milestones.map((m) => m.routePosition), sampled.total).map((L) => {
      const p = road.getPointAtLength(L);
      const ahead = L + 4 <= sampled.total;
      const q = road.getPointAtLength(ahead ? L + 4 : L - 4);
      return { L, x: p.x, y: p.y, pad: ahead ? padPosition(p, q) : padPosition(q, p) };
    });
    setGeo({ total: sampled.total, stops, trees: generateTrees(sampled.samples) });
  }, [milestones]);

  useEffect(() => {
    if (!geo) return;
    const s = sim.current;
    const svg = svgRef.current!;
    const road = roadRef.current!;
    const car = carRef.current!;
    const frame = frameRef.current!;
    const stopL = geo.stops.map((st) => st.L);
    s.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let running = false;
    let last = 0;

    const render = (dt: number) => {
      const drive = driveFromInput(s.keys.f || s.hold.f, s.keys.b || s.hold.b);
      s.car = s.reduced && drive === 0 && s.car.target !== null ? { L: s.car.target, v: 0, target: null } : stepCar(s.car, drive, geo.total, dt);
      const { L, v } = s.car;

      const p = road.getPointAtLength(L);
      const nearEnd = L + 3 > geo.total;
      const q = road.getPointAtLength(nearEnd ? geo.total - 3 : L + 3);
      let a = nearEnd ? Math.atan2(p.y - q.y, p.x - q.x) : Math.atan2(q.y - p.y, q.x - p.x);
      if (v < -25) a += Math.PI;
      s.ang = s.reduced ? a : easeAngle(s.ang, a, dt);
      car.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${(s.ang * 180) / Math.PI})`);

      // Body bob and dust puffs while moving (skipped for reduced motion).
      s.time += dt;
      const moving = Math.abs(v) > 30 && !s.reduced;
      bodyRef.current?.setAttribute("transform", moving ? `translate(0 ${Math.sin(s.time * 22) * 1.4}) scale(${1 + Math.sin(s.time * 11) * 0.015})` : "");
      s.dustClock += dt;
      if (moving && s.dustClock > 0.07) {
        s.dustClock = 0;
        const slot = s.dust.reduce((oldest, d, i, all) => (d.age > all[oldest].age ? i : oldest), 0);
        const back = v > 0 ? -34 : 34;
        s.dust[slot] = { x: p.x + Math.cos(s.ang) * back + (Math.random() - 0.5) * 14, y: p.y + Math.sin(s.ang) * back + (Math.random() - 0.5) * 14, age: 0 };
      }
      const puffs = dustRef.current?.children;
      s.dust.forEach((d, i) => {
        d.age = Math.min(1, d.age + dt / 0.7);
        const c = puffs?.[i];
        if (!c) return;
        c.setAttribute("cx", d.x.toFixed(1));
        c.setAttribute("cy", (d.y - d.age * 10).toFixed(1));
        c.setAttribute("r", (5 + d.age * 13).toFixed(1));
        c.setAttribute("opacity", (0.55 * (1 - d.age)).toFixed(2));
      });

      const W = svg.clientWidth || 1000;
      const H = svg.clientHeight || 700;
      const { vw, vh } = viewSize(W, H);
      const t = cameraTarget(p, W, H);
      const k = s.reduced ? 1 : Math.min(1, dt * 4);
      s.cam.x += (t.x - s.cam.x) * k;
      s.cam.y += (t.y - s.cam.y) * k;
      svg.setAttribute("viewBox", `${s.cam.x - vw / 2} ${s.cam.y - vh / 2} ${vw} ${vh}`);

      const near = nearestStop(stopL, L);
      if (near !== s.active) {
        s.active = near;
        setActive(near);
        if (near >= 0) {
          s.visited.add(near);
          setVisited((prev) => (prev.has(near) ? prev : new Set(prev).add(near)));
          track("MILESTONE_VIEW", `/journey/${milestones[near].slug}`);
        } else {
          const next = stopL.findIndex((x) => x > L);
          setHint({ start: L < 5, next: next < 0 ? stopL.length - 1 : next });
        }
      }
      // Landmarks pop up as the car approaches and stay up once visited; reduced motion shows them all.
      const up = s.reduced ? stopL.map((_, i) => i) : raisedPads(stopL, L, s.visited);
      const key = up.join(",");
      if (key !== s.raisedKey) {
        s.raisedKey = key;
        setRaised(new Set(up));
      }
      if (near < 0 && s.start !== L < 5) {
        s.start = L < 5;
        setHint((h) => ({ ...h, start: L < 5 }));
      }
    };

    const loop = (ts: number) => {
      const dt = last ? (ts - last) / 1000 : 0;
      last = ts;
      render(dt);
      if (s.visible) raf = requestAnimationFrame(loop);
      else running = false;
    };
    const start = () => {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(loop);
    };

    s.driveTo = (L: number) => {
      s.car = { ...s.car, target: L };
      start();
    };

    // The loop only runs while the map is on screen; keys are captured only when it is mostly visible,
    // so the rest of the page scrolls and types normally.
    const io = new IntersectionObserver(
      ([e]) => {
        s.visible = e.isIntersecting;
        s.keysActive = e.intersectionRatio >= 0.4;
        if (!s.keysActive) s.keys = { f: false, b: false };
        if (s.visible) start();
      },
      { threshold: [0, 0.4] },
    );
    io.observe(frame);

    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      const k = KEYMAP[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!k || e.altKey || e.ctrlKey || e.metaKey) return;
      if (down && (!s.keysActive || isEditable(e.target))) return;
      s.keys[k] = down;
      if (down) e.preventDefault();
    };
    const keydown = onKey(true);
    const keyup = onKey(false);
    const release = () => {
      s.keys = { f: false, b: false };
      s.hold = { f: false, b: false };
    };
    const onVisibility = () => document.hidden && release();
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", onVisibility);

    render(0);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [geo, milestones]);

  const goTo = (i: number) => geo && sim.current.driveTo?.(geo.stops[i].L);

  const hold = (dir: "f" | "b", on: boolean) => {
    sim.current.hold[dir] = on;
  };
  /** Keyboard activation of Drive/Reverse (a click with detail 0) jumps to the next/previous stop. */
  const stepTo = (dir: "f" | "b") => {
    if (!geo) return;
    const L = sim.current.car.L;
    const idx = dir === "f" ? geo.stops.findIndex((st) => st.L > L + 5) : geo.stops.findLastIndex((st) => st.L < L - 5);
    if (idx >= 0) goTo(idx);
  };

  const m = active >= 0 ? milestones[active] : null;

  return (
    <div className="journey" id="journey" ref={frameRef} data-testid="journey" data-time={clock?.tod ?? "day"} data-moved={!hint.start || active >= 0 ? "" : undefined}>
      <svg ref={svgRef} className="map" viewBox="-200 400 1600 1000" aria-hidden="true" focusable="false">
        <Road trees={geo?.trees ?? []} roadRef={roadRef} />
        {geo?.stops.map((st, i) => (
          <Stop
            key={milestones[i].id}
            x={st.pad.x}
            y={st.pad.y}
            index={i}
            label={milestones[i].title}
            landmark={milestones[i].landmark}
            active={i === active}
            visited={visited.has(i)}
            raised={raised.has(i)}
            onSelect={() => goTo(i)}
          />
        ))}
        <g ref={dustRef} className="j-dust">
          {Array.from({ length: DUST }, (_, i) => (
            <circle key={i} r={0} opacity={0} />
          ))}
        </g>
        <Car carRef={carRef} bodyRef={bodyRef} />
        <Sky />
      </svg>

      <div className="jl">
        <span className="mono">{copy.eyebrow}</span>
        <h2 id="journey-title">
          <Multiline text={copy.headline} />
        </h2>
        <p>{copy.description}</p>
        <div className="kb" aria-hidden="true">
          <span>
            <u /> <u>W</u> <u /> <u>A</u> <u>S</u> <u>D</u>
          </span>
          Move the car
        </div>
        {clock && <TimeChip tod={clock.tod} label={clock.label} />}
      </div>

      <div className="pips" role="group" aria-label="Milestones">
        {milestones.map((ms, i) => (
          <button
            key={ms.id}
            type="button"
            className={[i === active && "on", visited.has(i) && "done"].filter(Boolean).join(" ")}
            aria-label={`Drive to milestone ${i + 1}: ${ms.title}`}
            aria-pressed={i === active}
            onClick={() => goTo(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className={`card ${m ? "open" : ""}`} aria-live="polite" data-testid="milestone-card">
        {m ? (
          <>
            {m.image && <Image src={m.image.url} alt={m.image.alt} width={m.image.width ?? 600} height={m.image.height ?? 300} sizes="310px" />}
            <h3>{m.title}</h3>
            <small>{[m.category, m.period].filter(Boolean).join(" · ")}</small>
            <p>{m.shortDescription}</p>
            {m.tags.length > 0 && (
              <div className="tags">
                {m.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            )}
            {m.project && (
              <Link className="more mono" href={`/projects/${m.project.slug}`}>
                View {m.project.title} →
              </Link>
            )}
          </>
        ) : (
          <>
            <h3>{hint.start ? "Start the engine" : `Next stop: ${milestones[hint.next]?.title.split(",")[0] ?? ""}`}</h3>
            <small>Keep driving</small>
            <p>{hint.start ? "Hold Drive, press D or the right arrow, or tap any numbered stop to be driven there." : "Tap a numbered stop to jump straight to it."}</p>
          </>
        )}
      </div>

      <div className="ctls">
        <button
          type="button"
          className="ctl"
          aria-label="Drive backward (hold), or press to go to the previous stop"
          onPointerDown={(e) => {
            e.preventDefault();
            hold("b", true);
          }}
          onPointerUp={() => hold("b", false)}
          onPointerCancel={() => hold("b", false)}
          onPointerLeave={() => hold("b", false)}
          onContextMenu={(e) => e.preventDefault()}
          onClick={(e) => e.detail === 0 && stepTo("b")}
        >
          Reverse
        </button>
        <button
          type="button"
          className="ctl go"
          aria-label="Drive forward (hold), or press to go to the next stop"
          onPointerDown={(e) => {
            e.preventDefault();
            hold("f", true);
          }}
          onPointerUp={() => hold("f", false)}
          onPointerCancel={() => hold("f", false)}
          onPointerLeave={() => hold("f", false)}
          onContextMenu={(e) => e.preventDefault()}
          onClick={(e) => e.detail === 0 && stepTo("f")}
        >
          Drive
        </button>
      </div>
    </div>
  );
}

function TimeChip({ tod, label }: { tod: TimeOfDay; label: string }) {
  const Icon = TIME_ICON[tod];
  return (
    <span className="time-chip">
      <Icon size={14} strokeWidth={2.5} aria-hidden="true" />
      {TIME_LABELS[tod]} · {label} your time
    </span>
  );
}
