// Decorative trees beside the road, generated deterministically (seed 7) exactly as in the prototype.

export type Point = { x: number; y: number };
export type Tree = { x: number; y: number; r: number; color: string };

const TREE_COLORS = ["#244b46", "#2a5951", "#315f57"];

/** mulberry32 PRNG. */
export function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `samples` are points along the road every ~24 units. Trees never land within 75 units of the road. */
export function generateTrees(samples: Point[], seed = 7): Tree[] {
  const rnd = seededRandom(seed);
  const trees: Tree[] = [];
  for (let i = 0; i < samples.length * 2; i++) {
    const ai = Math.floor(rnd() * samples.length);
    const a = samples[ai];
    const b = samples[Math.min(samples.length - 1, ai + 1)];
    const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
    const off = (rnd() < 0.5 ? -1 : 1) * (85 + rnd() * 115);
    const x = a.x + Math.cos(ang) * off;
    const y = a.y + Math.sin(ang) * off;
    if (samples.some((p) => (p.x - x) ** 2 + (p.y - y) ** 2 < 75 * 75)) continue;
    const r = 9 + rnd() * 10;
    trees.push({ x, y, r, color: TREE_COLORS[Math.floor(rnd() * 3)] });
  }
  return trees;
}
