import { z } from "zod";
import { addCatalogItems, defaultBusiness, deleteCatalogItem, listCatalog, newId, updateCatalogItem } from "@/db";
import { embed } from "@/lib/ai/nemotron";

const Item = z.object({
  title: z.string().min(1).max(120),
  body: z.string().max(2000).default(""),
  price: z.string().max(40).optional(),
  inStock: z.boolean().default(true),
});

export async function GET() {
  const business = await defaultBusiness();
  const items = await listCatalog(business.id);
  // Embeddings are large; the console never needs them.
  return Response.json(items.map(({ embedding, ...rest }) => ({ ...rest, embedded: Boolean(embedding?.length) })));
}

export async function POST(request: Request) {
  const parsed = Item.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  const business = await defaultBusiness();
  const id = newId();
  const [embedding] = await embed([`${parsed.data.title}\n${parsed.data.body}`]).catch(() => []);
  await addCatalogItems([{ id, businessId: business.id, ...parsed.data, price: parsed.data.price ?? null, embedding: embedding ?? null }]);
  return Response.json({ id });
}

export async function PATCH(request: Request) {
  const body = z.object({ id: z.string() }).and(Item.partial()).safeParse(await request.json().catch(() => ({})));
  if (!body.success) return Response.json({ error: body.error.message }, { status: 400 });
  const { id, ...patch } = body.data;
  // Re-embed when the text changed so search stays in sync.
  const embedding =
    patch.title || patch.body ? (await embed([`${patch.title ?? ""}\n${patch.body ?? ""}`]).catch(() => []))[0] : undefined;
  await updateCatalogItem(id, { ...patch, ...(embedding ? { embedding } : {}) });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const business = await defaultBusiness();
  await deleteCatalogItem(business.id, id);
  return Response.json({ ok: true });
}
