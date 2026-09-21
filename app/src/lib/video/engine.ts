// The single boundary to the NoteReel video engine (video-engine/ on a Nebius Serverless Endpoint).
// Every call here spends GPU time — callers must only reach this after the owner approved the cost.

export const engineReady = () => Boolean(process.env.ENGINE_URL);

function headers() {
  const h: Record<string, string> = { "content-type": "application/json" };
  // Nebius endpoint token auth (gateway) and the engine's own ENGINE_TOKEN use the same bearer header.
  if (process.env.ENGINE_TOKEN) h.authorization = `Bearer ${process.env.ENGINE_TOKEN}`;
  return h;
}

async function call(path: string, body: unknown, timeoutMs: number) {
  if (!process.env.ENGINE_URL) throw new Error("ENGINE_URL is not set — the Nebius video engine isn't deployed");
  const res = await fetch(new URL(path, process.env.ENGINE_URL), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`engine ${path} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res;
}

/** First frame of a shot composed from locked reference photos (URLs or data URLs). Returns a JPEG data URL. */
export async function keyframe(input: { prompt: string; references: string[]; seed?: number }) {
  const res = await call("/keyframe", { width: 544, height: 960, seed: 0, ...input }, 5 * 60_000);
  return (await res.json()) as { image: string; gpu_seconds: number };
}

/** One ≤5 s vertical clip with sound. Image-to-video when firstFrame is given. Returns MP4 bytes. */
export async function take(input: { prompt: string; firstFrame?: string; seconds: number; seed?: number }) {
  const res = await call(
    "/take",
    { prompt: input.prompt, first_frame: input.firstFrame, seconds: input.seconds, seed: input.seed ?? 0, width: 544, height: 960 },
    10 * 60_000,
  );
  return { mp4: Buffer.from(await res.arrayBuffer()), gpuSeconds: Number(res.headers.get("x-gpu-seconds") ?? 0) };
}
