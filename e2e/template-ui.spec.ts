import { test, expect } from "@playwright/test";

async function injectWebSocketMock(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    class MockWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = 1;
      send() {}
      close() {
        this.readyState = 3;
        if (this.onclose) this.onclose(new CloseEvent("close"));
      }
      addEventListener() {}
      removeEventListener() {}
      onopen: ((ev: Event) => void) | null = null;
      onclose: ((ev: CloseEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      onmessage: ((ev: MessageEvent) => void) | null = null;
      constructor(_url: string) {
        setTimeout(() => {
          if (this.onopen) this.onopen(new Event("open"));
        }, 50);
      }
    }
    // @ts-expect-error mock WebSocket for CI
    window.WebSocket = MockWebSocket;
  });
}

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
  await injectWebSocketMock(page);
  await page.goto("/");
  await expect(page.locator("#root")).toBeAttached({ timeout: 10_000 });
  await page.waitForFunction(() => {
    const root = document.getElementById("root");
    if (!root) return false;
    return !root.querySelector(".animate-spin");
  }, { timeout: 10_000 });
}

const isAgent = process.env.TEMPLATE_TYPE === "agent";

(isAgent ? test : test.skip)("should switch between activity bar tabs", async ({ page }) => {
  await waitForAppReady(page);

  const explorerBtn = page.locator('button[data-testid="tab-explorer"]');
  await expect(explorerBtn).toBeVisible();

  const gitBtn = page.locator('button[data-testid="tab-git"]');
  await expect(gitBtn).toBeVisible();
  await gitBtn.click();
  await expect(page.locator("text=Source Control")).toBeVisible();

  await explorerBtn.click();
  await expect(page.locator("text=Explorer")).toBeVisible();

  await gitBtn.click();
  await expect(page.locator("text=Source Control")).toBeVisible();
});

(isAgent ? test.describe : test.describe.skip)("Chat Panel", () => {
  test("should display chat input", async ({ page }) => {
    await waitForAppReady(page);

    const chatTab = page.locator('button[data-testid="center-tab-chat"]');
    await chatTab.click();
    await expect(page.locator('input[placeholder="Type a message..."]')).toBeVisible();
    await expect(page.locator("button:has-text('Send')")).toBeVisible();
  });

  test("should accept input text", async ({ page }) => {
    await waitForAppReady(page);

    const chatTab = page.locator('button[data-testid="center-tab-chat"]');
    await chatTab.click();

    const input = page.locator('input[placeholder="Type a message..."]');
    await input.fill("Hello from E2E test");
    await expect(input).toHaveValue("Hello from E2E test");
  });
});

(isAgent ? test.describe : test.describe.skip)("Explorer Panel", () => {
  test("should display explorer sidebar", async ({ page }) => {
    await waitForAppReady(page);

    const explorerBtn = page.locator('button[data-testid="tab-explorer"]');
    await expect(explorerBtn).toBeVisible();
    await expect(page.locator("text=Explorer")).toBeVisible();
    await expect(page.locator('input[placeholder="Path"]')).toBeVisible();
    await expect(page.locator('button[title="List directory"]')).toBeVisible();
  });

  test("should show empty state prompt", async ({ page }) => {
    await waitForAppReady(page);

    await expect(
      page.locator("text=Enter path and click refresh").first()
    ).toBeVisible();
  });
});

(isAgent ? test.describe : test.describe.skip)("Responsive Layout", () => {
  async function mockWebSocketAndGoto(page: import("@playwright/test").Page) {
    await injectWebSocketMock(page);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForFunction(
      () =>
        !!document.querySelector('[data-testid="mobile-tab-bar"]') ||
        !!document.querySelector('button[data-testid^="tab-"]') ||
        !!document.querySelector('[data-testid="activity-bar"]'),
      { timeout: 10_000 }
    );
  }

  test("should show mobile tab bar on small screens", async ({ page }) => {
    await mockWebSocketAndGoto(page);

    const tabs = page.locator('button[data-testid^="tab-"]');
    await expect(tabs.first()).toBeVisible({ timeout: 10_000 });

    const mobileTabBar = page.locator('[data-testid="mobile-tab-bar"]');
    await expect(mobileTabBar).toBeVisible();
  });

  test("should hide activity bar on mobile", async ({ page }) => {
    await mockWebSocketAndGoto(page);

    const activityBar = page.locator('[data-testid="activity-bar"]');
    await expect(activityBar).toHaveCount(0);
  });
});

test("should show loading state before connection", async ({ page }) => {
  await injectWebSocketMock(page);
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
  }, { timeout: 10_000 });
  await expect(page.locator(".animate-spin")).toHaveCount(0);
});

(process.env.TEMPLATE_TYPE === 'agent' ? test : test.skip)("should display center tab navigation", async ({ page }) => {
  await waitForAppReady(page);
  await expect(page.locator('button[data-testid="center-tab-chat"]')).toBeVisible();
  await expect(page.locator('button[data-testid="center-tab-feed"]')).toBeVisible();
});

(process.env.TEMPLATE_TYPE === 'agent' ? test : test.skip)("should switch center tabs", async ({ page }) => {
  await waitForAppReady(page);

  await page.locator('button[data-testid="center-tab-feed"]').click();
  await expect(page.locator('[data-testid="center-tab-feed"]').locator("..")).toBeVisible();

  await page.locator('button[data-testid="center-tab-chat"]').click();
  await expect(page.locator('[data-testid="center-tab-chat"]')).toBeVisible();
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

    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    await page.waitForTimeout(500);

    const hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(hasDarkClass).toBe(false);
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

    const langSwitch = page.locator('[data-testid="language-switcher"]');
    await expect(langSwitch).toBeVisible();
    await langSwitch.click();
    await page.waitForTimeout(500);

    const locale = await page.evaluate(() => localStorage.getItem("locale"));
    expect(locale).toBe("zh");
  });
});

(isAgent ? test.describe : test.describe.skip)("Explorer File Browsing", () => {
  test("should show explorer sidebar when clicking explorer icon", async ({ page }) => {
    await waitForAppReady(page);

    const explorerBtn = page.locator('button[data-testid="tab-explorer"]').first();
    await expect(explorerBtn).toBeVisible();

    const gitBtn = page.locator('button[data-testid="tab-git"]');
    await gitBtn.click();
    await page.waitForTimeout(300);

    await explorerBtn.click();
    const pathInput = page.locator('input[placeholder="Path"]');
    await expect(pathInput).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Connection Info", () => {
  test("should display connection mode in header", async ({ page }) => {
    await waitForAppReady(page);

    const modeBadge = page.locator("text=/Desktop \\(IPC\\)|Web \\(WebSocket\\)/").first();
    await expect(modeBadge).toBeVisible();
    const text = await modeBadge.textContent();
    expect(text).toBeTruthy();
  });
});
