import { normalizeInputUrl } from "../core/url.mjs";

function isPrivateIpv4(hostname) {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0
  );
}

function normalizeHostnameForPolicy(hostname) {
  let normalized = hostname.toLowerCase();
  normalized = normalized.replace(/\.+$/u, "");
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    normalized = normalized.slice(1, -1);
  }
  return normalized;
}

function isIpv6Literal(hostname) {
  return hostname.includes(":");
}

function ipv4FromMappedIpv6(hostname) {
  if (!hostname.startsWith("::ffff:")) return "";
  const mapped = hostname.slice("::ffff:".length);
  if (mapped.includes(".")) return mapped;

  const hexParts = mapped.split(":");
  if (hexParts.length !== 2) return "";

  const high = Number.parseInt(hexParts[0], 16);
  const low = Number.parseInt(hexParts[1], 16);
  if (![high, low].every((part) => Number.isInteger(part) && part >= 0 && part <= 0xffff)) {
    return "";
  }

  return [
    (high >> 8) & 255,
    high & 255,
    (low >> 8) & 255,
    low & 255
  ].join(".");
}

function isPrivateIpv6(hostname) {
  if (!isIpv6Literal(hostname)) return false;
  const mappedIpv4 = ipv4FromMappedIpv6(hostname);
  if (mappedIpv4) return isPrivateIpv4(mappedIpv4);

  return (
    hostname === "::1" ||
    hostname.startsWith("fe80:") ||
    hostname.startsWith("fe9") ||
    hostname.startsWith("fea") ||
    hostname.startsWith("feb") ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd")
  );
}

export function prepareJinaTargetUrl(url) {
  const normalizedUrl = normalizeInputUrl(url);
  const parsed = new URL(normalizedUrl);
  const hostname = normalizeHostnameForPolicy(parsed.hostname);

  if (parsed.protocol === "file:") {
    return { error: "Jina does not support file:// URLs", normalizedUrl };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "Unsupported URL scheme", normalizedUrl };
  }

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".test") ||
    isPrivateIpv4(hostname) ||
    isPrivateIpv6(hostname)
  ) {
    return { error: "Jina fallback is blocked for localhost, private, or internal URLs", normalizedUrl };
  }

  parsed.username = "";
  parsed.password = "";
  parsed.search = "";
  parsed.hash = "";
  return { normalizedUrl, targetUrl: parsed.toString() };
}

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
  let prepared;
  try {
    prepared = prepareJinaTargetUrl(url);
  } catch (error) {
    return errorResult({ url, error });
  }

  if (prepared.error) {
    return errorResult({ url: prepared.normalizedUrl, error: prepared.error });
  }

  let response;
  try {
    response = await fetchImpl(`https://r.jina.ai/${prepared.targetUrl}`, {
      headers: {
        "x-no-cache": "true",
        "x-respond-with": "markdown",
        "x-engine": "auto"
      }
    });
  } catch (error) {
    return errorResult({ url: prepared.normalizedUrl, error });
  }

  let markdown;
  try {
    markdown = await response.text();
  } catch (error) {
    return errorResult({ url: prepared.normalizedUrl, error, raw: { status: response.status } });
  }

  const warnings = [];
  if (!response.ok) warnings.push(`Jina returned status ${response.status}`);
  if (markdown.length < 500) warnings.push("Jina markdown content is short");

  const confidence = markdown.length > 1500 ? 0.82 : 0.55;

  return buildResult({
    url: prepared.normalizedUrl,
    markdown,
    warnings,
    confidence: response.ok ? confidence : Math.min(confidence, 0.35),
    raw: { status: response.status, targetUrl: prepared.targetUrl }
  });
}
