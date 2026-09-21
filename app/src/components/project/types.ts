import type { Asset, Project } from "@/db/schema";

type Json<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] };

export type ClientAsset = Json<Asset>;

/** A project as returned by GET /api/projects/[id] (JSON: dates become strings, no device id). */
export type ClientProject = Json<Omit<Project, "deviceId">> & { assets: ClientAsset[]; engineReady: boolean };
