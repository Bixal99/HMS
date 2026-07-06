# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication Flow >> should login as Admin and redirect to /admin
- Location: tests\auth.spec.ts:9:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "domcontentloaded"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - generic [ref=e9]: M
          - generic [ref=e10]: MediCore
        - heading "Modern Healthcare Management" [level=1] [ref=e11]:
          - text: Modern Healthcare
          - text: Management
        - paragraph [ref=e12]: Streamline patient care, appointments, medical records, and hospital operations — all in one unified platform.
        - generic [ref=e13]:
          - generic [ref=e14]:
            - generic [ref=e15]: "14"
            - generic [ref=e16]: Modules
          - generic [ref=e17]:
            - generic [ref=e18]: RBAC
            - generic [ref=e19]: Role Security
      - generic [ref=e21]:
        - heading "Welcome back" [level=2] [ref=e22]
        - paragraph [ref=e23]: Sign in to your account to continue
        - generic [ref=e24]:
          - paragraph [ref=e26]: Failed to fetch
          - generic [ref=e27]:
            - generic [ref=e28]: Email Address
            - textbox "Email Address" [ref=e29]:
              - /placeholder: you@hospital.com
              - text: admin@medicore.com
          - generic [ref=e30]:
            - generic [ref=e31]: Password
            - textbox "Password" [ref=e32]:
              - /placeholder: Enter your password
              - text: password123
          - button "Sign In" [ref=e33]
        - generic [ref=e34]:
          - paragraph [ref=e35]: Demo Credentials
          - generic [ref=e36]:
            - generic [ref=e37]:
              - generic [ref=e38]: "Admin:"
              - generic [ref=e39]: admin@medicore.com
            - generic [ref=e40]:
              - generic [ref=e41]: "Doctor:"
              - generic [ref=e42]: doctor@medicore.com
            - generic [ref=e43]:
              - generic [ref=e44]: "Reception:"
              - generic [ref=e45]: reception@medicore.com
            - generic [ref=e46]: "Password: password123"
  - button "Open Next.js Dev Tools" [ref=e52] [cursor=pointer]:
    - img [ref=e53]
  - alert [ref=e56]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Authentication Flow", () => {
  4  |   test("should display the login page", async ({ page }) => {
  5  |     await page.goto("/login");
  6  |     await expect(page.locator("h2")).toContainText(/welcome back/i);
  7  |   });
  8  | 
  9  |   test("should login as Admin and redirect to /admin", async ({ page }) => {
  10 |     await page.goto("/login", { waitUntil: "networkidle" });
  11 | 
  12 |     await page.fill('#email-address', "admin@medicore.com");
  13 |     await page.fill('#password', "password123");
  14 | 
  15 |     await page.click('button[type="submit"]');
  16 | 
  17 |     // The login uses window.location.href which triggers a full page reload
  18 |     // Wait for the URL to change away from /login
> 19 |     await page.waitForURL(/\/admin/, { timeout: 30_000, waitUntil: "domcontentloaded" });
     |                ^ TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
  20 |     await expect(page).toHaveURL(/\/admin/);
  21 |   });
  22 | 
  23 |   test("should reject invalid credentials", async ({ page }) => {
  24 |     await page.goto("/login", { waitUntil: "networkidle" });
  25 | 
  26 |     await page.fill('#email-address', "wrong@medicore.com");
  27 |     await page.fill('#password', "wrongpassword");
  28 | 
  29 |     await page.click('button[type="submit"]');
  30 | 
  31 |     // Should remain on the login page and show an error
  32 |     await page.waitForTimeout(3000);
  33 |     await expect(page).toHaveURL(/\/login/);
  34 |   });
  35 | 
  36 |   test("should redirect unauthenticated users from /admin to /login", async ({ page }) => {
  37 |     await page.goto("/admin");
  38 | 
  39 |     // Should be redirected to login (possibly with query params)
  40 |     await page.waitForURL(/\/login/, { timeout: 15_000, waitUntil: "domcontentloaded" });
  41 |     await expect(page).toHaveURL(/\/login/);
  42 |   });
  43 | });
  44 | 
```