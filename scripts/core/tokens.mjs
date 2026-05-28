function parseRgbColor(value) {
  const match = value.trim().match(/^rgba?\(\s*(.*?)\s*\)$/i);
  if (!match) return null;

  const body = match[1];
  if (body.includes(",")) {
    const parts = body.split(",").map((part) => part.trim());
    if (parts.length < 3) return null;
    return {
      r: parts[0],
      g: parts[1],
      b: parts[2],
      alpha: parts[3]
    };
  }

  const [channelsBody, alphaBody] = body.split("/").map((part) => part.trim());
  const channels = channelsBody.split(/\s+/);
  if (channels.length < 3) return null;
  return {
    r: channels[0],
    g: channels[1],
    b: channels[2],
    alpha: alphaBody
  };
}

function isTransparent(value) {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "transparent") return true;

  const rgb = parseRgbColor(trimmed);
  return rgb?.alpha !== undefined && Number(rgb.alpha) === 0;
}

export function normalizeColor(value) {
  if (!value || isTransparent(value)) return null;
  const rgb = parseRgbColor(value);
  if (!rgb) return value.trim().toLowerCase();
  const { r, g, b } = rgb;
  return `#${[r, g, b].map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`;
}

function roleForColor(style, property) {
  if (property === "color") return "text";
  if (style.role === "button" || style.tag === "button" || style.selector?.includes("button")) return "interactive";
  if (property === "backgroundColor") return "surface";
  return "unknown";
}

function pushColor(colors, style, property) {
  const value = normalizeColor(style[property]);
  if (!value) return;
  const roleCandidate = roleForColor(style, property);
  colors.push({
    value,
    property,
    selector: style.selector,
    tag: style.tag,
    sampleText: style.text,
    roleCandidate,
    confidence: property === "backgroundColor" && roleCandidate === "interactive" ? 0.8 : 0.6
  });
}

export function extractTokensFromComputedStyles(styles) {
  const colors = [];
  const typography = [];
  const spacing = [];
  const radii = [];
  const shadows = [];

  for (const style of styles) {
    pushColor(colors, style, "color");
    pushColor(colors, style, "backgroundColor");

    if (style.fontFamily || style.fontSize) {
      typography.push({
        selector: style.selector,
        tag: style.tag,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        sampleText: style.text,
        confidence: style.tag?.startsWith("h") || style.tag === "p" || style.tag === "button" ? 0.75 : 0.55
      });
    }

    if (style.padding && style.padding !== "0px") {
      spacing.push({ selector: style.selector, property: "padding", value: style.padding, confidence: 0.65 });
    }
    if (style.margin && style.margin !== "0px") {
      spacing.push({ selector: style.selector, property: "margin", value: style.margin, confidence: 0.5 });
    }
    if (style.borderRadius && style.borderRadius !== "0px") {
      radii.push({ selector: style.selector, value: style.borderRadius, confidence: 0.7 });
    }
    if (style.boxShadow && style.boxShadow !== "none") {
      shadows.push({ selector: style.selector, value: style.boxShadow, confidence: 0.7 });
    }
  }

  return { colors, typography, spacing, radii, shadows };
}
