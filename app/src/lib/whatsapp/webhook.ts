// Parsing and verifying what Meta posts to us.
import { createHmac, timingSafeEqual } from "node:crypto";

export type InboundMessage = {
  waId: string; // customer's number
  name?: string;
  messageId: string;
  phoneNumberId: string;
  type: "text" | "audio" | "other";
  text?: string;
  mediaId?: string;
};

/** Meta signs every POST with the app secret; reject anything else when the secret is configured. */
export function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // local/dev without Meta
  if (!signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

type Payload = {
  entry?: {
    changes?: {
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: {
          id?: string;
          from?: string;
          type?: string;
          text?: { body?: string };
          audio?: { id?: string };
        }[];
      };
    }[];
  }[];
};

export function parseInbound(body: unknown): InboundMessage[] {
  const payload = body as Payload;
  const out: InboundMessage[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id ?? "";
      const name = value?.contacts?.[0]?.profile?.name;
      for (const m of value?.messages ?? []) {
        if (!m.from || !m.id) continue;
        out.push({
          waId: m.from,
          name,
          messageId: m.id,
          phoneNumberId,
          type: m.type === "text" ? "text" : m.type === "audio" ? "audio" : "other",
          text: m.text?.body,
          mediaId: m.audio?.id,
        });
      }
    }
  }
  return out;
}
