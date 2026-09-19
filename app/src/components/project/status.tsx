import type { ProjectStatus } from "@/db/schema";
import { Pill } from "../ios/primitives";

/** Planning stages in order, as shown on the progress list. */
export const STAGES: { status: ProjectStatus; label: string; model: string }[] = [
  { status: "researching", label: "Researching", model: "Tavily" },
  { status: "briefing", label: "Writing the brief", model: "Nemotron 3 Super" },
  { status: "directing", label: "Directing the shot list", model: "Nemotron 3 Ultra" },
];

export function StatusPill({ status }: { status: ProjectStatus }) {
  if (status === "ready") return <Pill tone="green">Shot list ready</Pill>;
  if (status === "failed") return <Pill tone="red">Failed</Pill>;
  if (status === "queued") return <Pill tone="gray">Queued</Pill>;
  return <Pill tone="blue">{STAGES.find((s) => s.status === status)?.label ?? status}…</Pill>;
}
