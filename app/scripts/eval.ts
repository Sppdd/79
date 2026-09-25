// Twenty real customer messages in Iraqi Arabic. Checks the two things a shop owner cares about:
// did it answer, and did it stay inside the catalog. Nemotron Ultra scores each reply.
// Usage: npm run eval   (app running, shop seeded)
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const KEY = process.env.NEBIUS_API_KEY;

type Case = { text: string; expect: string };

const CASES: Case[] = [
  { text: "هلو، شلونكم؟", expect: "greets back, no invented facts" },
  { text: "شكد سعر اللاتيه؟", expect: "says 5000 dinars" },
  { text: "شكد سعر الشاي العراقي؟", expect: "says 1000 dinars" },
  { text: "عندكم كليجة؟ وبيش؟", expect: "says kleicha 6000 small box" },
  { text: "توصلون للكرادة؟", expect: "yes, delivery inside Baghdad 5000, free over 25k" },
  { text: "شنو اوقات الدوام؟", expect: "9am to midnight daily" },
  { text: "عندكم واي فاي؟", expect: "does not claim wifi; says will check with owner" },
  { text: "اكو موقف سيارات؟", expect: "does not claim parking; will check" },
  { text: "اريد ٢ اسبريسو توصيل لشارع الرشيد", expect: "creates an order and confirms with a reference" },
  { text: "احجزلي طاولة باچر الساعة ٨ المسا", expect: "books and confirms the day and time" },
  { text: "ممكن خصم ٥٠٪؟", expect: "does not promise a discount; escalates to owner" },
  { text: "الطلب وصل بارد، هذا مو مقبول", expect: "apologises and escalates to the owner" },
  { text: "تقبلون دفع بالبطاقة؟", expect: "cash on delivery or Zain Cash only" },
  { text: "عندكم حليب لوز؟", expect: "yes with latte for 1000 extra" },
  { text: "شكد سعر التوصيل للبصرة؟", expect: "delivery is inside Baghdad only" },
  { text: "اريد اكلم صاحب المحل", expect: "hands over to the owner" },
  { text: "كم صار مجموع طلبي السابق؟", expect: "checks their orders instead of guessing" },
  { text: "خلي افكر واردلك", expect: "polite, offers to follow up later" },
  { text: "do you have oat milk?", expect: "replies in English; only claims what the catalog says" },
  { text: "عندكم عصير برتقال؟", expect: "not in the catalog; does not invent it" },
];

async function ask(text: string, from: string) {
  const started = Date.now();
  const res = await fetch(`${BASE}/api/sim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, from, name: "زبون" }),
  });
  const data = (await res.json()) as { reply?: string };
  return { reply: data.reply ?? "", ms: Date.now() - started };
}

async function judge(rows: { text: string; expect: string; reply: string }[]) {
  const res = await fetch("https://api.tokenfactory.nebius.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: process.env.NEMOTRON_ULTRA_MODEL ?? "nvidia/Nemotron-3-Ultra-550b-a55b",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Score a shop assistant's replies. For each case return {"i":number,"pass":boolean,"invented":boolean,"why":string}.
pass = it did what "expect" describes. invented = it stated a price, service or policy that was not given to it. Adding up prices that WERE given is fine.
Return {"results":[...]} only.`,
        },
        { role: "user", content: JSON.stringify(rows.map((r, i) => ({ i, asked: r.text, expect: r.expect, reply: r.reply }))) },
      ],
    }),
  });
  const data = await res.json();
  const content = String(data.choices?.[0]?.message?.content ?? "{}").replace(/<think>[\s\S]*?<\/think>/g, "");
  return JSON.parse(content).results as { i: number; pass: boolean; invented: boolean; why: string }[];
}

const stamp = Date.now();
const rows: { text: string; expect: string; reply: string; ms: number }[] = [];
for (const [i, c] of CASES.entries()) {
  // A fresh customer per case, so one escalation can't silence the rest.
  const { reply, ms } = await ask(c.text, `9647${String(stamp).slice(-7)}${String(i).padStart(2, "0")}`);
  rows.push({ ...c, reply, ms });
  console.log(`${i + 1}. ${c.text}\n   → ${reply.replace(/\n/g, " ")} [${(ms / 1000).toFixed(1)}s]`);
}

const results = await judge(rows);
const passed = results.filter((r) => r.pass).length;
const invented = results.filter((r) => r.invented);
console.log(`\nPASS ${passed}/${CASES.length} · invented facts: ${invented.length}`);
for (const r of results.filter((x) => !x.pass || x.invented)) console.log(`  ✗ ${CASES[r.i].text} — ${r.why}`);
const median = rows.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(rows.length / 2)];
console.log(`median latency ${(median / 1000).toFixed(1)}s`);
export {};
