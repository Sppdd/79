"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Group, LargeTitle, Pill, PrimaryButton } from "@/components/ios/primitives";
import { Sheet } from "@/components/ios/sheet";

type Item = { id: string; title: string; body: string; price?: string | null; inStock: boolean; embedded: boolean };

export default function CatalogPage() {
  const [items, setItems] = useState<Item[]>();
  const [importing, setImporting] = useState(false);
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const load = () =>
    fetch("/api/catalog")
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setItems([]));

  useEffect(() => {
    load();
  }, []);

  async function importList() {
    setBusy(true);
    setError(undefined);
    const res = await fetch("/api/catalog/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: paste }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "ما زبطت");
    setPaste("");
    setImporting(false);
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/catalog?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main>
      <LargeTitle
        title="المنتجات"
        subtitle="المساعد ما يذكر سعر أو توفر إلا من هنا."
        action={
          <button onClick={() => setImporting(true)} className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-tint text-white" aria-label="إضافة">
            <Plus size={22} />
          </button>
        }
      />

      {items?.length === 0 && (
        <div className="px-8 pt-16 text-center text-secondary">
          <p className="text-[17px]">القائمة فارغة</p>
          <p className="pt-1 text-[15px]">الصق قائمة أسعارك وسند يرتبها.</p>
          <button onClick={() => setImporting(true)} className="pt-3 text-[17px] text-tint">
            الصق القائمة
          </button>
        </div>
      )}

      {!!items?.length && (
        <Group footer={`${items.length} عنصر`}>
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[17px]">
                  {item.title}
                  {!item.inStock && <Pill tone="red">مو متوفر</Pill>}
                  {!item.embedded && <Pill tone="gray">بدون فهرسة</Pill>}
                </p>
                <p className="text-[15px] text-secondary">{item.body}</p>
              </div>
              <span className="shrink-0 text-[15px] font-semibold">{item.price ?? "—"}</span>
              <button onClick={() => remove(item.id)} className="shrink-0 text-ios-red" aria-label="حذف">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </Group>
      )}

      <Sheet open={importing} onClose={() => setImporting(false)}>
        <div className="pb-6">
          <p className="px-4 pt-1 text-center text-[17px] font-semibold">الصق قائمة الأسعار</p>
          <p className="px-8 pb-2 text-center text-[13px] text-secondary">أي شكل: منيو، رسالة واتساب، جدول. نيموترون يرتبها.</p>
          <Group>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={10}
              placeholder={"مثال:\nشاي عراقي ١٠٠٠ دينار\nكيك تمر ٣٠٠٠ — متوفر بالويكند\nتوصيل داخل بغداد ٥٠٠٠"}
              className="block w-full resize-none bg-transparent p-4 text-[16px] outline-none placeholder:text-secondary"
            />
          </Group>
          <div className="px-4">
            <PrimaryButton onClick={importList} disabled={busy || paste.trim().length < 5}>
              {busy && <Loader2 size={20} className="animate-spin" />}
              {busy ? "أرتبها…" : "أضف للقائمة"}
            </PrimaryButton>
            {error && <p className="pt-2 text-center text-[15px] text-ios-red">{error}</p>}
          </div>
        </div>
      </Sheet>
    </main>
  );
}
