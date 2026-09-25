"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Group, LargeTitle, PrimaryButton } from "@/components/ios/primitives";

type Business = {
  id: string;
  name: string;
  about: string;
  policies: string;
  hours: string;
  dialect: "iraqi" | "gulf" | "egyptian" | "levantine" | "msa";
  ownerPhone?: string | null;
  paused: boolean;
};

const DIALECTS: { value: Business["dialect"]; label: string }[] = [
  { value: "iraqi", label: "عراقي" },
  { value: "gulf", label: "خليجي" },
  { value: "egyptian", label: "مصري" },
  { value: "levantine", label: "شامي" },
  { value: "msa", label: "فصحى" },
];

const FIELDS: { key: keyof Business; label: string; placeholder: string; rows?: number }[] = [
  { key: "name", label: "اسم المتجر", placeholder: "مقهى الرشيد" },
  { key: "hours", label: "أوقات الدوام", placeholder: "٩ صباحاً – ١١ مساءً، يومياً" },
  { key: "ownerPhone", label: "رقمك للتنبيهات", placeholder: "9647700000000" },
];

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/business")
      .then((r) => r.json())
      .then(setBusiness)
      .catch(() => {});
  }, []);

  async function save() {
    if (!business) return;
    const res = await fetch("/api/business", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(business),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  if (!business) return <LargeTitle title="الإعدادات" />;

  return (
    <main>
      <LargeTitle title="الإعدادات" subtitle="كل ما يعرفه المساعد عن متجرك." />

      <Group header="المتجر">
        {FIELDS.map(({ key, label, placeholder }) => (
          <label key={key} className="flex items-center gap-3 px-4 py-3">
            <span className="w-28 shrink-0 text-[17px]">{label}</span>
            <input
              value={(business[key] as string) ?? ""}
              onChange={(e) => setBusiness({ ...business, [key]: e.target.value })}
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent text-left text-[17px] outline-none placeholder:text-secondary"
              dir="auto"
            />
          </label>
        ))}
      </Group>

      <Group header="اللهجة" footer="المساعد يرد بهذه اللهجة، ويجاري لغة الزبون إذا كتب بغيرها.">
        <div className="no-scrollbar flex gap-2 overflow-x-auto p-3">
          {DIALECTS.map((d) => (
            <button
              key={d.value}
              onClick={() => setBusiness({ ...business, dialect: d.value })}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[15px] ${business.dialect === d.value ? "bg-tint text-white" : "bg-fill"}`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </Group>

      <Group header="عن المتجر" footer="وش تبيع، وين موقعك، شنو يميزك.">
        <textarea
          value={business.about}
          onChange={(e) => setBusiness({ ...business, about: e.target.value })}
          rows={4}
          placeholder="مقهى في الكرادة، قهوة مختصة وحلويات تمر…"
          className="block w-full resize-none bg-transparent p-4 text-[16px] outline-none placeholder:text-secondary"
        />
      </Group>

      <Group header="القواعد" footer="حدود ما يقدر يوعد فيه: التوصيل، الدفع، الاسترجاع، الخصومات.">
        <textarea
          value={business.policies}
          onChange={(e) => setBusiness({ ...business, policies: e.target.value })}
          rows={5}
          placeholder={"التوصيل داخل بغداد فقط، ٥٠٠٠ دينار\nالدفع عند الاستلام\nما اكو خصومات بدون موافقتي"}
          className="block w-full resize-none bg-transparent p-4 text-[16px] outline-none placeholder:text-secondary"
        />
      </Group>

      <Group header="إيقاف مؤقت" footer="إذا أوقفته، ما يرد على أي زبون حتى ترجعه.">
        <label className="flex items-center justify-between px-4 py-3">
          <span className="text-[17px]">إيقاف المساعد</span>
          <input
            type="checkbox"
            checked={business.paused}
            onChange={(e) => setBusiness({ ...business, paused: e.target.checked })}
            className="h-6 w-6 accent-[var(--tint)]"
          />
        </label>
      </Group>

      <div className="px-4 pt-2">
        <PrimaryButton onClick={save}>{saved ? <><Check size={20} /> انحفظ</> : "حفظ"}</PrimaryButton>
      </div>
    </main>
  );
}
