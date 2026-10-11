// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AdminMenu } from "@/components/admin/AdminMenu";

afterEach(cleanup);

describe("AdminMenu", () => {
  it("toggles the menu, closes on a link click and on Escape", () => {
    render(
      <AdminMenu brand={<span>MW</span>}>
        <a href="#projects">Projects</a>
      </AdminMenu>,
    );
    const burger = screen.getByRole("button", { name: "Open menu" });
    const menu = document.getElementById("admin-menu")!;

    fireEvent.click(burger);
    expect(burger.getAttribute("aria-expanded")).toBe("true");
    expect(menu.classList.contains("open")).toBe(true);
    fireEvent.click(screen.getByText("Projects"));
    expect(menu.classList.contains("open")).toBe(false);

    fireEvent.click(burger);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(menu.classList.contains("open")).toBe(false);
    expect(document.activeElement).toBe(burger);
  });
});
