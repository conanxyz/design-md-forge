import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
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

export function buildScreenshotName(url) {
  const slug = slugifyUrl(url);
  const hash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 8);
  return `desktop-${slug}-${hash}.png`;
}

export async function captureWithPlaywright({ url, screenshotDir, viewport = { width: 1440, height: 1200 } }) {
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
    await page.route(/\.(woff2?|ttf|otf)(\?.*)?$/i, (route) => route.abort());

    await page.goto(url, { waitUntil: "commit", timeout: 45000 });
    await page.locator("body").waitFor({ state: "attached", timeout: 15000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return text.length > 500 || !text.includes("self.__next_f");
    }, null, { timeout: 25000 }).catch(() => {});
    await Promise.race([
      page.evaluate(() => document.fonts?.ready),
      page.waitForTimeout(2000)
    ]).catch(() => {});
    await page.evaluate(() => {
      if (!document.fonts?.delete) return;
      for (const fontFace of document.fonts) {
        document.fonts.delete(fontFace);
      }
    }).catch(() => {});

    const selectors = buildRepresentativeSelectors();
    const data = await page.evaluate((captureSelectors) => {
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
      return {
        title: document.title,
        url: location.href,
        textLength: text.length,
        text: text.slice(0, 20000),
        cssVars,
        computedStyles,
        headings: [...document.querySelectorAll("h1,h2,h3")].map((node) => node.textContent.trim()).filter(Boolean).slice(0, 30),
        navLabels: [...document.querySelectorAll("nav a, header a")].map((node) => node.textContent.trim()).filter(Boolean).slice(0, 40),
        ctaLabels: [...document.querySelectorAll("button,a")].map((node) => node.textContent.trim()).filter(Boolean).slice(0, 60),
        landmarks: [...document.querySelectorAll("header,nav,main,section,article,footer")].map((node) => node.tagName.toLowerCase()).slice(0, 40),
        links: [...document.querySelectorAll("a[href]")].map((node) => node.href).slice(0, 200)
      };
    }, selectors);

    const screenshotName = buildScreenshotName(url);
    const screenshotPath = path.join(screenshotDir, screenshotName);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true, timeout: 10000 });
    } catch {
      const client = await context.newCDPSession(page);
      const screenshot = await client.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        fromSurface: true
      });
      await fs.writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
      await client.detach();
    }

    const tokens = extractTokensFromComputedStyles(data.computedStyles);
    const warnings = summarizeCaptureWarnings({
      textLength: data.textLength,
      cssVarCount: Object.keys(data.cssVars).length,
      computedStyleCount: data.computedStyles.length
    });
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
      viewport,
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
