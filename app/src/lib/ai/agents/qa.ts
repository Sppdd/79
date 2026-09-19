// Agent 3 — visual QA. A vision model describes the frame ("eyes"); Nemotron Super decides pass/fail and
// rewrites the prompt ("judgment"). Keeps the decision with Nemotron even though the VLM isn't NVIDIA's.
import { askJson, askText, hasNemotron } from "../nemotron";
import { ShotReview, type BrandKit, type Shot } from "../schemas";

const DESCRIBE = `Describe this image objectively for an ad reviewer: main subject, setting, lighting, colors, and any
defects (distorted hands/faces/objects, garbled or fake text, artifacts, blur). Be concise and specific.`;

const JUDGE = `You are the quality reviewer for social media ad creatives. Decide if a generated frame can ship.

Score 0–10 and set pass = score >= 6.
FAIL only for real problems a customer would notice:
- visible defects: distorted hands/faces/products, melted objects, garbled or fake text/logos, heavy blur;
- wrong subject: the main product/subject of the shot is missing or replaced by something else;
- clearly unappealing or off-tone for an ad.
Do NOT fail for: missing brand color accents, small background differences, or props that differ slightly from the
prompt — those are nice-to-haves (mention them as issues, but they don't block).
If it fails, write a revisedPrompt that fixes the blocking problems while keeping the shot's intent.`;

export async function reviewShot(imageUrl: string, shot: Shot, brand: BrandKit): Promise<ShotReview> {
  if (!hasNemotron()) return { pass: true, score: 8, issues: [] };
  const seen = await askText({
    tier: "vision",
    system: DESCRIBE,
    user: [
      { type: "text", text: "Describe this generated ad frame." },
      { type: "image_url", image_url: { url: imageUrl } },
    ],
  });
  return askJson({
    tier: "super",
    schema: ShotReview,
    system: JUDGE,
    user: `Brand: ${brand.name} (${brand.voice}, color ${brand.primaryColor})
Intended shot: ${shot.description}
Generation prompt: ${shot.prompt}
What the frame actually shows: ${seen}`,
    temperature: 0.1,
  });
}
