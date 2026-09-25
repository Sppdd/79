# سند · Sanad

**An Arabic WhatsApp agent for small shops.** A customer messages the shop; Sanad answers in their own dialect from
the shop's real catalog, takes the order or the booking, calls the owner when it should, and follows up on its own.
The owner watches everything from a phone-sized console.

Track: **Best Apps and Agents** — Nebius x NVIDIA Global AI Hackathon.

## Why this is different

Most "AI reply bots" happily invent a price. Sanad can't:

1. Every factual answer must come from the shop's catalog (`searchCatalog`).
2. Before any reply is sent, a second model checks each claim against what was actually looked up.
3. If a claim isn't supported, the agent rewrites it once, and otherwise says it will check with the owner — and
   the owner gets a notification.

In a 20-question Iraqi-Arabic test set (`npm run eval`, judged by Nemotron 3 Ultra): **19/20 correct behaviour,
0 invented facts**, median reply 10 s.

## How NVIDIA models and Nebius are used

| Job | Model / service |
|---|---|
| Triage every message (intent, difficulty, language) | **Nemotron 3.5 Lightning** on Token Factory |
| Everyday replies, orders, bookings, follow-ups | **Nemotron 3 Super** |
| Complaints, haggling, refunds, the daily summary | **Nemotron 3 Ultra** |
| Checking the reply invents nothing | **Nemotron 3.5 Lightning** (guardrail pass) |
| Remembering a customer between chats | **Nemotron 3 Nano** |
| Catalog search | Qwen3-Embedding-8B on Token Factory + word matching |
| Turning a pasted price list into a catalog | **Nemotron 3 Super** |
| Hearing and speaking voice notes (next phase) | **Nemotron 3.5 ASR** and **NVIDIA Magpie TTS**, on CPU |

Small models do the constant work, the big one only handles turns where a sale is at stake — so a conversation
costs about **$0.002**.

## What it can do

- Answers questions about products, prices, stock, delivery and hours — only from the catalog.
- Takes **orders** and **bookings**, and confirms with a short reference.
- **Escalates** to the owner: unknown answers, complaints, refunds, discount requests, "let me talk to a person".
- **Follows up** by itself when a customer says they'll think about it.
- Sends the owner an **end-of-day summary** of what customers asked for and what needs them.
- The owner can take over any chat, and the agent goes quiet until they hand it back.

## Run it

```bash
cd app
cp .env.example .env          # add NEBIUS_API_KEY; WhatsApp keys are optional
npm install
npm run dev                   # http://localhost:3000
npm run seed                  # a demo Baghdad café with a real price list
npm run chat "شكد سعر اللاتيه؟"   # talk to it like a customer
npm run eval                  # the 20-question quality check
```

Without WhatsApp keys everything still works: the console has a built-in simulator that goes through the same
pipeline as a real message.

### With Docker (what gets deployed)

```bash
docker compose up --build     # app + Postgres + the jobs timer
```

### Connecting real WhatsApp

1. Meta developer account → a WhatsApp app → use the **test number**, with your own number as a tester.
2. Expose the app: `cloudflared tunnel --url http://localhost:3000`.
3. Webhook URL `https://<tunnel>/api/whatsapp/webhook`, verify token = `WHATSAPP_VERIFY_TOKEN`, subscribe to `messages`.
4. Put `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_APP_SECRET` in `.env`.

### Deploying to Nebius

The same image runs on a Nebius Serverless Endpoint (CPU preset) once AI Cloud is funded:

```bash
nebius ai endpoint create --name sanad --image <registry>/sanad --container-port 3000 \
  --platform cpu-d3 --preset 4vcpu-16gb --public
```

## Layout

```
app/src/lib/agent/    brain (routing + guardrail loop), tools, memory, jobs, prompt
app/src/lib/ai/       the only file that calls Token Factory (chat, tools, embeddings)
app/src/lib/whatsapp/ Cloud API client + webhook parsing/verification
app/src/app/api/      whatsapp webhook, simulator, console APIs, cron
app/src/app/          the owner's console (Arabic, right-to-left)
app/scripts/          seed, chat, eval, models
```

## License

MIT
