import { describe, expect, it } from "vitest";
import { addWarning, scorePageEvidence } from "../../scripts/core/confidence.mjs";

describe("confidence helpers", () => {
  it("scores strong visual evidence higher than weak evidence", () => {
    const strong = scorePageEvidence({
      textLength: 2000,
      cssVarCount: 8,
      computedStyleCount: 20,
      screenshotCount: 1
    });
    const weak = scorePageEvidence({
      textLength: 100,
      cssVarCount: 0,
      computedStyleCount: 1,
      screenshotCount: 0
    });

    expect(strong).toBeGreaterThan(0.75);
    expect(weak).toBeLessThan(0.4);
  });

  it("pins exact evidence scoring boundaries", () => {
    expect(scorePageEvidence({})).toBe(0);
    expect(scorePageEvidence({ textLength: 1000 })).toBe(0);
    expect(scorePageEvidence({ textLength: 1001 })).toBe(0.2);
    expect(scorePageEvidence({ cssVarCount: 4 })).toBe(0);
    expect(scorePageEvidence({ cssVarCount: 5 })).toBe(0.2);
    expect(scorePageEvidence({ computedStyleCount: 9 })).toBe(0);
    expect(scorePageEvidence({ computedStyleCount: 10 })).toBe(0.35);
    expect(scorePageEvidence({ screenshotCount: 1 })).toBe(0.25);
  });

  it("adds warning strings without duplicating messages", () => {
    const warnings = [];
    addWarning(warnings, "Few CSS variables found");
    addWarning(warnings, "Few CSS variables found");
    expect(warnings).toEqual(["Few CSS variables found"]);
  });
});
