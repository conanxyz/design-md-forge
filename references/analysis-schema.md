# Analysis JSON Schema

`analysis.json` stores normalized evidence for LLM generation.

Top-level fields:

- `target`: domain, input URLs, analyzed URLs, and capture time.
- `pages`: one object per analyzed URL/viewport capture.
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
- Optional `fallbacks.jina`: captured only when `--jina` is set for eligible public HTTP(S) pages with fewer than 2 Playwright headings. It contains `markdown`, `confidence`, `warnings`, and `errors`.

When `--viewport all` captures the same URL multiple times, `pages` has one entry per URL/viewport. Consumers should treat `page.url + page.viewport.name` as the page identity, not `page.url` alone.

Token entries should preserve source evidence with selector, tag, property, value, role candidate, occurrence count when aggregated, and confidence.

Jina Reader fallback warnings and errors are also copied into top-level `warnings` with URL context so agents can see run-level evidence gaps without inspecting every page entry. Jina receives a sanitized URL with credentials, query strings, and hashes removed.

`aggregate.confidence` contains:

- `overall`: average page confidence.
- `bestPage`: highest page confidence.
- `weakestPage`: lowest page confidence.
- `pageCount`: analyzed page count.
