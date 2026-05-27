export function normalizeInputUrl(value) {
  const trimmed = String(value || "").trim();
  if (trimmed.length === 0) {
    throw new Error("URL is required");
  }
  if (/^https?:\/\//i.test(trimmed) || /^file:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    throw new Error("Unsupported URL scheme");
  }
  return `https://${trimmed}`;
}

export function getDomain(url) {
  const parsed = new URL(normalizeInputUrl(url));
  return parsed.hostname.toLowerCase().replace(/^www\./, "");
}

export function isSameDomain(baseUrl, candidateUrl) {
  try {
    const baseDomain = getDomain(baseUrl);
    const candidateDomain = getDomain(candidateUrl);
    return baseDomain.length > 0 && baseDomain === candidateDomain;
  } catch {
    return false;
  }
}

export function slugifyUrl(url) {
  const parsed = new URL(normalizeInputUrl(url));
  const path = parsed.pathname.replace(/^\/+|\/+$/g, "");
  if (!path) return "home";
  const last = path.split("/").filter(Boolean).at(-1) || "home";
  return last
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "page";
}
