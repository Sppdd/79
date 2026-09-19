// Local render: runs render-job/render.ts with this machine's ffmpeg and writes MP4s into public/renders/<id>/.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RenderManifest } from "./hook";

export async function startLocalRender(manifest: RenderManifest, secret: string) {
  const outDir = path.join(process.cwd(), "public", "renders", manifest.projectId);
  await mkdir(outDir, { recursive: true });
  const manifestPath = path.join(outDir, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest));

  const script = path.resolve(process.cwd(), process.env.RENDER_SCRIPT ?? "../render-job/render.ts");
  const child = spawn(process.execPath, [script, manifestPath], {
    env: {
      ...process.env,
      OUTPUT_DIR: outDir,
      OUTPUT_URL_PREFIX: `/renders/${manifest.projectId}/`,
      RENDER_CALLBACK_SECRET: secret,
    },
    stdio: "inherit",
    detached: true,
  });
  child.unref();
  return `local-${child.pid}`;
}
