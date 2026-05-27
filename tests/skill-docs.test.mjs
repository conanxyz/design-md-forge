import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("skill documentation", () => {
  it("documents the required workflow and confidence rules", async () => {
    const skill = await fs.readFile("SKILL.md", "utf8");
    expect(skill).toContain("Playwright");
    expect(skill).toContain("Jina Reader");
    expect(skill).toContain("Confidence Notes");
    expect(skill).toContain("analysis.json");
    expect(skill).toContain("DESIGN.md");
  });

  it("keeps reference files available for agent workers", async () => {
    const schema = await fs.readFile("references/analysis-schema.md", "utf8");
    const rules = await fs.readFile("references/design-md-generation-rules.md", "utf8");
    expect(schema).toContain("target");
    expect(schema).toContain("aggregate");
    expect(rules).toContain("Do not invent dark mode");
  });
});
