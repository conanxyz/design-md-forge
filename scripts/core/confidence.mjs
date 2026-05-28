export function scorePageEvidence({
  textLength = 0,
  cssVarCount = 0,
  computedStyleCount = 0,
  screenshotCount = 0
}) {
  let score = 0;
  if (textLength > 1000) score += 0.2;
  if (cssVarCount >= 5) score += 0.2;
  if (computedStyleCount >= 10) score += 0.35;
  if (screenshotCount > 0) score += 0.25;
  return Math.min(1, Number(score.toFixed(2)));
}

export function addWarning(warnings, message) {
  if (!warnings.includes(message)) {
    warnings.push(message);
  }
  return warnings;
}
