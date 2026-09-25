"use client";

import { MessageSquareDashed, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Group, LargeTitle, Pill } from "@/components/ios/primitives";

type Chat = {
  id: string;
  waId: string;
  name?: string | null;
  handedOver: boolean;
  lastMessageAt: string;
  preview: string;
};

export default function InboxPage() {
  const [chats, setChats] = useState<Chat[]>();
  const [test, setTest] = useState("");
  const [sending, setSending] = useState(false);

  const load = () =>
    fetch("/api/chats")
      .then((r) => r.json())
      .then(setChats)
      .catch(() => setChats([]));

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  async function sendTest() {
    if (!test.trim()) return;
    setSending(true);
    await fetch("/api/sim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: test, name: "زبون تجريبي" }),
    });
    setTest("");
    setSending(false);
    load();
  }

  return (
    <main>
      <LargeTitle title="المحادثات" subtitle="المساعد يرد، وأنت تتدخل وقت ما تحب." />

      {chats?.length === 0 && (
        <div className="flex flex-col items-center gap-3 px-8 pt-16 text-center text-secondary">
          <MessageSquareDashed size={48} strokeWidth={1.4} />
          <p className="text-[17px]">ما وصلتك رسائل بعد</p>
          <p className="text-[15px]">جرب ترسل رسالة تجريبية من الأسفل.</p>
        </div>
      )}

      {!!chats?.length && (
        <Group>
          {chats.map((c) => (
            <Link key={c.id} href={`/chat/${c.id}`} className="block px-4 py-3 active:bg-fill">
              <div className="flex items-center gap-2">
                <p className="flex-1 truncate text-[17px]">{c.name || c.waId}</p>
                {c.handedOver && <Pill tone="orange">أنت ترد</Pill>}
                <span className="text-[13px] text-secondary">{new Date(c.lastMessageAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <p className="truncate text-[15px] text-secondary">{c.preview}</p>
            </Link>
          ))}
        </Group>
      )}

      <Group header="رسالة تجريبية" footer="تنفع للتجربة بدون واتساب — تمر بنفس مسار الرسائل الحقيقية.">
        <div className="flex items-center gap-2 p-2">
          <input
            value={test}
            onChange={(e) => setTest(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendTest()}
            placeholder="مثال: شكد سعر التوصيل للكرادة؟"
            className="flex-1 bg-transparent px-2 py-2 text-[16px] outline-none placeholder:text-secondary"
          />
          <button
            onClick={sendTest}
            disabled={sending || !test.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-tint text-white disabled:opacity-40"
            aria-label="إرسال"
          >
            <Send size={18} />
          </button>
        </div>
      </Group>
    </main>
  );
}
