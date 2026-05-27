import { describe, expect, it } from "vitest";
import { aggregatePages } from "../../scripts/core/aggregate.mjs";

describe("page aggregation", () => {
  it("deduplicates repeated colors by value and role while keeping max confidence", () => {
    const aggregate = aggregatePages([
      {
        tokens: {
          colors: [
            { value: "#635bff", roleCandidate: "interactive", confidence: 0.8 },
            { value: "#635bff", roleCandidate: "interactive", confidence: 0.9 },
            { value: "#635bff", roleCandidate: "background", confidence: 0.7 },
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
      roleCandidate: "interactive",
      confidence: 0.9
    }));
    expect(aggregate.colors).toContainEqual(expect.objectContaining({
      value: "#635bff",
      count: 1,
      roleCandidate: "background"
    }));
    expect(aggregate.confidence.overall).toBe(0.85);
  });

  it("sorts counted evidence by count then confidence", () => {
    const aggregate = aggregatePages([
      {
        tokens: {
          colors: [
            { value: "#111111", roleCandidate: "text", confidence: 0.4 },
            { value: "#222222", roleCandidate: "text", confidence: 0.8 },
            { value: "#333333", roleCandidate: "text", confidence: 0.7 },
            { value: "#333333", roleCandidate: "text", confidence: 0.7 }
          ],
          typography: [],
          spacing: [],
          radii: [],
          shadows: []
        },
        components: { buttons: [], cards: [], forms: [], nav: [], hero: [] },
        confidence: 0.5
      }
    ]);

    expect(aggregate.colors.map((color) => color.value)).toEqual(["#333333", "#222222", "#111111"]);
  });

  it("aggregates token scales and flattens component patterns", () => {
    const aggregate = aggregatePages([
      {
        tokens: {
          colors: [],
          typography: [
            { fontSize: "16px", confidence: 0.4 },
            { fontSize: "16px", confidence: 0.7 },
            { fontSize: "24px", confidence: 0.8 }
          ],
          spacing: [
            { value: "8px", confidence: 0.5 },
            { value: "8px", confidence: 0.9 },
            { value: "16px", confidence: 0.6 }
          ],
          radii: [
            { value: "4px", confidence: 0.5 },
            { value: "4px", confidence: 0.8 },
            { value: "12px", confidence: 0.7 }
          ],
          shadows: [
            { value: "0 1px 2px rgb(0 0 0 / 0.2)", confidence: 0.6 },
            { value: "0 1px 2px rgb(0 0 0 / 0.2)", confidence: 0.75 },
            { value: "0 8px 16px rgb(0 0 0 / 0.2)", confidence: 0.65 }
          ]
        },
        components: {
          buttons: [{ variant: "primary", confidence: 0.8 }],
          cards: [{ elevation: "raised", confidence: 0.7 }],
          forms: [],
          nav: [{ position: "top", confidence: 0.6 }],
          hero: []
        },
        confidence: 0.85
      },
      {
        tokens: {
          colors: [],
          typography: [{ fontSize: "24px", confidence: 0.9 }],
          spacing: [{ value: "16px", confidence: 0.95 }],
          radii: [{ value: "12px", confidence: 0.85 }],
          shadows: [{ value: "0 8px 16px rgb(0 0 0 / 0.2)", confidence: 0.8 }]
        },
        components: {
          buttons: [{ variant: "secondary", confidence: 0.65 }],
          cards: [],
          forms: [{ fields: 2, confidence: 0.7 }],
          nav: [],
          hero: [{ layout: "split", confidence: 0.75 }]
        },
        confidence: 0.9
      }
    ]);

    expect(aggregate.typographyScale).toEqual([
      expect.objectContaining({ fontSize: "24px", count: 2, confidence: 0.9 }),
      expect.objectContaining({ fontSize: "16px", count: 2, confidence: 0.7 })
    ]);
    expect(aggregate.spacingScale).toEqual([
      expect.objectContaining({ value: "16px", count: 2, confidence: 0.95 }),
      expect.objectContaining({ value: "8px", count: 2, confidence: 0.9 })
    ]);
    expect(aggregate.radiusScale).toEqual([
      expect.objectContaining({ value: "12px", count: 2, confidence: 0.85 }),
      expect.objectContaining({ value: "4px", count: 2, confidence: 0.8 })
    ]);
    expect(aggregate.shadows).toEqual([
      expect.objectContaining({ value: "0 8px 16px rgb(0 0 0 / 0.2)", count: 2, confidence: 0.8 }),
      expect.objectContaining({ value: "0 1px 2px rgb(0 0 0 / 0.2)", count: 2, confidence: 0.75 })
    ]);
    expect(aggregate.componentPatterns).toEqual([
      { kind: "buttons", variant: "primary", confidence: 0.8 },
      { kind: "cards", elevation: "raised", confidence: 0.7 },
      { kind: "nav", position: "top", confidence: 0.6 },
      { kind: "buttons", variant: "secondary", confidence: 0.65 },
      { kind: "forms", fields: 2, confidence: 0.7 },
      { kind: "hero", layout: "split", confidence: 0.75 }
    ]);
    expect(aggregate.confidence.overall).toBe(0.9);
  });
});
