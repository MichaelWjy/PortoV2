// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SiteNav } from "@/components/portfolio/SiteNav";

vi.mock("next/image", () => ({ default: () => <span /> }));
afterEach(cleanup);
beforeAll(() => {
  globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
});

const labels = { work: "Work", about: "About", experience: "Experience", contact: "Contact" };

describe("SiteNav burger menu", () => {
  it("opens, closes on a link click, and closes on Escape with focus back on the button", () => {
    render(<SiteNav labels={labels} availability={null} base="" />);
    const burger = screen.getByRole("button", { name: "Open menu" });
    const menu = document.getElementById("site-menu")!;
    expect(burger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(burger);
    expect(burger.getAttribute("aria-expanded")).toBe("true");
    expect(menu.classList.contains("open")).toBe(true);
    fireEvent.click(screen.getByRole("link", { name: "About" }));
    expect(menu.classList.contains("open")).toBe(false);

    fireEvent.click(burger);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(menu.classList.contains("open")).toBe(false);
    expect(document.activeElement).toBe(burger);
  });
});
