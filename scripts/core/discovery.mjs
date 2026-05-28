const KEY_PATH_PATTERNS = [
  { pattern: /\/pricing\/?$/i, score: 100 },
  { pattern: /\/features?\/?$/i, score: 90 },
  { pattern: /\/docs?(\/|$)/i, score: 80 },
  { pattern: /\/guide(s)?(\/|$)/i, score: 70 },
  { pattern: /\/about\/?$/i, score: 55 },
  { pattern: /\/blog(\/|$)/i, score: 35 },
  { pattern: /\/support\/?$/i, score: 30 },
  { pattern: /\/faq\/?$/i, score: 25 }
];

function normalizeDiscoveredUrl(link, sourceUrl) {
  try {
    const url = new URL(link, sourceUrl);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function scoreUrl(url) {
  const parsed = new URL(url);
  const path = parsed.pathname;
  const match = KEY_PATH_PATTERNS.find(({ pattern }) => pattern.test(path));
  if (match) return match.score;
  if (path === "/" || path === "") return 0;
  return 10;
}

export function selectAutoPages({
  sourceUrl,
  links = [],
  existingUrls = [],
  maxPages = 4
}) {
  if (sourceUrl.startsWith("file://")) return [];

  const source = new URL(sourceUrl);
  const existing = new Set(existingUrls.map((url) => normalizeDiscoveredUrl(url, sourceUrl)));
  const remainingSlots = Math.max(0, maxPages - existing.size);
  if (remainingSlots === 0) return [];

  const candidates = new Map();
  for (const link of links) {
    const normalized = normalizeDiscoveredUrl(link, sourceUrl);
    if (!normalized || existing.has(normalized)) continue;

    const parsed = new URL(normalized);
    if (parsed.hostname !== source.hostname) continue;

    const score = scoreUrl(normalized);
    if (score <= 0) continue;
    const current = candidates.get(normalized);
    if (!current || score > current.score) {
      candidates.set(normalized, { url: normalized, score });
    }
  }

  return [...candidates.values()]
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url))
    .slice(0, remainingSlots)
    .map((candidate) => candidate.url);
}
