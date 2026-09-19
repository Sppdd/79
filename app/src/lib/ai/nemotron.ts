// The single boundary to Nebius Token Factory. Every Nemotron call in the app goes through here.
// Token Factory is OpenAI-compatible, so we use the official `openai` client with a different baseURL.

import OpenAI from "openai";
import { z } from "zod";

// Model IDs come from env so they can be swapped without code changes.
// Run `npm run models` to list what your Token Factory key can access.
export const models = {
  nano: process.env.NEMOTRON_NANO_MODEL ?? "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
  super: process.env.NEMOTRON_SUPER_MODEL ?? "nvidia/nemotron-3-super-120b-a12b",
  ultra: process.env.NEMOTRON_ULTRA_MODEL ?? "nvidia/Nemotron-3-Ultra-550b-a55b",
  // Token Factory has no NVIDIA vision model yet, so a VLM acts as the "eyes" and Nemotron makes the call.
  vision: process.env.VISION_MODEL ?? "google/gemma-3-27b-it",
} as const;

export type ModelTier = keyof typeof models;

/** Without a key the agents fall back to their built-in demo outputs. */
export const hasNemotron = () => Boolean(process.env.NEBIUS_API_KEY);

let client: OpenAI | undefined;
function tokenFactory() {
  client ??= new OpenAI({
    apiKey: process.env.NEBIUS_API_KEY,
    baseURL: process.env.NEBIUS_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1/",
    maxRetries: 1,
  });
  return client;
}

// A stalled request must not block a Reel for the SDK's 10-minute default. Ultra reasons longer than the rest.
const timeoutMs = (tier: ModelTier) => (tier === "ultra" ? 240_000 : 90_000);

type UserContent = string | OpenAI.Chat.Completions.ChatCompletionContentPart[];

/** Plain-text answer from a model (used for the vision model's frame description). */
export async function askText(opts: { tier: ModelTier; system: string; user: UserContent; maxTokens?: number }) {
  const res = await tokenFactory().chat.completions.create({
    model: models[opts.tier],
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    temperature: 0.2,
    max_tokens: opts.maxTokens ?? 400,
  }, { timeout: timeoutMs(opts.tier) });
  return res.choices[0]?.message?.content ?? "";
}

/**
 * Ask a Nemotron model for JSON that matches `schema`.
 * Uses JSON-schema guided decoding, validates with Zod, and retries once with the validation error.
 */
export async function askJson<T extends z.ZodType>(opts: {
  tier: ModelTier;
  schema: T;
  system: string;
  user: UserContent;
  temperature?: number;
}): Promise<z.infer<T>> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await tokenFactory().chat.completions.create({
      model: models[opts.tier],
      messages,
      temperature: opts.temperature ?? 0.6,
      response_format: {
        type: "json_schema",
        json_schema: { name: "output", schema: z.toJSONSchema(opts.schema) as Record<string, unknown> },
      },
    }, { timeout: timeoutMs(opts.tier) });
    const text = res.choices[0]?.message?.content ?? "";
    const parsed = opts.schema.safeParse(safeJson(text));
    if (parsed.success) return parsed.data;

    messages.push(
      { role: "assistant", content: text },
      {
        role: "user",
        content: `Your JSON failed validation (${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}). Answer the original request again, fixing only those fields.`,
      },
    );
  }
  throw new Error(`Nemotron (${opts.tier}) did not return valid JSON`);
}

function safeJson(text: string): unknown {
  // Reasoning models may wrap output in <think> blocks or code fences.
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/```(?:json)?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return undefined;
  }
}
