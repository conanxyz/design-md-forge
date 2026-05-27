import { describe, expect, it } from "vitest";
import { aggregatePages } from "../../scripts/core/aggregate.mjs";

describe("page aggregation", () => {
  it("deduplicates repeated colors and keeps occurrence counts", () => {
    const aggregate = aggregatePages([
      {
        tokens: {
          colors: [
            { value: "#635bff", roleCandidate: "interactive", confidence: 0.8 },
            { value: "#635bff", roleCandidate: "interactive", confidence: 0.8 },
            { value: "#111111", roleCandidate: "text", confidence: 0.6 }
          ],
          typography: [],
          spacing: [],
          radii: [],
          shadows: []
        },
        components: { buttons: [{ confidence: 0.8 }], cards: [], forms: [], nav: [], hero: [] },
        confidence: 0.85
      }
    ]);

    expect(aggregate.colors[0]).toEqual(expect.objectContaining({
      value: "#635bff",
      count: 2,
      roleCandidate: "interactive"
    }));
    expect(aggregate.confidence.overall).toBe(0.85);
  });
});
