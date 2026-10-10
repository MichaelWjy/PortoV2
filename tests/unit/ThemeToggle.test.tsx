// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeToggle } from "@/components/portfolio/ThemeToggle";

afterEach(cleanup);

describe("ThemeToggle", () => {
  it("switches dark → light → dark and remembers the choice in a cookie", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    const root = document.documentElement;
    expect(root.dataset.theme).toBeUndefined();

    fireEvent.click(button);
    expect(root.dataset.theme).toBe("light");
    expect(document.cookie).toContain("mw-theme=light");

    fireEvent.click(button);
    expect(root.dataset.theme).toBeUndefined();
    expect(document.cookie).toContain("mw-theme=dark");
  });
});
