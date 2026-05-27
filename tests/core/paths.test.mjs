import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildRunPaths } from "../../scripts/core/paths.mjs";

describe("output paths", () => {
  it("builds domain and run-id scoped output paths", () => {
    const paths = buildRunPaths({
      rootDir: "/repo",
      domain: "example.com",
      runId: "2026-05-27-153012"
    });

    const runDir = path.join("/repo", "design-output", "example.com", "2026-05-27-153012");

    expect(paths.runDir).toBe(runDir);
    expect(paths.analysisPath).toBe(path.join(runDir, "analysis.json"));
    expect(paths.designPath).toBe(path.join(runDir, "DESIGN.md"));
    expect(paths.screenshotDir).toBe(path.join(runDir, "screenshots"));
  });
});
