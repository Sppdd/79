import { z } from "zod";
import { deleteAsset, updateAsset } from "@/db";
import { AssetKind } from "@/lib/ai/schemas";
import { deviceId } from "@/lib/device";

const Patch = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  kind: AssetKind.optional(),
  description: z.string().max(1500).optional(),
  locked: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: RouteContext<"/api/assets/[id]">) {
  const { id } = await params;
  const patch = Patch.safeParse(await request.json().catch(() => ({})));
  if (!patch.success) return Response.json({ error: patch.error.message }, { status: 400 });
  await updateAsset(await deviceId(), id, patch.data);
  return Response.json({ ok: true });
}

export async function DELETE(_: Request, { params }: RouteContext<"/api/assets/[id]">) {
  const { id } = await params;
  await deleteAsset(await deviceId(), id);
  return Response.json({ ok: true });
}
