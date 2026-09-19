// Dependency-free on purpose: imported by the workflow sandbox (no Node APIs allowed there).
import type { RenderOutputs } from "@/db/schema";

export type RenderManifest = {
  projectId: string;
  callbackUrl: string;
  shots: { url: string; kind: "image" | "video"; durationSec: number; caption?: string }[];
  voiceoverUrl?: string;
  musicUrl?: string;
  brandColor?: string;
  formats: ("9:16" | "1:1" | "4:5")[];
};

export type RenderResult = { ok: true; outputs: RenderOutputs } | { ok: false; error: string };

/** The workflow waits on this hook token; the render callback route resumes it. */
export const renderHookToken = (projectId: string) => `render:${projectId}`;
