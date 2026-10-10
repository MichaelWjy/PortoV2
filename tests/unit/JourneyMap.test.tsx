// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { JourneyMap } from "@/components/roadmap/JourneyMap";
import type { PublicMilestone } from "@/lib/services/public";

vi.mock("next/image", () => ({ default: (p: { alt: string }) => <span data-alt={p.alt} /> }));

beforeAll(() => {
  // jsdom has no layout/observer APIs; the map degrades to its static render, which is what we assert.
  globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  } as unknown as typeof IntersectionObserver;
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

const milestone = (i: number, extra: Partial<PublicMilestone> = {}): PublicMilestone => ({
  id: `m${i}`,
  slug: `m-${i}`,
  title: `Milestone ${i}`,
  category: "Education",
  shortDescription: `Description ${i}`,
  description: null,
  tags: ["Tag"],
  period: null,
  locationLabel: null,
  landmark: "flag",
  routePosition: i / 10,
  image: null,
  project: null,
  experience: null,
  ...extra,
});

const copy = { eyebrow: "My journey", headline: "Small Steps,\nBig Dreams.", description: "Drive." };

describe("JourneyMap", () => {
  it("renders one accessible control per milestone, in order", () => {
    render(<JourneyMap milestones={[milestone(1), milestone(2), milestone(3)]} copy={copy} />);
    const buttons = screen.getAllByRole("button", { name: /Drive to milestone/ });
    expect(buttons.map((b) => b.textContent)).toEqual(["1", "2", "3"]);
    expect(buttons[1].getAttribute("aria-label")).toBe("Drive to milestone 2: Milestone 2");
  });

  it("shows the start hint before any milestone is reached", () => {
    render(<JourneyMap milestones={[milestone(1)]} copy={copy} />);
    expect(screen.getByTestId("milestone-card").textContent).toContain("Start the engine");
  });

  it("exposes hold-to-drive controls that also work from the keyboard", () => {
    render(<JourneyMap milestones={[milestone(1)]} copy={copy} />);
    const drive = screen.getByRole("button", { name: /Drive forward/ });
    // Pointer and keyboard activation must not throw even before geometry is available.
    fireEvent.pointerDown(drive);
    fireEvent.pointerUp(drive);
    fireEvent.click(drive, { detail: 0 });
    expect(screen.getByRole("button", { name: /Drive backward/ })).toBeTruthy();
  });

  it("renders the headline from the database copy with line breaks", () => {
    render(<JourneyMap milestones={[milestone(1)]} copy={copy} />);
    expect(screen.getByRole("heading", { level: 2 }).innerHTML).toContain("<br>");
  });
});
