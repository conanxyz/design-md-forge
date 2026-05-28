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
    expect(skill).toContain("--viewport");
    expect(skill).toContain("Use `all` to capture each analyzed URL across all supported viewport presets");
    expect(skill).toContain("--auto-pages");
    expect(skill).toContain("auto-select 2-4 shallow key same-domain pages");
    expect(skill).toContain("--max-pages");
    expect(skill).toContain("--jina");
    expect(skill).toContain("--no-jina");
    expect(skill).toContain("Use Jina only when `--jina` is explicitly set");
    expect(skill).toContain("external service");
    expect(skill).toContain("fewer than 2 headings");
    expect(skill).toContain("Playwright capture fails for any page");
    expect(skill).toContain("Jina fallback warnings and errors do not abort");
    expect(skill).toContain("write a reference `DESIGN.md` next to `analysis.json`");
    expect(skill).toContain("Confidence Notes");
    expect(skill).toContain("analysis.json");
    expect(skill).toContain("DESIGN.md");
  });

  it("documents automatic reference DESIGN.md flow and remaining boundaries", async () => {
    const readme = await fs.readFile("README.md", "utf8");
    const readmeZh = await fs.readFile("README.zh-CN.md", "utf8");

    expect(readme).toContain("automatically read the generated `analysis.json` and write `DESIGN.md`");
    expect(readme).toContain("--viewport all");
    expect(readme).toContain("When `--viewport all` is used, the same URL can appear multiple times in `analysis.json`");
    expect(readme).toContain("--auto-pages");
    expect(readme).toContain("--max-pages 4");
    expect(readme).toContain("Auto-page discovery is explicit and shallow");
    expect(readme).toContain("Final `DESIGN.md` is written by the agent/LLM after the CLI succeeds, not by the CLI itself.");
    expect(readme).toContain("No logged-in state handling.");
    expect(readme).toContain("No arbitrary clicking, filtering, pagination, or multi-step interaction.");
    expect(readme).toContain("Key-page discovery is explicit and shallow; it is not a crawler.");
    expect(readme).toContain("Screenshot validation is heuristic pixel analysis, not full visual quality evaluation.");

    expect(readmeZh).toContain("自动读取生成的 `analysis.json`");
    expect(readmeZh).toContain("--viewport all");
    expect(readmeZh).toContain("--auto-pages");
    expect(readmeZh).toContain("--max-pages 4");
    expect(readmeZh).toContain("最终 `DESIGN.md` 在 CLI 成功后由 agent/LLM 写入，而不是 CLI 自己写入。");
    expect(readmeZh).toContain("不处理登录态。");
    expect(readmeZh).toContain("不执行任意复杂点击、筛选、分页或多步骤交互。");
    expect(readmeZh).toContain("关键页发现需要显式开启，并且是浅层选择，不是 crawler。");
    expect(readmeZh).toContain("截图校验是启发式像素分析，不是完整视觉质量评估。");
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
    expect(schema).toContain("average page confidence");
    expect(schema).toContain("When `--viewport all` captures the same URL multiple times");
    expect(schema).toContain("one entry per URL/viewport");
    expect(schema).toContain("page.url + page.viewport.name");
    expect(rules).toContain("Do not invent dark mode");
  });
});
