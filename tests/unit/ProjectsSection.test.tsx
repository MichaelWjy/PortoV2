// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ProjectsSection } from "@/components/portfolio/Sections";

vi.mock("next/image", () => ({ default: () => <span /> }));
afterEach(cleanup);

const settings = { projectsHeadline: "Selected\nProjects.", projectsDescription: "Work." } as never;
const project = (n: number) => ({ id: `p${n}`, slug: `p-${n}`, title: `Project ${n}`, projectType: "Web", shortDescription: "x", cover: null });

describe("home featured projects", () => {
  it("shows at most five cards, then a 'Show more projects' card linking to the full list", () => {
    render(<ProjectsSection settings={settings} projects={Array.from({ length: 7 }, (_, i) => project(i + 1)) as never} />);
    expect(screen.getAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("/projects/"))).toHaveLength(5);
    const more = screen.getByRole("link", { name: /Show more projects/ });
    expect(more.getAttribute("href")).toBe("/projects");
    expect(more.textContent).toContain("+2 more");
  });

  it("has no 'show more' card with five or fewer projects", () => {
    render(<ProjectsSection settings={settings} projects={[project(1), project(2), project(3)] as never} />);
    expect(screen.queryByRole("link", { name: /Show more projects/ })).toBeNull();
  });
});
