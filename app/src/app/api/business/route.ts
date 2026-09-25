import { z } from "zod";
import { defaultBusiness, updateBusiness } from "@/db";

const Patch = z.object({
  name: z.string().min(1).max(80).optional(),
  about: z.string().max(2000).optional(),
  policies: z.string().max(4000).optional(),
  hours: z.string().max(300).optional(),
  dialect: z.enum(["iraqi", "gulf", "egyptian", "levantine", "msa"]).optional(),
  ownerPhone: z.string().max(20).optional(),
  phoneNumberId: z.string().max(40).optional(),
  paused: z.boolean().optional(),
});

export async function GET() {
  return Response.json(await defaultBusiness());
}

export async function PUT(request: Request) {
  const patch = Patch.safeParse(await request.json().catch(() => ({})));
  if (!patch.success) return Response.json({ error: patch.error.message }, { status: 400 });
  const business = await defaultBusiness();
  await updateBusiness(business.id, patch.data);
  return Response.json({ ...business, ...patch.data });
}
