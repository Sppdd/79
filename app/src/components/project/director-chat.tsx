"use client";

import { ArrowUp, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/db/schema";
import { Sheet } from "../ios/sheet";

const SUGGESTIONS = [
  "Make the whole ad brighter and more premium",
  "Edit 1A: open behind the product and orbit to the front",
  "Add a tight close-up of the product after 1A",
  "Make scene 2 golden hour",
];

/** Talk to the director like an editor: "edit 1A…", "brighter overall…". Only what you name changes. */
export function DirectorChat({
  open,
  onClose,
  projectId,
  messages,
  draft,
  onEdited,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  messages: ChatMessage[];
  draft: string;
  onEdited: (changed: string[]) => void;
}) {
  const [text, setText] = useState(draft);
  const [pending, setPending] = useState<string>();
  const [error, setError] = useState<string>();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, pending]);

  async function send(message = text) {
    if (message.trim().length < 2) return;
    setPending(message);
    setText("");
    setError(undefined);
    const res = await fetch(`/api/projects/${projectId}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    setPending(undefined);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setText(message);
      return;
    }
    onEdited(data.changed);
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex min-h-[60dvh] flex-col">
        <p className="px-4 pt-1 text-center text-[17px] font-semibold">Director</p>
        <p className="px-8 pb-2 text-center text-[13px] text-secondary">Nemotron edits only what you name. Free — no video is generated.</p>

        <div className="flex-1 space-y-2 px-4 py-2">
          {messages.length === 0 && !pending && (
            <div className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="block w-full rounded-xl bg-card px-3.5 py-2.5 text-left text-[15px] active:opacity-60">
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <Bubble key={i} message={m} />
          ))}
          {pending && (
            <>
              <Bubble message={{ role: "owner", text: pending, at: "" }} />
              <div className="flex items-center gap-2 text-[15px] text-secondary">
                <Loader2 size={16} className="animate-spin" /> Rewriting the shot list…
              </div>
            </>
          )}
          {error && <p className="text-[15px] text-ios-red">{error}</p>}
          <div ref={end} />
        </div>

        <div className="sticky bottom-0 flex items-end gap-2 border-t border-separator bg-grouped p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="e.g. Edit 2A: make him walk in from the left"
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-[20px] bg-card px-4 py-2 text-[16px] outline-none placeholder:text-secondary"
          />
          <button
            onClick={() => send()}
            disabled={!!pending || text.trim().length < 2}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint text-white disabled:opacity-40"
            aria-label="Send"
          >
            <ArrowUp size={20} strokeWidth={2.6} />
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const mine = message.role === "owner";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-[18px] px-3.5 py-2 text-[15px] ${mine ? "bg-tint text-white" : "bg-card"}`}>
        {message.text}
        {!!message.changed?.length && (
          <p className="pt-1 text-[12px] text-secondary">Changed: {message.changed.join(", ")}</p>
        )}
      </div>
    </div>
  );
}
