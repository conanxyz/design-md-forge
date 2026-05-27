import { describe, expect, it } from "vitest";
import { PROJECT_NAME, SUPPORTED_NODE_MAJOR } from "../../scripts/core/project.mjs";

describe("project metadata", () => {
  it("names the skill and documents the supported Node major", () => {
    expect(PROJECT_NAME).toBe("design-md-forge");
    expect(SUPPORTED_NODE_MAJOR).toBe(20);
  });
});
