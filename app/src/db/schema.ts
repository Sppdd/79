import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { AdCopy, BrandKit, Brief, ReelPlan, ShotReview } from "@/lib/ai/schemas";

export type ReelStatus = "queued" | "researching" | "briefing" | "directing" | "generating" | "voicing" | "rendering" | "done" | "failed";

export type ShotState = {
  status: "pending" | "generating" | "reviewing" | "ready" | "failed";
  imageUrl?: string;
  videoUrl?: string;
  review?: ShotReview;
  attempts: number;
};

export type RenderOutputs = Partial<Record<"9:16" | "1:1" | "4:5", string>>;

export const brandKits = pgTable("brand_kits", {
  deviceId: text("device_id").primaryKey(),
  kit: jsonb("kit").$type<BrandKit>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  notes: text("notes").notNull(),
  brand: jsonb("brand").$type<BrandKit>().notNull(),
  status: text("status").$type<ReelStatus>().notNull().default("queued"),
  brief: jsonb("brief").$type<Brief>(),
  plan: jsonb("plan").$type<ReelPlan>(),
  shots: jsonb("shots").$type<ShotState[]>().notNull().default([]),
  voiceoverUrl: text("voiceover_url"),
  musicUrl: text("music_url"),
  outputs: jsonb("outputs").$type<RenderOutputs>(),
  adCopy: jsonb("ad_copy").$type<AdCopy>(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;

// Kept next to the table definitions so schema changes happen in one place.
// Idempotent — runs once per process on first DB access.
export const bootstrapSql = `
create table if not exists brand_kits (
  device_id text primary key,
  kit jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists projects (
  id text primary key,
  device_id text not null,
  notes text not null,
  brand jsonb not null,
  status text not null default 'queued',
  brief jsonb,
  plan jsonb,
  shots jsonb not null default '[]'::jsonb,
  voiceover_url text,
  music_url text,
  outputs jsonb,
  ad_copy jsonb,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists projects_device_idx on projects (device_id, created_at desc);
`;
