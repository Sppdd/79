// Agent 4 — caption, hashtags and 3 Meta ad copy variants for A/B testing → Nemotron Super.
import { askJson, hasNemotron } from "../nemotron";
import { AdCopy, type BrandKit, type Brief, type ShotList } from "../schemas";
import { demoAdCopy } from "./demo";

const SYSTEM = `You write high-converting Meta (Facebook/Instagram) ad copy for small businesses.

The copy must sell THE SPECIFIC OFFER in the brief (product, price, deadline, key points) — never generic brand fluff.
Write 3 variants with clearly different angles:
1. Urgency — the deadline / limited availability.
2. Benefit — what the customer gets or feels.
3. Social / local — community, friends, "everyone's going".

For each variant:
- headline: max ~40 characters, different wording from primaryText.
- primaryText: 1–2 sentences, under 125 characters, mentions the offer and price/deadline when known.
- cta: a Meta button label that fits the goal (e.g. "Order Now", "Shop Now", "Get Directions", "Learn More").
caption: the organic Reel caption (1–3 short lines, can use 1–2 emoji). hashtags: 3–6 relevant tags with #.
Match the brand voice. Do not invent facts that are not in the brief.`;

export async function writeAdCopy(brief: Brief, list: ShotList, brand: BrandKit): Promise<AdCopy> {
  if (!hasNemotron()) return demoAdCopy(brief);
  return askJson({
    tier: "super",
    schema: AdCopy,
    system: SYSTEM,
    user: `Brand: ${brand.name}, ${brand.industry}. Voice: ${brand.voice}. Audience: ${brand.audience}.
Brief: ${JSON.stringify(brief)}
Ad idea: ${list.logline}
End card: ${list.endCard.headline} — ${list.endCard.cta}`,
  });
}
