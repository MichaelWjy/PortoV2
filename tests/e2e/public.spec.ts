import { test, expect, carPosition } from "./fixtures";

test.describe("public site", () => {
  test("home page renders database content", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("MichaelWijaya.");
    await expect(page.getByText("Software Engineer / Indonesia")).toBeVisible();
    await expect(page.getByRole("link", { name: /BizBridge/ })).toBeVisible();
  });

  test("navigation links scroll to their sections", async ({ page }) => {
    await page.goto("/");
    for (const [name, id] of [["Work", "work"], ["About", "about"], ["Experience", "experience"], ["Contact", "contact"]]) {
      await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
  });

  test("project cards open their detail pages; drafts stay private", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /BizBridge/ }).click();
    await expect(page).toHaveURL(/\/projects\/bizbridge$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("BizBridge");

    // SEA Catering is seeded as a draft.
    const res = await page.goto("/projects/sea-catering");
    expect(res?.status()).toBe(404);
    await page.goto("/projects");
    await expect(page.getByRole("link", { name: /SEA Catering/ })).toHaveCount(0);
  });

  test("journey map loads milestones from the database and drives with the keyboard", async ({ page }) => {
    await page.goto("/");
    const pips = page.getByRole("button", { name: /Drive to milestone/ });
    await expect(pips).toHaveCount(7);
    await expect(pips.nth(1)).toHaveAccessibleName(/BINUS University/);

    await page.locator("#journey").scrollIntoViewIfNeeded();
    await expect.poll(() => carPosition(page)).not.toBeNull();
    const before = await carPosition(page);
    await page.keyboard.down("d");
    await page.waitForTimeout(1200);
    await page.keyboard.up("d");
    await expect.poll(async () => (await carPosition(page))!.x).not.toBe(before!.x);

    await page.keyboard.down("a");
    await page.waitForTimeout(3000);
    await page.keyboard.up("a");
    await expect.poll(async () => (await carPosition(page))!.x, { timeout: 5000 }).toBeCloseTo(before!.x, 0);
  });

  test("selecting a milestone drives there and shows its details", async ({ page }) => {
    await page.goto("/");
    await page.locator("#journey").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /Drive to milestone 5/ }).click();
    const card = page.getByTestId("milestone-card");
    await expect(card.getByRole("heading")).toHaveText("Internship", { timeout: 10_000 });
    await expect(card).toContainText("Application Developer intern");
    await expect(page.getByRole("button", { name: /Drive to milestone 5/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("keyboard users can drive stop to stop with the Drive button", async ({ page }) => {
    await page.goto("/");
    await page.locator("#journey").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /Drive forward/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("milestone-card").getByRole("heading")).toHaveText("High School", { timeout: 10_000 });
  });

  test("the journey is available to screen readers as a list, with no visible toggle", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("View the journey as a list")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Journey milestones" })).toBeAttached();
    await expect(page.locator(".journey-list li")).toHaveCount(7);
  });

  test("contact form validates and stores messages", async ({ page }) => {
    await page.goto("/#contact");
    const form = page.getByRole("form", { name: "Contact form" });
    await form.getByRole("button", { name: /Send message/ }).click();
    await expect(form.getByText("Please fix the highlighted fields.")).toBeVisible();
    await expect(form.getByLabel("E-mail")).toHaveAttribute("aria-invalid", "true");

    await form.getByLabel("Name").fill("E2E Visitor");
    await form.getByLabel("E-mail").fill("visitor@example.test");
    await form.getByLabel("Message").fill("Hello from the end-to-end test suite.");
    await page.waitForTimeout(2600);
    await form.getByRole("button", { name: /Send message/ }).click();
    await expect(form.getByText("Thanks! Your message has been sent.")).toBeVisible();
  });

  test("admin pages and data are not reachable without signing in", async ({ page, request }) => {
    for (const path of ["/admin", "/admin/projects", "/admin/messages", "/admin/projects/new"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login$/);
    }
    const res = await request.get("/admin/messages", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(await res.text()).not.toContain("visitor@example.test");
  });

  test("security headers are sent", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("robots and sitemap exclude admin and drafts", async ({ request }) => {
    expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /admin");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/projects/bizbridge");
    expect(sitemap).not.toContain("sea-catering");
  });
});

test.describe("intro", () => {
  test.use({ skipIntro: false });

  test("plays the preloader once, then reveals the hero", async ({ page }) => {
    await page.goto("/");
    const pre = page.getByTestId("preloader");
    await expect(pre).toBeVisible();
    await expect(pre.getByText("Hello")).toBeVisible({ timeout: 8000 });
    await expect(pre).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("preloader")).toHaveCount(0, { timeout: 2000 });
  });

  test("is skipped for reduced-motion users", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.getByTestId("preloader")).toHaveCount(0, { timeout: 2000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await ctx.close();
  });
});
