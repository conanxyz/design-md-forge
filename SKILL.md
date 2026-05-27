---
name: design-md-forge
description: Generate a DESIGN.md design-system document from website URLs using Playwright-first visual analysis.
---

# DESIGN.md Forge

Use this skill when the user wants to generate a `DESIGN.md` from one or more website URLs.

## Workflow

1. Collect URLs from the user.
2. If the user provides one URL and the site appears multi-page, ask whether to analyze only that URL, auto-select 2-4 key same-domain pages, or let the user provide more URLs.
3. Run the analysis script:

```bash
npm run analyze -- --url "https://example.com"
```

For multiple URLs, repeat `--url`:

```bash
npm run analyze -- --url "https://example.com" --url "https://example.com/pricing"
```

4. Read the generated `analysis.json`.
5. Write `DESIGN.md` next to `analysis.json`.
6. Report the `DESIGN.md` path to the user.

## Tool Policy

Use Playwright as the primary visual evidence source. Use Jina Reader only as a text and semantic fallback when the page has thin DOM text or unclear headings.

Do not use Firecrawl, AgentKey, Browser Agent, Stagehand, Web UI, MCP, or deep crawling in V1.

## Output

The script writes:

```text
design-output/<domain>/<run-id>/analysis.json
design-output/<domain>/<run-id>/screenshots/
```

The agent writes:

```text
design-output/<domain>/<run-id>/DESIGN.md
```

## DESIGN.md Requirements

Every generated `DESIGN.md` must include:

- YAML frontmatter with source URLs and core tokens.
- Visual Theme.
- Color System.
- Typography.
- Layout Principles.
- Components.
- Responsive Behavior.
- Interaction States.
- Do's and Don'ts.
- Confidence Notes.

Confidence Notes must explain strong observations, weak inferences, and missing evidence.

## Failure Policy

Stop instead of generating `DESIGN.md` when the page cannot be reached, body is invisible, screenshot is blank, or access is blocked by login or CAPTCHA.

Continue with warnings when CSS variables are sparse, some resources fail, Jina fails but Playwright evidence is strong, or one page fails in a multi-page run.
