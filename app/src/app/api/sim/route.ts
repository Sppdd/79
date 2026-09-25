// Local simulator: pretend to be a customer without Meta. Used by scripts/chat.ts and the console's test panel.
// Disabled in production unless SIM_ENABLED=1, so nobody can inject messages into a live shop.
import { z } from "zod";
import { processInbound } from "@/lib/agent/pipeline";

const Body = z.object({
  from: z.string().default("9647700000000"),
  name: z.string().optional(),
  text: z.string().min(1),
});

export const maxDuration = 120;

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && process.env.SIM_ENABLED !== "1") {
    return Response.json({ error: "simulator disabled" }, { status: 404 });
  }
  const body = Body.safeParse(await request.json().catch(() => ({})));
  if (!body.success) return Response.json({ error: body.error.message }, { status: 400 });

  const result = await processInbound({
    waId: body.data.from,
    name: body.data.name,
    messageId: `sim-${Date.now()}`,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    type: "text",
    text: body.data.text,
  });
  return Response.json(result);
}
