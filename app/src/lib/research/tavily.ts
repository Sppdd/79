// Optional web research for the brief step (brand context + what's trending in the niche).
// Returns undefined when TAVILY_API_KEY is missing or the call fails — research never blocks a Reel.
import type { BrandKit } from "../ai/schemas";

export async function researchBrand(brand: BrandKit, notes: string): Promise<string | undefined> {
  if (!process.env.TAVILY_API_KEY) return undefined;
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
      body: JSON.stringify({
        query: `${brand.name} ${brand.industry} ${notes.slice(0, 120)} trending social media content ideas`,
        max_results: 5,
        include_answer: true,
      }),
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { answer?: string; results?: { title: string; content: string }[] };
    const snippets = (data.results ?? []).map((r) => `- ${r.title}: ${r.content.slice(0, 200)}`);
    return [data.answer, ...snippets].filter(Boolean).join("\n");
  } catch {
    return undefined;
  }
}
