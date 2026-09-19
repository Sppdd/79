"use client";

import { Minus, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { ShotList } from "@/lib/ai/schemas";
import { estimateTakes } from "@/lib/cost";
import { Group, PrimaryButton } from "../ios/primitives";

/**
 * Approval gate before any paid generation. Shows what will run and the estimated cost; nothing is spent until
 * the owner taps Approve. (The Nebius video engine is connected in week 2 — until then Approve is disabled.)
 */
export function ShootGate({ list, engineReady }: { list: ShotList; engineReady: boolean }) {
  const [takes, setTakes] = useState(2);
  const est = estimateTakes(list, takes);

  return (
    <Group header="Shoot draft takes" footer="Draft takes are fast, low-cost versions of every shot. Pick the best, then shoot finals.">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[17px]">Takes per shot</span>
        <span className="flex items-center gap-3">
          <button onClick={() => setTakes(Math.max(1, takes - 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-fill" aria-label="Fewer takes">
            <Minus size={16} />
          </button>
          <span className="w-4 text-center text-[17px] font-semibold">{takes}</span>
          <button onClick={() => setTakes(Math.min(4, takes + 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-fill" aria-label="More takes">
            <Plus size={16} />
          </button>
        </span>
      </div>
      <div className="flex justify-between px-4 py-3 text-[15px]">
        <span className="text-secondary">
          {est.shots} shots × {takes} = {est.takes} clips · ~{est.gpuMinutes} GPU min on Nebius
        </span>
        <span className="font-semibold">≈ ${est.usd.toFixed(2)}</span>
      </div>
      <div className="px-4 py-3">
        <PrimaryButton disabled={!engineReady}>
          <ShieldCheck size={20} /> Approve · ≈ ${est.usd.toFixed(2)}
        </PrimaryButton>
        {!engineReady && <p className="pt-2 text-center text-[13px] text-secondary">The Nebius video engine isn&apos;t connected yet.</p>}
      </div>
    </Group>
  );
}
