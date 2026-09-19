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

export const Shot = z.object({
  description: z.string().describe("what the viewer sees, for the storyboard"),
  prompt: z.string().describe("detailed generation prompt: subject, setting, lighting, camera, style"),
  kind: z.enum(["image", "video"]),
  style: z.enum(["product", "cinematic", "lifestyle"]).describe("routes the shot to the best media model"),
  durationSec: z.number().min(1.5).max(6),
  caption: z.string().max(60).describe("on-screen text, punchy, max ~6 words"),
});
export type Shot = z.infer<typeof Shot>;

export const ReelPlan = z.object({
  title: z.string(),
  hook: z.string().describe("the idea that stops the scroll in the first 1.5s"),
  shots: z.array(Shot).min(4).max(8),
  voiceover: z.string().describe("spoken script, matches total duration (~2.5 words/sec)"),
  musicMood: z.string(),
});
export type ReelPlan = z.infer<typeof ReelPlan>;

export const ShotReview = z.object({
  pass: z.boolean(),
  score: z.number().min(0).max(10),
  issues: z.array(z.string()),
  revisedPrompt: z.string().optional().describe("improved prompt if pass is false"),
});
export type ShotReview = z.infer<typeof ShotReview>;

export const AdCopy = z.object({
  caption: z.string().min(10).describe("organic Reel caption"),
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
