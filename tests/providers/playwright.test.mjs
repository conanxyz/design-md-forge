import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildRepresentativeSelectors, buildScreenshotName, isLikelyBlankPng, summarizeCaptureWarnings } from "../../scripts/providers/playwright.mjs";

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, Buffer.from(type), data, Buffer.alloc(4)]);
}

function pngFromRows({ width, height, rows }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.concat(rows.map((row) => Buffer.concat([Buffer.from([0]), Buffer.from(row)])));
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

describe("Playwright capture utilities", () => {
  it("uses focused selectors for visual style evidence", () => {
    expect(buildRepresentativeSelectors()).toEqual(expect.arrayContaining([
      "body",
      "h1",
      "button",
      "nav",
      "[class*='card']",
      "[class*='hero']"
    ]));
  });

  it("warns when captured page evidence is thin", () => {
    const warnings = summarizeCaptureWarnings({
      textLength: 100,
      cssVarCount: 0,
      computedStyleCount: 1
    });

    expect(warnings).toContain("Page text is short; page may be blocked or mostly visual");
    expect(warnings).toContain("Few CSS variables found; computed styles will carry token extraction");
    expect(warnings).toContain("Few representative computed styles captured");
  });

  it("builds unique screenshot names for URLs with the same path", () => {
    const planAName = buildScreenshotName("https://example.com/pricing?plan=a");
    const planBName = buildScreenshotName("https://example.com/pricing?plan=b");

    expect(planAName).not.toBe(planBName);
  });

  it("keeps readable screenshot name prefixes and extensions", () => {
    const name = buildScreenshotName("https://example.com/pricing?plan=a");

    expect(name.startsWith("desktop-pricing-")).toBe(true);
    expect(name.endsWith(".png")).toBe(true);
  });

  it("detects single-color PNG screenshots as blank", () => {
    const blank = pngFromRows({
      width: 2,
      height: 1,
      rows: [[255, 255, 255, 255, 255, 255]]
    });
    const nonBlank = pngFromRows({
      width: 2,
      height: 1,
      rows: [[255, 255, 255, 0, 0, 0]]
    });

    expect(isLikelyBlankPng(blank)).toBe(true);
    expect(isLikelyBlankPng(nonBlank)).toBe(false);
  });
});
