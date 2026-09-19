// Agent 1 — turns messy notes into a structured marketing brief. Fast everyday call → Nemotron Super.
import { askJson, hasNemotron } from "../nemotron";
import { Brief, type BrandKit } from "../schemas";
import { demoBrief } from "./demo";

const SYSTEM = `You are a senior social media marketer for small businesses.
Turn the owner's quick notes into a precise marketing brief.
Never invent prices, dates or claims that are not in the notes or research. Leave optional fields out if unknown.`;

export async function writeBrief(notes: string, brand: BrandKit, research?: string): Promise<Brief> {
  if (!hasNemotron()) return demoBrief(notes, brand);
  return askJson({
    tier: "super",
    schema: Brief,
    system: SYSTEM,
    user: [
      `Brand: ${JSON.stringify(brand)}`,
      research ? `Web research (may be partial):\n${research}` : "",
      `Owner's notes:\n${notes}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    temperature: 0.3,
  });
}
