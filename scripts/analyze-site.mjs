import fs from "node:fs/promises";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { aggregatePages } from "./core/aggregate.mjs";
import { buildRunPaths, createRunId } from "./core/paths.mjs";
import { createAnalysis, createPageAnalysis } from "./core/schema.mjs";
import { getDomain, normalizeInputUrl } from "./core/url.mjs";
import { captureWithPlaywright } from "./providers/playwright.mjs";
import { readWithJina } from "./providers/jina.mjs";

function readOptionValue(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

export function parseArgs(argv) {
  const urls = [];
  let outDir = process.cwd();
  let runId = createRunId();
  let useJina = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--url") {
      urls.push(readOptionValue(argv, index, value));
      index += 1;
    } else if (value === "--out-dir") {
      outDir = readOptionValue(argv, index, value);
      index += 1;
    } else if (value === "--run-id") {
      runId = readOptionValue(argv, index, value);
      index += 1;
    } else if (value === "--jina") {
      useJina = true;
    } else if (value === "--no-jina") {
      useJina = false;
    } else {
      throw new Error(`Unknown option: ${value}`);
    }
  }

  return { urls, rootDir: outDir, runId, useJina };
}

function domainForOutput(url) {
  if (url.startsWith("file://")) return "";
  return getDomain(url);
}

function applyVisualEvidenceConfidenceFloor(captured) {
  const hasVisualEvidence =
    captured.screenshotPath &&
    captured.computedStyles.length >= 10 &&
    captured.tokens.colors.length > 0;

  if (hasVisualEvidence) {
    captured.confidence = Math.max(captured.confidence, 0.75);
  }

  return captured;
}

export async function runAnalyzeSite({
  urls,
  rootDir = process.cwd(),
  runId = createRunId(),
  useJina = false,
  capture = captureWithPlaywright,
  read = readWithJina
}) {
  if (!urls || urls.length === 0) {
    throw new Error("At least one --url is required");
  }

  const normalizedUrls = urls.map(normalizeInputUrl);
  const domain = domainForOutput(normalizedUrls[0]);
  const paths = buildRunPaths({ rootDir, domain, runId });
  await fs.mkdir(paths.screenshotDir, { recursive: true });

  const pages = [];
  const warnings = [];

  for (const url of normalizedUrls) {
    const captured = await capture({ url, screenshotDir: paths.screenshotDir });
    let fallbackEvidence;
    applyVisualEvidenceConfidenceFloor(captured);
    if (useJina && captured.htmlSummary.headings.length < 2 && !url.startsWith("file://")) {
      try {
        const jina = await read({ url });
        const jinaWarnings = jina.warnings || [];
        const jinaErrors = jina.errors || [];
        fallbackEvidence = {
          jina: {
            markdown: jina.markdown,
            confidence: jina.confidence,
            warnings: [...jinaWarnings],
            errors: [...jinaErrors]
          }
        };
        warnings.push(...jinaWarnings.map((message) => `Jina for ${url}: ${message}`));
        warnings.push(...jinaErrors.map((message) => `Jina for ${url}: ${message}`));
      } catch (error) {
        warnings.push(`Jina failed for ${url}: ${error.message}`);
      }
    }

    const pageAnalysis = createPageAnalysis(captured);
    if (fallbackEvidence) {
      pageAnalysis.fallbacks = fallbackEvidence;
    }
    pages.push(pageAnalysis);
    warnings.push(...captured.warnings.map((message) => `${url}: ${message}`));
  }

  const aggregate = aggregatePages(pages);
  const analysis = createAnalysis({
    domain,
    inputUrls: normalizedUrls,
    analyzedUrls: normalizedUrls,
    pages,
    aggregate,
    warnings
  });

  await fs.mkdir(paths.runDir, { recursive: true });
  await fs.writeFile(paths.analysisPath, JSON.stringify(analysis, null, 2));
  return { ...paths, analysis };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  runAnalyzeSite(args)
    .then((result) => {
      console.log(`analysis.json written to ${result.analysisPath}`);
      console.log(`DESIGN.md should be written to ${result.designPath}`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
