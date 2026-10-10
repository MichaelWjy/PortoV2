import { test, expect, carPosition } from "./fixtures";

test.describe("mobile", () => {
  test("layout fits the screen without horizontal scrolling", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("hold-to-drive touch control moves the car", async ({ page }) => {
    await page.goto("/");
    await page.locator("#journey").scrollIntoViewIfNeeded();
    await expect.poll(() => carPosition(page)).not.toBeNull();
    const before = await carPosition(page);
    const drive = page.getByRole("button", { name: /Drive forward/ });
    await drive.dispatchEvent("pointerdown", { pointerType: "touch", isPrimary: true });
    await page.waitForTimeout(1200);
    await drive.dispatchEvent("pointerup", { pointerType: "touch", isPrimary: true });
    await expect.poll(async () => (await carPosition(page))!.x).not.toBe(before!.x);
  });

  test("tapping a milestone shows its details", async ({ page }) => {
    await page.goto("/");
    await page.locator("#journey").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /Drive to milestone 2/ }).tap();
    await expect(page.getByTestId("milestone-card").getByRole("heading")).toHaveText("BINUS University", { timeout: 10_000 });
  });
});
