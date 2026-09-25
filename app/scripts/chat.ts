// Talk to the agent from the terminal, as if you were a customer on WhatsApp.
// Usage: npm run chat "شكد سعر اللاتيه؟"   (or with no argument for an interactive session)
import { createInterface } from "node:readline/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const from = process.env.FROM ?? "9647701234567";

async function say(text: string) {
  const started = Date.now();
  const res = await fetch(`${BASE}/api/sim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, from, name: "أبو علي" }),
  });
  const data = (await res.json()) as { reply?: string; error?: string };
  console.log(`\n🤖 ${data.reply ?? data.error ?? "(no reply)"}  \x1b[2m[${((Date.now() - started) / 1000).toFixed(1)}s]\x1b[0m\n`);
}

const argument = process.argv.slice(2).join(" ");
if (argument) {
  await say(argument);
} else {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log("اكتب رسالتك (Ctrl+C للخروج)");
  for (;;) {
    const line = await rl.question("👤 ");
    if (!line.trim()) continue;
    await say(line);
  }
}
export {};
