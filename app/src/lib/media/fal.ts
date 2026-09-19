// fal.ai implementation of MediaProvider. One key → many image/video/voice/music models.
//
// MEDIA_QUALITY picks a cost tier (see README "Costs"):
//   draft (default) — FLUX schnell + Seedance Lite 480p, max 1 video shot   ≈ $0.10–0.20 per Reel
//   pro             — FLUX Pro 1.1 + Kling 2.1, max 3 video shots            ≈ $1.00–1.40 per Reel
// Individual model IDs can still be overridden with FAL_*_MODEL env vars.
import { fal } from "@fal-ai/client";
import type { MediaProvider } from "./provider";

const TIERS = {
  draft: {
    image: "fal-ai/flux/schnell",
    video: "fal-ai/bytedance/seedance/v1/lite/image-to-video",
    videoResolution: "480p",
    maxVideoShots: 1,
  },
  pro: {
    image: "fal-ai/flux-pro/v1.1",
    video: "fal-ai/kling-video/v2.1/standard/image-to-video",
    videoResolution: "720p",
    maxVideoShots: 3,
  },
} as const;

const tier = TIERS[process.env.MEDIA_QUALITY === "pro" ? "pro" : "draft"];

const MODELS = {
  product: process.env.FAL_IMAGE_PRODUCT_MODEL ?? tier.image,
  cinematic: process.env.FAL_IMAGE_CINEMATIC_MODEL ?? tier.image,
  lifestyle: process.env.FAL_IMAGE_LIFESTYLE_MODEL ?? tier.image,
  video: process.env.FAL_VIDEO_MODEL ?? tier.video,
  speech: process.env.FAL_TTS_MODEL ?? "fal-ai/kokoro/american-english",
  music: process.env.FAL_MUSIC_MODEL ?? "fal-ai/stable-audio",
};

fal.config({ credentials: process.env.FAL_KEY });

async function run(model: string, input: Record<string, unknown>, timeoutMs = 120_000): Promise<string> {
  // Abort stalled queue polling so one stuck request can't block a Reel.
  const { data } = await fal.subscribe(model, { input, abortSignal: AbortSignal.timeout(timeoutMs) }).catch((err) => {
    // Surface fal's reason (e.g. "User is locked. Reason: TOP_UP.") instead of a bare "Forbidden".
    const detail = (err as { body?: { detail?: unknown } }).body?.detail;
    throw new Error(`fal ${model}: ${detail ? JSON.stringify(detail) : String(err)}`);
  });
  const url = firstUrl(data);
  if (!url) throw new Error(`${model} returned no media URL`);
  return url;
}

/** Output shapes differ per model (images[0].url, video.url, audio.url, audio_file.url…). */
function firstUrl(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if ("url" in value && typeof value.url === "string") return value.url;
  for (const v of Object.values(value)) {
    const found = Array.isArray(v) ? v.map(firstUrl).find(Boolean) : firstUrl(v);
    if (found) return found;
  }
  return undefined;
}

/** Video models take different duration formats; Seedance also takes aspect ratio + resolution. */
function videoInput(imageUrl: string, prompt: string, seconds: number): Record<string, unknown> {
  if (MODELS.video.includes("seedance")) {
    return {
      prompt,
      image_url: imageUrl,
      duration: String(Math.min(12, Math.max(2, Math.round(seconds)))),
      aspect_ratio: "9:16",
      resolution: tier.videoResolution,
    };
  }
  return { prompt, image_url: imageUrl, duration: seconds > 5 ? "10" : "5" };
}

export const falProvider: MediaProvider = {
  maxVideoShots: tier.maxVideoShots,
  image: (prompt, style) => run(MODELS[style], { prompt, image_size: "portrait_16_9", num_images: 1 }),
  animate: (imageUrl, prompt, seconds) => run(MODELS.video, videoInput(imageUrl, prompt, seconds), 360_000),
  speech: (text) => run(MODELS.speech, { prompt: text, voice: process.env.FAL_TTS_VOICE ?? "af_heart" }),
  music: (mood, seconds) =>
    run(MODELS.music, {
      prompt: `${mood} background music for a short ad, no vocals`,
      seconds_total: Math.ceil(seconds),
      steps: 50,
    }, 240_000), // stable-audio is slow (~90s)
};
