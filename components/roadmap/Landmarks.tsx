import type { Landmark } from "@/lib/roadmap/landmarks";

// Original cartoon landmarks, drawn around a base point (0,0) and ~90 units tall.
// Colours come from CSS classes (app/globals.css, .journey) so the time-of-day palettes relight them.

const ol = { className: "j-ol", strokeWidth: 4, strokeLinejoin: "round", strokeLinecap: "round" } as const;

function School() {
  return (
    <g>
      <rect {...ol} className="j-ol j-wall" x={-30} y={-46} width={60} height={46} rx={3} />
      <path {...ol} className="j-ol j-roof" d="M-38 -44 L0 -72 L38 -44 Z" />
      <rect {...ol} className="j-ol j-wall" x={-7} y={-90} width={14} height={20} />
      <path {...ol} className="j-ol j-roof" d="M-11 -88 L0 -98 L11 -88 Z" />
      <circle className="j-gold" cx={0} cy={-79} r={3.5} />
      <rect {...ol} className="j-ol j-door" x={-8} y={-24} width={16} height={24} rx={2} />
      <rect {...ol} className="j-ol j-win" x={-25} y={-36} width={11} height={11} rx={2} />
      <rect {...ol} className="j-ol j-win" x={14} y={-36} width={11} height={11} rx={2} />
    </g>
  );
}

function Campus() {
  return (
    <g>
      <rect {...ol} className="j-ol j-wall" x={-40} y={-10} width={80} height={10} rx={2} />
      {[-30, -12, 6, 24].map((x) => (
        <rect key={x} {...ol} className="j-ol j-wall" x={x} y={-50} width={8} height={40} />
      ))}
      <rect {...ol} className="j-ol j-wall" x={-40} y={-60} width={80} height={10} rx={2} />
      <path {...ol} className="j-ol j-roof-alt" d="M-42 -60 L0 -86 L42 -60 Z" />
      <circle {...ol} className="j-ol j-win" cx={0} cy={-70} r={5} />
    </g>
  );
}

function Code() {
  return (
    <g>
      <path {...ol} className="j-ol j-metal" d="M-44 0 L-36 -14 L36 -14 L44 0 Z" />
      <rect {...ol} className="j-ol j-dark" x={-32} y={-62} width={64} height={46} rx={5} />
      <rect className="j-screen" x={-25} y={-55} width={50} height={32} rx={3} />
      <path className="j-dark-stroke" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" d="M-10 -46 L-17 -39 L-10 -32 M10 -46 L17 -39 L10 -32 M4 -48 L-4 -30" />
    </g>
  );
}

function Office() {
  return (
    <g>
      <rect {...ol} className="j-ol j-wall" x={14} y={-46} width={26} height={46} rx={2} />
      <rect {...ol} className="j-ol j-glass" x={-26} y={-96} width={44} height={96} rx={3} />
      {[-84, -68, -52, -36, -20].map((y) =>
        [-19, -3].map((x) => <rect key={`${x}${y}`} className="j-win" x={x} y={y} width={10} height={9} rx={1.5} />),
      )}
      {[-36, -22].map((y) => (
        <rect key={y} className="j-win" x={21} y={y} width={12} height={7} rx={1.5} />
      ))}
      <rect {...ol} className="j-ol j-door" x={-9} y={-12} width={14} height={12} />
    </g>
  );
}

function Trophy() {
  return (
    <g>
      <rect {...ol} className="j-ol j-wood" x={-24} y={-16} width={48} height={16} rx={3} />
      <rect {...ol} className="j-ol j-gold" x={-6} y={-30} width={12} height={14} />
      <path {...ol} className="j-ol j-gold" fill="none" d="M-22 -76 C-40 -76 -40 -54 -16 -50 M22 -76 C40 -76 40 -54 16 -50" style={{ fill: "none" }} />
      <path {...ol} className="j-ol j-gold" d="M-24 -84 L24 -84 L20 -56 C16 -38 -16 -38 -20 -56 Z" />
      <path className="j-shine" d="M-12 -78 L-9 -58" strokeWidth={4} strokeLinecap="round" />
    </g>
  );
}

function Rocket() {
  return (
    <g>
      <path className="j-flame" d="M-9 -16 Q0 14 9 -16 Z" />
      <path {...ol} className="j-ol j-roof" d="M-16 -30 L-30 -8 L-14 -14 Z M16 -30 L30 -8 L14 -14 Z" />
      <path {...ol} className="j-ol j-wall" d="M0 -104 C20 -84 20 -40 14 -14 L-14 -14 C-20 -40 -20 -84 0 -104 Z" />
      <circle {...ol} className="j-ol j-win" cx={0} cy={-62} r={8} />
      <path {...ol} className="j-ol j-roof" d="M0 -104 C10 -96 13 -88 14 -82 L-14 -82 C-13 -88 -10 -96 0 -104 Z" />
    </g>
  );
}

function Flag() {
  return (
    <g>
      <path {...ol} className="j-ol j-wood" d="M-3 0 L-3 -96" />
      <path {...ol} className="j-ol j-roof j-wave" d="M-1 -94 C14 -100 24 -86 42 -92 L42 -64 C24 -58 14 -72 -1 -66 Z" />
      <circle {...ol} className="j-ol j-gold" cx={-3} cy={-98} r={5} />
    </g>
  );
}

const DRAW: Record<Landmark, () => React.ReactElement> = { school: School, campus: Campus, code: Code, office: Office, trophy: Trophy, rocket: Rocket, flag: Flag };

export function LandmarkArt({ kind }: { kind: Landmark }) {
  const Draw = DRAW[kind] ?? Flag;
  return <Draw />;
}
