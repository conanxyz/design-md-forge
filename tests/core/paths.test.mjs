import { describe, expect, it } from "vitest";
import { buildRunPaths } from "../../scripts/core/paths.mjs";

describe("output paths", () => {
  it("builds domain and run-id scoped output paths", () => {
    const paths = buildRunPaths({
      rootDir: "/repo",
      domain: "example.com",
      runId: "2026-05-27-153012"
    });

    expect(paths.runDir).toBe("/repo/design-output/example.com/2026-05-27-153012");
    expect(paths.analysisPath).toBe("/repo/design-output/example.com/2026-05-27-153012/analysis.json");
    expect(paths.designPath).toBe("/repo/design-output/example.com/2026-05-27-153012/DESIGN.md");
    expect(paths.screenshotDir).toBe("/repo/design-output/example.com/2026-05-27-153012/screenshots");
  });
});
