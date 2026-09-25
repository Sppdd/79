// Optional web lookups for the owner's console (what competitors charge, supplier prices).
// Returns undefined when TAVILY_API_KEY is missing — research never blocks anything.
export async function research(query: string): Promise<string | undefined> {
  if (!process.env.TAVILY_API_KEY) return undefined;
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
      body: JSON.stringify({ query, max_results: 5, include_answer: true }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { answer?: string; results?: { title: string; content: string }[] };
    return [data.answer, ...(data.results ?? []).map((r) => `- ${r.title}: ${r.content.slice(0, 200)}`)]
      .filter(Boolean)
      .join("\n");
  } catch {
    return undefined;
  }
}
