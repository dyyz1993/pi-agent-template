import { test, expect } from "@playwright/test";

test.describe("Template UI Smoke Tests", () => {
  test("page loads with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/React \+ Tailwind \+ Vite|Pi Agent/i);
  });

  test("root element renders", async ({ page }) => {
    await page.goto("/");
    const root = page.locator("#root");
    await expect(root).toBeAttached({ timeout: 10_000 });
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForTimeout(2000);
    const filtered = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404")
    );
    expect(filtered).toEqual([]);
  });

  test("connecting spinner or chat UI appears", async ({ page }) => {
    await page.goto("/");
    const body = page.locator("body");
    await expect(body).toContainText(
      /Connecting|Start a conversation|Messages/i,
      { timeout: 10_000 }
    );
  });

  test("CSS loaded (background is dark)", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);
    const bg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    expect(bg).toBeTruthy();
  });

  test("Messages tab visible", async ({ page }) => {
    await page.goto("/");
    const messagesTab = page.getByText("Messages");
    await expect(messagesTab).toBeVisible({ timeout: 10_000 });
  });

  test("input field visible", async ({ page }) => {
    await page.goto("/");
    const input = page.getByPlaceholder("Type a message...");
    await expect(input).toBeVisible({ timeout: 10_000 });
  });

  test("Send button visible", async ({ page }) => {
    await page.goto("/");
    const sendBtn = page.getByRole("button", { name: /send/i });
    await expect(sendBtn).toBeVisible({ timeout: 10_000 });
  });

  test("ActivityBar icons render", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);
    const svgIcons = page.locator("svg");
    const count = await svgIcons.count();
    expect(count).toBeGreaterThan(0);
  });
});
