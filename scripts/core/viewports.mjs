export const VIEWPORT_PRESETS = {
  desktop: { name: "desktop", width: 1440, height: 1200 },
  tablet: { name: "tablet", width: 834, height: 1112 },
  mobile: { name: "mobile", width: 390, height: 844 }
};

export function resolveViewportSelection(selection = "desktop") {
  const normalized = String(selection || "desktop").trim().toLowerCase();
  if (normalized === "all") {
    return [
      VIEWPORT_PRESETS.desktop,
      VIEWPORT_PRESETS.tablet,
      VIEWPORT_PRESETS.mobile
    ];
  }

  const preset = VIEWPORT_PRESETS[normalized];
  if (!preset) {
    throw new Error("--viewport must be one of: desktop, tablet, mobile, all");
  }

  return [preset];
}

export function viewportToPlaywright(viewport) {
  return {
    width: viewport.width,
    height: viewport.height
  };
}
