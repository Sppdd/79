import { boolean, integer, jsonb, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";

/** The shop the agent answers for. One row per WhatsApp number. */
export const businesses = pgTable("businesses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  about: text("about").notNull().default(""),
  /** Free-text rules the owner writes: delivery areas, payment, tone, what to never promise. */
  policies: text("policies").notNull().default(""),
  dialect: text("dialect").$type<"iraqi" | "gulf" | "egyptian" | "levantine" | "msa">().notNull().default("iraqi"),
  hours: text("hours").notNull().default(""),
  ownerPhone: text("owner_phone"),
  phoneNumberId: text("phone_number_id"),
  /** Owner takes over everything; the agent stays quiet. */
  paused: boolean("paused").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * What the agent is allowed to say: products, prices, FAQs.
 * Embeddings are plain float arrays — shop catalogs are small, so cosine similarity in JS beats running pgvector.
 */
export const catalogItems = pgTable("catalog_items", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  price: text("price"),
  inStock: boolean("in_stock").notNull().default(true),
  embedding: jsonb("embedding").$type<number[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CustomerMemory = {
  /** Short facts worth remembering across conversations: name, address, preferences. */
  facts: string[];
  summary?: string;
};

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  waId: text("wa_id").notNull(), // the customer's WhatsApp number
  name: text("name"),
  memory: jsonb("memory").$type<CustomerMemory>().notNull().default({ facts: [] }),
  /** Set while a turn is being handled, so two inbound messages can't answer over each other. */
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  /** The owner took over this chat. */
  handedOver: boolean("handed_over").notNull().default(false),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type MessageRole = "customer" | "agent" | "owner" | "system";
export type ToolCallLog = { name: string; args: unknown; result?: unknown };

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  customerId: text("customer_id").notNull(),
  role: text("role").$type<MessageRole>().notNull(),
  text: text("text").notNull(),
  /** Voice notes: stored audio + what the ASR heard. */
  audioUrl: text("audio_url"),
  transcript: text("transcript"),
  toolCalls: jsonb("tool_calls").$type<ToolCallLog[]>(),
  model: text("model"),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type OrderItem = { title: string; quantity: number; price?: string };

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  customerId: text("customer_id").notNull(),
  kind: text("kind").$type<"order" | "booking">().notNull().default("order"),
  items: jsonb("items").$type<OrderItem[]>().notNull().default([]),
  /** Bookings: when the customer wants to come. */
  slot: text("slot"),
  address: text("address"),
  note: text("note"),
  total: real("total"),
  status: text("status").$type<"new" | "confirmed" | "done" | "cancelled">().notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type JobKind = "follow_up" | "escalation" | "daily_summary";

/** Work the agent does on its own: follow-ups, owner alerts, the nightly summary. Driven by /api/cron. */
export const jobs = pgTable("jobs", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  customerId: text("customer_id"),
  kind: text("kind").$type<JobKind>().notNull(),
  runAt: timestamp("run_at", { withTimezone: true }).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").$type<"pending" | "done" | "failed">().notNull().default("pending"),
  result: text("result"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Business = typeof businesses.$inferSelect;
export type CatalogItem = typeof catalogItems.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Job = typeof jobs.$inferSelect;

// One place for schema changes; idempotent, runs once per process on first DB access.
export const bootstrapSql = `
create table if not exists businesses (
  id text primary key,
  name text not null,
  about text not null default '',
  policies text not null default '',
  dialect text not null default 'iraqi',
  hours text not null default '',
  owner_phone text,
  phone_number_id text,
  paused boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists catalog_items (
  id text primary key,
  business_id text not null,
  title text not null,
  body text not null,
  price text,
  in_stock boolean not null default true,
  embedding jsonb,
  created_at timestamptz not null default now()
);
create index if not exists catalog_business_idx on catalog_items (business_id);
create table if not exists customers (
  id text primary key,
  business_id text not null,
  wa_id text not null,
  name text,
  memory jsonb not null default '{"facts":[]}'::jsonb,
  locked_at timestamptz,
  handed_over boolean not null default false,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists customers_wa_idx on customers (business_id, wa_id);
create table if not exists messages (
  id text primary key,
  business_id text not null,
  customer_id text not null,
  role text not null,
  text text not null,
  audio_url text,
  transcript text,
  tool_calls jsonb,
  model text,
  latency_ms integer,
  created_at timestamptz not null default now()
);
create index if not exists messages_customer_idx on messages (customer_id, created_at);
create table if not exists orders (
  id text primary key,
  business_id text not null,
  customer_id text not null,
  kind text not null default 'order',
  items jsonb not null default '[]'::jsonb,
  slot text,
  address text,
  note text,
  total real,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
create index if not exists orders_business_idx on orders (business_id, created_at desc);
create table if not exists jobs (
  id text primary key,
  business_id text not null,
  customer_id text,
  kind text not null,
  run_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  result text,
  created_at timestamptz not null default now()
);
create index if not exists jobs_due_idx on jobs (status, run_at);
`;
