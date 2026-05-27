import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runAnalyzeSite } from "../../scripts/analyze-site.mjs";

describe("analyze-site CLI", () => {
  it("writes analysis.json for a local HTML page", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "design-md-forge-"));
    const fixturePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/sample-page.html");
    const result = await runAnalyzeSite({
      urls: [`file://${fixturePath}`],
      rootDir,
      runId: "2026-05-27-153012",
      useJina: false
    });

    const raw = await fs.readFile(result.analysisPath, "utf8");
    const analysis = JSON.parse(raw);

    expect(analysis.target.domain).toBe("");
    expect(analysis.pages).toHaveLength(1);
    expect(analysis.pages[0].tokens.colors.length).toBeGreaterThan(0);
    expect(analysis.pages[0].screenshotPath).toContain("screenshots");
    expect(analysis.aggregate.confidence.overall).toBeGreaterThan(0.7);
  });
});
