import { start } from "workflow/api";
import { z } from "zod";
import { createProject, getAssets, getBrandKit, listProjects } from "@/db";
import { defaultBrand } from "@/lib/brand";
import { deviceId } from "@/lib/device";
import { planCommercial } from "@/workflows/plan-commercial";

const Body = z.object({
  notes: z.string().trim().min(3).max(2000),
  assetIds: z.array(z.string()).max(12).default([]),
  targetSec: z.union([z.literal(15), z.literal(30), z.literal(45)]).default(30),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Write a few words about what you want to promote." }, { status: 400 });

  const device = await deviceId();
  const owned = await getAssets(device, parsed.data.assetIds);
  const id = crypto.randomUUID().slice(0, 12);
  await createProject({
    id,
    deviceId: device,
    notes: parsed.data.notes,
    brand: (await getBrandKit(device)) ?? defaultBrand,
    assetIds: owned.map((a) => a.id),
    targetSec: parsed.data.targetSec,
  });
  await start(planCommercial, [id]);
  return Response.json({ id });
}

export async function GET() {
  const rows = await listProjects(await deviceId());
  return Response.json(rows.map((p) => ({ id: p.id, title: p.shotlist?.title ?? p.notes.slice(0, 60), status: p.status })));
}
