// Describes an uploaded reference photo so Nemotron can write prompts that keep the real product intact.
// Token Factory has no NVIDIA vision model, so the VLM tier (Gemma 3) looks and Nemotron does the writing.
import { askText, hasNemotron } from "../nemotron";

const SYSTEM = `You catalog reference photos for a commercial shoot. Describe exactly what is visible so a video
model can reproduce it faithfully: object type, shape, materials, colors (with approximate hex), finish, proportions,
labels/branding placement (do not transcribe long text), distinctive details. For people: apparent age range, hair,
clothing, build — no identity guesses. For places: layout, materials, light. 3–5 sentences, no opinions, no
preamble — start directly with the description.`;

export async function describeAsset(imageUrl: string, kind: string): Promise<string | undefined> {
  if (!hasNemotron()) return undefined;
  const text = await askText({
    tier: "vision",
    system: SYSTEM,
    user: [
      { type: "text", text: `This is a ${kind} reference photo.` },
      { type: "image_url", image_url: { url: imageUrl } },
    ],
  });
  return text.trim() || undefined;
}
