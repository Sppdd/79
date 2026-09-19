// Agent 2 — the director. Turns the brief + locked assets into a connected shot list → Nemotron 3 Ultra.
// This is the "shot-list skill" pro AI filmmakers use, as an agent: one style prefix, named prompts, continuity.
import { normalize } from "@/lib/shotlist";
import { askJson, hasNemotron } from "../nemotron";
import { ShotList, type BrandKit, type Brief } from "../schemas";
import { demoShotList } from "./demo";

export type AssetRef = { name: string; kind: string; description?: string | null };

const SYSTEM = `You are the director of high-budget TV and social commercials, planning a spot that will be
generated shot by shot with an image-to-video model (clips of at most 5 seconds each).

Write ONE connected shot list, not loose prompts:
- stylePrefix: the shared look (style, lighting, camera language, color/grade, things to avoid). It is glued to every
  shot, so never repeat style words inside shot prompts. Default to bright, clean, premium commercial light unless
  the brief needs another mood; always avoid on-screen text, fake logos, warped hands and extra objects.
- scenes: one story beat per scene. Only set lightingOverride when a scene genuinely needs different light.
- shots: named 1A, 1B, 2A… Each shot prompt is self-contained: subject, action, setting, framing. Use the locked
  asset NAMES in "references" for every shot that shows them, and describe them exactly as their description says —
  the real product must never change shape, color or branding.
- motion: write the action move by move ("lifts the cup with the right hand", "turns a quarter to camera",
  "two head nods"), never vague verbs like "dances" or "enjoys".
- camera: a specific move per shot (push-in, orbit, top-down, worm's-eye, tracking, snorricam). Vary framing:
  wides, mediums, tight details, one hero product close-up.
- continuity: when a shot must match the previous one (same hand, pose, prop position), say so; use "match-cut"
  transitions between scenes where an action carries over.
- Open with a hook in the first 2 seconds. End on a clean product packshot that sets up the endCard.
- Durations: 2–5 s per shot; the total should land close to the target length.
- music: mood, bpm and how the cuts follow the beat. voiceover only if it helps; keep it short.`;

export async function writeShotList(input: {
  brief: Brief;
  brand: BrandKit;
  assets: AssetRef[];
  targetSec: number;
}): Promise<ShotList> {
  if (!hasNemotron()) return demoShotList(input.brief, input.assets, input.targetSec);
  const list = await askJson({
    tier: "ultra",
    schema: ShotList,
    system: SYSTEM,
    user: [
      `Brand: ${JSON.stringify(input.brand)}`,
      `Brief: ${JSON.stringify(input.brief)}`,
      `Target length: ${input.targetSec} seconds, vertical 9:16.`,
      input.assets.length
        ? `Locked assets (use these names in references):\n${input.assets
            .map((a) => `- ${a.name} (${a.kind}): ${a.description ?? "no description"}`)
            .join("\n")}`
        : "No locked assets yet — describe the product consistently in every shot.",
    ].join("\n\n"),
    temperature: 0.8,
  });
  return normalize(list);
}
