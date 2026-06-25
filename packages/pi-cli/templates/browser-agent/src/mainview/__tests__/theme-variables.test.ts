import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";

function extractVarNames(css: string, selector: string): string[] {
  const regex = new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]+)\\}`, "s");
  const match = css.match(regex);
  if (!match) return [];
  const vars = match[1].match(/--[\w-]+/g);
  return vars ? [...new Set(vars)].sort() : [];
}

describe("CSS Variables", () => {
  const cssPath = resolve(dirname(import.meta.url.replace("file://", "")), "../index.css");
  const css = readFileSync(cssPath, "utf-8");

  it("should have matching variables in :root and .dark", () => {
    const rootVars = extractVarNames(css, ":root");
    const darkVars = extractVarNames(css, ".dark");

    expect(rootVars.length).toBeGreaterThan(0);
    expect(darkVars.length).toBeGreaterThan(0);
    expect(rootVars).toEqual(darkVars);
  });

  it("should have all required variable categories", () => {
    const allVars = css.match(/--[\w-]+/g) || [];
    const uniqueVars = [...new Set(allVars)];

    const requiredPrefixes = ["bg-", "text-", "border-", "accent-"];
    for (const prefix of requiredPrefixes) {
      const hasPrefix = uniqueVars.some((v) => v.includes(prefix));
      expect(hasPrefix, `Missing CSS variables with prefix: ${prefix}`).toBe(true);
    }
  });
});
