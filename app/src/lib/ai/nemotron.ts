// The single boundary to Nebius Token Factory. Every Nemotron call in the app goes through here.
// Token Factory is OpenAI-compatible, so we use the official `openai` client with a different baseURL.

import OpenAI from "openai";
import { z } from "zod";

// Model IDs come from env so they can be swapped without code changes.
// Run `npm run models` to list what your Token Factory key can access.
export const models = {
  /** Smallest/fastest — triage and guardrail checks sit on the critical path, so speed matters more than depth. */
  fast: process.env.NEMOTRON_FAST_MODEL ?? "nvidia/Nemotron-3_5-Lightning",
  nano: process.env.NEMOTRON_NANO_MODEL ?? "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
  super: process.env.NEMOTRON_SUPER_MODEL ?? "nvidia/nemotron-3-super-120b-a12b",
  ultra: process.env.NEMOTRON_ULTRA_MODEL ?? "nvidia/Nemotron-3-Ultra-550b-a55b",
  // Token Factory has no NVIDIA vision model, so a VLM is used where images must be read.
  vision: process.env.VISION_MODEL ?? "google/gemma-3-27b-it",
} as const;

/** Embeddings for catalog retrieval (Token Factory hosts this one; NVIDIA has no embedding model here yet). */
export const EMBED_MODEL = process.env.EMBED_MODEL ?? "Qwen/Qwen3-Embedding-8B";

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
const timeoutMs = (tier: ModelTier) => (tier === "ultra" ? 240_000 : tier === "fast" ? 30_000 : 90_000);

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

// ─── Tool calling ─────────────────────────────────────────────────────────────

/** A capability the agent can use. `run` does the real work; the model only sees name/description/parameters. */
export type Tool = {
  name: string;
  description: string;
  parameters: z.ZodType;
  run: (args: never) => Promise<unknown>;
};

/** Keeps each tool's arguments typed where it's written, while a list of tools stays a plain Tool[]. */
export function defineTool<T extends z.ZodType>(spec: {
  name: string;
  description: string;
  parameters: T;
  run: (args: z.infer<T>) => Promise<unknown>;
}): Tool {
  return spec as unknown as Tool;
}

export type ToolRun = { name: string; args: unknown; result?: unknown };

/**
 * One assistant turn with tools: the model may call tools, we run them, feed the results back, and repeat
 * until it answers in words. Returns the final text plus what it actually did.
 */
export async function converse(opts: {
  tier: ModelTier;
  system: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  tools?: Tool[];
  temperature?: number;
  maxRounds?: number;
}): Promise<{ text: string; toolRuns: ToolRun[]; model: string }> {
  const model = models[opts.tier];
  const tools = opts.tools ?? [];
  const toolRuns: ToolRun[] = [];
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: opts.system },
    ...opts.messages,
  ];

  for (let round = 0; round < (opts.maxRounds ?? 4); round++) {
    const res = await tokenFactory().chat.completions.create(
      {
        model,
        messages,
        temperature: opts.temperature ?? 0.4,
        ...(tools.length
          ? {
              tools: tools.map((t) => ({
                type: "function" as const,
                function: {
                  name: t.name,
                  description: t.description,
                  parameters: z.toJSONSchema(t.parameters) as Record<string, unknown>,
                },
              })),
              tool_choice: "auto" as const,
            }
          : {}),
      },
      { timeout: timeoutMs(opts.tier) },
    );

    const message = res.choices[0]?.message;
    if (!message) break;
    const calls = message.tool_calls ?? [];
    if (!calls.length) return { text: clean(message.content ?? ""), toolRuns, model };

    messages.push(message);
    for (const call of calls) {
      if (call.type !== "function") continue;
      const tool = tools.find((t) => t.name === call.function.name);
      const parsed = tool?.parameters.safeParse(safeJson(call.function.arguments));
      let result: unknown;
      if (!tool) result = { error: `unknown tool ${call.function.name}` };
      else if (!parsed?.success) result = { error: `bad arguments: ${parsed?.error.message}` };
      else result = await tool.run(parsed.data as never).catch((err: unknown) => ({ error: String(err) }));
      toolRuns.push({ name: call.function.name, args: parsed?.success ? parsed.data : call.function.arguments, result });
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result).slice(0, 4000) });
    }
  }
  return { text: "", toolRuns, model };
}

/** Reasoning models wrap answers in <think> blocks; customers must never see those. */
function clean(text: string) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

// ─── Embeddings ───────────────────────────────────────────────────────────────

export async function embed(input: string[]): Promise<number[][]> {
  if (!input.length) return [];
  const res = await tokenFactory().embeddings.create({ model: EMBED_MODEL, input }, { timeout: 60_000 });
  return res.data.map((d) => d.embedding as number[]);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
