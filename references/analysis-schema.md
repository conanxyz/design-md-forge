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

Token entries should preserve source evidence with selector, tag, property, value, role candidate, occurrence count when aggregated, and confidence.
