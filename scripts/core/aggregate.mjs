function countByValue(items, valueKey) {
  const map = new Map();
  for (const item of items) {
    const key = `${item[valueKey]}:${item.roleCandidate || ""}`;
    const existing = map.get(key) || { ...item, count: 0, confidence: 0 };
    existing.count += 1;
    existing.confidence = Math.max(existing.confidence, item.confidence || 0);
    map.set(key, existing);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.confidence - a.confidence);
}

export function aggregatePages(pages) {
  const colors = pages.flatMap((page) => page.tokens.colors);
  const typography = pages.flatMap((page) => page.tokens.typography);
  const spacing = pages.flatMap((page) => page.tokens.spacing);
  const radii = pages.flatMap((page) => page.tokens.radii);
  const shadows = pages.flatMap((page) => page.tokens.shadows);
  const componentPatterns = pages.flatMap((page) => Object.entries(page.components).flatMap(([kind, values]) => {
    return values.map((value) => ({ kind, ...value }));
  }));
  const overall = pages.length === 0 ? 0 : Math.max(...pages.map((page) => page.confidence || 0));

  return {
    colors: countByValue(colors, "value"),
    typographyScale: countByValue(typography, "fontSize"),
    spacingScale: countByValue(spacing, "value"),
    radiusScale: countByValue(radii, "value"),
    shadows: countByValue(shadows, "value"),
    componentPatterns,
    confidence: { overall }
  };
}
