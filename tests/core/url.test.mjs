import { describe, expect, it } from "vitest";
import { getDomain, isSameDomain, normalizeInputUrl, slugifyUrl } from "../../scripts/core/url.mjs";

describe("url helpers", () => {
  it("normalizes URLs without a protocol", () => {
    expect(normalizeInputUrl("example.com/pricing")).toBe("https://example.com/pricing");
  });

  it("rejects unsupported explicit URL schemes", () => {
    expect(() => normalizeInputUrl("ftp://example.com/x")).toThrow("Unsupported URL scheme");
    expect(() => normalizeInputUrl("mailto:a@example.com")).toThrow("Unsupported URL scheme");
  });

  it("extracts a lowercase hostname without www", () => {
    expect(getDomain("https://www.Example.com/docs")).toBe("example.com");
  });

  it("returns an empty domain for file URLs", () => {
    expect(getDomain("file:///tmp/page.html")).toBe("");
  });

  it("checks same-domain links after www normalization", () => {
    expect(isSameDomain("https://example.com", "https://www.example.com/pricing")).toBe(true);
    expect(isSameDomain("https://example.com", "https://docs.example.com")).toBe(false);
  });

  it("does not treat hostname-less URLs as same-domain", () => {
    expect(isSameDomain("file:///tmp/a.html", "file:///tmp/b.html")).toBe(false);
  });

  it("builds stable URL slugs", () => {
    expect(slugifyUrl("https://example.com/pricing?plan=pro")).toBe("pricing");
    expect(slugifyUrl("https://example.com/")).toBe("home");
  });
});
