import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should display the login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h2")).toContainText(/welcome back/i);
  });

  test("should login as Admin and redirect to /admin", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });

    await page.fill('#email-address', "admin@medicore.com");
    await page.fill('#password', "password123");

    await page.click('button[type="submit"]');

    // The login uses window.location.href which triggers a full page reload
    // Wait for the URL to change away from /login
    await page.waitForURL(/\/admin/, { timeout: 30_000, waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin/);
  });

  test("should reject invalid credentials", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });

    await page.fill('#email-address', "wrong@medicore.com");
    await page.fill('#password', "wrongpassword");

    await page.click('button[type="submit"]');

    // Should remain on the login page and show an error
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect unauthenticated users from /admin to /login", async ({ page }) => {
    await page.goto("/admin");

    // Should be redirected to login (possibly with query params)
    await page.waitForURL(/\/login/, { timeout: 15_000, waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/);
  });
});
