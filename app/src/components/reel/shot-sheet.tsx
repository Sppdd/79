"use client";
/* eslint-disable @next/next/no-img-element */

import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Group, Pill, PrimaryButton } from "../ios/primitives";
import { Sheet } from "../ios/sheet";
import type { ClientProject } from "./types";

type Props = { project: ClientProject; index: number | undefined; onClose: () => void; onChanged: () => void };

export function ShotSheet({ project, index, onClose, onChanged }: Props) {
  const open = index !== undefined && !!project.plan?.shots[index];
  return (
    <Sheet open={open} onClose={onClose}>
      {/* keyed so the form state resets for each shot */}
      {open && <ShotEditor key={index} project={project} index={index} onClose={onClose} onChanged={onChanged} />}
    </Sheet>
  );
}

function ShotEditor({ project, index, onClose, onChanged }: Props & { index: number }) {
  const shot = project.plan!.shots[index];
  const state = project.shots[index];
  const [caption, setCaption] = useState(shot.caption);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(regenerate: boolean) {
    setBusy(true);
    await fetch(`/api/reels/${project.id}/shots/${index}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ caption, regenerate, instruction: instruction || undefined }),
    });
    setBusy(false);
    onChanged();
    if (!regenerate) onClose();
  }

  return (
    <div className="pb-6">
      <div className="flex gap-4 px-4 pt-2">
        <div className="aspect-[9/16] w-28 shrink-0 overflow-hidden rounded-xl bg-fill">
          {state?.imageUrl && <img src={state.imageUrl} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0">
          <p className="text-[20px] font-bold">Shot {index + 1}</p>
          <p className="pt-1 text-[15px] text-secondary">{shot.description}</p>
          <div className="flex flex-wrap gap-1.5 pt-2">
            <Pill tone="gray">{shot.style}</Pill>
            <Pill tone="gray">{shot.kind}</Pill>
            {state?.review && <Pill tone={state.review.pass ? "green" : "orange"}>QA {state.review.score}/10</Pill>}
          </div>
        </div>
      </div>

      {state?.review?.issues.length ? (
        <Group header="Nemotron QA notes">
          {state.review.issues.map((issue) => (
            <p key={issue} className="px-4 py-2.5 text-[15px]">
              {issue}
            </p>
          ))}
        </Group>
      ) : null}

      <Group header="On-screen caption">
        <input
          value={caption}
          maxLength={60}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full bg-transparent px-4 py-3 text-[17px] outline-none"
        />
      </Group>

      <Group header="Regenerate" footer="Describe what to change, or leave empty for a fresh take.">
        <input
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g. brighter, show the cup from above"
          className="w-full bg-transparent px-4 py-3 text-[17px] outline-none placeholder:text-secondary"
        />
      </Group>

      <div className="flex flex-col gap-2 px-4">
        <PrimaryButton onClick={() => submit(true)} disabled={busy}>
          {busy ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
          Regenerate shot
        </PrimaryButton>
        <button onClick={() => submit(false)} disabled={busy} className="h-[50px] text-[17px] text-tint">
          Save caption
        </button>
      </div>

      <details className="px-8 pt-2 text-[13px] text-secondary">
        <summary>Generation prompt</summary>
        <p className="pt-1">{shot.prompt}</p>
      </details>
    </div>
  );
}
