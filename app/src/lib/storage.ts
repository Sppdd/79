// Stores uploaded reference photos. Vercel Blob when configured; otherwise public/uploads/ for local dev.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const ACCEPTED_IMAGE_TYPES = Object.keys(EXT);

export async function saveUpload(id: string, file: File): Promise<{ url: string; dataUrl: string }> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const name = `${id}.${EXT[file.type] ?? "bin"}`;
  // Vision models can't reach localhost URLs, so they always get the image inline.
  const dataUrl = `data:${file.type};base64,${bytes.toString("base64")}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`assets/${name}`, bytes, { access: "public", contentType: file.type });
    return { url: blob.url, dataUrl };
  }
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return { url: `/uploads/${name}`, dataUrl };
}
