import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("skill documentation", () => {
  it("documents the required workflow and confidence rules", async () => {
    const skill = await fs.readFile("SKILL.md", "utf8");
    expect(skill).toContain("Playwright");
    expect(skill).toContain("Jina Reader");
    expect(skill).toContain("npm install");
    expect(skill).toContain("npx playwright install chromium");
    expect(skill).toContain("--url");
    expect(skill).toContain("--out-dir");
    expect(skill).toContain("--run-id");
    expect(skill).toContain("--no-jina");
    expect(skill).toContain("Use Jina for non-file pages");
    expect(skill).toContain("fewer than 2 headings");
    expect(skill).toContain("Playwright capture fails for any page");
    expect(skill).toContain("Jina fallback warnings and errors do not abort");
    expect(skill).toContain("Confidence Notes");
    expect(skill).toContain("analysis.json");
    expect(skill).toContain("DESIGN.md");
  });

  it("keeps reference files available for agent workers", async () => {
    const schema = await fs.readFile("references/analysis-schema.md", "utf8");
    const rules = await fs.readFile("references/design-md-generation-rules.md", "utf8");
    expect(schema).toContain("target");
    expect(schema).toContain("aggregate");
    expect(schema).toContain("fallbacks.jina");
    expect(schema).toContain("markdown");
    expect(schema).toContain("warnings");
    expect(schema).toContain("errors");
    expect(schema).toContain("top-level `warnings` with URL context");
    expect(rules).toContain("Do not invent dark mode");
  });
});
