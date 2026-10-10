// Movement model for the journey map, ported from the prototype. Pure functions so they can be unit tested.
// World units are SVG user units of ROUTE_PATH. Distances along the road are "L" (0..total length).

/** The road, in world coordinates. Milestones are placed by fraction of its length (Milestone.routePosition). */
export const ROUTE_PATH = "M 140 900 C 380 980, 520 700, 760 680 S 1060 900, 1300 790 S 1420 420, 1660 360 S 1900 560, 1860 820";
export const ROUTE_START = { x: 140, y: 900 };

export const MAX_SPEED = 340;
export const MAX_AUTOPILOT_SPEED = 560;
export const ARRIVE_EPSILON = 5;
export const STOP_RADIUS = 40;
const ACCEL = 6;
const TURN = 9;
const MAX_DT = 0.05;

/** -1 reverse, 0 idle, 1 forward. */
export type Drive = -1 | 0 | 1;

export type CarState = {
  /** Distance travelled along the road. */
  L: number;
  /** Signed speed along the road (units/s). */
  v: number;
  /** Autopilot destination along the road, or null when driven manually. */
  target: number | null;
};

export const clampDt = (dt: number) => Math.min(Math.max(dt, 0), MAX_DT);

export function driveFromInput(forward: boolean, backward: boolean): Drive {
  return ((forward ? 1 : 0) - (backward ? 1 : 0)) as Drive;
}

/**
 * Advances the car one frame. Manual input cancels autopilot. The car can never leave [0, total],
 * and speed is zeroed when pinned against an end so it does not "stick" there.
 */
export function stepCar(state: CarState, drive: Drive, total: number, rawDt: number): CarState {
  const dt = clampDt(rawDt);
  let { L, v, target } = state;
  let want: number = drive;
  let max = MAX_SPEED;

  if (want !== 0) target = null;
  if (target !== null) {
    const d = target - L;
    if (Math.abs(d) < ARRIVE_EPSILON) return { L: target, v: 0, target: null };
    want = Math.sign(d);
    max = Math.min(MAX_AUTOPILOT_SPEED, Math.abs(d) * 3 + 70);
  }

  v += (want * max - v) * Math.min(1, dt * ACCEL);
  L += v * dt;
  if (L <= 0 || L >= total) {
    L = Math.max(0, Math.min(total, L));
    v = 0;
  }
  return { L, v, target };
}

/** Index of the stop the car is parked at (within STOP_RADIUS), or -1. Stops are distances along the road. */
export function nearestStop(stops: readonly number[], L: number, radius = STOP_RADIUS): number {
  let best = -1;
  let bestDist = radius;
  stops.forEach((s, i) => {
    const d = Math.abs(s - L);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  });
  return best;
}

/** Eases `angle` toward `target` along the shortest arc. Radians. */
export function easeAngle(angle: number, target: number, rawDt: number): number {
  const diff = ((target - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return angle + diff * Math.min(1, clampDt(rawDt) * TURN);
}

/** Visible world area for a viewport. Wide screens zoom in, narrow ones zoom out (but stay readable). */
export function viewSize(width: number, height: number) {
  const zoom = Math.min(1.1, Math.max(0.7, width / 1000));
  return { vw: width / zoom, vh: height / zoom };
}

/**
 * Where the camera should look so the car and the pads behind it stay in the open part of the map:
 * on wide screens slightly left of and below centre (panel top-left, card bottom-right); on phones just
 * below centre, between the title strip and the info card.
 */
export function cameraTarget(car: { x: number; y: number }, width: number, height: number) {
  const { vw, vh } = viewSize(width, height);
  return { x: car.x + (width > 820 ? vw * 0.05 : 0), y: car.y + vh * (width < 640 ? 0.02 : -0.05) };
}

/** Converts admin-entered positions (0..1) to distances; clamps out-of-range values. */
export function stopDistances(positions: readonly number[], total: number): number[] {
  return positions.map((p) => Math.min(1, Math.max(0, p)) * total);
}

/** Pads sit just behind the road, so their landmarks grow away from the car and are never covered by it. */
export const PAD_OFFSET = 76;

/** Point `dist` units from road point `p`, perpendicular to the road direction p→q, on the upper (far) side. Pure. */
export function padPosition(p: { x: number; y: number }, q: { x: number; y: number }, dist = PAD_OFFSET) {
  const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
  let nx = -(q.y - p.y) / len;
  let ny = (q.x - p.x) / len;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  return { x: p.x + nx * dist, y: p.y + ny * dist };
}
