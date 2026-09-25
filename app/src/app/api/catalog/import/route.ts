// The owner pastes their price list however they keep it (WhatsApp text, a menu, a CSV) and Nemotron turns it
// into clean catalog rows. This is the step that makes the agent safe to trust: it only ever quotes these rows.
import { z } from "zod";
import { addCatalogItems, defaultBusiness, newId } from "@/db";
import { askJson, embed, hasNemotron } from "@/lib/ai/nemotron";

const Parsed = z.object({
  items: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        body: z.string().max(600).describe("details: sizes, options, notes — keep the owner's wording"),
        price: z.string().max(40).optional(),
        inStock: z.boolean().default(true),
      }),
    )
    .max(60),
});

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = z.object({ text: z.string().min(5).max(20000) }).safeParse(await request.json().catch(() => ({})));
  if (!body.success) return Response.json({ error: "Paste your price list or menu." }, { status: 400 });
  if (!hasNemotron()) return Response.json({ error: "NEBIUS_API_KEY is not set" }, { status: 400 });

  const business = await defaultBusiness();
  const parsed = await askJson({
    tier: "super",
    schema: Parsed,
    system: `Turn a small business's price list into catalog rows.
Keep the owner's own words and language (Arabic stays Arabic). One row per product or service.
price: copy exactly what is written (with currency); leave it out when no price is given.
Never invent products, prices or availability.`,
    user: body.data.text,
    temperature: 0.1,
  });

  const embeddings = await embed(parsed.items.map((i) => `${i.title}\n${i.body}`)).catch(() => []);
  await addCatalogItems(
    parsed.items.map((item, i) => ({
      id: newId(),
      businessId: business.id,
      title: item.title,
      body: item.body,
      price: item.price ?? null,
      inStock: item.inStock,
      embedding: embeddings[i] ?? null,
    })),
  );
  return Response.json({ added: parsed.items.length });
}
