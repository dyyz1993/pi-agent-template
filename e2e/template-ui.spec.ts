import { test, expect } from "@playwright/test";

test.describe("Template UI Smoke Tests", () => {
  test("page loads successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#root")).toBeAttached({ timeout: 10_000 });
  });

  test("React app mounts (no blank page)", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);
    const rootContent = await page.locator("#root").innerHTML();
    expect(rootContent.length).toBeGreaterThan(0);
  });

  test("no critical console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForTimeout(3000);
    const filtered = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("WebSocket") && !e.includes("net::")
    );
    expect(filtered).toEqual([]);
  });

  test("shows connecting spinner or main UI", async ({ page }) => {
    await page.goto("/");
    const body = page.locator("body");
    await expect(body).toContainText(
      /Connecting|Messages|Start a conversation|Pi Agent|Pi Chat/i,
      { timeout: 10_000 }
    );
  });

  test("CSS loaded (dark theme)", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);
    const bg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    expect(bg).toBeTruthy();
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("SVG icons render", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);
    const svgIcons = page.locator("svg");
    const count = await svgIcons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("HTML structure is valid", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html).toContain("root");
    expect(html).toContain("<div");
  });

  test("Tailwind CSS applied", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);
    const hasTailwind = await page.evaluate(() => {
      const el = document.createElement("div");
      el.className = "flex items-center justify-center";
      document.body.appendChild(el);
      const computed = window.getComputedStyle(el);
      document.body.removeChild(el);
      return computed.display === "flex";
    });
    expect(hasTailwind).toBe(true);
  });

  test("JavaScript bundle executed", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);
    const hasReact = await page.evaluate(() => {
      const root = document.getElementById("root");
      return root && root.children.length > 0;
    });
    expect(hasReact).toBe(true);
  });
});
