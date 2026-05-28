---
name: design-md-forge
description: Generate a DESIGN.md design-system document from website URLs using Playwright-first visual analysis.
---

# DESIGN.md Forge

Use this skill when the user wants to generate a `DESIGN.md` from one or more website URLs.

## Workflow

1. Collect URLs from the user.
2. For a fresh checkout, install dependencies and the Chromium browser used by Playwright:

```bash
npm install
npx playwright install chromium
```

3. If the user provides one URL and the site appears multi-page, ask whether to analyze only that URL, auto-select 2-4 key same-domain pages, or let the user provide more URLs.
4. Run the analysis script:

```bash
npm run analyze -- --url "https://example.com"
```

For multiple URLs, repeat `--url`:

```bash
npm run analyze -- --url "https://example.com" --url "https://example.com/pricing"
```

Optional CLI flags:

- `--url`: repeatable input URL to analyze.
- `--out-dir`: output root for generated analysis artifacts.
- `--run-id`: stable path-safe run directory name to use instead of an auto-generated ID.
- `--viewport`: viewport preset to capture. Use `all` to capture each analyzed URL across all supported viewport presets.
- `--auto-pages`: explicitly auto-select 2-4 shallow key same-domain pages from one input URL.
- `--max-pages`: maximum total analyzed pages when `--auto-pages` is enabled, including the starting URL.
- `--jina`: explicitly enable Jina Reader fallback collection for public HTTP(S) URLs.
- `--no-jina`: keep Jina Reader disabled. This is the default.

5. After the script succeeds, immediately read the generated `analysis.json`.
6. Automatically write a reference `DESIGN.md` next to `analysis.json` using `references/design-md-generation-rules.md`.
7. Verify the `DESIGN.md` exists, then report the `DESIGN.md` path to the user.

## Tool Policy

Use Playwright as the primary visual evidence source. Use Jina only when `--jina` is explicitly set and Playwright captured fewer than 2 headings.

Jina is an external service. Never send `file://`, localhost, private-network, internal, or credentialed URLs to Jina. The script strips credentials, query strings, and hashes before requesting Jina.

Do not use Firecrawl, AgentKey, Browser Agent, Stagehand, Web UI, MCP, or deep crawling in V1.

## Output

The script writes:

```text
design-output/<domain>/<run-id>/analysis.json
design-output/<domain>/<run-id>/screenshots/
```

After a successful analysis run, the agent automatically writes:

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

Stop instead of generating `DESIGN.md` when Playwright capture fails for any page, including when the page cannot be reached, body is invisible, screenshot is blank, or access is blocked by login or CAPTCHA.

Continue with warnings when CSS variables are sparse, some resources fail, or explicit Jina fallback fails while Playwright evidence is available. Jina fallback warnings and errors do not abort the run.
