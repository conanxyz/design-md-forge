export async function readWithJina({ url, fetchImpl = fetch }) {
  const response = await fetchImpl(`https://r.jina.ai/${url}`, {
    headers: {
      "x-no-cache": "true",
      "x-respond-with": "markdown",
      "x-engine": "auto"
    }
  });
  const markdown = await response.text();
  const warnings = [];
  if (!response.ok) warnings.push(`Jina returned status ${response.status}`);
  if (markdown.length < 500) warnings.push("Jina markdown content is short");
  return {
    provider: "jina",
    url,
    markdown,
    text: markdown,
    warnings,
    errors: [],
    confidence: markdown.length > 1500 ? 0.82 : 0.55,
    raw: { status: response.status }
  };
}
