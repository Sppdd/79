// Demo outputs used when NEBIUS_API_KEY is not set, so the whole app runs offline for UI work and tests.
import type { AdCopy, BrandKit, Brief, ReelPlan } from "../schemas";

export function demoBrief(notes: string, brand: BrandKit): Brief {
  const firstLine = notes.split("\n")[0]?.trim() || "Our new special";
  const price = notes.match(/\$\s?\d+(?:\.\d{2})?/)?.[0];
  return {
    product: firstLine,
    offer: `${firstLine}${price ? ` for ${price}` : ""}`,
    price,
    audience: brand.audience,
    goal: "sales",
    cta: "Order now",
    keyPoints: notes.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).slice(0, 4),
  };
}

export function demoPlan(brief: Brief, brand: BrandKit): ReelPlan {
  const look = `warm natural light, shallow depth of field, ${brand.primaryColor} accents, vertical 9:16`;
  return {
    title: `${brief.product} — launch Reel`,
    hook: `Close-up reveal of ${brief.product}`,
    shots: [
      { description: `Macro reveal of ${brief.product}`, prompt: `macro shot of ${brief.product}, ${look}`, kind: "video", style: "cinematic", durationSec: 3, caption: "Wait for it…" },
      { description: `Customer enjoying ${brief.product}`, prompt: `happy customer enjoying ${brief.product} in ${brand.name}, ${look}`, kind: "image", style: "lifestyle", durationSec: 3, caption: brief.keyPoints[0] ?? "Made fresh" },
      { description: `Hero product shot`, prompt: `studio hero shot of ${brief.product} on a clean surface, ${look}`, kind: "image", style: "product", durationSec: 3, caption: brief.price ?? "You'll love it" },
      { description: `Storefront / brand moment`, prompt: `inviting storefront of a ${brand.industry} business at golden hour, ${look}`, kind: "image", style: "lifestyle", durationSec: 3, caption: brief.deadline ?? "Limited time" },
      { description: `CTA end card`, prompt: `minimal background in ${brand.primaryColor} with soft texture, ${look}`, kind: "image", style: "product", durationSec: 2.5, caption: brief.cta },
    ],
    voiceover: `${brief.offer}. ${brief.keyPoints.slice(0, 2).join(". ")}. ${brief.cta} at ${brand.name}.`,
    musicMood: "upbeat acoustic",
  };
}

export function demoAdCopy(brief: Brief): AdCopy {
  return {
    caption: `${brief.offer} ✨ ${brief.cta}!`,
    hashtags: ["#smallbusiness", "#shoplocal", "#new"],
    variants: [
      { headline: brief.offer, primaryText: `Don't miss it — ${brief.offer}.`, cta: brief.cta },
      { headline: `Why everyone's talking about ${brief.product}`, primaryText: brief.keyPoints.join(" · "), cta: brief.cta },
      { headline: `Limited time only`, primaryText: `${brief.product} won't be here forever.`, cta: brief.cta },
    ],
  };
}
