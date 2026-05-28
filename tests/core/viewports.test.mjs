import { describe, expect, it } from "vitest";
import {
  VIEWPORT_PRESETS,
  resolveViewportSelection,
  viewportToPlaywright
} from "../../scripts/core/viewports.mjs";

describe("viewport presets", () => {
  it("exposes desktop, tablet, and mobile presets", () => {
    expect(VIEWPORT_PRESETS.desktop).toEqual({ name: "desktop", width: 1440, height: 1200 });
    expect(VIEWPORT_PRESETS.tablet).toEqual({ name: "tablet", width: 834, height: 1112 });
    expect(VIEWPORT_PRESETS.mobile).toEqual({ name: "mobile", width: 390, height: 844 });
  });

  it("defaults to desktop", () => {
    expect(resolveViewportSelection()).toEqual([
      { name: "desktop", width: 1440, height: 1200 }
    ]);
  });

  it("resolves one named viewport", () => {
    expect(resolveViewportSelection("mobile")).toEqual([
      { name: "mobile", width: 390, height: 844 }
    ]);
  });

  it("resolves all viewports in stable order", () => {
    expect(resolveViewportSelection("all").map((viewport) => viewport.name)).toEqual([
      "desktop",
      "tablet",
      "mobile"
    ]);
  });

  it("rejects unsupported viewport selections", () => {
    expect(() => resolveViewportSelection("watch")).toThrow(
      "--viewport must be one of: desktop, tablet, mobile, all"
    );
  });

  it("converts named presets to Playwright viewport objects", () => {
    expect(viewportToPlaywright({ name: "mobile", width: 390, height: 844 })).toEqual({
      width: 390,
      height: 844
    });
  });
});
