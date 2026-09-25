// One customer turn: understand → route to the right Nemotron size → answer with tools → remember.
import { z } from "zod";
import { addMessage, customerOrders, getBusiness, getCustomer, history, newId, updateCustomer } from "@/db";
import type { Message } from "@/db/schema";
import { askJson, converse, hasNemotron, type ModelTier } from "@/lib/ai/nemotron";
import { buildSources, checkGrounding, needsGrounding, SAFE_FALLBACK } from "./guardrails";
import { rememberFromTurn } from "./memory";
import { systemPrompt } from "./prompt";
import { agentTools } from "./tools";

const Triage = z.object({
  intent: z.enum(["greeting", "question", "order", "booking", "complaint", "price_negotiation", "other"]),
  /** true when the turn needs real thinking: complaints, haggling, confusing or multi-part requests. */
  hard: z.boolean(),
  language: z.enum(["arabic", "english", "other"]),
});

/** Small model triages every message; only hard turns get the expensive model. */
async function triage(text: string) {
  return askJson({
    tier: "fast",
    schema: Triage,
    system:
      "Classify one incoming WhatsApp message to a small business. `hard` = complaint, haggling, refund, angry tone, or a genuinely confusing request. A simple question with two parts is NOT hard.",
    user: text,
    temperature: 0,
  }).catch(() => ({ intent: "other" as const, hard: false, language: "arabic" as const }));
}

export type TurnResult = { reply: string; tier: ModelTier; toolRuns: { name: string; args: unknown; result?: unknown }[]; latencyMs: number };

/**
 * Answers one customer message. The caller holds the per-conversation lock and sends the reply.
 * Returns null when the agent must stay silent (owner took over, or business paused).
 */
export async function handleTurn(input: {
  businessId: string;
  customerId: string;
  text: string;
  audioUrl?: string;
  transcript?: string;
}): Promise<TurnResult | null> {
  const started = Date.now();
  const [business, customer] = await Promise.all([getBusiness(input.businessId), getCustomer(input.customerId)]);
  if (!business || !customer) throw new Error("unknown business or customer");

  await addMessage({
    id: newId(),
    businessId: business.id,
    customerId: customer.id,
    role: "customer",
    text: input.text,
    audioUrl: input.audioUrl ?? null,
    transcript: input.transcript ?? null,
    toolCalls: null,
    model: null,
    latencyMs: null,
  });

  if (business.paused || customer.handedOver) return null;
  if (!hasNemotron()) {
    return { reply: "(demo mode — set NEBIUS_API_KEY)", tier: "nano", toolRuns: [], latencyMs: Date.now() - started };
  }

  const { hard, intent, language } = await triage(input.text);
  // Ultra for the turns that decide whether a sale survives; Super for everyday chat.
  const tier: ModelTier = hard || intent === "complaint" || intent === "price_negotiation" ? "ultra" : "super";

  const [past, openOrders] = await Promise.all([history(customer.id, 16), customerOrders(customer.id)]);
  const system = systemPrompt(
    business,
    customer,
    openOrders.filter((o) => o.status !== "done" && o.status !== "cancelled"),
    language,
  );
  const tools = agentTools(business, customer);
  const messages = past.map(toChatMessage);

  let { text, toolRuns } = await converse({ tier, system, messages, tools, temperature: 0.5 });

  // Guardrail: anything the reply claims must come from the catalog or the shop profile. One correction, then a
  // safe answer — a wrong price costs the owner money and trust.
  if (text.trim() && needsGrounding(text)) {
    const sources = buildSources(business, toolRuns);
    const check = await checkGrounding(text, sources);
    if (!check.grounded) {
      const retry = await converse({
        tier,
        system: `${system}

You just wrote a reply containing claims you cannot support: ${check.problems.join("; ")}.
Rewrite it: keep only what the sources support, and for anything else say you'll check with the owner
(and call escalateToOwner). Never repeat the unsupported claims.`,
        messages,
        tools,
        temperature: 0.3,
      });
      const recheck = retry.text.trim() ? await checkGrounding(retry.text, buildSources(business, [...toolRuns, ...retry.toolRuns])) : { grounded: false, problems: [] };
      text = recheck.grounded ? retry.text : SAFE_FALLBACK;
      toolRuns = [...toolRuns, ...retry.toolRuns];
    }
  }

  const reply = text.trim() || SAFE_FALLBACK;
  const latencyMs = Date.now() - started;

  await addMessage({
    id: newId(),
    businessId: business.id,
    customerId: customer.id,
    role: "agent",
    text: reply,
    audioUrl: null,
    transcript: null,
    toolCalls: toolRuns.length ? toolRuns : null,
    model: tier,
    latencyMs,
  });

  // Remembering is cheap and shouldn't delay the reply.
  void rememberFromTurn(customer, [...past, { ...blank(), text: input.text, role: "customer" }, { ...blank(), text: reply, role: "agent" }])
    .then((memory) => memory && updateCustomer(customer.id, { memory }))
    .catch(() => {});

  return { reply, tier, toolRuns, latencyMs };
}

const toChatMessage = (m: Message) =>
  ({ role: m.role === "customer" ? ("user" as const) : ("assistant" as const), content: m.transcript ?? m.text });

const blank = (): Message => ({
  id: "",
  businessId: "",
  customerId: "",
  role: "customer",
  text: "",
  audioUrl: null,
  transcript: null,
  toolCalls: null,
  model: null,
  latencyMs: null,
  createdAt: new Date(),
});
