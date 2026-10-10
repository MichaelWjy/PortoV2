export type TimeOfDay = "dawn" | "day" | "dusk" | "night";

/** Map palette for the visitor's local hour (0–23). */
export function timeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 17) return "day";
  if (hour >= 17 && hour < 19) return "dusk";
  return "night";
}

export const TIME_LABELS: Record<TimeOfDay, string> = { dawn: "Dawn", day: "Daytime", dusk: "Sunset", night: "Night" };

/** How close (world units) the car must be before a pad's landmark springs up. */
export const RAISE_DISTANCE = 230;

/** Pads whose landmark is up: every visited pad plus any within reach of the car. Pure. */
export function raisedPads(stops: readonly number[], L: number, visited: ReadonlySet<number>, reach = RAISE_DISTANCE): number[] {
  return stops.flatMap((s, i) => (visited.has(i) || Math.abs(s - L) <= reach ? [i] : []));
}
