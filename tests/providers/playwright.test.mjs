import { describe, expect, it } from "vitest";
import { buildRepresentativeSelectors, summarizeCaptureWarnings } from "../../scripts/providers/playwright.mjs";

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
});
