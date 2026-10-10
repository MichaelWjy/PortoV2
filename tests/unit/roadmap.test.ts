import { describe, expect, it } from "vitest";
import {
  ARRIVE_EPSILON,
  cameraTarget,
  driveFromInput,
  easeAngle,
  MAX_SPEED,
  nearestStop,
  stepCar,
  stopDistances,
  viewSize,
  type CarState,
} from "@/lib/roadmap/engine";
import { generateTrees } from "@/components/roadmap/scenery";

const TOTAL = 2000;
const run = (s: CarState, drive: -1 | 0 | 1, seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 60) s = stepCar(s, drive, TOTAL, 1 / 60);
  return s;
};

describe("journey movement model", () => {
  it("maps keys and buttons to a drive direction", () => {
    expect(driveFromInput(true, false)).toBe(1);
    expect(driveFromInput(false, true)).toBe(-1);
    expect(driveFromInput(true, true)).toBe(0);
    expect(driveFromInput(false, false)).toBe(0);
  });

  it("accelerates forward toward max speed and moves along the road", () => {
    const s = run({ L: 0, v: 0, target: null }, 1, 1);
    expect(s.L).toBeGreaterThan(100);
    expect(s.v).toBeGreaterThan(MAX_SPEED * 0.9);
    expect(s.v).toBeLessThanOrEqual(MAX_SPEED);
  });

  it("never leaves the road and does not stick at the ends", () => {
    const atStart = run({ L: 10, v: 0, target: null }, -1, 2);
    expect(atStart.L).toBe(0);
    expect(atStart.v).toBe(0);
    const moved = run(atStart, 1, 0.5);
    expect(moved.L).toBeGreaterThan(0);

    const atEnd = run({ L: TOTAL - 10, v: 0, target: null }, 1, 2);
    expect(atEnd.L).toBe(TOTAL);
    expect(run(atEnd, -1, 0.5).L).toBeLessThan(TOTAL);
  });

  it("decelerates when input is released", () => {
    const fast = run({ L: 0, v: 0, target: null }, 1, 1);
    const coasted = run(fast, 0, 2);
    expect(Math.abs(coasted.v)).toBeLessThan(5);
  });

  it("autopilot drives to a stop and parks exactly on it", () => {
    const s = run({ L: 0, v: 0, target: 900 }, 0, 6);
    expect(s.L).toBe(900);
    expect(s.v).toBe(0);
    expect(s.target).toBeNull();
  });

  it("autopilot works backwards too", () => {
    expect(run({ L: 1500, v: 0, target: 300 }, 0, 8).L).toBe(300);
  });

  it("manual input cancels autopilot", () => {
    const s = stepCar({ L: 100, v: 0, target: 1500 }, -1, TOTAL, 1 / 60);
    expect(s.target).toBeNull();
  });

  it("clamps large frame gaps (tab switches) so the car cannot teleport", () => {
    const s = stepCar({ L: 0, v: MAX_SPEED, target: null }, 1, TOTAL, 5);
    expect(s.L).toBeLessThan(MAX_SPEED * 0.06);
  });

  it("finds the stop the car is parked at", () => {
    const stops = [100, 500, 900];
    expect(nearestStop(stops, 510)).toBe(1);
    expect(nearestStop(stops, 300)).toBe(-1);
    expect(nearestStop(stops, 100 + ARRIVE_EPSILON)).toBe(0);
  });

  it("turns along the shortest arc", () => {
    const a = easeAngle(Math.PI - 0.1, -Math.PI + 0.1, 0.05);
    expect(a).toBeGreaterThan(Math.PI - 0.1);
  });

  it("maps 0..1 route positions to distances and clamps bad values", () => {
    expect(stopDistances([0, 0.5, 1, 1.4, -2], 1000)).toEqual([0, 500, 1000, 1000, 0]);
  });

  it("frames the car differently on desktop and phone viewports", () => {
    const car = { x: 1000, y: 500 };
    const desktop = cameraTarget(car, 1440, 860);
    const phone = cameraTarget(car, 375, 700);
    expect(desktop.x).toBeGreaterThan(car.x);
    expect(phone.x).toBe(car.x);
    expect(phone.y).toBeGreaterThan(desktop.y);
    expect(viewSize(375, 700).vw).toBeGreaterThan(375);
  });
});

describe("scenery", () => {
  const road = Array.from({ length: 50 }, (_, i) => ({ x: i * 24, y: 500 }));

  it("is deterministic", () => {
    expect(generateTrees(road)).toEqual(generateTrees(road));
  });

  it("keeps trees off the road", () => {
    for (const t of generateTrees(road)) expect(Math.abs(t.y - 500)).toBeGreaterThanOrEqual(75);
  });
});

describe("pad placement", () => {
  it("puts pads just behind the road (upper side), whatever the travel direction", async () => {
    const { padPosition, PAD_OFFSET } = await import("@/lib/roadmap/engine");
    // Same side regardless of travel direction.
    for (const [p, q] of [[{ x: 0, y: 0 }, { x: 10, y: 0 }], [{ x: 0, y: 0 }, { x: -10, y: 0 }]]) {
      const pad = padPosition(p, q);
      expect(pad.x).toBeCloseTo(0);
      expect(pad.y).toBeCloseTo(-PAD_OFFSET);
    }
    const vertical = padPosition({ x: 0, y: 0 }, { x: 0, y: 10 });
    expect(Math.hypot(vertical.x, vertical.y)).toBeCloseTo(PAD_OFFSET);
  });
});
