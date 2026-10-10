import type { Tree } from "./scenery";
import { ROUTE_PATH } from "@/lib/roadmap/engine";
import type { Landmark } from "@/lib/roadmap/landmarks";
import { LandmarkArt } from "./Landmarks";

// Cartoon overworld layers shared by the public map and the admin position preview.
// All colours are CSS classes (".journey .j-*" in app/globals.css) driven by the time-of-day palette.

const round = { fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;

// Fixed decorative scatter (world units); deterministic so server and client agree.
const CLOUDS = [
  { x: 260, y: 470, s: 1.1 },
  { x: 980, y: 380, s: 0.8 },
  { x: 1500, y: 980, s: 1.25 },
  { x: 2050, y: 620, s: 0.9 },
];
const STARS = Array.from({ length: 60 }, (_, i) => ({ x: ((i * 397) % 2600) - 400, y: ((i * 211) % 1300) + 120, r: 1.5 + (i % 3) }));
const WAVES = Array.from({ length: 34 }, (_, i) => ({ x: ((i * 523) % 2700) - 450, y: ((i * 317) % 1250) + 150 }));

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse className="j-cloud-shadow" cx={40} cy={150} rx={110} ry={34} />
      <g className="j-cloud">
        <circle cx={-40} cy={0} r={38} />
        <circle cx={10} cy={-24} r={52} />
        <circle cx={64} cy={-4} r={40} />
        <rect x={-70} y={-4} width={170} height={40} rx={20} />
      </g>
    </g>
  );
}

export function Road({ trees, roadRef }: { trees: Tree[]; roadRef?: React.Ref<SVGPathElement> }) {
  return (
    <>
      <rect className="j-sea" x={-1200} y={-600} width={4600} height={2800} />
      <g className="j-stars">
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} />
        ))}
      </g>
      <g className="j-waves">
        {WAVES.map((w, i) => (
          <path key={i} d={`M${w.x} ${w.y} q 12 -10 24 0 t 24 0`} {...round} strokeWidth={4} />
        ))}
      </g>
      {/* Foam rings, outline, sand, cliff and lifted grass give the island a chunky tile edge. */}
      <path className="j-foam-outer" d={ROUTE_PATH} {...round} strokeWidth={560} />
      <path className="j-foam" d={ROUTE_PATH} {...round} strokeWidth={512} />
      <path className="j-ol-stroke" d={ROUTE_PATH} {...round} strokeWidth={490} />
      <path className="j-sand" d={ROUTE_PATH} {...round} strokeWidth={478} />
      <path className="j-cliff" d={ROUTE_PATH} {...round} strokeWidth={430} transform="translate(0 10)" />
      <path className="j-ol-stroke" d={ROUTE_PATH} {...round} strokeWidth={430} />
      <path className="j-grass" d={ROUTE_PATH} {...round} strokeWidth={422} />
      <path className="j-grass-hi" d={ROUTE_PATH} {...round} strokeWidth={290} />
      <g>
        {trees.map((t, i) =>
          i % 7 === 3 ? (
            <g key={i}>
              <ellipse className="j-ground-shadow" cx={t.x + 3} cy={t.y + t.r * 0.5} rx={t.r * 0.9} ry={t.r * 0.35} />
              <path className="j-ol j-rock" strokeWidth={3} strokeLinejoin="round" d={`M${t.x - t.r * 0.8} ${t.y + t.r * 0.4} Q${t.x - t.r * 0.6} ${t.y - t.r * 0.6} ${t.x} ${t.y - t.r * 0.5} Q${t.x + t.r * 0.8} ${t.y - t.r * 0.4} ${t.x + t.r * 0.8} ${t.y + t.r * 0.4} Z`} />
            </g>
          ) : (
            <g key={i}>
              <ellipse className="j-ground-shadow" cx={t.x + 4} cy={t.y + t.r + 4} rx={t.r} ry={t.r * 0.38} />
              <rect className="j-ol j-trunk" strokeWidth={3} x={t.x - 3} y={t.y + t.r * 0.4} width={6} height={t.r * 0.7} rx={2} />
              <circle className="j-ol j-tree" strokeWidth={3.5} cx={t.x} cy={t.y} r={t.r} />
              <circle className="j-tree-hi" cx={t.x - t.r * 0.3} cy={t.y - t.r * 0.32} r={t.r * 0.45} />
            </g>
          ),
        )}
      </g>
      <path className="j-ol-stroke" d={ROUTE_PATH} {...round} strokeWidth={76} />
      <path ref={roadRef} className="j-road-edge" d={ROUTE_PATH} {...round} strokeWidth={68} />
      <path className="j-road" d={ROUTE_PATH} {...round} strokeWidth={54} />
      <path className="j-dash" d={ROUTE_PATH} fill="none" strokeWidth={5} strokeDasharray="16 22" strokeLinecap="round" />
    </>
  );
}

/** Drifting clouds sit above everything else in the world. */
export function Sky() {
  return (
    <g className="j-sky" aria-hidden="true">
      {CLOUDS.map((c, i) => (
        <g key={i} className="j-drift" style={{ animationDelay: `${-i * 13}s` }}>
          <Cloud {...c} />
        </g>
      ))}
    </g>
  );
}

type StopProps = {
  x: number;
  y: number;
  index: number;
  label: string;
  active: boolean;
  visited: boolean;
  /** Landmark springs up out of the pad when raised. */
  raised?: boolean;
  landmark?: Landmark;
  onSelect?: () => void;
};

/** A level pad: a round tile with a number badge, a name plaque and a pop-up landmark. */
export function Stop({ x, y, index, label, active, visited, raised = true, landmark = "flag", onSelect }: StopProps) {
  const short = label.length > 22 ? `${label.split(",")[0].slice(0, 21)}…` : label;
  const plaqueW = Math.max(90, short.length * 11 + 30);
  return (
    <g className={`stop ${raised ? "up" : ""} ${visited ? "done" : ""}`} onClick={onSelect} data-testid={`stop-${index}`} transform={`translate(${x} ${y})`}>
      {active && <ellipse className="pulse" cx={0} cy={4} rx={58} ry={34} fill="none" strokeWidth={5} />}
      <ellipse className="j-ground-shadow" cx={4} cy={18} rx={52} ry={22} />
      <ellipse className="j-ol j-pad-side" strokeWidth={4} cx={0} cy={10} rx={46} ry={26} />
      <ellipse className="j-ol j-pad" strokeWidth={4} cx={0} cy={0} rx={46} ry={26} />
      <ellipse className="j-pad-ring" cx={0} cy={0} rx={32} ry={17} fill="none" strokeWidth={3} strokeDasharray="6 7" />
      <g className="j-pop">
        <g transform="translate(0 4) scale(1.12)">
          <LandmarkArt kind={landmark} />
        </g>
      </g>
      {/* Arrival pennant: runs up its pole just after the landmark pops (CSS .stop.done). The flag landmark is its own flag. */}
      {landmark !== "flag" && (
        <g transform="translate(-68 10)">
          <path className="j-ol-stroke" d="M0 0 L0 -64" strokeWidth={4} strokeLinecap="round" />
          <path className="j-ol j-pennant" strokeWidth={3} strokeLinejoin="round" d="M-2 -62 L-28 -54 L-2 -46 Z" />
        </g>
      )}
      <g transform="translate(34 18)">
        <circle className="j-ol j-badge" strokeWidth={4} r={17} />
        <text className="j-badge-text" y={6.5} textAnchor="middle" fontSize={19} fontWeight={700}>
          {index + 1}
        </text>
      </g>
      {/* The name sits on the pad rim until the landmark pops, then rides up above it. */}
      <g className="j-plaque-group" style={{ transform: `translateY(${raised ? -150 : -50}px)` }}>
        <rect className="j-ol j-plaque" strokeWidth={4} x={-plaqueW / 2} y={-17} width={plaqueW} height={34} rx={17} />
        <text className="j-plaque-text" y={7} textAnchor="middle" fontSize={19} fontWeight={600}>
          {short}
        </text>
      </g>
    </g>
  );
}

/** Top-down car with outline, headlight beams (visible at night) and a body that bobs while driving. */
export function Car({ carRef, bodyRef }: { carRef?: React.Ref<SVGGElement>; bodyRef?: React.Ref<SVGGElement> }) {
  return (
    <g ref={carRef} data-testid="car">
      <path className="j-beam" d="M28 -12 L150 -58 L150 58 L28 12 Z" />
      <ellipse className="j-ground-shadow" cx={4} cy={6} rx={36} ry={20} />
      <g ref={bodyRef}>
        {[-19, 13].map((x) => [-21, 15].map((y) => <rect key={`${x}${y}`} className="j-ol j-tyre" strokeWidth={3} x={x} y={y} width={14} height={7} rx={3} />))}
        <rect className="j-ol j-car" strokeWidth={4} x={-32} y={-17} width={64} height={34} rx={12} />
        <rect className="j-car-hi" x={-26} y={-13} width={50} height={6} rx={3} />
        <rect className="j-ol j-cabin" strokeWidth={3.5} x={-10} y={-13} width={26} height={26} rx={7} />
        <rect className="j-cabin-glass" x={9} y={-9} width={4} height={18} rx={2} />
        <rect className="j-lamp" x={27} y={-13} width={5} height={8} rx={2} />
        <rect className="j-lamp" x={27} y={5} width={5} height={8} rx={2} />
      </g>
    </g>
  );
}

/** Samples the road every `step` units. Returns null where SVG geometry is unavailable (e.g. jsdom). */
export function sampleRoad(road: SVGPathElement | null, step = 24) {
  if (!road || typeof road.getTotalLength !== "function") return null;
  const total = road.getTotalLength();
  const samples = [];
  for (let l = 0; l <= total; l += step) {
    const p = road.getPointAtLength(l);
    samples.push({ x: p.x, y: p.y });
  }
  return { total, samples };
}
