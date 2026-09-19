// The whole Notes → Reel pipeline. Read top to bottom: each `await` is a durable, retryable step.
// Workflow functions only orchestrate; all I/O lives in the "use step" functions below.
import { createHook, FatalError } from "workflow";
import { getProject, patchShot, updateProject } from "@/db";
import type { RenderOutputs, ReelStatus, ShotState } from "@/db/schema";
import { writeAdCopy } from "@/lib/ai/agents/adcopy";
import { writeBrief } from "@/lib/ai/agents/brief";
import { directReel } from "@/lib/ai/agents/director";
import { reviewShot } from "@/lib/ai/agents/qa";
import type { BrandKit, Brief, ReelPlan, Shot } from "@/lib/ai/schemas";
import { media } from "@/lib/media/provider";
import { renderHookToken, type RenderResult } from "@/lib/render/hook";
import { renderBackend, startRender } from "@/lib/render";
import { researchBrand } from "@/lib/research/tavily";

const MAX_SHOT_ATTEMPTS = 2;

export async function makeReel(projectId: string, appUrl: string) {
  "use workflow";
  try {
    const { notes, brand } = await loadProject(projectId);

    await setStatus(projectId, "researching");
    const research = await research_(brand, notes);

    await setStatus(projectId, "briefing");
    const brief = await brief_(projectId, notes, brand, research);

    await setStatus(projectId, "directing");
    const plan = await direct_(projectId, brief, brand);

    await setStatus(projectId, "generating");
    await Promise.all(plan.shots.map((shot, i) => produceShot(projectId, i, shot, brand)));

    await setStatus(projectId, "voicing");
    const total = plan.shots.reduce((s, x) => s + x.durationSec, 0);
    await Promise.all([adCopy_(projectId, brief, plan, brand), audio_(projectId, plan, total)]);

    await render(projectId, appUrl);
    await setStatus(projectId, "done");
  } catch (err) {
    await fail(projectId, String(err));
    throw err;
  }
}

/** Re-render after the owner edited captions or regenerated shots in the editor. */
export async function rerenderReel(projectId: string, appUrl: string) {
  "use workflow";
  try {
    await render(projectId, appUrl);
    await setStatus(projectId, "done");
  } catch (err) {
    await fail(projectId, String(err));
    throw err;
  }
}

/** Starts the render job and waits (durably, no compute used) for its signed callback. */
async function render(projectId: string, appUrl: string) {
  if (!(await canRender())) return;
  await setStatus(projectId, "rendering");
  const hook = createHook<RenderResult>({ token: renderHookToken(projectId) });
  await launchRender(projectId, appUrl);
  const result = await hook;
  if (!result.ok) throw new FatalError(`Render failed: ${result.error}`);
  await saveOutputs(projectId, result.outputs);
}

/** Generate → QA → (regenerate) one shot. Runs in parallel for all shots. */
async function produceShot(projectId: string, index: number, shot: Shot, brand: BrandKit): Promise<ShotState> {
  let prompt = shot.prompt;
  let state: ShotState = { status: "generating", attempts: 0 };
  while (state.attempts < MAX_SHOT_ATTEMPTS) {
    state = await generateStill(projectId, index, prompt, shot.style, state.attempts + 1);
    state = await review(projectId, index, state, shot, brand);
    if (state.review?.pass) break;
    prompt = state.review?.revisedPrompt ?? prompt;
  }
  // Ship the best effort even if QA never passed — the owner can regenerate from the editor.
  if (shot.kind === "video" && state.imageUrl) state = await animate(projectId, index, state, prompt, shot.durationSec);
  return finishShot(projectId, index, state);
}

// ─── Steps ────────────────────────────────────────────────────────────────────

async function loadProject(projectId: string) {
  "use step";
  const p = await getProject(projectId);
  if (!p) throw new FatalError(`Project ${projectId} not found`);
  return { notes: p.notes, brand: p.brand };
}

async function setStatus(projectId: string, status: ReelStatus) {
  "use step";
  await updateProject(projectId, { status });
}

async function research_(brand: BrandKit, notes: string) {
  "use step";
  return researchBrand(brand, notes);
}

async function brief_(projectId: string, notes: string, brand: BrandKit, research?: string) {
  "use step";
  const brief = await writeBrief(notes, brand, research);
  await updateProject(projectId, { brief });
  return brief;
}

async function direct_(projectId: string, brief: Brief, brand: BrandKit) {
  "use step";
  const plan = await directReel(brief, brand);
  // Keep the director's first N video shots (its most important motion moments); the rest become stills.
  let videos = 0;
  for (const shot of plan.shots) if (shot.kind === "video" && ++videos > media().maxVideoShots) shot.kind = "image";
  const shots: ShotState[] = plan.shots.map(() => ({ status: "pending", attempts: 0 }));
  await updateProject(projectId, { plan, shots });
  return plan;
}

async function generateStill(projectId: string, index: number, prompt: string, style: Shot["style"], attempts: number) {
  "use step";
  await patchShot(projectId, index, { status: "generating", attempts });
  const imageUrl = await media().image(prompt, style);
  const state: ShotState = { status: "reviewing", imageUrl, attempts };
  await patchShot(projectId, index, state);
  return state;
}

async function review(projectId: string, index: number, state: ShotState, shot: Shot, brand: BrandKit) {
  "use step";
  const result = await reviewShot(state.imageUrl!, shot, brand).catch(() => undefined); // QA outage ≠ failed Reel
  const next: ShotState = { ...state, review: result ?? { pass: true, score: 0, issues: ["QA unavailable"] } };
  await patchShot(projectId, index, next);
  return next;
}

async function animate(projectId: string, index: number, state: ShotState, prompt: string, seconds: number) {
  "use step";
  const videoUrl = await media().animate(state.imageUrl!, prompt, seconds);
  const next = { ...state, videoUrl };
  await patchShot(projectId, index, next);
  return next;
}

async function finishShot(projectId: string, index: number, state: ShotState) {
  "use step";
  const next: ShotState = { ...state, status: state.imageUrl ? "ready" : "failed" };
  await patchShot(projectId, index, next);
  return next;
}

async function adCopy_(projectId: string, brief: Brief, plan: ReelPlan, brand: BrandKit) {
  "use step";
  const adCopy = await writeAdCopy(brief, plan, brand);
  await updateProject(projectId, { adCopy });
  return adCopy;
}

async function audio_(projectId: string, plan: ReelPlan, seconds: number) {
  "use step";
  const [voiceoverUrl, musicUrl] = await Promise.all([
    media().speech(plan.voiceover).catch(() => undefined),
    media().music(plan.musicMood, seconds).catch(() => undefined),
  ]);
  await updateProject(projectId, { voiceoverUrl: voiceoverUrl ?? null, musicUrl: musicUrl ?? null });
  return { voiceoverUrl, musicUrl };
}

async function canRender() {
  "use step";
  return renderBackend() !== undefined;
}

async function launchRender(projectId: string, appUrl: string) {
  "use step";
  const p = await getProject(projectId);
  if (!p?.plan) throw new FatalError("Nothing to render yet");
  return startRender({
    projectId,
    callbackUrl: `${appUrl}/api/render/callback`,
    shots: p.plan.shots.flatMap((s, i) => {
      const url = p.shots[i]?.videoUrl ?? p.shots[i]?.imageUrl;
      if (!url) return [];
      return [{ url, kind: p.shots[i].videoUrl ? "video" : "image", durationSec: s.durationSec, caption: s.caption }] as const;
    }),
    voiceoverUrl: p.voiceoverUrl ?? undefined,
    musicUrl: p.musicUrl ?? undefined,
    brandColor: p.brand.primaryColor,
    formats: ["9:16", "1:1", "4:5"],
  });
}

async function saveOutputs(projectId: string, outputs: RenderOutputs) {
  "use step";
  await updateProject(projectId, { outputs });
}

async function fail(projectId: string, error: string) {
  "use step";
  await updateProject(projectId, { status: "failed", error: error.slice(0, 500) });
}
