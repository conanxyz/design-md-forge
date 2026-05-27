import fs from "node:fs/promises";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { aggregatePages } from "./core/aggregate.mjs";
import { buildRunPaths, createRunId } from "./core/paths.mjs";
import { createAnalysis, createPageAnalysis } from "./core/schema.mjs";
import { getDomain, normalizeInputUrl } from "./core/url.mjs";
import { captureWithPlaywright } from "./providers/playwright.mjs";
import { readWithJina } from "./providers/jina.mjs";

function parseArgs(argv) {
  const urls = [];
  let outDir = process.cwd();
  let runId = createRunId();
  let useJina = true;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--url") {
      urls.push(argv[index + 1]);
      index += 1;
    } else if (value === "--out-dir") {
      outDir = argv[index + 1];
      index += 1;
    } else if (value === "--run-id") {
      runId = argv[index + 1];
      index += 1;
    } else if (value === "--no-jina") {
      useJina = false;
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

export async function runAnalyzeSite({ urls, rootDir = process.cwd(), runId = createRunId(), useJina = true }) {
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
    const captured = await captureWithPlaywright({ url, screenshotDir: paths.screenshotDir });
    applyVisualEvidenceConfidenceFloor(captured);
    if (useJina && captured.htmlSummary.headings.length < 2 && !url.startsWith("file://")) {
      try {
        const jina = await readWithJina({ url });
        captured.jina = { markdown: jina.markdown, confidence: jina.confidence };
        warnings.push(...jina.warnings.map((message) => `Jina for ${url}: ${message}`));
      } catch (error) {
        warnings.push(`Jina failed for ${url}: ${error.message}`);
      }
    }

    pages.push(createPageAnalysis(captured));
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
