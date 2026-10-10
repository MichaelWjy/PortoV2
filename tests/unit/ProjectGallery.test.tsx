// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProjectGallery } from "@/components/portfolio/ProjectGallery";

vi.mock("next/image", () => ({ default: (p: { alt: string }) => <span role="img" aria-label={p.alt} /> }));

beforeAll(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const img = (n: number) => ({ url: `/media/${n}.png`, alt: `Shot ${n}`, width: 800, height: 600 });
// Hidden slides are aria-hidden, so include them to find the visible one.
const current = () => screen.getAllByRole("group", { hidden: true }).findIndex((g) => g.getAttribute("aria-hidden") === "false");

describe("ProjectGallery", () => {
  it("renders a single image without carousel controls", () => {
    render(<ProjectGallery images={[img(1)]} title="P" />);
    expect(screen.queryByRole("button", { name: "Next image" })).toBeNull();
    expect(screen.getByRole("img", { name: "Shot 1" })).toBeTruthy();
  });

  it("moves with next, previous (wrapping) and the dots", () => {
    render(<ProjectGallery images={[img(1), img(2), img(3)]} title="P" />);
    expect(current()).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    expect(current()).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Previous image" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous image" }));
    expect(current()).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "Show image 1 of 3" }));
    expect(current()).toBe(0);
  });

  it("advances on a timer and stops when paused", () => {
    vi.useFakeTimers();
    render(<ProjectGallery images={[img(1), img(2)]} title="P" />);
    act(() => vi.advanceTimersByTime(5000));
    expect(current()).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Pause slideshow" }));
    act(() => vi.advanceTimersByTime(15000));
    expect(current()).toBe(1);
  });
});
