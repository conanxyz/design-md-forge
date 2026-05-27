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
    cssVars,
    computedStyles,
    links,
    htmlSummary: {
      headings: htmlSummary.headings || [],
      landmarks: htmlSummary.landmarks || [],
      navLabels: htmlSummary.navLabels || [],
      ctaLabels: htmlSummary.ctaLabels || []
    },
    tokens: {
      colors: tokens.colors || [],
      typography: tokens.typography || [],
      spacing: tokens.spacing || [],
      radii: tokens.radii || [],
      shadows: tokens.shadows || []
    },
    components: {
      buttons: components.buttons || [],
      cards: components.cards || [],
      forms: components.forms || [],
      nav: components.nav || [],
      hero: components.hero || []
    },
    confidence,
    warnings
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
      inputUrls,
      analyzedUrls,
      capturedAt
    },
    pages,
    aggregate: {
      colors: aggregate.colors || [],
      typographyScale: aggregate.typographyScale || [],
      spacingScale: aggregate.spacingScale || [],
      radiusScale: aggregate.radiusScale || [],
      shadows: aggregate.shadows || [],
      componentPatterns: aggregate.componentPatterns || [],
      confidence: aggregate.confidence || {}
    },
    warnings
  };
}
