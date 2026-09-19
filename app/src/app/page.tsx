"use client";

import { Clapperboard, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AssetThumb } from "@/components/assets/asset-thumb";
import { UploadSheet } from "@/components/assets/upload-sheet";
import { Group, LargeTitle, PrimaryButton } from "@/components/ios/primitives";
import type { ClientAsset } from "@/components/project/types";

const LENGTHS = [15, 30, 45] as const;

const STARTERS = [
  { label: "☕️ New product", text: "New cinnamon oat latte, $4.50\nOnly this weekend\nMade with local honey" },
  { label: "🏷️ Flash sale", text: "20% off all candles until Sunday\nHand-poured soy wax\nFree gift wrap" },
  { label: "🎧 Launch", text: "Launching our wireless headphones\nOne tap switches the noisy world off\nPre-order now" },
];

export default function CreatePage() {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [length, setLength] = useState<(typeof LENGTHS)[number]>(30);
  const [assets, setAssets] = useState<ClientAsset[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    fetch("/api/assets")
      .then((r) => r.json())
      .then(setAssets)
      .catch(() => {});
  }, []);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function plan() {
    setBusy(true);
    setError(undefined);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notes, assetIds: selected, targetSec: length }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setBusy(false);
      return;
    }
    router.push(`/project/${data.id}`);
  }

  return (
    <main>
      <LargeTitle title="Create" subtitle="Plan a commercial with your AI director." />

      <Group header="What are we selling?" footer="Product, offer, price, deadline, the feeling — rough notes are fine.">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          placeholder={"e.g. Launching our wireless headphones\nOne tap switches the noisy world off"}
          className="block w-full resize-none bg-transparent p-4 text-[17px] leading-snug outline-none placeholder:text-secondary"
        />
      </Group>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
        {STARTERS.map((s) => (
          <button key={s.label} onClick={() => setNotes(s.text)} className="shrink-0 rounded-full bg-card px-3.5 py-2 text-[15px] active:opacity-60">
            {s.label}
          </button>
        ))}
      </div>

      <Group
        header="Reference photos"
        footer="Real photos of your product keep it looking exactly right in every shot. Tap to use them in this ad."
      >
        <div className="no-scrollbar flex gap-3 overflow-x-auto p-3">
          <button onClick={() => setUploading(true)} className="w-20 shrink-0 text-left active:opacity-70">
            <div className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-separator text-tint">
              <Plus size={28} />
            </div>
            <p className="pt-1 text-[12px] text-tint">Add photo</p>
          </button>
          {assets.map((a) => (
            <AssetThumb key={a.id} asset={a} selected={selected.includes(a.id)} onClick={() => toggle(a.id)} />
          ))}
        </div>
      </Group>

      <Group header="Length">
        <div className="flex gap-1 p-1">
          {LENGTHS.map((l) => (
            <button
              key={l}
              onClick={() => setLength(l)}
              className={`flex-1 rounded-lg py-2 text-[15px] font-medium ${length === l ? "bg-tint text-white" : "text-label"}`}
            >
              {l}s
            </button>
          ))}
        </div>
      </Group>

      <div className="px-4 pt-2">
        <PrimaryButton onClick={plan} disabled={busy || notes.trim().length < 3}>
          {busy ? <Loader2 className="animate-spin" size={20} /> : <Clapperboard size={20} />}
          {busy ? "Calling the director…" : "Plan my commercial"}
        </PrimaryButton>
        <p className="pt-2 text-center text-[13px] text-secondary">Planning is free — no video is generated yet.</p>
        {error && <p className="pt-1 text-center text-[15px] text-ios-red">{error}</p>}
      </div>

      <UploadSheet
        open={uploading}
        onClose={() => setUploading(false)}
        onUploaded={(a) => {
          setAssets((list) => [a, ...list]);
          setSelected((s) => [...s, a.id]);
        }}
      />
    </main>
  );
}
