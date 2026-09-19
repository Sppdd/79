// Plans a commercial: research → brief → connected shot list → ad copy. Each `await` is a durable, retryable step.
// No media is generated here — shooting takes is a separate, owner-approved step.
import { FatalError } from "workflow";
import { getAssets, getProject, updateProject } from "@/db";
import type { ProjectStatus } from "@/db/schema";
import { writeAdCopy } from "@/lib/ai/agents/adcopy";
import { writeBrief } from "@/lib/ai/agents/brief";
import { writeShotList, type AssetRef } from "@/lib/ai/agents/director";
import type { BrandKit, Brief, ShotList } from "@/lib/ai/schemas";
import { researchBrand } from "@/lib/research/tavily";

export async function planCommercial(projectId: string) {
  "use workflow";
  try {
    const { notes, brand, assets, targetSec } = await loadProject(projectId);

    await setStatus(projectId, "researching");
    const research = await research_(brand, notes);

    await setStatus(projectId, "briefing");
    const brief = await brief_(projectId, notes, brand, research);

    await setStatus(projectId, "directing");
    const list = await shotList_(projectId, brief, brand, assets, targetSec);
    await adCopy_(projectId, brief, list, brand);

    await setStatus(projectId, "ready");
  } catch (err) {
    await fail(projectId, String(err));
    throw err;
  }
}

// ─── Steps ────────────────────────────────────────────────────────────────────

async function loadProject(projectId: string) {
  "use step";
  const p = await getProject(projectId);
  if (!p) throw new FatalError(`Project ${projectId} not found`);
  const assets: AssetRef[] = (await getAssets(p.deviceId, p.assetIds)).map((a) => ({
    name: a.name,
    kind: a.kind,
    description: a.description,
  }));
  return { notes: p.notes, brand: p.brand, assets, targetSec: p.targetSec };
}

async function setStatus(projectId: string, status: ProjectStatus) {
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

async function shotList_(projectId: string, brief: Brief, brand: BrandKit, assets: AssetRef[], targetSec: number) {
  "use step";
  const shotlist = await writeShotList({ brief, brand, assets, targetSec });
  await updateProject(projectId, { shotlist, shotlistVersion: 1 });
  return shotlist;
}

async function adCopy_(projectId: string, brief: Brief, list: ShotList, brand: BrandKit) {
  "use step";
  // Ad copy is a bonus; a failure here shouldn't block the shot list.
  const adCopy = await writeAdCopy(brief, list, brand).catch(() => undefined);
  if (adCopy) await updateProject(projectId, { adCopy });
}

async function fail(projectId: string, error: string) {
  "use step";
  await updateProject(projectId, { status: "failed", error: error.slice(0, 500) });
}
