import { describe, expect, it, vi } from "vitest";
import { prepareJinaTargetUrl, readWithJina } from "../../scripts/providers/jina.mjs";

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

  it("strips credentials, query strings, and hashes before sending URLs to Jina", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "# Example\n\n" + "content ".repeat(300)
    }));

    const result = await readWithJina({
      url: "https://user:secret@example.com/docs?token=abc#private",
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledWith("https://r.jina.ai/https://example.com/docs", expect.anything());
    expect(result.url).toBe("https://user:secret@example.com/docs?token=abc#private");
    expect(result.raw.targetUrl).toBe("https://example.com/docs");
  });

  it("blocks localhost and private network URLs without calling fetch", async () => {
    const fetchImpl = vi.fn();

    const localhost = await readWithJina({ url: "http://localhost:3000", fetchImpl });
    const privateIp = await readWithJina({ url: "http://192.168.1.20/dashboard", fetchImpl });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(localhost.errors).toEqual(["Jina fallback is blocked for localhost, private, or internal URLs"]);
    expect(privateIp.errors).toEqual(["Jina fallback is blocked for localhost, private, or internal URLs"]);
  });

  it("prepares only public HTTP(S) URLs for Jina", () => {
    expect(prepareJinaTargetUrl("https://example.com/path?a=1").targetUrl).toBe("https://example.com/path");
    expect(prepareJinaTargetUrl("http://10.0.0.2").error).toBe("Jina fallback is blocked for localhost, private, or internal URLs");
  });

  it("blocks trailing-dot internal hostnames", () => {
    for (const url of [
      "http://localhost.",
      "http://localhost..",
      "http://foo.local.",
      "http://svc.internal.",
      "http://example.test."
    ]) {
      expect(prepareJinaTargetUrl(url).error).toBe("Jina fallback is blocked for localhost, private, or internal URLs");
    }
  });

  it("blocks private IPv6 hostnames", () => {
    for (const url of [
      "http://[::1]/",
      "http://[fe80::1]/",
      "http://[fc00::1]/",
      "http://[fd12:3456::1]/"
    ]) {
      expect(prepareJinaTargetUrl(url).error).toBe("Jina fallback is blocked for localhost, private, or internal URLs");
    }
  });

  it("blocks private IPv4-mapped IPv6 hostnames", () => {
    for (const url of [
      "http://[::ffff:127.0.0.1]/",
      "http://[::ffff:10.0.0.1]/",
      "http://[::ffff:172.16.0.1]/",
      "http://[::ffff:192.168.1.1]/",
      "http://[::ffff:169.254.1.1]/"
    ]) {
      expect(prepareJinaTargetUrl(url).error).toBe("Jina fallback is blocked for localhost, private, or internal URLs");
    }
  });

  it("does not apply IPv6 private-prefix checks to public DNS hostnames", () => {
    expect(prepareJinaTargetUrl("https://fdroid.org").targetUrl).toBe("https://fdroid.org/");
    expect(prepareJinaTargetUrl("https://fcbarcelona.com").targetUrl).toBe("https://fcbarcelona.com/");
    expect(prepareJinaTargetUrl("http://[::ffff:8.8.8.8]/").targetUrl).toBe("http://[::ffff:808:808]/");
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
