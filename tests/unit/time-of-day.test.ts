import { describe, expect, it } from "vitest";
import { raisedPads, timeOfDay } from "@/lib/roadmap/time-of-day";

describe("map time of day", () => {
  it.each([
    [4, "night"], [5, "dawn"], [6, "dawn"], [7, "day"], [12, "day"], [16, "day"], [17, "dusk"], [18, "dusk"], [19, "night"], [0, "night"],
  ] as const)("hour %i is %s", (hour, expected) => {
    expect(timeOfDay(hour)).toBe(expected);
  });
});

describe("pop-up pads", () => {
  it("raises pads within reach and keeps visited ones up", () => {
    const stops = [100, 500, 900, 1300];
    expect(raisedPads(stops, 0, new Set())).toEqual([0]);
    expect(raisedPads(stops, 700, new Set([0]))).toEqual([0, 1, 2]);
    expect(raisedPads(stops, 1300, new Set([0, 1]))).toEqual([0, 1, 3]);
  });
});
