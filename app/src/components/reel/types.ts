import type { Project } from "@/db/schema";

/** A project as returned by GET /api/reels/[id] (JSON: dates become strings, no device id). */
export type ClientProject = Omit<Project, "deviceId" | "createdAt"> & { createdAt: string; canRender: boolean };
