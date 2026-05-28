function copyArray(value) {
  return value ? [...value] : [];
}

function copyArrayEntries(value) {
  return value
    ? value.map((entry) =>
        entry && typeof entry === "object" && !Array.isArray(entry) ? { ...entry } : entry
      )
    : [];
}

export function createPageAnalysis({
  url,
  title = "",
  viewport,
  screenshotPath = "",
  cssVars = {},
  computedStyles = [],
  links = [],
  htmlSummary = {},
  tokens = {},
  components = {},
  warnings = [],
  confidence = 0
}) {
  return {
    url,
    title,
    viewport: viewport ? { ...viewport } : viewport,
    screenshotPath,
    cssVars: { ...cssVars },
    computedStyles: copyArrayEntries(computedStyles),
    links: [...links],
    htmlSummary: {
      headings: copyArray(htmlSummary.headings),
      landmarks: copyArray(htmlSummary.landmarks),
      navLabels: copyArray(htmlSummary.navLabels),
      ctaLabels: copyArray(htmlSummary.ctaLabels)
    },
    tokens: {
      colors: copyArrayEntries(tokens.colors),
      typography: copyArrayEntries(tokens.typography),
      spacing: copyArrayEntries(tokens.spacing),
      radii: copyArrayEntries(tokens.radii),
      shadows: copyArrayEntries(tokens.shadows)
    },
    components: {
      buttons: copyArrayEntries(components.buttons),
      cards: copyArrayEntries(components.cards),
      forms: copyArrayEntries(components.forms),
      nav: copyArrayEntries(components.nav),
      hero: copyArrayEntries(components.hero)
    },
    confidence,
    warnings: [...warnings]
  };
}

export function createAnalysis({
  domain,
  inputUrls,
  analyzedUrls,
  pages,
  capturedAt = new Date().toISOString(),
  aggregate = {},
  warnings = []
}) {
  return {
    target: {
      domain,
      inputUrls: [...inputUrls],
      analyzedUrls: [...analyzedUrls],
      capturedAt
    },
    pages: copyArrayEntries(pages),
    aggregate: {
      colors: copyArrayEntries(aggregate.colors),
      typographyScale: copyArrayEntries(aggregate.typographyScale),
      spacingScale: copyArrayEntries(aggregate.spacingScale),
      radiusScale: copyArrayEntries(aggregate.radiusScale),
      shadows: copyArrayEntries(aggregate.shadows),
      componentPatterns: copyArrayEntries(aggregate.componentPatterns),
      confidence: { ...(aggregate.confidence || {}) }
    },
    warnings: [...warnings]
  };
}
