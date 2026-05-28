import { describe, expect, it } from "vitest";
import { extractTokensFromComputedStyles, normalizeColor } from "../../scripts/core/tokens.mjs";

describe("token extraction", () => {
  it("normalizes rgb colors to hex", () => {
    expect(normalizeColor("rgb(99, 91, 255)")).toBe("#635bff");
    expect(normalizeColor("rgb( 99, 91, 255)")).toBe("#635bff");
    expect(normalizeColor("rgb(99 91 255 / 1)")).toBe("#635bff");
    expect(normalizeColor("rgba(0, 0, 0, 0)")).toBe(null);
    expect(normalizeColor("rgba(99, 91, 255, 0)")).toBe(null);
    expect(normalizeColor("rgba(99,91,255,0)")).toBe(null);
    expect(normalizeColor("rgba( 99, 91, 255, 0)")).toBe(null);
    expect(normalizeColor("rgb(99 91 255 / 0)")).toBe(null);
    expect(normalizeColor("transparent")).toBe(null);
    expect(normalizeColor(" ReBeCCaPurPle ")).toBe("rebeccapurple");
  });

  it("extracts colors, typography, spacing, radii, and shadows from computed styles", () => {
    const tokens = extractTokensFromComputedStyles([
      {
        selector: "button",
        tag: "button",
        role: "button",
        text: "Start",
        color: "rgb(255, 255, 255)",
        backgroundColor: "rgb(99, 91, 255)",
        fontFamily: "Inter, sans-serif",
        fontSize: "16px",
        fontWeight: "600",
        lineHeight: "24px",
        padding: "12px 16px",
        margin: "0px",
        borderRadius: "8px",
        boxShadow: "rgba(0, 0, 0, 0.12) 0px 8px 24px"
      }
    ]);

    expect(tokens.colors).toContainEqual(expect.objectContaining({
      value: "#635bff",
      property: "backgroundColor",
      roleCandidate: "interactive"
    }));
    expect(tokens.typography).toContainEqual(expect.objectContaining({
      fontFamily: "Inter, sans-serif",
      fontSize: "16px"
    }));
    expect(tokens.spacing).toContainEqual(expect.objectContaining({ value: "12px 16px" }));
    expect(tokens.radii).toContainEqual(expect.objectContaining({ value: "8px" }));
    expect(tokens.shadows).toContainEqual(expect.objectContaining({ value: "rgba(0, 0, 0, 0.12) 0px 8px 24px" }));
  });

  it("does not add color tokens for transparent backgrounds", () => {
    const tokens = extractTokensFromComputedStyles([
      {
        selector: ".ghost",
        tag: "div",
        backgroundColor: "rgb(99 91 255 / 0)"
      }
    ]);

    expect(tokens.colors).toEqual([]);
  });
});
