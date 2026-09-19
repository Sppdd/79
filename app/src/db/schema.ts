import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { AdCopy, AssetKind, BrandKit, Brief, ShotList } from "@/lib/ai/schemas";

export type ProjectStatus = "queued" | "researching" | "briefing" | "directing" | "ready" | "failed";

export type ChatMessage = {
  role: "owner" | "director";
  text: string;
  /** Shot ids / "style" / "scene N" touched by this edit, for highlighting in the UI. */
  changed?: string[];
  at: string;
};

export type RenderOutputs = Partial<Record<"9:16" | "1:1" | "4:5", string>>;

export const brandKits = pgTable("brand_kits", {
  deviceId: text("device_id").primaryKey(),
  kit: jsonb("kit").$type<BrandKit>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Locked visual references (real product photos, characters, locations…) reused across shots and projects. */
export const assets = pgTable("assets", {
  id: text("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  name: text("name").notNull(),
  kind: text("kind").$type<AssetKind>().notNull(),
  url: text("url").notNull(),
  /** What the vision model sees — lets Nemotron write prompts that match the real product. */
  description: text("description"),
  locked: boolean("locked").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  notes: text("notes").notNull(),
  brand: jsonb("brand").$type<BrandKit>().notNull(),
  /** Asset ids chosen for this commercial. */
  assetIds: jsonb("asset_ids").$type<string[]>().notNull().default([]),
  targetSec: integer("target_sec").notNull().default(30),
  status: text("status").$type<ProjectStatus>().notNull().default("queued"),
  brief: jsonb("brief").$type<Brief>(),
  shotlist: jsonb("shotlist").$type<ShotList>(),
  shotlistVersion: integer("shotlist_version").notNull().default(0),
  chat: jsonb("chat").$type<ChatMessage[]>().notNull().default([]),
  adCopy: jsonb("ad_copy").$type<AdCopy>(),
  outputs: jsonb("outputs").$type<RenderOutputs>(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type Asset = typeof assets.$inferSelect;

// Kept next to the table definitions so schema changes happen in one place. Idempotent; runs once per process.
// `add column if not exists` upgrades databases created by earlier versions without losing data.
export const bootstrapSql = `
create table if not exists brand_kits (
  device_id text primary key,
  kit jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists assets (
  id text primary key,
  device_id text not null,
  name text not null,
  kind text not null,
  url text not null,
  description text,
  locked boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists assets_device_idx on assets (device_id, created_at desc);
create table if not exists projects (
  id text primary key,
  device_id text not null,
  notes text not null,
  brand jsonb not null,
  status text not null default 'queued',
  ad_copy jsonb,
  outputs jsonb,
  error text,
  created_at timestamptz not null default now()
);
alter table projects add column if not exists asset_ids jsonb not null default '[]'::jsonb;
alter table projects add column if not exists target_sec integer not null default 30;
alter table projects add column if not exists brief jsonb;
alter table projects add column if not exists shotlist jsonb;
alter table projects add column if not exists shotlist_version integer not null default 0;
alter table projects add column if not exists chat jsonb not null default '[]'::jsonb;
create index if not exists projects_device_idx on projects (device_id, created_at desc);
`;
