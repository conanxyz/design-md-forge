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
});
