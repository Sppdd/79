import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { Group } from "../ios/primitives";
import { STAGES } from "./status";
import type { ClientProject } from "./types";

export function Progress({ project }: { project: ClientProject }) {
  const current = STAGES.findIndex((s) => s.status === project.status);
  const failed = project.status === "failed";

  return (
    <Group header="Your director is working" footer={failed ? project.error ?? undefined : undefined}>
      {STAGES.map((stage, i) => {
        const done = current > i || project.status === "done";
        const active = current === i;
        return (
          <div key={stage.status} className="flex items-center gap-3 px-4 py-2.5">
            {failed && active ? (
              <XCircle size={22} className="text-ios-red" />
            ) : done ? (
              <CheckCircle2 size={22} className="text-ios-green" />
            ) : active ? (
              <Loader2 size={22} className="animate-spin text-tint" />
            ) : (
              <Circle size={22} className="text-separator" />
            )}
            <div className="flex-1">
              <p className={`text-[15px] ${done || active ? "" : "text-secondary"}`}>{stage.label}</p>
            </div>
            <span className="text-[12px] text-secondary">{stage.model}</span>
          </div>
        );
      })}
    </Group>
  );
}
