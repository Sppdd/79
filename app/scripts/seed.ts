// Fills a demo shop (a Baghdad café) so the agent has something real to answer from.
// Usage: npm run seed  (the app must be running)
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const business = {
  name: "مقهى الرشيد",
  about: "مقهى في الكرادة ببغداد — قهوة مختصة، شاي عراقي، وحلويات تمر. جلسة داخلية وتوصيل.",
  hours: "٩ صباحاً – ١٢ منتصف الليل، كل يوم",
  policies: [
    "التوصيل داخل بغداد فقط، أجرة التوصيل ٥٠٠٠ دينار، ومجاني للطلبات فوق ٢٥ ألف.",
    "الدفع عند الاستلام أو زين كاش.",
    "ما اكو خصومات إلا بموافقة المالك.",
    "الحجز للجلسات الكبيرة (أكثر من ٦ أشخاص) يحتاج تأكيد من المالك.",
  ].join("\n"),
  dialect: "iraqi",
};

const priceList = `
قهوة عربية ٣٠٠٠ دينار
اسبريسو ٤٠٠٠
لاتيه ٥٠٠٠ — يتوفر بحليب لوز بزيادة ١٠٠٠
شاي عراقي ١٠٠٠ دينار — استكان
كيك التمر ٤٠٠٠ قطعة
كليجة تمر ٦٠٠٠ علبة صغيرة
حجز طاولة داخل المقهى — مجاني
توصيل داخل بغداد ٥٠٠٠ دينار
`;

const ok = (res: Response, what: string) => {
  if (!res.ok) throw new Error(`${what} failed: ${res.status}`);
  return res.json();
};

await fetch(`${BASE}/api/business`, {
  method: "PUT",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(business),
}).then((r) => ok(r, "business"));

const imported = await fetch(`${BASE}/api/catalog/import`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ text: priceList }),
}).then((r) => ok(r, "catalog"));

console.log(`seeded ${business.name}:`, imported);
export {};
