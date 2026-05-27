import path from "node:path";

export function validateRunId(runId) {
  if (typeof runId !== "string" || !/^[a-z0-9._-]+$/i.test(runId)) {
    throw new Error("--run-id must be a single path-safe segment using letters, numbers, dots, underscores, or hyphens");
  }
  return runId;
}

export function buildRunPaths({ rootDir, domain, runId }) {
  validateRunId(runId);
  const runDir = path.join(rootDir, "design-output", domain, runId);
  return {
    runDir,
    analysisPath: path.join(runDir, "analysis.json"),
    designPath: path.join(runDir, "DESIGN.md"),
    screenshotDir: path.join(runDir, "screenshots")
  };
}

export function createRunId(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-") + "-" + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
}
