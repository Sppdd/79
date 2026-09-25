// What the agent can actually do. Each tool is small, typed, and writes to the database — the model never
// touches the database itself, so a bad model output can't do anything we didn't allow.
import { z } from "zod";
import { createOrder, customerOrders, listCatalog, newId, scheduleJob, updateCustomer } from "@/db";
import type { Business, Customer } from "@/db/schema";
import { cosine, defineTool, embed, type Tool } from "@/lib/ai/nemotron";

/**
 * Catalog search: embeddings for meaning + word matching for exact names, merged.
 * Shops name things in dialect ("كليجة"), so neither method alone is reliable.
 */
export async function searchCatalog(businessId: string, query: string, limit = 8) {
  const items = await listCatalog(businessId);
  if (!items.length) return [];

  const scores = new Map<string, number>();
  const words = query
    .toLowerCase()
    .split(/[\s،,.؟?!]+/)
    .filter((w) => w.length > 2);
  for (const item of items) {
    const haystack = `${item.title} ${item.body}`.toLowerCase();
    const hits = words.filter((w) => haystack.includes(w)).length;
    if (hits) scores.set(item.id, hits / Math.max(words.length, 1));
  }

  const embedded = items.filter((i) => i.embedding?.length);
  if (embedded.length) {
    const [q] = await embed([query]).catch(() => []);
    if (q) {
      for (const item of embedded) {
        const similarity = cosine(q, item.embedding!);
        scores.set(item.id, (scores.get(item.id) ?? 0) + similarity);
      }
    }
  }

  return items
    .filter((i) => (scores.get(i.id) ?? 0) > 0.15)
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
    .slice(0, limit);
}

/** Short, human-friendly reference the customer can quote back ("طلب A1B2C3"). */
const ref = (id: string) => id.replace(/-/g, "").slice(0, 6).toUpperCase();

export function agentTools(business: Business, customer: Customer): Tool[] {
  return [
    defineTool({
      name: "searchCatalog",
      description:
        "Look up products, prices, stock and policies. Search ONE thing at a time — call it again for each item the customer asked about.",
      parameters: z.object({ query: z.string().describe("what the customer is asking about, in any language") }),
      run: async ({ query }) => {
        const items = await searchCatalog(business.id, query);
        return items.length
          ? items.map((i) => ({ title: i.title, price: i.price ?? "غير محدد", inStock: i.inStock, details: i.body }))
          : { note: "nothing in the catalog matches — do not invent an answer, escalate instead" };
      },
    }),
    defineTool({
      name: "createOrder",
      description: "Record an order once the items are clear. Ask for the address first when it's a delivery.",
      parameters: z.object({
        items: z.array(z.object({ title: z.string(), quantity: z.number().int().min(1), price: z.string().optional() })).min(1),
        address: z.string().optional(),
        note: z.string().optional(),
      }),
      run: async ({ items, address, note }) => {
        const id = newId();
        await createOrder({ id, businessId: business.id, customerId: customer.id, kind: "order", items, address: address ?? null, note: note ?? null, slot: null, total: null });
        await scheduleJob({
          id: newId(),
          businessId: business.id,
          customerId: customer.id,
          kind: "escalation",
          runAt: new Date(),
          payload: { reason: "طلب جديد", orderId: id },
        });
        return { reference: ref(id), status: "new", tell_customer: `رقم الطلب ${ref(id)}` };
      },
    }),
    defineTool({
      name: "bookAppointment",
      description: "Book a time slot (visit, table, service). Confirm the day and time back to the customer.",
      parameters: z.object({ slot: z.string().describe("day and time as the customer said it"), note: z.string().optional() }),
      run: async ({ slot, note }) => {
        const id = newId();
        await createOrder({ id, businessId: business.id, customerId: customer.id, kind: "booking", items: [], slot, note: note ?? null, address: null, total: null });
        await scheduleJob({
          id: newId(),
          businessId: business.id,
          customerId: customer.id,
          kind: "escalation",
          runAt: new Date(),
          payload: { reason: "حجز جديد", orderId: id },
        });
        return { reference: ref(id), slot, tell_customer: `رقم الحجز ${ref(id)}` };
      },
    }),
    defineTool({
      name: "escalateToOwner",
      description:
        "Tell the owner something needs them: an answer you don't have, a complaint, a discount or refund request, or the customer asking for a person. Set handOver=true only when the owner should take over the chat (complaints, refunds, angry customers, asking for a person) — for a simple missing detail leave it false and keep helping.",
      parameters: z.object({
        reason: z.string().describe("one line for the owner, in Arabic"),
        urgent: z.boolean().default(false),
        handOver: z.boolean().default(false),
      }),
      run: async ({ reason, urgent, handOver }) => {
        if (handOver) await updateCustomer(customer.id, { handedOver: true });
        await scheduleJob({
          id: newId(),
          businessId: business.id,
          customerId: customer.id,
          kind: "escalation",
          runAt: new Date(),
          payload: { reason, urgent },
        });
        return { ok: true, handedOver: handOver, tell_customer: "the owner will get back to them shortly" };
      },
    }),
    defineTool({
      name: "scheduleFollowUp",
      description: "Message the customer again later — when they say they'll think about it or ask for a reminder.",
      parameters: z.object({
        hours: z.number().min(1).max(168).describe("how many hours from now"),
        why: z.string().describe("what to remind them about, in Arabic"),
      }),
      run: async ({ hours, why }) => {
        await scheduleJob({
          id: newId(),
          businessId: business.id,
          customerId: customer.id,
          kind: "follow_up",
          runAt: new Date(Date.now() + hours * 3600_000),
          payload: { why },
        });
        return { ok: true, at: new Date(Date.now() + hours * 3600_000).toISOString() };
      },
    }),
    defineTool({
      name: "myOrders",
      description: "Check this customer's previous orders and their status.",
      parameters: z.object({}),
      run: async () => {
        const rows = await customerOrders(customer.id);
        return rows.map((o) => ({ id: o.id, kind: o.kind, status: o.status, items: o.items, slot: o.slot, at: o.createdAt }));
      },
    }),
  ];
}
