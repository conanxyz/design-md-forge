import { describe, expect, it } from "vitest";
import { getDomain, isSameDomain, normalizeInputUrl, slugifyUrl } from "../../scripts/core/url.mjs";

describe("url helpers", () => {
  it("normalizes URLs without a protocol", () => {
    expect(normalizeInputUrl("example.com/pricing")).toBe("https://example.com/pricing");
  });

  it("extracts a lowercase hostname without www", () => {
    expect(getDomain("https://www.Example.com/docs")).toBe("example.com");
  });

  it("checks same-domain links after www normalization", () => {
    expect(isSameDomain("https://example.com", "https://www.example.com/pricing")).toBe(true);
    expect(isSameDomain("https://example.com", "https://docs.example.com")).toBe(false);
  });

  it("builds stable URL slugs", () => {
    expect(slugifyUrl("https://example.com/pricing?plan=pro")).toBe("pricing");
    expect(slugifyUrl("https://example.com/")).toBe("home");
  });
});
