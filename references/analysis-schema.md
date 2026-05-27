# Analysis JSON Schema

`analysis.json` stores normalized evidence for LLM generation.

Top-level fields:

- `target`: domain, input URLs, analyzed URLs, and capture time.
- `pages`: one object per analyzed page.
- `aggregate`: deduplicated tokens and confidence summaries.
- `warnings`: run-level warnings.

Each page contains:

- `url`
- `title`
- `viewport`
- `screenshotPath`
- `htmlSummary`
- `tokens`
- `components`
- `confidence`
- `warnings`
- Optional `fallbacks.jina`: captured only for eligible non-file pages with fewer than 2 Playwright headings, unless Jina is disabled. It contains `markdown`, `confidence`, `warnings`, and `errors`.

Token entries should preserve source evidence with selector, tag, property, value, role candidate, occurrence count when aggregated, and confidence.

Jina Reader fallback warnings and errors are also copied into top-level `warnings` with URL context so agents can see run-level evidence gaps without inspecting every page entry.
