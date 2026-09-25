// Meta's webhook. GET verifies the subscription; POST receives messages.
// Meta retries anything slower than a few seconds, so we acknowledge first and answer in the background.
import { processInbound } from "@/lib/agent/pipeline";
import { markRead } from "@/lib/whatsapp/client";
import { parseInbound, verifySignature } from "@/lib/whatsapp/webhook";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifySignature(raw, request.headers.get("x-hub-signature-256"))) {
    return new Response("bad signature", { status: 401 });
  }

  const messages = parseInbound(JSON.parse(raw));
  for (const message of messages) {
    void markRead(message.messageId);
    void processInbound(message).catch((err) => console.error("processInbound failed", err));
  }
  return Response.json({ received: messages.length });
}
