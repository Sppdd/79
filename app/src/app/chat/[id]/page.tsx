"use client";

import { Send, UserRoundCheck } from "lucide-react";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { NavBar, Pill } from "@/components/ios/primitives";

type Msg = {
  id: string;
  role: "customer" | "agent" | "owner" | "system";
  text: string;
  transcript?: string | null;
  model?: string | null;
  latencyMs?: number | null;
  toolCalls?: { name: string }[] | null;
  createdAt: string;
};
type Chat = { customer: { id: string; name?: string | null; waId: string; handedOver: boolean }; messages: Msg[] };

export default function ChatPage({ params }: PageProps<"/chat/[id]">) {
  const { id } = use(params);
  const [chat, setChat] = useState<Chat>();
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);

  const load = useCallback(
    () =>
      fetch(`/api/chats/${id}`, { cache: "no-store" })
        .then((r) => r.json())
        .then(setChat)
        .catch(() => {}),
    [id],
  );

  useEffect(() => {
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    end.current?.scrollIntoView();
  }, [chat?.messages.length]);

  async function post(body: object) {
    await fetch(`/api/chats/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    load();
  }

  const handedOver = chat?.customer.handedOver;

  return (
    <main className="pb-20">
      <NavBar
        back={{ href: "/", label: "المحادثات" }}
        title={chat?.customer.name || chat?.customer.waId}
        action={
          <button onClick={() => post({ handedOver: !handedOver })} className="text-[15px] text-tint">
            {handedOver ? "رجّع للمساعد" : "استلم المحادثة"}
          </button>
        }
      />

      <div className="space-y-2 px-4 py-4">
        {chat?.messages.map((m) => {
          const mine = m.role !== "customer";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[85%] rounded-[18px] px-3.5 py-2 text-[15px] ${m.role === "customer" ? "bg-card" : m.role === "owner" ? "bg-ios-green text-white" : "bg-tint text-white"}`}>
                {m.transcript ?? m.text}
                <span className="block pt-1 text-[11px] opacity-70">
                  {new Date(m.createdAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                  {m.model ? ` · ${m.model}` : ""}
                  {m.latencyMs ? ` · ${(m.latencyMs / 1000).toFixed(1)}s` : ""}
                  {m.toolCalls?.length ? ` · ${m.toolCalls.map((t) => t.name).join(", ")}` : ""}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>

      {handedOver && (
        <div className="px-4 pb-2">
          <Pill tone="orange">
            <span className="flex items-center gap-1">
              <UserRoundCheck size={13} /> المساعد متوقف بهذه المحادثة
            </span>
          </Pill>
        </div>
      )}

      <div className="pb-safe fixed inset-x-0 bottom-16 z-30 mx-auto flex max-w-md items-end gap-2 border-t border-separator bg-bar p-3 backdrop-blur-xl">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) {
                post({ text, handedOver: true });
                setText("");
              }
            }
          }}
          rows={1}
          placeholder="اكتب ردك بنفسك…"
          className="max-h-28 min-h-[40px] flex-1 resize-none rounded-[20px] bg-card px-4 py-2 text-[16px] outline-none placeholder:text-secondary"
        />
        <button
          onClick={() => {
            if (!text.trim()) return;
            post({ text, handedOver: true });
            setText("");
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint text-white"
          aria-label="إرسال"
        >
          <Send size={18} />
        </button>
      </div>
    </main>
  );
}
