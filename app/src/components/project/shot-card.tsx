"use client";
/* eslint-disable @next/next/no-img-element */

import { ChevronDown, Move3d, Timer } from "lucide-react";
import { useState } from "react";
import type { Scene, Shot, ShotList } from "@/lib/ai/schemas";
import { renderPrompt } from "@/lib/shotlist";
import type { ClientAsset } from "./types";

const TRANSITION: Record<Shot["transition"], string> = {
  cut: "Cut",
  "match-cut": "Match cut",
  "whip-pan": "Whip pan",
  dissolve: "Dissolve",
};

export function ShotCard({
  list,
  scene,
  shot,
  assets,
  highlight,
  onAsk,
}: {
  list: ShotList;
  scene: Scene;
  shot: Shot;
  assets: ClientAsset[];
  highlight: boolean;
  onAsk: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const refs = shot.references.map((name) => ({ name, asset: assets.find((a) => a.name === name) }));

  return (
    <div className={`px-4 py-3 transition-colors ${highlight ? "bg-tint/10" : ""}`}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 text-left">
        <span className="mt-0.5 rounded-md bg-label px-1.5 py-0.5 font-mono text-[13px] font-bold text-card">{shot.id}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{shot.beat}</p>
          <p className="flex flex-wrap items-center gap-x-3 pt-0.5 text-[13px] text-secondary">
            <span className="flex items-center gap-1">
              <Move3d size={13} /> {shot.camera}
            </span>
            <span className="flex items-center gap-1">
              <Timer size={13} /> {shot.durationSec}s
            </span>
            <span>{TRANSITION[shot.transition]}</span>
          </p>
        </div>
        <ChevronDown size={18} className={`mt-1 text-secondary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {refs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 pl-11">
          {refs.map(({ name, asset }) => (
            <span key={name} className="flex items-center gap-1.5 rounded-full bg-fill py-0.5 pr-2.5 pl-0.5 text-[12px]">
              {asset ? <img src={asset.url} alt="" className="h-5 w-5 rounded-full object-cover" /> : <span className="h-5 w-5 rounded-full bg-separator" />}
              {name}
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="space-y-3 pt-3 pl-11 text-[14px]">
          <div>
            <p className="text-[12px] font-semibold text-secondary uppercase">Action, move by move</p>
            <ol className="list-decimal pl-5">
              {shot.motion.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ol>
          </div>
          {shot.continuity && (
            <div>
              <p className="text-[12px] font-semibold text-secondary uppercase">Continuity</p>
              <p>{shot.continuity}</p>
            </div>
          )}
          {shot.caption && (
            <div>
              <p className="text-[12px] font-semibold text-secondary uppercase">On-screen text</p>
              <p>{shot.caption}</p>
            </div>
          )}
          <div>
            <p className="text-[12px] font-semibold text-secondary uppercase">Full prompt sent to the video model</p>
            <p className="rounded-lg bg-fill p-2.5 font-mono text-[12px] leading-relaxed">{renderPrompt(list, scene.number, shot)}</p>
          </div>
          <button onClick={() => onAsk(`Edit ${shot.id}: `)} className="text-[15px] font-medium text-tint">
            Ask the director to change {shot.id}
          </button>
        </div>
      )}
    </div>
  );
}
