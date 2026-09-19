// Picks where Reels are rendered. Both backends run the same render-job/render.ts and report back through
// the same signed callback, so the workflow doesn't care which one is used.
//   RENDER_MODE=local  → ffmpeg on this machine (dev / quick client work; needs `brew install ffmpeg`)
//   Nebius configured  → Nebius Serverless Job (production)
import { createHmac, timingSafeEqual } from "node:crypto";
import type { RenderManifest } from "./hook";
import { startLocalRender } from "./local";
import { nebiusConfigured, startNebiusJob } from "./nebius";

export function renderBackend(): "local" | "nebius" | undefined {
  if (process.env.RENDER_MODE === "local") return "local";
  if (nebiusConfigured()) return "nebius";
  return undefined;
}

export function callbackSecret(): string | undefined {
  return process.env.RENDER_CALLBACK_SECRET || (process.env.RENDER_MODE === "local" ? "local-dev-secret" : undefined);
}

export async function startRender(manifest: RenderManifest) {
  const secret = callbackSecret();
  if (!secret) throw new Error("RENDER_CALLBACK_SECRET is not set");
  return renderBackend() === "local" ? startLocalRender(manifest, secret) : startNebiusJob(manifest, secret);
}

export function verifySignature(body: string, signature: string | null): boolean {
  const secret = callbackSecret();
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
