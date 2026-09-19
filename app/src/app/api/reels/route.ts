import { start } from "workflow/api";
import { z } from "zod";
import { createProject, getBrandKit, listProjects } from "@/db";
import { defaultBrand } from "@/lib/brand";
import { deviceId } from "@/lib/device";
import { makeReel } from "@/workflows/make-reel";

const Body = z.object({ notes: z.string().trim().min(3).max(2000) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Write a few words about what you want to promote." }, { status: 400 });

  const device = await deviceId();
  const id = crypto.randomUUID().slice(0, 12);
  const brand = (await getBrandKit(device)) ?? defaultBrand;
  await createProject({ id, deviceId: device, notes: parsed.data.notes, brand });

  // Callback URL for the Nebius render job; APP_URL overrides it when deployments are behind protection/proxies.
  const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
  await start(makeReel, [id, appUrl]);
  return Response.json({ id });
}

export async function GET() {
  const rows = await listProjects(await deviceId());
  return Response.json(
    rows.map((p) => ({
      id: p.id,
      title: p.plan?.title ?? p.notes.slice(0, 60),
      status: p.status,
      thumbnail: p.shots.find((s) => s.imageUrl)?.imageUrl,
      createdAt: p.createdAt,
    })),
  );
}
