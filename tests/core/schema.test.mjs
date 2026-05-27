import { describe, expect, it } from "vitest";
import { createAnalysis, createPageAnalysis } from "../../scripts/core/schema.mjs";

describe("analysis schema constructors", () => {
  it("creates a page analysis with stable empty collections", () => {
    const page = createPageAnalysis({
      url: "https://example.com",
      title: "Example",
      viewport: { width: 1440, height: 1200 },
      screenshotPath: "screenshots/home.png"
    });

    expect(page.htmlSummary.headings).toEqual([]);
    expect(page.cssVars).toEqual({});
    expect(page.computedStyles).toEqual([]);
    expect(page.links).toEqual([]);
    expect(page.tokens.colors).toEqual([]);
    expect(page.components.buttons).toEqual([]);
    expect(page.warnings).toEqual([]);
  });

  it("creates aggregate analysis for target domain", () => {
    const analysis = createAnalysis({
      domain: "example.com",
      inputUrls: ["https://example.com"],
      analyzedUrls: ["https://example.com"],
      pages: []
    });

    expect(analysis.target.domain).toBe("example.com");
    expect(analysis.aggregate.colors).toEqual([]);
    expect(analysis.aggregate.shadows).toEqual([]);
    expect(analysis.warnings).toEqual([]);
  });
});
