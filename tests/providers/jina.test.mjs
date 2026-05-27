import { describe, expect, it, vi } from "vitest";
import { readWithJina } from "../../scripts/providers/jina.mjs";

describe("Jina Reader provider", () => {
  it("returns markdown and confidence for useful content", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "# Example\n\n" + "content ".repeat(300)
    }));

    const result = await readWithJina({ url: "https://example.com/docs", fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith("https://r.jina.ai/https://example.com/docs", expect.anything());
    expect(result.provider).toBe("jina");
    expect(result.markdown).toContain("# Example");
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it("normalizes protocol-less URLs before calling Jina", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "# Example\n\n" + "content ".repeat(300)
    }));

    const result = await readWithJina({ url: "example.com/docs", fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith("https://r.jina.ai/https://example.com/docs", expect.anything());
    expect(result.url).toBe("https://example.com/docs");
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it("trims whitespace before normalizing protocol-less URLs", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "# Example\n\n" + "content ".repeat(300)
    }));

    const result = await readWithJina({ url: "  example.com/docs  ", fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith("https://r.jina.ai/https://example.com/docs", expect.anything());
    expect(result.url).toBe("https://example.com/docs");
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it("returns errors and zero confidence when fetch rejects", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network failed");
    });

    const result = await readWithJina({ url: "https://example.com/docs", fetchImpl });

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(result.errors).toEqual(["network failed"]);
    expect(result.confidence).toBe(0);
    expect(result.markdown).toBe("");
  });

  it("returns errors and zero confidence when response text rejects", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => {
        throw new Error("body failed");
      }
    }));

    const result = await readWithJina({ url: "https://example.com/docs", fetchImpl });

    expect(result.errors).toEqual(["body failed"]);
    expect(result.confidence).toBe(0);
    expect(result.raw).toEqual({ status: 200 });
  });

  it("warns and caps confidence for non-OK long responses", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 502,
      text: async () => "# Example\n\n" + "content ".repeat(300)
    }));

    const result = await readWithJina({ url: "https://example.com/docs", fetchImpl });

    expect(result.warnings).toContain("Jina returned status 502");
    expect(result.confidence).toBeLessThanOrEqual(0.35);
  });

  it("warns for short markdown content", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "# Short"
    }));

    const result = await readWithJina({ url: "https://example.com/docs", fetchImpl });

    expect(result.warnings).toContain("Jina markdown content is short");
    expect(result.confidence).toBe(0.55);
  });

  it("returns an error for file URLs without calling fetch", async () => {
    const fetchImpl = vi.fn();

    const result = await readWithJina({ url: "file:///tmp/example.md", fetchImpl });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.errors).toEqual(["Jina does not support file:// URLs"]);
    expect(result.confidence).toBe(0);
  });

  it("returns an error for unsupported schemes without calling fetch", async () => {
    const fetchImpl = vi.fn();

    const result = await readWithJina({ url: "ftp://example.com/docs", fetchImpl });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.errors).toEqual(["Unsupported URL scheme"]);
    expect(result.confidence).toBe(0);
  });
});
