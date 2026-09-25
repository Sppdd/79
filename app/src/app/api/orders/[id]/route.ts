import { z } from "zod";
import { defaultBusiness, updateOrder } from "@/db";

const Patch = z.object({
  status: z.enum(["new", "confirmed", "done", "cancelled"]).optional(),
  note: z.string().max(500).optional(),
});

export async function PATCH(request: Request, { params }: RouteContext<"/api/orders/[id]">) {
  const { id } = await params;
  const patch = Patch.safeParse(await request.json().catch(() => ({})));
  if (!patch.success) return Response.json({ error: patch.error.message }, { status: 400 });
  const business = await defaultBusiness();
  await updateOrder(business.id, id, patch.data);
  return Response.json({ ok: true });
}
