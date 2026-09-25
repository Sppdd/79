// Database access. Postgres in production (DATABASE_URL), embedded PGlite locally — same schema, same queries.
import { and, asc, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  bootstrapSql,
  businesses,
  catalogItems,
  customers,
  jobs,
  messages,
  orders,
  type Business,
  type CatalogItem,
  type Customer,
  type CustomerMemory,
  type Job,
  type Message,
  type Order,
} from "./schema";

type Db = PgDatabase<PgQueryResultHKT>;
let ready: Promise<Db> | undefined;

function db(): Promise<Db> {
  ready ??= (async () => {
    let instance: Db;
    if (process.env.DATABASE_URL) {
      const { drizzle } = await import("drizzle-orm/node-postgres");
      instance = drizzle(process.env.DATABASE_URL) as unknown as Db;
      for (const stmt of bootstrapSql.split(";").map((s) => s.trim()).filter(Boolean)) {
        await instance.execute(sql.raw(stmt));
      }
    } else {
      const { PGlite } = await import("@electric-sql/pglite");
      const { drizzle } = await import("drizzle-orm/pglite");
      const { mkdir } = await import("node:fs/promises");
      const dir = process.env.PGLITE_DIR ?? ".data/pglite";
      await mkdir(dir, { recursive: true });
      const client = new PGlite(dir);
      await client.exec(bootstrapSql);
      instance = drizzle(client) as unknown as Db;
    }
    return instance;
  })().catch((err) => {
    ready = undefined; // retry on the next call instead of caching the failure
    throw err;
  });
  return ready;
}

export const newId = () => crypto.randomUUID().slice(0, 12);

// ─── Business ─────────────────────────────────────────────────────────────────

export async function getBusiness(id: string): Promise<Business | undefined> {
  const [row] = await (await db()).select().from(businesses).where(eq(businesses.id, id));
  return row;
}

export async function getBusinessByPhoneNumberId(phoneNumberId: string): Promise<Business | undefined> {
  const [row] = await (await db()).select().from(businesses).where(eq(businesses.phoneNumberId, phoneNumberId));
  return row;
}

/** The demo runs one shop; this returns it, creating a blank one on first run. */
export async function defaultBusiness(): Promise<Business> {
  const [existing] = await (await db()).select().from(businesses).orderBy(asc(businesses.createdAt)).limit(1);
  if (existing) return existing;
  const id = newId();
  await (await db())
    .insert(businesses)
    .values({ id, name: "متجري", phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID });
  return (await getBusiness(id))!;
}

export async function updateBusiness(id: string, patch: Partial<Omit<Business, "id" | "createdAt">>) {
  await (await db()).update(businesses).set(patch).where(eq(businesses.id, id));
}

// ─── Catalog ──────────────────────────────────────────────────────────────────

export async function listCatalog(businessId: string): Promise<CatalogItem[]> {
  return (await db())
    .select()
    .from(catalogItems)
    .where(eq(catalogItems.businessId, businessId))
    .orderBy(desc(catalogItems.createdAt));
}

export async function addCatalogItems(items: (Omit<CatalogItem, "createdAt"> & { createdAt?: Date })[]) {
  if (items.length) await (await db()).insert(catalogItems).values(items);
}

export async function updateCatalogItem(id: string, patch: Partial<Omit<CatalogItem, "id" | "businessId">>) {
  await (await db()).update(catalogItems).set(patch).where(eq(catalogItems.id, id));
}

export async function deleteCatalogItem(businessId: string, id: string) {
  await (await db()).delete(catalogItems).where(and(eq(catalogItems.businessId, businessId), eq(catalogItems.id, id)));
}

// ─── Customers & messages ─────────────────────────────────────────────────────

export async function getOrCreateCustomer(businessId: string, waId: string, name?: string): Promise<Customer> {
  const [existing] = await (await db())
    .select()
    .from(customers)
    .where(and(eq(customers.businessId, businessId), eq(customers.waId, waId)));
  if (existing) return existing;
  const id = newId();
  await (await db()).insert(customers).values({ id, businessId, waId, name });
  const [created] = await (await db()).select().from(customers).where(eq(customers.id, id));
  return created;
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  const [row] = await (await db()).select().from(customers).where(eq(customers.id, id));
  return row;
}

export async function listCustomers(businessId: string): Promise<Customer[]> {
  return (await db())
    .select()
    .from(customers)
    .where(eq(customers.businessId, businessId))
    .orderBy(desc(customers.lastMessageAt))
    .limit(100);
}

export async function updateCustomer(id: string, patch: Partial<Omit<Customer, "id" | "businessId">>) {
  await (await db()).update(customers).set(patch).where(eq(customers.id, id));
}

export async function rememberFacts(id: string, memory: CustomerMemory) {
  await (await db()).update(customers).set({ memory }).where(eq(customers.id, id));
}

/**
 * Per-conversation lock so two messages from the same customer are answered in order.
 * Returns false when another turn is already running (locks older than 2 minutes count as stale).
 */
export async function acquireTurnLock(customerId: string): Promise<boolean> {
  const stale = new Date(Date.now() - 2 * 60_000);
  const result = await (await db())
    .update(customers)
    .set({ lockedAt: new Date() })
    .where(and(eq(customers.id, customerId), or(isNull(customers.lockedAt), lte(customers.lockedAt, stale))))
    .returning({ id: customers.id });
  return result.length > 0;
}

export async function releaseTurnLock(customerId: string) {
  await (await db()).update(customers).set({ lockedAt: null }).where(eq(customers.id, customerId));
}

export async function addMessage(m: Omit<Message, "createdAt"> & { createdAt?: Date }) {
  await (await db()).insert(messages).values(m);
  await (await db()).update(customers).set({ lastMessageAt: new Date() }).where(eq(customers.id, m.customerId));
}

export async function history(customerId: string, limit = 20): Promise<Message[]> {
  const rows = await (await db())
    .select()
    .from(messages)
    .where(eq(messages.customerId, customerId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  return rows.reverse();
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function createOrder(o: Omit<Order, "createdAt" | "status"> & { status?: Order["status"] }) {
  await (await db()).insert(orders).values(o);
}

export async function listOrders(businessId: string): Promise<Order[]> {
  return (await db())
    .select()
    .from(orders)
    .where(eq(orders.businessId, businessId))
    .orderBy(desc(orders.createdAt))
    .limit(100);
}

export async function updateOrder(businessId: string, id: string, patch: Partial<Pick<Order, "status" | "note">>) {
  await (await db()).update(orders).set(patch).where(and(eq(orders.businessId, businessId), eq(orders.id, id)));
}

export async function customerOrders(customerId: string): Promise<Order[]> {
  return (await db())
    .select()
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.createdAt))
    .limit(10);
}

// ─── Jobs (things the agent does on its own) ──────────────────────────────────

export async function scheduleJob(j: Omit<Job, "createdAt" | "status" | "result">) {
  await (await db()).insert(jobs).values(j);
}

export async function dueJobs(now = new Date()): Promise<Job[]> {
  return (await db())
    .select()
    .from(jobs)
    .where(and(eq(jobs.status, "pending"), lte(jobs.runAt, now)))
    .orderBy(asc(jobs.runAt))
    .limit(20);
}

export async function finishJob(id: string, status: Job["status"], result?: string) {
  await (await db()).update(jobs).set({ status, result }).where(eq(jobs.id, id));
}

/** Customers who went quiet after their last message — used to schedule follow-ups. */
export async function quietCustomers(businessId: string, since: Date): Promise<Customer[]> {
  return (await db())
    .select()
    .from(customers)
    .where(
      and(eq(customers.businessId, businessId), lte(customers.lastMessageAt, since), eq(customers.handedOver, false)),
    )
    .limit(50);
}

export async function recentMessages(businessId: string, since: Date): Promise<Message[]> {
  return (await db())
    .select()
    .from(messages)
    .where(and(eq(messages.businessId, businessId), gt(messages.createdAt, since)))
    .orderBy(asc(messages.createdAt))
    .limit(500);
}
