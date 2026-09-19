"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Group, LargeTitle, PrimaryButton } from "@/components/ios/primitives";
import type { BrandKit } from "@/lib/ai/schemas";

const FIELDS: { key: keyof BrandKit; label: string; placeholder: string }[] = [
  { key: "name", label: "Name", placeholder: "Sunny Side Café" },
  { key: "industry", label: "Business", placeholder: "neighborhood coffee shop" },
  { key: "voice", label: "Voice", placeholder: "warm, playful, local" },
  { key: "audience", label: "Audience", placeholder: "students and young professionals" },
  { key: "website", label: "Website", placeholder: "https://…" },
];

export default function BrandPage() {
  const [kit, setKit] = useState<BrandKit>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/brand").then((r) => r.json()).then(setKit);
  }, []);

  async function save() {
    if (!kit) return;
    const res = await fetch("/api/brand", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...kit, website: kit.website || undefined }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  if (!kit) return <LargeTitle title="Brand Kit" />;

  return (
    <main>
      <LargeTitle title="Brand Kit" subtitle="Every Reel is directed to match this." />

      <Group header="Identity">
        {FIELDS.map(({ key, label, placeholder }) => (
          <label key={key} className="flex items-center gap-3 px-4 py-3">
            <span className="w-24 shrink-0 text-[17px]">{label}</span>
            <input
              value={kit[key] ?? ""}
              onChange={(e) => setKit({ ...kit, [key]: e.target.value })}
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent text-right text-[17px] outline-none placeholder:text-secondary"
            />
          </label>
        ))}
      </Group>

      <Group header="Color" footer="Used for lighting accents, caption boxes and the end card.">
        <label className="flex items-center justify-between px-4 py-3">
          <span className="text-[17px]">Primary color</span>
          <span className="flex items-center gap-2 text-secondary">
            {kit.primaryColor.toUpperCase()}
            <input
              type="color"
              value={kit.primaryColor}
              onChange={(e) => setKit({ ...kit, primaryColor: e.target.value })}
              className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent"
            />
          </span>
        </label>
      </Group>

      <div className="px-4 pt-2">
        <PrimaryButton onClick={save}>{saved ? <><Check size={20} /> Saved</> : "Save Brand Kit"}</PrimaryButton>
      </div>
    </main>
  );
}
