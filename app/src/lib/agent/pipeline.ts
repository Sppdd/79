// Takes one inbound message all the way to a sent reply. Used by the WhatsApp webhook and the local simulator.
import { acquireTurnLock, defaultBusiness, getBusinessByPhoneNumberId, getOrCreateCustomer, releaseTurnLock } from "@/db";
import { sendText } from "@/lib/whatsapp/client";
import type { InboundMessage } from "@/lib/whatsapp/webhook";
import { handleTurn } from "./brain";

/** Messages that arrive while a turn is running wait briefly, so replies never cross. */
async function withLock<T>(customerId: string, fn: () => Promise<T>): Promise<T | undefined> {
  for (let attempt = 0; attempt < 10; attempt++) {
    if (await acquireTurnLock(customerId)) {
      try {
        return await fn();
      } finally {
        await releaseTurnLock(customerId);
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return undefined;
}

export async function processInbound(message: InboundMessage): Promise<{ reply?: string; customerId: string }> {
  const business =
    (message.phoneNumberId ? await getBusinessByPhoneNumberId(message.phoneNumberId) : undefined) ??
    (await defaultBusiness());
  const customer = await getOrCreateCustomer(business.id, message.waId, message.name);

  let text = message.text ?? "";
  let transcript: string | undefined;
  if (message.type === "audio") {
    const heard = await transcribeInbound(message);
    transcript = heard;
    text = heard ?? "(رسالة صوتية)";
  }

  const result = await withLock(customer.id, () =>
    handleTurn({ businessId: business.id, customerId: customer.id, text, transcript }),
  );
  if (!result) return { customerId: customer.id };

  await sendText(message.waId, result.reply).catch((err) => console.error("send failed", err));
  return { reply: result.reply, customerId: customer.id };
}

/** Voice notes: transcription lands in phase B (Nemotron ASR on CPU). Until then we ask for text. */
async function transcribeInbound(message: InboundMessage): Promise<string | undefined> {
  void message;
  return undefined;
}
