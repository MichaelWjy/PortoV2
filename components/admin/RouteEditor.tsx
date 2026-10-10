"use client";

import { useEffect, useRef, useState } from "react";
import { Car, Road, sampleRoad, Stop } from "@/components/roadmap/Road";
import { padPosition } from "@/lib/roadmap/engine";
import { generateTrees, type Point, type Tree } from "@/components/roadmap/scenery";
import type { RouteStop } from "./fields";

type Props = {
  name: string;
  value: number;
  onChange: (v: number) => void;
  /** Other milestones, shown for context. */
  others: RouteStop[];
  title: string;
};

type Geo = { total: number; samples: Point[]; fine: Point[]; trees: Tree[] };

/**
 * Milestone placement without raw coordinates: click the road (or use the slider / arrow keys)
 * to set the position as a fraction of the road's length, the same coordinate the public map uses.
 */
export function RouteEditor({ name, value, onChange, others, title }: Props) {
  const roadRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);

  useEffect(() => {
    const s = sampleRoad(roadRef.current);
    const fine = sampleRoad(roadRef.current, 4);
    if (s && fine) setGeo({ total: s.total, samples: s.samples, fine: fine.samples, trees: generateTrees(s.samples) });
  }, []);

  const at = (pos: number) => {
    if (!geo) return null;
    const i = Math.round(Math.min(1, Math.max(0, pos)) * (geo.fine.length - 1));
    return geo.fine[i];
  };
  // Pads render beside the road exactly as on the public map.
  const padAt = (pos: number) => {
    if (!geo) return null;
    const i = Math.round(Math.min(1, Math.max(0, pos)) * (geo.fine.length - 1));
    const j = Math.min(geo.fine.length - 1, i + 1);
    return j > i ? padPosition(geo.fine[i], geo.fine[j]) : padPosition(geo.fine[i - 1], geo.fine[i]);
  };

  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || !geo) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    let best = 0;
    let bestD = Infinity;
    geo.fine.forEach((q, i) => {
      const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    onChange(Number((best / (geo.fine.length - 1)).toFixed(3)));
  };

  const me = at(value);
  const mePad = padAt(value);

  return (
    <div className="adm-route">
      <svg ref={svgRef} viewBox="-150 150 2250 1050" onClick={onClick} role="img" aria-label={`Road preview. ${title || "This milestone"} is at ${Math.round(value * 100)}% of the road.`}>
        <rect x={-150} y={150} width={2250} height={1050} fill="#0f1824" />
        <Road trees={geo?.trees ?? []} roadRef={roadRef} />
        {others.map((o, i) => {
          const p = padAt(o.position);
          return p ? (
            <g key={o.id} opacity={0.45}>
              <Stop x={p.x} y={p.y} index={i} label={o.title} active={false} visited={false} />
            </g>
          ) : null;
        })}
        {me && (
          <>
            {mePad && <Stop x={mePad.x} y={mePad.y} index={others.length} label={title || "This milestone"} active visited />}
            <g transform={`translate(${me.x} ${me.y - 70})`}>
              <Car />
            </g>
          </>
        )}
      </svg>
      <div className="adm-route-controls">
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Position along the road"
        />
        <input className="adm-input" style={{ width: 100 }} type="number" min={0} max={1} step={0.001} name={name} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label="Position (0 to 1)" />
      </div>
    </div>
  );
}
