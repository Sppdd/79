// Database access. Neon Postgres in production (DATABASE_URL), embedded PGlite locally — same schema, same queries.
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { BrandKit } from "@/lib/ai/schemas";
import { assets, bootstrapSql, brandKits, projects, type Asset, type Project } from "./schema";

type Db = PgDatabase<PgQueryResultHKT>;
let ready: Promise<Db> | undefined;

function db(): Promise<Db> {
  ready ??= (async () => {
    let instance: Db;
    if (process.env.DATABASE_URL) {
      const { neon } = await import("@neondatabase/serverless");
      const { drizzle } = await import("drizzle-orm/neon-http");
      instance = drizzle(neon(process.env.DATABASE_URL)) as unknown as Db;
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

export async function createProject(p: {
  id: string;
  deviceId: string;
  notes: string;
  brand: BrandKit;
  assetIds: string[];
  targetSec: number;
}) {
  await (await db()).insert(projects).values(p);
}

export async function getProject(id: string): Promise<Project | undefined> {
  const [row] = await (await db()).select().from(projects).where(eq(projects.id, id));
  return row;
}

export async function listProjects(deviceId: string): Promise<Project[]> {
  return (await db()).select().from(projects).where(eq(projects.deviceId, deviceId)).orderBy(desc(projects.createdAt)).limit(50);
}

export async function updateProject(id: string, patch: Partial<Omit<Project, "id" | "deviceId" | "createdAt">>) {
  await (await db()).update(projects).set(patch).where(eq(projects.id, id));
}

export async function getBrandKit(deviceId: string): Promise<BrandKit | undefined> {
  const [row] = await (await db()).select().from(brandKits).where(eq(brandKits.deviceId, deviceId));
  return row?.kit;
}

export async function saveBrandKit(deviceId: string, kit: BrandKit) {
  await (await db())
    .insert(brandKits)
    .values({ deviceId, kit })
    .onConflictDoUpdate({ target: brandKits.deviceId, set: { kit, updatedAt: new Date() } });
}

export async function createAsset(a: Omit<Asset, "createdAt" | "locked" | "description"> & { description?: string }) {
  await (await db()).insert(assets).values(a);
}

export async function listAssets(deviceId: string): Promise<Asset[]> {
  return (await db()).select().from(assets).where(eq(assets.deviceId, deviceId)).orderBy(desc(assets.createdAt));
}

/** Assets by id, restricted to the owner's device. */
export async function getAssets(deviceId: string, ids: string[]): Promise<Asset[]> {
  if (!ids.length) return [];
  return (await db()).select().from(assets).where(and(eq(assets.deviceId, deviceId), inArray(assets.id, ids)));
}

export async function updateAsset(deviceId: string, id: string, patch: Partial<Pick<Asset, "name" | "kind" | "description" | "locked">>) {
  await (await db()).update(assets).set(patch).where(and(eq(assets.deviceId, deviceId), eq(assets.id, id)));
}

export async function deleteAsset(deviceId: string, id: string) {
  await (await db()).delete(assets).where(and(eq(assets.deviceId, deviceId), eq(assets.id, id)));
}
