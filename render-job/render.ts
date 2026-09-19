// Reel render job — runs as a Nebius Serverless Job (or locally via Docker).
//
// Input:  MANIFEST_URL (or argv[2]) → JSON RenderManifest (see type below).
// Output: one MP4 per requested aspect ratio, uploaded to Vercel Blob (or written to OUTPUT_DIR for local
//         renders), then an HMAC-signed POST to manifest.callbackUrl.
//
// Runs with Node 24 native TypeScript type-stripping: `node render.ts <manifest>`.

import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { copyFile, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";

type Aspect = "9:16" | "1:1" | "4:5";

type RenderManifest = {
  projectId: string;
  callbackUrl: string;
  shots: { url: string; kind: "image" | "video"; durationSec: number; caption?: string }[];
  voiceoverUrl?: string;
  musicUrl?: string;
  brandColor?: string; // hex, used for caption box
  formats: Aspect[];
};

const SIZES: Record<Aspect, [number, number]> = {
  "9:16": [1080, 1920],
  "1:1": [1080, 1080],
  "4:5": [1080, 1350],
};

async function main() {
  const source = process.env.MANIFEST_URL ?? process.argv[2];
  if (!source) throw new Error("Provide MANIFEST_URL or a manifest path/URL argument");
  const manifest: RenderManifest = JSON.parse(
    source.startsWith("http") ? await (await fetch(source)).text() : await readFile(source, "utf8"),
  );

  const dir = await mkdtemp(join(tmpdir(), "reel-"));
  const shots = await Promise.all(
    manifest.shots.map(async (s, i) => ({ ...s, file: await download(s.url, join(dir, `shot${i}`)) })),
  );
  const voice = manifest.voiceoverUrl ? await download(manifest.voiceoverUrl, join(dir, "voice")) : undefined;
  const music = manifest.musicUrl ? await download(manifest.musicUrl, join(dir, "music")) : undefined;

  const outputs: Partial<Record<Aspect, string>> = {};
  try {
    for (const aspect of manifest.formats) {
      const out = join(dir, `reel-${aspect.replace(":", "x")}.mp4`);
      await ffmpeg(await buildArgs(dir, shots, aspect, out, manifest.brandColor, voice, music));
      outputs[aspect] = await publish(out, manifest.projectId, `${aspect.replace(":", "x")}.mp4`);
      console.log(`rendered ${aspect} → ${outputs[aspect]}`);
    }
    await callback(manifest, { ok: true, outputs });
  } catch (err) {
    await callback(manifest, { ok: false, error: String(err) });
    throw err;
  }
}

async function buildArgs(
  dir: string,
  shots: (RenderManifest["shots"][number] & { file: string })[],
  aspect: Aspect,
  out: string,
  brandColor = "#000000",
  voice?: string,
  music?: string,
) {
  const [w, h] = SIZES[aspect];
  const args: string[] = ["-y"];
  const filters: string[] = [];
  const input = (...a: string[]) => (args.push(...a), args.filter((x) => x === "-i").length - 1);

  for (const [i, s] of shots.entries()) {
    // Stills are a single frame; zoompan expands it to the shot length (a gentle Ken Burns push-in).
    // Clips are held on their last frame if the model returned something shorter than the shot.
    const frames = Math.round(s.durationSec * 30);
    const src = input("-i", s.file);
    let chain = `[${src}:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1`;
    chain +=
      s.kind === "image"
        ? `,zoompan=z='min(zoom+0.0008,1.12)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${w}x${h}:fps=30`
        : `,fps=30,tpad=stop_mode=clone:stop_duration=${s.durationSec}`;
    chain += `,trim=duration=${s.durationSec},setpts=PTS-STARTPTS`;

    if (s.caption) {
      // Captions are rendered to a transparent PNG (SVG → resvg) and overlaid — no ffmpeg text libs needed.
      const png = join(dir, `caption${i}-${aspect.replace(":", "x")}.png`);
      await writeFile(png, captionPng(s.caption, w, h, brandColor));
      const cap = input("-loop", "1", "-t", String(s.durationSec), "-i", png);
      filters.push(`${chain}[base${i}]`, `[base${i}][${cap}:v]overlay=0:0:shortest=1,format=yuv420p[v${i}]`);
    } else {
      filters.push(`${chain},format=yuv420p[v${i}]`);
    }
  }
  filters.push(`${shots.map((_, i) => `[v${i}]`).join("")}concat=n=${shots.length}:v=1:a=0[vout]`);

  const total = shots.reduce((sum, s) => sum + s.durationSec, 0);
  const audio: string[] = [];
  if (voice) audio.push(`[${input("-i", voice)}:a]volume=1.0[a${audio.length}]`);
  if (music) audio.push(`[${input("-i", music)}:a]volume=${voice ? 0.18 : 0.8}[a${audio.length}]`);
  if (audio.length) {
    filters.push(...audio);
    filters.push(
      `${audio.map((_, i) => `[a${i}]`).join("")}amix=inputs=${audio.length}:duration=longest:normalize=0,` +
        `atrim=duration=${total},afade=t=out:st=${Math.max(total - 1, 0)}:d=1[aout]`,
    );
  }

  args.push("-filter_complex", filters.join(";"), "-map", "[vout]");
  if (audio.length) args.push("-map", "[aout]", "-c:a", "aac", "-b:a", "160k");
  args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p");
  args.push("-movflags", "+faststart", "-t", String(total), out);
  return args;
}

/** Full-frame transparent PNG with a rounded brand-colored caption box at the lower third. */
function captionPng(text: string, w: number, h: number, color: string): Buffer {
  const fontSize = Math.round(w / 15);
  const maxChars = Math.floor((w * 0.78) / (fontSize * 0.56));
  const lines: string[] = [];
  for (const word of text.split(/\s+/)) {
    const last = lines.at(-1);
    if (last !== undefined && (last + " " + word).length <= maxChars) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  const lineH = Math.round(fontSize * 1.2);
  const padX = Math.round(fontSize * 0.6);
  const padY = Math.round(fontSize * 0.45);
  const boxW = Math.min(w * 0.9, Math.max(...lines.map((l) => l.length)) * fontSize * 0.56 + padX * 2);
  const boxH = lines.length * lineH + padY * 2;
  const x = (w - boxW) / 2;
  const y = h * 0.7 - boxH / 2;
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="${fontSize * 0.45}" fill="${color}" fill-opacity="0.9"/>
  ${lines
    .map(
      (l, i) =>
        `<text x="${w / 2}" y="${y + padY + lineH * (i + 0.78)}" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial, DejaVu Sans, sans-serif" font-weight="800" font-size="${fontSize}" fill="#fff">${esc(l)}</text>`,
    )
    .join("\n  ")}
</svg>`;
  return new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng();
}

/** Local mode (OUTPUT_DIR) copies the file next to the app; otherwise uploads to Vercel Blob. */
async function publish(file: string, projectId: string, name: string): Promise<string> {
  if (process.env.OUTPUT_DIR) {
    await copyFile(file, join(process.env.OUTPUT_DIR, name));
    return `${process.env.OUTPUT_URL_PREFIX ?? ""}${name}?v=${Date.now()}`;
  }
  const { put } = await import("@vercel/blob");
  const blob = await put(`reels/${projectId}/${name}`, await readFile(file), {
    access: "public",
    contentType: "video/mp4",
    allowOverwrite: true,
  });
  return blob.url;
}

async function download(url: string, path: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status}: ${url}`);
  await writeFile(path, Buffer.from(await res.arrayBuffer()));
  return path;
}

function ffmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn("ffmpeg", args, { stdio: ["ignore", "inherit", "inherit"] });
    p.on("error", reject);
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });
}

async function callback(manifest: RenderManifest, result: object) {
  const body = JSON.stringify({ projectId: manifest.projectId, ...result });
  const secret = process.env.RENDER_CALLBACK_SECRET ?? "";
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  const res = await fetch(manifest.callbackUrl, {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature": signature },
    body,
  }).catch((e) => console.error("callback failed", e));
  if (res && !res.ok) console.error("callback rejected", res.status, await res.text());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
