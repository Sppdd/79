// The part that runs without anyone opening the app: follow-ups, owner alerts, the nightly summary.
// Driven by POST /api/cron (a timer in docker compose locally, the platform's scheduler once deployed).
import {
  addMessage,
  dueJobs,
  finishJob,
  getBusiness,
  getCustomer,
  history,
  listOrders,
  newId,
  recentMessages,
} from "@/db";
import type { Job } from "@/db/schema";
import { askText, hasNemotron } from "@/lib/ai/nemotron";
import { sendText } from "@/lib/whatsapp/client";

export async function runDueJobs(): Promise<{ ran: number; results: string[] }> {
  const jobs = await dueJobs();
  const results: string[] = [];
  for (const job of jobs) {
    try {
      const result = await runJob(job);
      await finishJob(job.id, "done", result);
      results.push(`${job.kind}: ${result}`);
    } catch (err) {
      await finishJob(job.id, "failed", String(err).slice(0, 300));
      results.push(`${job.kind}: failed ${err}`);
    }
  }
  return { ran: jobs.length, results };
}

async function runJob(job: Job): Promise<string> {
  const business = await getBusiness(job.businessId);
  if (!business) return "unknown business";

  if (job.kind === "escalation") {
    const customer = job.customerId ? await getCustomer(job.customerId) : undefined;
    const reason = String(job.payload.reason ?? "يحتاج انتباهك");
    const who = customer?.name ?? customer?.waId ?? "زبون";
    const text = `🔔 ${reason}\nالزبون: ${who}`;
    if (business.ownerPhone) await sendText(business.ownerPhone, text);
    return `owner alerted: ${reason}`;
  }

  if (job.kind === "follow_up") {
    const customer = job.customerId ? await getCustomer(job.customerId) : undefined;
    if (!customer || customer.handedOver || business.paused) return "skipped";
    const why = String(job.payload.why ?? "");
    const past = await history(customer.id, 8);
    const text = hasNemotron()
      ? await askText({
          tier: "super",
          system: `You write ONE short WhatsApp follow-up for a small business, in the same Arabic dialect the
conversation uses. Friendly, not pushy, one or two lines, no greetings longer than a word, no emojis beyond one.
Reference what they were interested in. Never invent prices or offers.`,
          user: `Reason to follow up: ${why}\n\nConversation so far:\n${past
            .map((m) => `${m.role === "customer" ? "العميل" : "المتجر"}: ${m.transcript ?? m.text}`)
            .join("\n")}`,
          maxTokens: 200,
        })
      : why;

    await addMessage({
      id: newId(),
      businessId: business.id,
      customerId: customer.id,
      role: "agent",
      text,
      audioUrl: null,
      transcript: null,
      toolCalls: null,
      model: "follow_up",
      latencyMs: null,
    });
    await sendText(customer.waId, text);
    return `followed up with ${customer.waId}`;
  }

  // daily_summary
  const since = new Date(Date.now() - 24 * 3600_000);
  const [messages, orders] = await Promise.all([recentMessages(business.id, since), listOrders(business.id)]);
  const todaysOrders = orders.filter((o) => o.createdAt > since);
  if (!messages.length && !todaysOrders.length) return "nothing to report";

  const summary = hasNemotron()
    ? await askText({
        tier: "ultra",
        system: `You write the end-of-day note a shop owner actually wants: what customers asked for, what sold,
what the agent couldn't answer, and anything that needs the owner tomorrow. Arabic, short lines, no fluff.`,
        user: `Orders today: ${JSON.stringify(todaysOrders.map((o) => ({ kind: o.kind, items: o.items, slot: o.slot, status: o.status })))}
Conversations:\n${messages.map((m) => `${m.role}: ${m.transcript ?? m.text}`).join("\n").slice(0, 12000)}`,
        maxTokens: 600,
      })
    : `طلبات اليوم: ${todaysOrders.length}`;

  if (business.ownerPhone) await sendText(business.ownerPhone, `📋 ملخص اليوم\n${summary}`);
  return "summary sent";
}
