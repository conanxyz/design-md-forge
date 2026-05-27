import { normalizeInputUrl } from "../core/url.mjs";

function buildResult({
  url,
  markdown = "",
  warnings = [],
  errors = [],
  confidence = 0,
  raw = {}
}) {
  return {
    provider: "jina",
    url,
    markdown,
    text: markdown,
    warnings,
    errors,
    confidence,
    raw
  };
}

function errorResult({ url, error, raw }) {
  return buildResult({
    url,
    errors: [error instanceof Error ? error.message : String(error)],
    confidence: 0,
    raw
  });
}

export async function readWithJina({ url, fetchImpl = fetch }) {
  let normalizedUrl;
  try {
    normalizedUrl = normalizeInputUrl(url);
  } catch (error) {
    return errorResult({ url, error });
  }

  if (/^file:\/\//i.test(normalizedUrl)) {
    return errorResult({ url: normalizedUrl, error: "Jina does not support file:// URLs" });
  }

  let response;
  try {
    response = await fetchImpl(`https://r.jina.ai/${normalizedUrl}`, {
      headers: {
        "x-no-cache": "true",
        "x-respond-with": "markdown",
        "x-engine": "auto"
      }
    });
  } catch (error) {
    return errorResult({ url: normalizedUrl, error });
  }

  let markdown;
  try {
    markdown = await response.text();
  } catch (error) {
    return errorResult({ url: normalizedUrl, error, raw: { status: response.status } });
  }

  const warnings = [];
  if (!response.ok) warnings.push(`Jina returned status ${response.status}`);
  if (markdown.length < 500) warnings.push("Jina markdown content is short");

  const confidence = markdown.length > 1500 ? 0.82 : 0.55;

  return buildResult({
    url: normalizedUrl,
    markdown,
    warnings,
    confidence: response.ok ? confidence : Math.min(confidence, 0.35),
    raw: { status: response.status }
  });
}
