function copyArray(value) {
  return value ? [...value] : [];
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
    viewport,
    screenshotPath,
    cssVars: { ...cssVars },
    computedStyles: [...computedStyles],
    links: [...links],
    htmlSummary: {
      headings: copyArray(htmlSummary.headings),
      landmarks: copyArray(htmlSummary.landmarks),
      navLabels: copyArray(htmlSummary.navLabels),
      ctaLabels: copyArray(htmlSummary.ctaLabels)
    },
    tokens: {
      colors: copyArray(tokens.colors),
      typography: copyArray(tokens.typography),
      spacing: copyArray(tokens.spacing),
      radii: copyArray(tokens.radii),
      shadows: copyArray(tokens.shadows)
    },
    components: {
      buttons: copyArray(components.buttons),
      cards: copyArray(components.cards),
      forms: copyArray(components.forms),
      nav: copyArray(components.nav),
      hero: copyArray(components.hero)
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
    pages: [...pages],
    aggregate: {
      colors: copyArray(aggregate.colors),
      typographyScale: copyArray(aggregate.typographyScale),
      spacingScale: copyArray(aggregate.spacingScale),
      radiusScale: copyArray(aggregate.radiusScale),
      shadows: copyArray(aggregate.shadows),
      componentPatterns: copyArray(aggregate.componentPatterns),
      confidence: { ...(aggregate.confidence || {}) }
    },
    warnings: [...warnings]
  };
}
