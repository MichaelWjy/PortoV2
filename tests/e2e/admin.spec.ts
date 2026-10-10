import { test, expect, loginAsAdmin } from "./fixtures";

// Uses the development-only login (AUTH_DEV_LOGIN). The real Google sign-in flow needs OAuth credentials and is
// verified manually; see docs/TESTING.md.

test.describe("admin CMS", () => {
  test.beforeEach(async ({ page }) => loginAsAdmin(page));

  test("rejects sign-in for addresses that are not allow-listed", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/admin/login");
    await page.getByPlaceholder("admin e-mail").fill("intruder@example.test");
    await page.getByRole("button", { name: "Sign in (dev)" }).click();
    await expect(page.getByRole("alert")).toContainText("not authorized");
    await ctx.close();
  });

  test("dashboard shows real counts", async ({ page }) => {
    await expect(page.locator(".adm-stat", { hasText: "Published projects" })).toContainText("2");
    await expect(page.locator(".adm-stat", { hasText: "Milestones" })).toContainText("7");
  });

  test("draft → publish → edit → unpublish is reflected on the public site", async ({ page }) => {
    await page.goto("/admin/projects/new");
    await page.getByLabel("Title").fill("E2E Project");
    await page.getByLabel("Slug").fill("e2e-project");
    await page.getByLabel("Type", { exact: true }).fill("Test App");
    await page.getByLabel("Short description").fill("Created by Playwright.");
    await page.getByLabel("Overview").fill("Overview text.");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/\/admin\/projects\?saved=1/);

    const row = page.getByRole("row", { name: /E2E Project/ });
    await expect(row).toContainText("draft");
    expect((await page.request.get("/projects/e2e-project")).status()).toBe(404);

    // Admins can preview drafts.
    await page.goto("/projects/e2e-project?preview=1");
    await expect(page.getByText("Draft preview")).toBeVisible();

    await page.goto("/admin/projects");
    await row.getByRole("button", { name: "Publish" }).click();
    await expect(row).toContainText("published");
    await page.goto("/projects/e2e-project");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("E2E Project");

    await page.goto("/admin/projects");
    await row.getByRole("link", { name: "Edit" }).click();
    await page.getByLabel("Title").fill("E2E Project Renamed");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
    await page.goto("/projects/e2e-project");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("E2E Project Renamed");

    await page.goto("/admin/projects");
    await page.getByRole("row", { name: /E2E Project Renamed/ }).getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByRole("row", { name: /E2E Project Renamed/ })).toContainText("draft");
    expect((await page.request.get("/projects/e2e-project")).status()).toBe(404);
  });

  test("validation errors are shown per field and keep the input", async ({ page }) => {
    await page.goto("/admin/projects/new");
    await page.getByLabel("Title").fill("Keep me");
    await page.getByLabel("Slug").fill("Not A Slug");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Lowercase letters, numbers and single hyphens only")).toBeVisible();
    await expect(page.getByLabel("Title")).toHaveValue("Keep me");
  });

  test("a new published milestone appears on the journey map", async ({ page }) => {
    await page.goto("/admin/milestones/new");
    await page.getByLabel("Title").fill("E2E Stop");
    await page.getByLabel("Slug").fill("e2e-stop");
    await page.getByLabel("Kicker / category").fill("Testing");
    await page.getByLabel("Card text").fill("Placed by the test suite.");
    await page.getByLabel("Status").selectOption("PUBLISHED");
    await page.getByLabel("Position (0 to 1)").fill("0.99");
    await expect(page.locator(".adm-preview")).toContainText("E2E Stop");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/\/admin\/milestones\?saved=1/);

    await page.addInitScript(() => sessionStorage.setItem("mw-intro-seen", "1"));
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Drive to milestone/ })).toHaveCount(8);
    await expect(page.getByRole("button", { name: "Drive to milestone 8: E2E Stop" })).toBeVisible();

    // Clean up through the UI (also covers delete + confirmation) so other specs see the seeded map.
    page.once("dialog", (d) => d.accept());
    await page.goto("/admin/milestones");
    await page.getByRole("row", { name: /E2E Stop/ }).getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("row", { name: /E2E Stop/ })).toHaveCount(0);
  });

  test("site copy edits appear on the home page", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.getByLabel("Hero eyebrow").fill("Engineer / Jakarta (E2E)");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
    await page.addInitScript(() => sessionStorage.setItem("mw-intro-seen", "1"));
    await page.goto("/");
    await expect(page.getByText("Engineer / Jakarta (E2E)")).toBeVisible();

    await page.goto("/admin/settings");
    await page.getByLabel("Hero eyebrow").fill("Software Engineer / Indonesia");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
  });

  test("contact messages are visible to admins", async ({ page }) => {
    await page.goto("/admin/messages");
    await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
    // The public suite submits a message first when run in order; otherwise the empty state shows.
    await expect(page.locator(".adm-card, .adm-empty").first()).toBeVisible();
  });

  test("signing out ends the session", async ({ page }) => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login\?signedOut=1/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
