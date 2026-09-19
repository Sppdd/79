import { createAsset, listAssets, updateAsset } from "@/db";
import { describeAsset } from "@/lib/ai/agents/describe-asset";
import { AssetKind } from "@/lib/ai/schemas";
import { deviceId } from "@/lib/device";
import { ACCEPTED_IMAGE_TYPES, saveUpload } from "@/lib/storage";

export const maxDuration = 60;

export async function GET() {
  return Response.json(await listAssets(await deviceId()));
}

/** Multipart upload: file + name + kind. The photo is described by the vision model so prompts match it. */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => undefined);
  const file = form?.get("file");
  const kind = AssetKind.safeParse(form?.get("kind"));
  if (!(file instanceof File) || !ACCEPTED_IMAGE_TYPES.includes(file.type) || !kind.success) {
    return Response.json({ error: "Upload a JPG, PNG or WebP photo and pick what it shows." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: "Photos must be under 10 MB." }, { status: 400 });

  const device = await deviceId();
  const id = crypto.randomUUID().slice(0, 12);
  const name = slug(String(form?.get("name") || file.name.replace(/\.\w+$/, ""))) || `${kind.data}-${id.slice(0, 4)}`;
  const { url, dataUrl } = await saveUpload(id, file);
  await createAsset({ id, deviceId: device, name, kind: kind.data, url });

  const description = await describeAsset(dataUrl, kind.data).catch(() => undefined);
  if (description) await updateAsset(device, id, { description });
  return Response.json({ id, name, kind: kind.data, url, description, locked: true });
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
