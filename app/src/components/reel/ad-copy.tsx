"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { AdCopy } from "@/lib/ai/schemas";
import { Group } from "../ios/primitives";

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text).then(() => (setDone(true), setTimeout(() => setDone(false), 1200)))}
      className="shrink-0 text-tint"
      aria-label="Copy"
    >
      {done ? <Check size={18} /> : <Copy size={18} />}
    </button>
  );
}

export function AdCopyList({ adCopy }: { adCopy: AdCopy }) {
  const caption = `${adCopy.caption}\n\n${adCopy.hashtags.slice(0, 8).join(" ")}`;
  return (
    <>
      <Group header="Reel caption">
        <div className="flex gap-3 px-4 py-3">
          <p className="flex-1 text-[15px] whitespace-pre-line">{caption}</p>
          <CopyButton text={caption} />
        </div>
      </Group>
      <Group header="Meta ad variants" footer="Run all three as an A/B test and keep the winner.">
        {adCopy.variants.map((v, i) => (
          <div key={i} className="flex gap-3 px-4 py-3">
            <div className="flex-1">
              <p className="text-[15px] font-semibold">{v.headline}</p>
              <p className="text-[15px] text-secondary">{v.primaryText}</p>
              <p className="pt-1 text-[13px] font-semibold text-tint">{v.cta}</p>
            </div>
            <CopyButton text={`${v.headline}\n${v.primaryText}`} />
          </div>
        ))}
      </Group>
    </>
  );
}
