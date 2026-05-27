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

  it("copies page analysis collections so caller mutations do not leak in", () => {
    const cssVars = { "--color": "#fff" };
    const computedStyles = [{ selector: "button" }];
    const links = [{ href: "/pricing" }];
    const htmlSummary = {
      headings: ["Welcome"],
      landmarks: ["main"],
      navLabels: ["Docs"],
      ctaLabels: ["Start"]
    };
    const tokens = {
      colors: ["#fff"],
      typography: ["16px"],
      spacing: ["8px"],
      radii: ["4px"],
      shadows: ["0 1px 2px #000"]
    };
    const components = {
      buttons: ["primary"],
      cards: ["feature"],
      forms: ["signup"],
      nav: ["top"],
      hero: ["home"]
    };
    const warnings = ["Low confidence"];

    const page = createPageAnalysis({
      url: "https://example.com",
      viewport: { width: 1440, height: 1200 },
      cssVars,
      computedStyles,
      links,
      htmlSummary,
      tokens,
      components,
      warnings
    });

    cssVars["--color"] = "#000";
    computedStyles.push({ selector: "a" });
    links.push({ href: "/blog" });
    htmlSummary.headings.push("Changed");
    htmlSummary.landmarks.push("footer");
    htmlSummary.navLabels.push("Blog");
    htmlSummary.ctaLabels.push("Buy");
    tokens.colors.push("#000");
    tokens.typography.push("20px");
    tokens.spacing.push("16px");
    tokens.radii.push("8px");
    tokens.shadows.push("none");
    components.buttons.push("secondary");
    components.cards.push("pricing");
    components.forms.push("contact");
    components.nav.push("footer");
    components.hero.push("about");
    warnings.push("Changed");

    expect(page.cssVars).toEqual({ "--color": "#fff" });
    expect(page.computedStyles).toEqual([{ selector: "button" }]);
    expect(page.links).toEqual([{ href: "/pricing" }]);
    expect(page.htmlSummary.headings).toEqual(["Welcome"]);
    expect(page.htmlSummary.landmarks).toEqual(["main"]);
    expect(page.htmlSummary.navLabels).toEqual(["Docs"]);
    expect(page.htmlSummary.ctaLabels).toEqual(["Start"]);
    expect(page.tokens.colors).toEqual(["#fff"]);
    expect(page.tokens.typography).toEqual(["16px"]);
    expect(page.tokens.spacing).toEqual(["8px"]);
    expect(page.tokens.radii).toEqual(["4px"]);
    expect(page.tokens.shadows).toEqual(["0 1px 2px #000"]);
    expect(page.components.buttons).toEqual(["primary"]);
    expect(page.components.cards).toEqual(["feature"]);
    expect(page.components.forms).toEqual(["signup"]);
    expect(page.components.nav).toEqual(["top"]);
    expect(page.components.hero).toEqual(["home"]);
    expect(page.warnings).toEqual(["Low confidence"]);
  });

  it("copies aggregate analysis collections so caller mutations do not leak in", () => {
    const inputUrls = ["https://example.com"];
    const analyzedUrls = ["https://example.com"];
    const pages = [{ url: "https://example.com" }];
    const aggregate = {
      colors: ["#fff"],
      typographyScale: ["16px"],
      spacingScale: ["8px"],
      radiusScale: ["4px"],
      shadows: ["0 1px 2px #000"],
      componentPatterns: ["buttons"],
      confidence: { colors: 0.9 }
    };
    const warnings = ["Partial crawl"];

    const analysis = createAnalysis({
      domain: "example.com",
      inputUrls,
      analyzedUrls,
      pages,
      aggregate,
      warnings
    });

    inputUrls.push("https://example.com/input-mutated");
    analyzedUrls.push("https://example.com/analyzed-mutated");
    pages.push({ url: "https://example.com/changed" });
    aggregate.colors.push("#000");
    aggregate.typographyScale.push("20px");
    aggregate.spacingScale.push("16px");
    aggregate.radiusScale.push("8px");
    aggregate.shadows.push("none");
    aggregate.componentPatterns.push("cards");
    aggregate.confidence.colors = 0.1;
    warnings.push("Changed");

    expect(analysis.target.inputUrls).toEqual(["https://example.com"]);
    expect(analysis.target.analyzedUrls).toEqual(["https://example.com"]);
    expect(analysis.pages).toEqual([{ url: "https://example.com" }]);
    expect(analysis.aggregate.colors).toEqual(["#fff"]);
    expect(analysis.aggregate.typographyScale).toEqual(["16px"]);
    expect(analysis.aggregate.spacingScale).toEqual(["8px"]);
    expect(analysis.aggregate.radiusScale).toEqual(["4px"]);
    expect(analysis.aggregate.shadows).toEqual(["0 1px 2px #000"]);
    expect(analysis.aggregate.componentPatterns).toEqual(["buttons"]);
    expect(analysis.aggregate.confidence).toEqual({ colors: 0.9 });
    expect(analysis.warnings).toEqual(["Partial crawl"]);
  });
});
