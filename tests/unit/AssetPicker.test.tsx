// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AssetPicker } from "@/components/admin/AssetPicker";

afterEach(cleanup);

const items = [
  { value: "a", label: "bizbridge-home.png", thumb: "/media/a.png" },
  { value: "b", label: "setrum-login.png", thumb: "/media/b.png" },
  { value: "c", label: "certificate.pdf" },
];

const submitted = () => new FormData(document.querySelector("form")!).getAll("gallery");

describe("AssetPicker", () => {
  it("filters by search but keeps selected and hidden choices in the form", () => {
    render(
      <form>
        <AssetPicker name="gallery" inputId="f-gallery" label="Gallery" items={items} multiple defaultValue={["b"]} />
      </form>,
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "bizbridge" } });
    const visible = (v: string) => !(document.querySelector(`input[value="${v}"]`)!.closest("label") as HTMLElement).hidden;
    expect(visible("a")).toBe(true);
    expect(visible("b")).toBe(true); // selected, so it stays visible
    expect(visible("c")).toBe(false);

    fireEvent.click(document.querySelector('input[value="a"]')!);
    expect(submitted()).toEqual(["a", "b"]);
    expect(screen.getByText(/2 selected/).textContent).toContain("2 selected");
  });

  it("single choice offers 'No file' and reports changes", () => {
    const seen: string[] = [];
    render(
      <form>
        <AssetPicker name="gallery" inputId="f-cover" label="Cover" items={items} defaultValue={[""]} onChange={(v) => seen.push(v)} />
      </form>,
    );
    expect((screen.getByRole("radio", { name: /No file/ }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: /setrum/ }));
    expect(seen).toEqual(["b"]);
    expect(submitted()).toEqual(["b"]);
  });
});
