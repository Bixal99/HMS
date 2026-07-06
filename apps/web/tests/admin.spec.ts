import { test, expect } from "@playwright/test";

/**
 * Helper: login as admin before each test in this suite.
 */
async function loginAsAdmin(page: any) {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.fill('#email-address', "admin@medicore.com");
  await page.fill('#password', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 30_000, waitUntil: "domcontentloaded" });
}

test.describe("Admin Dashboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should display KPI cards on the admin dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/\/admin/);

    // Wait for KPI data to load
    await page.waitForSelector("text=Total Patients", { timeout: 15_000 });
    await expect(page.locator("text=Total Patients")).toBeVisible();
    await expect(page.locator("text=Occupancy Rate")).toBeVisible();
  });

  test("should navigate to Wards page via sidebar/navbar", async ({ page }) => {
    await page.click('a[href="/wards"]');
    await page.waitForURL(/\/wards/, { timeout: 10_000, waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/wards/);
  });

  test("should navigate to Global Settings", async ({ page }) => {
    await page.click('a[href="/admin/settings"]');
    await page.waitForURL(/\/admin\/settings/, { timeout: 10_000, waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/settings/);

    await expect(page.locator("text=Global Configuration")).toBeVisible();
  });

  test("should navigate to Audit Logs", async ({ page }) => {
    await page.click('a[href="/admin/audit-logs"]');
    await page.waitForURL(/\/admin\/audit-logs/, { timeout: 10_000, waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/audit-logs/);

    await expect(page.locator("text=System Audit Logs")).toBeVisible();
  });
});
