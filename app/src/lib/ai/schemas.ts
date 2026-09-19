// Shared data shapes. Everything the agents produce is validated against these.
import { z } from "zod";

export const BrandKit = z.object({
  name: z.string(),
  industry: z.string(),
  voice: z.string().describe("How the brand talks, e.g. 'warm, playful, local'"),
  audience: z.string(),
  primaryColor: z.string().describe("hex color"),
  website: z.string().optional(),
});
export type BrandKit = z.infer<typeof BrandKit>;

export const Brief = z.object({
  product: z.string(),
  offer: z.string().describe("the deal or news, in one line"),
  price: z.string().optional(),
  deadline: z.string().optional(),
  audience: z.string(),
  goal: z.enum(["sales", "awareness", "foot_traffic", "signups"]),
  cta: z.string().describe("short call to action, e.g. 'Order now'"),
  keyPoints: z.array(z.string()).max(5),
});
export type Brief = z.infer<typeof Brief>;

// ─── Shot list: the connected document the whole commercial is built from ─────

/** Glued in front of every generation prompt, so one change restyles the whole commercial. */
export const StylePrefix = z.object({
  look: z.string().describe("overall visual style, e.g. 'high-budget commercial, crisp, photoreal'"),
  lighting: z.string(),
  camera: z.string().describe("default lens / camera language"),
  color: z.string().describe("palette and grade"),
  avoid: z.string().describe("things that must never appear, e.g. 'on-screen text, logos, extra fingers'"),
});
export type StylePrefix = z.infer<typeof StylePrefix>;

export const Shot = z.object({
  id: z.string().describe("scene number + letter, e.g. '1A', '1B', '2A'"),
  beat: z.string().describe("what happens in the story, one short sentence (not a timecode)"),
  prompt: z
    .string()
    .describe("self-contained video prompt for this shot (subject, action, setting, framing) — no style words"),
  references: z.array(z.string()).describe("names of locked assets this shot must use as visual references"),
  camera: z.string().describe("camera move, e.g. 'slow push-in', 'orbit left', 'worm's-eye tilt up'"),
  motion: z.array(z.string()).min(1).describe("the action written move by move, in order"),
  durationSec: z.number().min(2).max(5).describe("open video models make clips of 5 s or less"),
  transition: z.enum(["cut", "match-cut", "whip-pan", "dissolve"]).describe("how this shot starts from the previous"),
  continuity: z.string().optional().describe("what must match the previous/next shot (pose, hand, prop position)"),
  caption: z.string().max(60).optional().describe("optional on-screen text, max ~6 words"),
});
export type Shot = z.infer<typeof Shot>;

export const Scene = z.object({
  number: z.number().int().min(1),
  title: z.string(),
  location: z.string(),
  lightingOverride: z.string().optional().describe("only when this scene needs different light than the prefix"),
  shots: z.array(Shot).min(1).max(5),
});
export type Scene = z.infer<typeof Scene>;

export const ShotList = z.object({
  title: z.string(),
  logline: z.string().describe("the idea of the ad in one sentence"),
  stylePrefix: StylePrefix,
  scenes: z.array(Scene).min(1).max(6),
  music: z.object({ mood: z.string(), bpm: z.number().min(60).max(180), notes: z.string() }),
  voiceover: z.string().optional(),
  endCard: z.object({ headline: z.string(), cta: z.string() }),
});
export type ShotList = z.infer<typeof ShotList>;

/** Director-chat result: targeted edits, applied deterministically so nothing else in the list changes. */
export const ShotListEdit = z.object({
  reply: z.string().describe("one or two sentences telling the owner what you changed"),
  stylePrefix: StylePrefix.partial().optional().describe("only the prefix fields to change"),
  sceneLighting: z.array(z.object({ scene: z.number().int(), lightingOverride: z.string() })).optional(),
  shotEdits: z
    .array(
      z.object({
        action: z.enum(["update", "insert_after", "delete"]),
        id: z.string().describe("shot to update/delete, or the shot to insert after"),
        shot: Shot.optional().describe("the complete new shot, required for update and insert_after"),
      }),
    )
    .optional(),
});
export type ShotListEdit = z.infer<typeof ShotListEdit>;

export const AssetKind = z.enum(["product", "character", "location", "prop", "logo"]);
export type AssetKind = z.infer<typeof AssetKind>;

export const ShotReview = z.object({
  pass: z.boolean(),
  score: z.number().min(0).max(10),
  issues: z.array(z.string()),
  revisedPrompt: z.string().optional().describe("improved prompt if pass is false"),
});
export type ShotReview = z.infer<typeof ShotReview>;

export const AdCopy = z.object({
  caption: z.string().min(10).describe("organic caption for the post"),
  hashtags: z.array(z.string()).min(3).describe("3–6 hashtags"),
  variants: z
    .array(
      z.object({
        headline: z.string().min(3).describe("max ~40 characters"),
        primaryText: z.string().min(10),
        cta: z.string().min(2).describe("button text, e.g. 'Shop now'"),
      }),
    )
    .length(3)
    .describe("3 Meta ad copy variants for A/B testing"),
});
export type AdCopy = z.infer<typeof AdCopy>;
