import { defaultBusiness, getCustomer, listOrders } from "@/db";

export async function GET() {
  const business = await defaultBusiness();
  const orders = await listOrders(business.id);
  return Response.json(
    await Promise.all(
      orders.map(async (o) => ({ ...o, customer: (await getCustomer(o.customerId))?.name ?? (await getCustomer(o.customerId))?.waId })),
    ),
  );
}
