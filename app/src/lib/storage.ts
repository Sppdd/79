// Files (voice notes, uploads) on a mounted volume — works the same on a laptop and on a Nebius endpoint.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.env.MEDIA_DIR ?? path.join(process.cwd(), "public", "media");

/** Saves bytes and returns the URL the app can serve them from. */
export async function saveFile(name: string, bytes: Buffer): Promise<string> {
  await mkdir(ROOT, { recursive: true });
  await writeFile(path.join(ROOT, name), bytes);
  return `/media/${name}`;
}
