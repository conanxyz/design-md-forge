import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  buildRepresentativeSelectors,
  buildScreenshotName,
  captureWithPlaywright,
  getBlockedReasons,
  isLikelyBlankPng,
  summarizeCaptureWarnings
} from "../../scripts/providers/playwright.mjs";

async function withServer(handler, callback) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    return await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function withScreenshotDir(callback) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "design-md-forge-playwright-"));
  try {
    return await callback(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

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

function solidRows({ width, height, rgb }) {
  const row = [];
  for (let x = 0; x < width; x += 1) {
    row.push(...rgb);
  }
  return Array.from({ length: height }, () => row);
}

function rowsWithSinglePixel({ width, height, backgroundRgb, pixelRgb, pixelX, pixelY }) {
  return Array.from({ length: height }, (_, y) => {
    const row = Buffer.alloc(width * 3);
    for (let x = 0; x < width; x += 1) {
      const offset = x * 3;
      const rgb = x === pixelX && y === pixelY ? pixelRgb : backgroundRgb;
      row[offset] = rgb[0];
      row[offset + 1] = rgb[1];
      row[offset + 2] = rgb[2];
    }
    return row;
  });
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
    const name = buildScreenshotName("https://example.com/pricing?plan=a", "mobile");

    expect(name.startsWith("mobile-pricing-")).toBe(true);
    expect(name.endsWith(".png")).toBe(true);
  });

  it("detects low-variance single-color screenshots as blank", () => {
    const blank = pngFromRows({
      width: 4,
      height: 4,
      rows: solidRows({ width: 4, height: 4, rgb: [255, 255, 255] })
    });

    expect(isLikelyBlankPng(blank)).toBe(true);
  });

  it("keeps sparse but visible screenshots as nonblank", () => {
    const rows = solidRows({ width: 4, height: 4, rgb: [255, 255, 255] });
    rows[1] = [
      255, 255, 255,
      0, 0, 0,
      255, 255, 255,
      255, 255, 255
    ];
    const sparse = pngFromRows({ width: 4, height: 4, rows });

    expect(isLikelyBlankPng(sparse)).toBe(false);
  });

  it("keeps one-pixel visible screenshots as nonblank", () => {
    const sparse = pngFromRows({
      width: 1440,
      height: 1200,
      rows: rowsWithSinglePixel({
        width: 1440,
        height: 1200,
        backgroundRgb: [255, 255, 255],
        pixelRgb: [0, 0, 0],
        pixelX: 1,
        pixelY: 1
      })
    });

    expect(isLikelyBlankPng(sparse)).toBe(false);
  });

  it("keeps multi-color screenshots as nonblank", () => {
    const colorful = pngFromRows({
      width: 4,
      height: 2,
      rows: [
        [
          255, 255, 255,
          12, 80, 180,
          230, 20, 120,
          40, 40, 40
        ],
        [
          255, 255, 255,
          12, 80, 180,
          230, 20, 120,
          40, 40, 40
        ]
      ]
    });

    expect(isLikelyBlankPng(colorful)).toBe(false);
  });

  it("does not treat sparse pages with a login nav link as login walls", () => {
    expect(getBlockedReasons({
      title: "Product",
      text: "Beautiful analytics for teams. Sign in",
      passwordFieldCount: 0,
      meaningfulVisibleElementCount: 6
    })).toEqual([]);
  });

  it("detects focused login-wall evidence", () => {
    expect(getBlockedReasons({
      title: "Login",
      text: "Please sign in required",
      passwordFieldCount: 1,
      meaningfulVisibleElementCount: 3
    })).toContain("login wall detected");
  });
});

describe("Playwright capture hard failures", () => {
  it("fails on HTTP error document responses", async () => {
    await withServer((request, response) => {
      response.writeHead(500, { "Content-Type": "text/html" });
      response.end("<main><h1>Server error</h1></main>");
    }, async (baseUrl) => {
      await withScreenshotDir(async (screenshotDir) => {
        await expect(captureWithPlaywright({
          url: baseUrl,
          screenshotDir,
          viewport: { width: 800, height: 600 }
        })).rejects.toThrow("Page returned HTTP 500");
      });
    });
  });

  it("fails on access-blocked pages", async () => {
    const copy = "Access denied. ".repeat(30);
    await withServer((request, response) => {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(`<main><h1>Access denied</h1><p>${copy}</p><button>Retry</button></main>`);
    }, async (baseUrl) => {
      await withScreenshotDir(async (screenshotDir) => {
        await expect(captureWithPlaywright({
          url: baseUrl,
          screenshotDir,
          viewport: { width: 800, height: 600 }
        })).rejects.toThrow("Access-blocked page detected");
      });
    });
  });

  it("fails when screenshots are blank", async () => {
    const copy = "Invisible white copy ".repeat(30);
    await withServer((request, response) => {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(`
        <main style="min-height:600px;background:white;color:white">
          <h1>${copy}</h1>
          <p>${copy}</p>
          <button style="color:white;background:white;border:0">Continue</button>
          <a style="color:white" href="/">Docs</a>
        </main>
      `);
    }, async (baseUrl) => {
      await withScreenshotDir(async (screenshotDir) => {
        await expect(captureWithPlaywright({
          url: baseUrl,
          screenshotDir,
          viewport: { width: 800, height: 600 }
        })).rejects.toThrow("Screenshot appears blank");
      });
    });
  });
});
