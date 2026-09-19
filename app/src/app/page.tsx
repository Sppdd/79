"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Group, LargeTitle, PrimaryButton } from "@/components/ios/primitives";

const STARTERS = [
  { label: "☕️ New product", text: "New cinnamon oat latte, $4.50\nOnly this weekend\nMade with local honey" },
  { label: "🏷️ Flash sale", text: "20% off all candles until Sunday\nHand-poured soy wax\nFree gift wrap" },
  { label: "🎉 Event", text: "Live acoustic night this Friday 7pm\nFree entry, happy hour drinks\nBring a friend" },
];

export default function CreatePage() {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function makeReel() {
    setBusy(true);
    setError(undefined);
    const res = await fetch("/api/reels", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notes }),
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
      <LargeTitle title="Create" subtitle="Your notes in, a Reel that sells out." />

      <Group header="What are you promoting?" footer="Product, price, offer, deadline — rough notes are fine.">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={7}
          placeholder={"e.g. New cinnamon oat latte, $4.50\nOnly this weekend"}
          className="block w-full resize-none bg-transparent p-4 text-[17px] leading-snug outline-none placeholder:text-secondary"
        />
      </Group>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
        {STARTERS.map((s) => (
          <button
            key={s.label}
            onClick={() => setNotes(s.text)}
            className="shrink-0 rounded-full bg-card px-3.5 py-2 text-[15px] active:opacity-60"
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4">
        <PrimaryButton onClick={makeReel} disabled={busy || notes.trim().length < 3}>
          {busy ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
          {busy ? "Starting your director…" : "Make Reel"}
        </PrimaryButton>
        {error && <p className="pt-2 text-center text-[15px] text-ios-red">{error}</p>}
      </div>

      <Group header="How it works">
        {[
          ["🧠", "Nemotron writes the brief", "Understands your notes and brand"],
          ["🎬", "Nemotron 3 Ultra directs", "Hook, script, shot list, captions, voiceover"],
          ["🖼️", "Shots are generated", "Best media model for each shot"],
          ["🔍", "Nemotron reviews every frame", "Bad shots are regenerated automatically"],
          ["🎞️", "Rendered on Nebius", "9:16, 1:1 and 4:5 — ready for Reels & Meta ads"],
        ].map(([emoji, title, sub]) => (
          <div key={title} className="flex items-center gap-3 px-4 py-3">
            <span className="text-2xl">{emoji}</span>
            <div>
              <p className="text-[17px]">{title}</p>
              <p className="text-[13px] text-secondary">{sub}</p>
            </div>
          </div>
        ))}
      </Group>
    </main>
  );
}
