// The only file that talks to Meta's WhatsApp Cloud API.
// Without WHATSAPP_TOKEN the app still works end to end — replies are stored and shown in the console/simulator.

const API = process.env.WHATSAPP_API_URL ?? "https://graph.facebook.com/v21.0";

export const whatsappReady = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

async function call(path: string, body: unknown) {
  const res = await fetch(`${API}/${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`whatsapp ${path} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

export async function sendText(to: string, text: string) {
  if (!whatsappReady()) return { skipped: true };
  return call(`${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  });
}

/** Voice note reply: upload the audio, then send it as an audio message. */
export async function sendAudio(to: string, audio: Buffer, mimeType = "audio/ogg") {
  if (!whatsappReady()) return { skipped: true };
  const form = new FormData();
  form.set("messaging_product", "whatsapp");
  form.set("type", mimeType);
  form.set("file", new Blob([new Uint8Array(audio)], { type: mimeType }), "reply.ogg");

  const upload = await fetch(`${API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!upload.ok) throw new Error(`whatsapp media upload ${upload.status}: ${(await upload.text()).slice(0, 300)}`);
  const { id } = (await upload.json()) as { id: string };

  return call(`${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "audio",
    audio: { id },
  });
}

export async function markRead(messageId: string) {
  if (!whatsappReady()) return { skipped: true };
  return call(`${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  }).catch(() => ({ skipped: true }));
}

/** Download an inbound voice note: media id → temporary URL → bytes. */
export async function downloadMedia(mediaId: string): Promise<{ bytes: Buffer; mimeType: string }> {
  const meta = await fetch(`${API}/${mediaId}`, {
    headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!meta.ok) throw new Error(`whatsapp media ${meta.status}`);
  const { url, mime_type } = (await meta.json()) as { url: string; mime_type: string };

  const file = await fetch(url, {
    headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    signal: AbortSignal.timeout(60_000),
  });
  if (!file.ok) throw new Error(`whatsapp media download ${file.status}`);
  return { bytes: Buffer.from(await file.arrayBuffer()), mimeType: mime_type };
}
