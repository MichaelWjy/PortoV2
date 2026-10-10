// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { SocialIcon } from "@/components/portfolio/SocialIcon";

afterEach(cleanup);

describe("SocialIcon", () => {
  it.each([
    ["https://www.linkedin.com/in/someone", "svg"],
    ["https://github.com/someone", "svg"],
    ["mailto:me@example.com", "svg"],
  ])("draws a logo for %s", (url) => {
    const { container } = render(<SocialIcon url={url} fallback="x" />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.textContent).toBe("");
  });

  it("falls back to the admin text for other sites, and for look-alike hosts", () => {
    for (const url of ["https://dribbble.com/someone", "https://github.com.evil.test/x"]) {
      const { container } = render(<SocialIcon url={url} fallback="dr" />);
      expect(container.querySelector("svg")).toBeNull();
      expect(container.textContent).toBe("dr");
      cleanup();
    }
  });
});
