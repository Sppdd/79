import { defaultBusiness, history, listCustomers } from "@/db";

/** Inbox: every customer with their last line, newest first. */
export async function GET() {
  const business = await defaultBusiness();
  const customers = await listCustomers(business.id);
  const rows = await Promise.all(
    customers.map(async (c) => {
      const [last] = (await history(c.id, 1)) ?? [];
      return {
        id: c.id,
        waId: c.waId,
        name: c.name,
        handedOver: c.handedOver,
        lastMessageAt: c.lastMessageAt,
        preview: last ? `${last.role === "customer" ? "" : "↩ "}${last.transcript ?? last.text}`.slice(0, 80) : "",
      };
    }),
  );
  return Response.json(rows);
}
