import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { chromium } from "playwright";
import { scorePageEvidence } from "../core/confidence.mjs";
import { extractTokensFromComputedStyles } from "../core/tokens.mjs";
import { slugifyUrl } from "../core/url.mjs";

export function buildRepresentativeSelectors() {
  return [
    "body",
    "header",
    "nav",
    "main",
    "section",
    "article",
    "footer",
    "h1",
    "h2",
    "h3",
    "p",
    "a",
    "button",
    "input",
    "textarea",
    "select",
    "pre",
    "code",
    "[class*='button']",
    "[class*='card']",
    "[class*='hero']",
    "[class*='grid']"
  ];
}

export function summarizeCaptureWarnings({ textLength, cssVarCount, computedStyleCount }) {
  const warnings = [];
  if (textLength < 500) warnings.push("Page text is short; page may be blocked or mostly visual");
  if (cssVarCount < 5) warnings.push("Few CSS variables found; computed styles will carry token extraction");
  if (computedStyleCount < 5) warnings.push("Few representative computed styles captured");
  return warnings;
}

export function buildScreenshotName(url, viewportName = "desktop") {
  const slug = slugifyUrl(url);
  const hash = crypto.createHash("sha256").update(`${viewportName}:${url}`).digest("hex").slice(0, 8);
  return `${viewportName}-${slug}-${hash}.png`;
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function summarizePngSamples(buffer) {
  const signature = "89504e470d0a1a0a";
  if (!Buffer.isBuffer(buffer) || buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("Screenshot is not a valid PNG");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  const channelsByColorType = new Map([
    [0, 1],
    [2, 3],
    [6, 4]
  ]);
  const channels = channelsByColorType.get(colorType);
  if (!width || !height || bitDepth !== 8 || !channels || idatChunks.length === 0) {
    throw new Error("Screenshot PNG format is unsupported for blank-image validation");
  }

  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = width * channels;
  let previous = Buffer.alloc(stride);
  const buckets = new Set();
  const sums = [0, 0, 0];
  const sumSquares = [0, 0, 0];
  let sampledPixels = 0;
  let nonTransparentPixels = 0;

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (stride + 1);
    const filter = inflated[rowOffset];
    const row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[rowOffset + 1 + x];
      const left = x >= channels ? row[x - channels] : 0;
      const up = previous[x] || 0;
      const upLeft = x >= channels ? previous[x - channels] || 0 : 0;
      if (filter === 0) row[x] = raw;
      else if (filter === 1) row[x] = (raw + left) & 255;
      else if (filter === 2) row[x] = (raw + up) & 255;
      else if (filter === 3) row[x] = (raw + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) row[x] = (raw + paethPredictor(left, up, upLeft)) & 255;
      else throw new Error("Screenshot PNG contains an unsupported filter");
    }

    for (let x = 0; x < width; x += 1) {
      const pixelOffset = x * channels;
      const r = row[pixelOffset];
      const g = channels >= 3 ? row[pixelOffset + 1] : row[pixelOffset];
      const b = channels >= 3 ? row[pixelOffset + 2] : row[pixelOffset];
      const a = channels === 4 ? row[pixelOffset + 3] : 255;
      sampledPixels += 1;
      if (a > 8) nonTransparentPixels += 1;
      buckets.add(`${Math.floor(r / 16)}:${Math.floor(g / 16)}:${Math.floor(b / 16)}:${Math.floor(a / 16)}`);
      sums[0] += r;
      sums[1] += g;
      sums[2] += b;
      sumSquares[0] += r * r;
      sumSquares[1] += g * g;
      sumSquares[2] += b * b;
    }
    previous = row;
  }

  const variances = sums.map((sum, index) => {
    const mean = sum / sampledPixels;
    return sumSquares[index] / sampledPixels - mean * mean;
  });

  return {
    width,
    height,
    sampledPixels,
    nonTransparentPixels,
    distinctColorBuckets: buckets.size,
    averageChannelVariance: variances.reduce((sum, value) => sum + value, 0) / variances.length
  };
}

export function isLikelyBlankPng(buffer) {
  const stats = summarizePngSamples(buffer);
  if (stats.nonTransparentPixels === 0) return true;
  return stats.distinctColorBuckets < 2 && stats.averageChannelVariance < 8;
}

export async function validateScreenshot(pathname) {
  const buffer = await fs.readFile(pathname);
  if (buffer.length < 1000) {
    throw new Error("Screenshot is unexpectedly small");
  }
  if (isLikelyBlankPng(buffer)) {
    throw new Error("Screenshot appears blank");
  }
}

export function getBlockedReasons({ text, title, passwordFieldCount = 0, meaningfulVisibleElementCount = 0 }) {
  const haystack = `${title || ""}\n${text || ""}`.toLowerCase();
  const checks = [
    ["captcha", "CAPTCHA challenge detected"],
    ["verify you are human", "human verification challenge detected"],
    ["checking your browser", "browser verification challenge detected"],
    ["access denied", "access denied page detected"],
    ["403 forbidden", "forbidden page detected"]
  ];
  const reasons = checks.filter(([needle]) => haystack.includes(needle)).map(([, message]) => message);
  const authTitle = /^(sign in|log in|login|authenticate|authentication|required sign in|required login)$/i.test((title || "").trim());
  const authCopy = /\b(sign in required|login required|please sign in|please log in|authentication required)\b/.test(haystack);
  if ((passwordFieldCount > 0 || authTitle || authCopy) && meaningfulVisibleElementCount < 8) {
    reasons.push("login wall detected");
  }
  return reasons;
}

async function waitForMeaningfulContent(page, timeout = 25000) {
  await page.waitForFunction(() => {
    const text = document.body?.innerText || "";
    const visibleTargets = [...document.querySelectorAll("main,section,article,h1,h2,h3,p,a,button,input,textarea,select")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
      });
    return text.trim().length > 120 || visibleTargets.length >= 4;
  }, null, { timeout }).catch(() => {});
  await page.waitForFunction(() => {
    const text = document.body?.innerText || "";
    const targetCount = document.querySelectorAll("main,section,article,h1,h2,h3,p,a,button,input,textarea,select").length;
    return text.trim().length > 300 || targetCount >= 8;
  }, null, { timeout: Math.min(timeout, 10000) }).catch(() => {});
}

async function collectPageData(page, selectors) {
  return page.evaluate((captureSelectors) => {
    const cssVars = {};
    const rootStyles = getComputedStyle(document.documentElement);
    for (const name of rootStyles) {
      if (name.startsWith("--")) cssVars[name] = rootStyles.getPropertyValue(name).trim();
    }

    const computedStyles = captureSelectors.map((selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      return {
        selector,
        tag: element.tagName.toLowerCase(),
        role: element.getAttribute("role") || "",
        className: element.getAttribute("class") || "",
        text: (element.textContent || "").trim().slice(0, 300),
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        padding: style.padding,
        margin: style.margin,
        display: style.display,
        gridTemplateColumns: style.gridTemplateColumns
      };
    }).filter(Boolean);

    const text = document.body.innerText || "";
    const meaningfulVisibleElementCount = [...document.querySelectorAll("main,section,article,h1,h2,h3,p,a,button,input,textarea,select")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
      }).length;
    return {
      title: document.title,
      url: location.href,
      textLength: text.length,
      text: text.slice(0, 20000),
      meaningfulVisibleElementCount,
      passwordFieldCount: document.querySelectorAll("input[type='password']").length,
      cssVars,
      computedStyles,
      headings: [...document.querySelectorAll("h1,h2,h3")].map((node) => node.textContent.trim()).filter(Boolean).slice(0, 30),
      navLabels: [...document.querySelectorAll("nav a, header a")].map((node) => node.textContent.trim()).filter(Boolean).slice(0, 40),
      ctaLabels: [...document.querySelectorAll("button,a")].map((node) => node.textContent.trim()).filter(Boolean).slice(0, 60),
      landmarks: [...document.querySelectorAll("header,nav,main,section,article,footer")].map((node) => node.tagName.toLowerCase()).slice(0, 40),
      links: [...document.querySelectorAll("a[href]")].map((node) => node.href).slice(0, 200)
    };
  }, selectors);
}

export async function captureWithPlaywright({
  url,
  screenshotDir,
  viewport = { width: 1440, height: 1200 },
  viewportName = "desktop"
}) {
  await fs.mkdir(screenshotDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      colorScheme: "light",
      reducedMotion: "reduce"
    });
    const page = await context.newPage();

    const response = await page.goto(url, { waitUntil: "commit", timeout: 45000 });
    if (response && response.status() >= 400) {
      throw new Error(`Page returned HTTP ${response.status()} for ${url}`);
    }
    await page.locator("body").waitFor({ state: "visible", timeout: 45000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
    await waitForMeaningfulContent(page);
    await Promise.race([
      page.evaluate(() => document.fonts?.ready),
      page.waitForTimeout(2000)
    ]).catch(() => {});

    const selectors = buildRepresentativeSelectors();
    let data = await collectPageData(page, selectors);
    if (data.textLength < 40 && data.meaningfulVisibleElementCount < 2) {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
      await waitForMeaningfulContent(page, 30000);
      data = await collectPageData(page, selectors);
    }
    const blockedReasons = getBlockedReasons(data);
    if (blockedReasons.length > 0) {
      throw new Error(`Access-blocked page detected: ${blockedReasons.join("; ")}`);
    }
    if (data.textLength < 40 && data.meaningfulVisibleElementCount < 2) {
      throw new Error("Page has no meaningful visible content");
    }

    const screenshotName = buildScreenshotName(url, viewportName);
    const screenshotPath = path.join(screenshotDir, screenshotName);
    let screenshotFallbackUsed = false;
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true, timeout: 10000 });
    } catch {
      screenshotFallbackUsed = true;
      const client = await context.newCDPSession(page);
      const screenshot = await client.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        fromSurface: true
      });
      await fs.writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
      await client.detach();
    }
    await validateScreenshot(screenshotPath);

    const tokens = extractTokensFromComputedStyles(data.computedStyles);
    const warnings = summarizeCaptureWarnings({
      textLength: data.textLength,
      cssVarCount: Object.keys(data.cssVars).length,
      computedStyleCount: data.computedStyles.length
    });
    if (screenshotFallbackUsed) {
      warnings.push("Playwright screenshot timed out; used CDP screenshot fallback");
    }
    const confidence = scorePageEvidence({
      textLength: data.textLength,
      cssVarCount: Object.keys(data.cssVars).length,
      computedStyleCount: data.computedStyles.length,
      screenshotCount: 1
    });

    return {
      provider: "playwright",
      url: data.url,
      title: data.title,
      viewport: { name: viewportName, ...viewport },
      screenshotPath,
      htmlSummary: {
        headings: data.headings,
        landmarks: data.landmarks,
        navLabels: data.navLabels,
        ctaLabels: data.ctaLabels
      },
      tokens,
      cssVars: data.cssVars,
      computedStyles: data.computedStyles,
      links: data.links,
      components: {
        buttons: data.computedStyles.filter((style) => style.tag === "button" || style.selector.includes("button")).map((style) => ({ ...style, confidence: 0.7 })),
        cards: data.computedStyles.filter((style) => style.selector.includes("card")).map((style) => ({ ...style, confidence: 0.55 })),
        forms: data.computedStyles.filter((style) => ["input", "textarea", "select"].includes(style.tag)).map((style) => ({ ...style, confidence: 0.65 })),
        nav: data.computedStyles.filter((style) => style.tag === "nav").map((style) => ({ ...style, confidence: 0.65 })),
        hero: data.computedStyles.filter((style) => style.selector.includes("hero")).map((style) => ({ ...style, confidence: 0.5 }))
      },
      confidence,
      warnings
    };
  } finally {
    await browser.close();
  }
}
