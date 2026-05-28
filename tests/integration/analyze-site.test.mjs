import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseArgs, runAnalyzeSite } from "../../scripts/analyze-site.mjs";

function createCapturedPage(overrides = {}) {
  return {
    url: "https://example.com/",
    title: "Example",
    viewport: { width: 1440, height: 1200 },
    screenshotPath: "/tmp/screenshots/desktop-home.png",
    cssVars: {},
    computedStyles: [],
    links: [],
    htmlSummary: {
      headings: ["Example"],
      landmarks: ["main"],
      navLabels: [],
      ctaLabels: []
    },
    tokens: {
      colors: [],
      typography: [],
      spacing: [],
      radii: [],
      shadows: []
    },
    components: {
      buttons: [],
      cards: [],
      forms: [],
      nav: [],
      hero: []
    },
    warnings: [],
    confidence: 0.8,
    ...overrides
  };
}

async function readAnalysis(result) {
  const raw = await fs.readFile(result.analysisPath, "utf8");
  return JSON.parse(raw);
}

describe("analyze-site CLI", () => {
  it("writes analysis.json for a local HTML page", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "design-md-forge-"));
    try {
      const fixturePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/sample-page.html");
      const result = await runAnalyzeSite({
        urls: [`file://${fixturePath}`],
        rootDir,
        runId: "2026-05-27-153012",
        useJina: false
      });

      const analysis = await readAnalysis(result);

      expect(analysis.target.domain).toBe("");
      expect(analysis.pages).toHaveLength(1);
      expect(analysis.pages[0].tokens.colors.length).toBeGreaterThan(0);
      expect(analysis.pages[0].screenshotPath).toContain("screenshots");
      expect(analysis.aggregate.confidence.overall).toBeGreaterThan(0.7);
    } finally {
      await fs.rm(rootDir, { recursive: true, force: true });
    }
  });

  it("preserves successful Jina fallback evidence for pages with thin headings", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "design-md-forge-"));
    try {
      const result = await runAnalyzeSite({
        urls: ["https://example.com"],
        rootDir,
        runId: "2026-05-27-153013",
        useJina: true,
        capture: async ({ url }) => createCapturedPage({ url }),
        read: async () => ({
          markdown: "# Example\n\nJina fallback copy.",
          confidence: 0.82,
          warnings: [],
          errors: []
        })
      });

      const analysis = await readAnalysis(result);

      expect(analysis.pages[0].fallbacks).toEqual({
        jina: {
          markdown: "# Example\n\nJina fallback copy.",
          confidence: 0.82,
          warnings: [],
          errors: []
        }
      });
      expect(analysis.warnings).toEqual([]);
    } finally {
      await fs.rm(rootDir, { recursive: true, force: true });
    }
  });

  it("records Jina returned errors as top-level warnings and page fallback errors", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "design-md-forge-"));
    try {
      const result = await runAnalyzeSite({
        urls: ["https://example.com"],
        rootDir,
        runId: "2026-05-27-153014",
        useJina: true,
        capture: async ({ url }) => createCapturedPage({ url }),
        read: async () => ({
          markdown: "",
          confidence: 0,
          warnings: ["Jina markdown content is short"],
          errors: ["fetch failed"]
        })
      });

      const analysis = await readAnalysis(result);

      expect(analysis.warnings).toContain("Jina for https://example.com: Jina markdown content is short");
      expect(analysis.warnings).toContain("Jina for https://example.com: fetch failed");
      expect(analysis.pages[0].fallbacks.jina.errors).toEqual(["fetch failed"]);
      expect(analysis.pages[0].fallbacks.jina.warnings).toEqual(["Jina markdown content is short"]);
    } finally {
      await fs.rm(rootDir, { recursive: true, force: true });
    }
  });

  it("rejects missing CLI option values", () => {
    expect(() => parseArgs(["--url"])).toThrow("--url requires a value");
    expect(() => parseArgs(["--out-dir", "--run-id", "abc"])).toThrow("--out-dir requires a value");
    expect(() => parseArgs(["--run-id"])).toThrow("--run-id requires a value");
  });

  it("requires explicit Jina opt-in and rejects unknown options", () => {
    expect(parseArgs(["--url", "https://example.com"]).useJina).toBe(false);
    expect(parseArgs(["--url", "https://example.com", "--jina"]).useJina).toBe(true);
    expect(() => parseArgs(["--url", "https://example.com", "--jin"])).toThrow("Unknown option: --jin");
  });

  it("parses viewport selection", () => {
    expect(parseArgs(["--url", "https://example.com"]).viewport).toBe("desktop");
    expect(parseArgs(["--url", "https://example.com", "--viewport", "all"]).viewport).toBe("all");
    expect(() => parseArgs(["--url", "https://example.com", "--viewport"])).toThrow("--viewport requires a value");
  });

  it("captures every selected viewport for every URL", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "design-md-forge-"));
    const seen = [];
    try {
      const result = await runAnalyzeSite({
        urls: ["https://example.com"],
        rootDir,
        runId: "2026-05-28-viewports",
        viewport: "all",
        capture: async ({ url, viewport, viewportName }) => {
          seen.push({ url, viewport, viewportName });
          return createCapturedPage({
            url,
            viewport: { name: viewportName, ...viewport },
            screenshotPath: `/tmp/screenshots/${viewportName}.png`
          });
        }
      });

      const analysis = await readAnalysis(result);

      expect(seen.map((entry) => entry.viewportName)).toEqual(["desktop", "tablet", "mobile"]);
      expect(analysis.pages.map((page) => page.viewport.name)).toEqual(["desktop", "tablet", "mobile"]);
      expect(analysis.pages.map((page) => page.screenshotPath)).toEqual([
        "/tmp/screenshots/desktop.png",
        "/tmp/screenshots/tablet.png",
        "/tmp/screenshots/mobile.png"
      ]);
    } finally {
      await fs.rm(rootDir, { recursive: true, force: true });
    }
  });
});
