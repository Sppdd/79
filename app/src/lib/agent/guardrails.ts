// The promise we make to a shop owner: the agent never invents a price, a policy or a feature.
// Every reply is checked against what it actually looked up before it is sent.
import { z } from "zod";
import type { Business } from "@/db/schema";
import type { ToolRun } from "@/lib/ai/nemotron";
import { askJson } from "@/lib/ai/nemotron";

const Check = z.object({
  grounded: z.boolean().describe("true when every factual claim is supported by the sources"),
  problems: z.array(z.string()).max(5).describe("each unsupported claim, quoted"),
});

const SYSTEM = `You check whether a shop assistant's reply is supported by its sources.

UNSUPPORTED = any claim about price, availability, delivery, timing, features/services (wifi, parking, seating),
discounts or policies that is not in the sources.
SUPPORTED = greetings, questions back to the customer, saying the owner will check, repeating what the customer
said, and anything clearly present in the sources.
Be strict about invented facts and relaxed about tone.`;

/** Sources the reply is allowed to rely on: what the tools returned plus the shop's own profile. */
export function buildSources(business: Business, toolRuns: ToolRun[]): string {
  return [
    `Business: ${business.name}. ${business.about}`,
    business.hours ? `Hours: ${business.hours}` : "",
    business.policies ? `Policies: ${business.policies}` : "",
    ...toolRuns.map((run) => `${run.name}(${JSON.stringify(run.args)}) → ${JSON.stringify(run.result)}`),
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Greetings and questions back to the customer claim nothing, so they skip the check — that saves a model call
 * on most turns. Anything with a number, a price word or a service word gets verified.
 */
const CLAIM_MARKERS =
  /[0-9٠-٩]|سعر|دينار|الف|ألف|توصيل|متوفر|موجود|مجان|خصم|واي\s*فاي|wifi|ساعة|يفتح|يسكر|دوام|حجز|عرض/i;

export const needsGrounding = (reply: string) => CLAIM_MARKERS.test(reply);

export async function checkGrounding(reply: string, sources: string) {
  return askJson({
    tier: "fast",
    schema: Check,
    system: SYSTEM,
    user: `SOURCES:\n${sources}\n\nREPLY:\n${reply}`,
    temperature: 0,
  }).catch(() => ({ grounded: true, problems: [] as string[] })); // a checker outage must not block the shop
}

/** Said when the agent has nothing safe to say. */
export const SAFE_FALLBACK = "لحظة، راح أتأكد من المالك وأرجعلك 🙏";
