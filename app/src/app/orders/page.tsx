"use client";

import { useEffect, useState } from "react";
import { Group, LargeTitle, Pill } from "@/components/ios/primitives";

type Order = {
  id: string;
  kind: "order" | "booking";
  items: { title: string; quantity: number }[];
  slot?: string | null;
  address?: string | null;
  status: "new" | "confirmed" | "done" | "cancelled";
  customer?: string;
  createdAt: string;
};

const TONE = { new: "blue", confirmed: "orange", done: "green", cancelled: "gray" } as const;
const LABEL = { new: "جديد", confirmed: "مؤكد", done: "منجز", cancelled: "ملغي" } as const;
const NEXT = { new: "confirmed", confirmed: "done", done: "new", cancelled: "new" } as const;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>();

  const load = () =>
    fetch("/api/orders")
      .then((r) => r.json())
      .then(setOrders)
      .catch(() => setOrders([]));

  useEffect(() => {
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, []);

  async function advance(order: Order) {
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: NEXT[order.status] }),
    });
    load();
  }

  return (
    <main>
      <LargeTitle title="الطلبات" subtitle="كل طلب أو حجز سجله المساعد." />
      {orders?.length === 0 && <p className="px-8 pt-16 text-center text-[17px] text-secondary">ما اكو طلبات بعد</p>}
      {!!orders?.length && (
        <Group>
          {orders.map((o) => (
            <button key={o.id} onClick={() => advance(o)} className="block w-full px-4 py-3 text-right active:bg-fill">
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate text-[17px]">
                  {o.kind === "booking" ? `حجز · ${o.slot ?? ""}` : o.items.map((i) => `${i.quantity}× ${i.title}`).join("، ")}
                </span>
                <Pill tone={TONE[o.status]}>{LABEL[o.status]}</Pill>
              </div>
              <p className="text-[13px] text-secondary">
                {o.customer} · {new Date(o.createdAt).toLocaleString("ar", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                {o.address ? ` · ${o.address}` : ""}
              </p>
            </button>
          ))}
        </Group>
      )}
    </main>
  );
}
