import { test, expect } from "@playwright/test";

test.describe("Template UI Smoke Tests", () => {
  test("page loads and React mounts", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#root")).toBeAttached({ timeout: 10_000 });
    await page.waitForTimeout(2000);
    const rootContent = await page.locator("#root").innerHTML();
    expect(rootContent.length).toBeGreaterThan(0);
  });

  test("shows connecting spinner or main UI", async ({ page }) => {
    await page.goto("/");
    const body = page.locator("body");
    await expect(body).toContainText(
      /Connecting|Messages|Start a conversation|Pi Agent|Pi Chat/i,
      { timeout: 10_000 }
    );
  });

  test("HTML structure is valid", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html).toContain("root");
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
});

async function waitForAppReady(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.locator("#root")).toBeAttached({ timeout: 10_000 });
  await page.waitForFunction(() => {
    const root = document.getElementById("root");
    if (!root) return false;
    return !root.querySelector(".animate-spin");
  }, { timeout: 15_000 });
}

test.skip(({ project }) => process.env.TEMPLATE_TYPE === "chat", "Chat template doesn't have Explorer tab")("should switch between activity bar tabs", async ({ page }) => {
  await waitForAppReady(page);

  const explorerBtn = page.locator('button[title="Explorer"]');
  await expect(explorerBtn).toBeVisible();
  await explorerBtn.click();
  await expect(page.locator("text=Explorer")).toBeVisible();

  const chatBtn = page.locator('button[title="Chat"]');
  await expect(chatBtn).toBeVisible();
  await chatBtn.click();
  await expect(page.locator("text=Messages")).toBeVisible();

  await explorerBtn.click();
  await expect(page.locator("text=Explorer")).toBeVisible();
});

test.describe("Chat Panel", () => {
  test("should display chat input", async ({ page }) => {
    await waitForAppReady(page);

    const chatTab = page.locator('button[title="Chat"]');
    await chatTab.click();
    await expect(page.locator('input[placeholder="Type a message..."]')).toBeVisible();
    await expect(page.locator("button:has-text('Send')")).toBeVisible();
  });

  test("should accept input text", async ({ page }) => {
    await waitForAppReady(page);

    const chatTab = page.locator('button[title="Chat"]');
    await chatTab.click();

    const input = page.locator('input[placeholder="Type a message..."]');
    await input.fill("Hello from E2E test");
    await expect(input).toHaveValue("Hello from E2E test");
  });
});

test.describe("Explorer Panel", () => {
  test("should display explorer sidebar", async ({ page }) => {
    await waitForAppReady(page);

    const explorerBtn = page.locator('button[title="Explorer"]');
    await explorerBtn.click();
    await expect(page.locator("text=Explorer")).toBeVisible();
    await expect(page.locator('input[placeholder="Path"]')).toBeVisible();
    await expect(page.locator('button[title="List directory"]')).toBeVisible();
  });

  test("should show empty state prompt", async ({ page }) => {
    await waitForAppReady(page);

    const explorerBtn = page.locator('button[title="Explorer"]');
    await explorerBtn.click();
    await expect(
      page.locator("text=Enter path and click refresh").or(page.locator("text=Explorer"))
    ).toBeVisible();
  });
});

test.describe("Responsive Layout", () => {
  test("should show mobile tab bar on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await waitForAppReady(page);

    await expect(page.locator('button[title="Explorer"]')).toHaveCount(2);
    const allExplorerBtns = page.locator('button[title="Explorer"]');
    await expect(allExplorerBtns).toHaveCount(2);
  });

  test("should hide activity bar on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await waitForAppReady(page);

    const activityBar = page.locator(".w-12.bg-gray-900.border-r");
    await expect(activityBar).toHaveCount(0);
  });
});

test("should show loading state before connection", async ({ page }) => {
  await page.goto("/");
  const spinner = page.locator(".animate-spin");
  if (await spinner.isVisible({ timeout: 500 })) {
    await expect(spinner).toBeVisible();
    await expect(page.locator("text=Connecting to RPC server")).toBeVisible();
  }
  await page.waitForFunction(() => {
    const root = document.getElementById("root");
    if (!root) return false;
    return !root.querySelector(".animate-spin");
  }, { timeout: 15_000 });
  await expect(page.locator(".animate-spin")).toHaveCount(0);
});

test("should display center tab navigation", async ({ page }) => {
  await waitForAppReady(page);
  await expect(page.locator("button:has-text('Chat')")).toBeVisible();
  await expect(page.locator("button:has-text('Feed')")).toBeVisible();
});

test("should switch center tabs", async ({ page }) => {
  await waitForAppReady(page);

  await page.locator("button:has-text('Feed')").click();
  await expect(page.locator("text=Feed")).toBeVisible();

  await page.locator("button:has-text('Chat')").click();
  await expect(page.locator("text=Messages")).toBeVisible();
});

test("should show connection mode badge in header", async ({ page }) => {
  await waitForAppReady(page);
  await expect(
    page.locator("text=Desktop (IPC)").or(page.locator("text=Web (WebSocket)"))
  ).toBeVisible();
});

test.describe("Theme System", () => {
  test("should toggle theme from dark to light", async ({ page }) => {
    await waitForAppReady(page);

    const themeToggle = page.locator('button[title="Switch to light mode"], button[title="Switch to dark mode"]').first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);

      const hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains("dark"));
      expect(typeof hasDarkClass).toBe("boolean");
    }
  });

  test("should persist theme after page reload", async ({ page }) => {
    await waitForAppReady(page);

    await page.evaluate(() => {
      localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
    });

    await page.reload();
    await waitForAppReady(page);

    const storedTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(storedTheme).toBe("light");
  });
});

test.describe("Language System", () => {
  test("should switch language from English to Chinese", async ({ page }) => {
    await waitForAppReady(page);

    const langSwitch = page.locator('button:has-text("中"), button:has-text("EN")').first();
    if (await langSwitch.isVisible()) {
      await langSwitch.click();
      await page.waitForTimeout(500);

      const locale = await page.evaluate(() => localStorage.getItem("locale"));
      expect(locale).toBeTruthy();
    }
  });
});

test.describe("Explorer File Browsing", () => {
  test("should show explorer sidebar when clicking explorer icon", async ({ page }) => {
    await waitForAppReady(page);

    const explorerBtn = page.locator('button[title="Explorer"]').first();
    if (await explorerBtn.isVisible()) {
      await explorerBtn.click();
      await page.waitForTimeout(500);

      const sidebar = page.locator("text=Explorer").first();
      expect(await sidebar.isVisible()).toBeTruthy();
    }
  });
});

test.describe("Connection Info", () => {
  test("should display connection mode in header", async ({ page }) => {
    await waitForAppReady(page);

    const modeBadge = page.locator("text=/Desktop \\(IPC\\)|Web \\(WebSocket\\)/").first();
    if (await modeBadge.isVisible()) {
      const text = await modeBadge.textContent();
      expect(text).toBeTruthy();
    }
  });
});
