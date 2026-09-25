// What the agent remembers about a customer between conversations: a few short facts, nothing more.
import { z } from "zod";
import type { Customer, CustomerMemory, Message } from "@/db/schema";
import { askJson } from "@/lib/ai/nemotron";

const Memory = z.object({
  facts: z.array(z.string().max(120)).max(8).describe("short durable facts: name, address, size, preferences, allergies"),
  summary: z.string().max(300).describe("one or two lines on who this customer is and what they want"),
});

const SYSTEM = `You keep a small business's notes on one customer.
Keep only facts that stay true and help serve them later: name, address/area, sizes, preferences, what they bought.
Never store payment details, ID numbers, or anything sensitive they didn't offer for the order.
Merge with the existing notes, drop anything contradicted, keep at most 8 short facts. Write them in Arabic.`;

export async function rememberFromTurn(customer: Customer, recent: Message[]): Promise<CustomerMemory | undefined> {
  const transcript = recent
    .slice(-10)
    .map((m) => `${m.role === "customer" ? "العميل" : "المتجر"}: ${m.transcript ?? m.text}`)
    .join("\n");
  if (!transcript.trim()) return undefined;

  return askJson({
    tier: "nano",
    schema: Memory,
    system: SYSTEM,
    user: `Existing notes: ${JSON.stringify(customer.memory)}\n\nConversation:\n${transcript}`,
    temperature: 0.1,
  }).catch(() => undefined);
}
