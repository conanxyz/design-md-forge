# DESIGN.md Generation Rules

Generate `DESIGN.md` from `analysis.json`.

Use observed tokens before naming aliases. Prefer concrete values. High-confidence evidence can become design rules. Low-confidence evidence must be described as an observation.

Do not invent dark mode, complex form states, animation systems, icon systems, or responsive behavior without evidence.

If only one URL was analyzed, say so in `Confidence Notes`.

If a component was not observed, do not write detailed component rules for it.

If screenshots or computed styles failed, stop and ask for another URL or more evidence.

If `fallbacks.jina` is present, use its markdown only to clarify page semantics, headings, and content structure. Do not let fallback text override stronger Playwright visual evidence.
