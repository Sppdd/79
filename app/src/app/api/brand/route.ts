import { getBrandKit, saveBrandKit } from "@/db";
import { BrandKit } from "@/lib/ai/schemas";
import { defaultBrand } from "@/lib/brand";
import { deviceId } from "@/lib/device";

export async function GET() {
  return Response.json((await getBrandKit(await deviceId())) ?? defaultBrand);
}

export async function PUT(request: Request) {
  const parsed = BrandKit.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  await saveBrandKit(await deviceId(), parsed.data);
  return Response.json(parsed.data);
}
