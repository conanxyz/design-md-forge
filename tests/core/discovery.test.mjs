import { describe, expect, it } from "vitest";
import { selectAutoPages } from "../../scripts/core/discovery.mjs";

describe("key page discovery", () => {
  it("selects high-value same-domain links in score order", () => {
    const selected = selectAutoPages({
      sourceUrl: "https://example.com",
      links: [
        "https://example.com/legal",
        "https://example.com/pricing",
        "https://example.com/features",
        "https://external.test/pricing",
        "https://example.com/docs/getting-started"
      ],
      existingUrls: ["https://example.com/"],
      maxPages: 4
    });

    expect(selected).toEqual([
      "https://example.com/pricing",
      "https://example.com/features",
      "https://example.com/docs/getting-started"
    ]);
  });

  it("removes hashes, duplicates, mailto links, and existing URLs", () => {
    const selected = selectAutoPages({
      sourceUrl: "https://example.com",
      links: [
        "https://example.com/#top",
        "https://example.com/pricing#plans",
        "https://example.com/pricing",
        "mailto:hello@example.com",
        "/features"
      ],
      existingUrls: ["https://example.com/"],
      maxPages: 4
    });

    expect(selected).toEqual([
      "https://example.com/pricing",
      "https://example.com/features"
    ]);
  });

  it("honors max page count as total analyzed pages including the source page", () => {
    const selected = selectAutoPages({
      sourceUrl: "https://example.com",
      links: [
        "https://example.com/pricing",
        "https://example.com/features",
        "https://example.com/docs",
        "https://example.com/about"
      ],
      existingUrls: ["https://example.com/"],
      maxPages: 2
    });

    expect(selected).toEqual(["https://example.com/pricing"]);
  });

  it("returns no pages for file URLs", () => {
    const selected = selectAutoPages({
      sourceUrl: "file:///tmp/example.html",
      links: ["file:///tmp/other.html"],
      existingUrls: ["file:///tmp/example.html"],
      maxPages: 4
    });

    expect(selected).toEqual([]);
  });
});
