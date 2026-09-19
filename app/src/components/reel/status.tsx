import type { ReelStatus } from "@/db/schema";
import { Pill } from "../ios/primitives";

/** Pipeline stages in order, as shown on the project progress timeline. */
export const STAGES: { status: ReelStatus; label: string; model: string }[] = [
  { status: "researching", label: "Researching", model: "Tavily" },
  { status: "briefing", label: "Writing brief", model: "Nemotron Super" },
  { status: "directing", label: "Directing", model: "Nemotron 3 Ultra" },
  { status: "generating", label: "Shooting & QA", model: "fal.ai + Nemotron QA" },
  { status: "voicing", label: "Voice & ad copy", model: "TTS + Nemotron Super" },
  { status: "rendering", label: "Rendering", model: "Nebius Serverless Job" },
];

export function StatusPill({ status }: { status: ReelStatus }) {
  if (status === "done") return <Pill tone="green">Ready</Pill>;
  if (status === "failed") return <Pill tone="red">Failed</Pill>;
  if (status === "queued") return <Pill tone="gray">Queued</Pill>;
  return <Pill tone="blue">{STAGES.find((s) => s.status === status)?.label ?? status}…</Pill>;
}
