import { z } from "zod";
import { addMessage, defaultBusiness, getCustomer, history, newId, updateCustomer } from "@/db";
import { sendText } from "@/lib/whatsapp/client";

export async function GET(_: Request, { params }: RouteContext<"/api/chats/[id]">) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ customer, messages: await history(id, 100) });
}

const Body = z.object({
  /** The owner writing to the customer themselves. */
  text: z.string().min(1).max(2000).optional(),
  /** Take over the chat, or give it back to the agent. */
  handedOver: z.boolean().optional(),
});

export async function POST(request: Request, { params }: RouteContext<"/api/chats/[id]">) {
  const { id } = await params;
  const body = Body.safeParse(await request.json().catch(() => ({})));
  const customer = await getCustomer(id);
  if (!body.success || !customer) return Response.json({ error: "Not found" }, { status: 404 });
  const business = await defaultBusiness();

  if (body.data.handedOver !== undefined) await updateCustomer(id, { handedOver: body.data.handedOver });
  if (body.data.text) {
    await addMessage({
      id: newId(),
      businessId: business.id,
      customerId: id,
      role: "owner",
      text: body.data.text,
      audioUrl: null,
      transcript: null,
      toolCalls: null,
      model: null,
      latencyMs: null,
    });
    await sendText(customer.waId, body.data.text).catch((err) => console.error("owner send failed", err));
  }
  return Response.json({ ok: true });
}
