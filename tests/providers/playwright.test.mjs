import { describe, expect, it } from "vitest";
import { buildRepresentativeSelectors, buildScreenshotName, summarizeCaptureWarnings } from "../../scripts/providers/playwright.mjs";

describe("Playwright capture utilities", () => {
  it("uses focused selectors for visual style evidence", () => {
    expect(buildRepresentativeSelectors()).toEqual(expect.arrayContaining([
      "body",
      "h1",
      "button",
      "nav",
      "[class*='card']",
      "[class*='hero']"
    ]));
  });

  it("warns when captured page evidence is thin", () => {
    const warnings = summarizeCaptureWarnings({
      textLength: 100,
      cssVarCount: 0,
      computedStyleCount: 1
    });

    expect(warnings).toContain("Page text is short; page may be blocked or mostly visual");
    expect(warnings).toContain("Few CSS variables found; computed styles will carry token extraction");
    expect(warnings).toContain("Few representative computed styles captured");
  });

  it("builds unique screenshot names for URLs with the same path", () => {
    const planAName = buildScreenshotName("https://example.com/pricing?plan=a");
    const planBName = buildScreenshotName("https://example.com/pricing?plan=b");

    expect(planAName).not.toBe(planBName);
  });

  it("keeps readable screenshot name prefixes and extensions", () => {
    const name = buildScreenshotName("https://example.com/pricing?plan=a");

    expect(name.startsWith("desktop-pricing-")).toBe(true);
    expect(name.endsWith(".png")).toBe(true);
  });
});
