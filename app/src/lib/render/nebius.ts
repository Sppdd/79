// The single boundary to Nebius AI Cloud: launches the ffmpeg render container as a Serverless Job.
// Docs: https://docs.nebius.com/serverless/jobs/manage
import { put } from "@vercel/blob";
import type { RenderManifest } from "./hook";

export const nebiusConfigured = () =>
  Boolean(
    process.env.NEBIUS_IAM_TOKEN &&
      process.env.NEBIUS_PROJECT_ID &&
      process.env.NEBIUS_JOB_IMAGE &&
      process.env.BLOB_READ_WRITE_TOKEN,
  );

/** Uploads the manifest to Blob and starts a Nebius Serverless Job that renders it. Returns the job name. */
export async function startNebiusJob(manifest: RenderManifest, callbackSecret: string): Promise<string> {
  const manifestBlob = await put(`reels/${manifest.projectId}/manifest.json`, JSON.stringify(manifest), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
  });

  const name = `reel-${manifest.projectId}-${Date.now().toString(36)}`.toLowerCase().slice(0, 60);
  const env = {
    MANIFEST_URL: manifestBlob.url,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN!,
    RENDER_CALLBACK_SECRET: callbackSecret,
  };

  const res = await fetch(`${process.env.NEBIUS_API_URL ?? "https://api.nebius.cloud"}/ai/v1/jobs`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.NEBIUS_IAM_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({
      metadata: { parentId: process.env.NEBIUS_PROJECT_ID, name },
      spec: {
        image: process.env.NEBIUS_JOB_IMAGE,
        containerCommand: "node",
        args: "render.ts",
        environmentVariables: Object.entries(env).map(([k, value]) => ({ name: k, value })),
        platform: process.env.NEBIUS_JOB_PLATFORM ?? "cpu-d3",
        preset: process.env.NEBIUS_JOB_PRESET ?? "4vcpu-16gb",
        ...(process.env.NEBIUS_SUBNET_ID ? { subnetId: process.env.NEBIUS_SUBNET_ID } : {}),
      },
    }),
  });
  if (!res.ok) throw new Error(`Nebius job create failed ${res.status}: ${await res.text()}`);
  return name;
}
