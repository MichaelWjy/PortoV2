import { test as base, expect, type Page } from "@playwright/test";

export const ADMIN_EMAIL = "e2e-admin@example.test";

/** Skips the intro animation (it plays once per session) unless a test opts in. */
export const test = base.extend<{ skipIntro: boolean }>({
  skipIntro: [true, { option: true }],
  page: async ({ page, skipIntro }, provide) => {
    if (skipIntro) await page.addInitScript(() => sessionStorage.setItem("mw-intro-seen", "1"));
    await provide(page);
  },
});
export { expect };

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByPlaceholder("admin e-mail").fill(ADMIN_EMAIL);
  await page.getByRole("button", { name: "Sign in (dev)" }).click();
  // The first admin request compiles routes in dev, so allow for it.
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 30_000 });
}

/** Reads the car's SVG translate() so tests can assert it moved. */
export async function carPosition(page: Page) {
  const t = (await page.getByTestId("car").getAttribute("transform")) ?? "";
  const m = t.match(/translate\(([-\d.]+) ([-\d.]+)\)/);
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
}
