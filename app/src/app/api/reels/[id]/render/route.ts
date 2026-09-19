import { start } from "workflow/api";
import { getProject, updateProject } from "@/db";
import { deviceId } from "@/lib/device";
import { renderBackend } from "@/lib/render";
import { rerenderReel } from "@/workflows/make-reel";

export async function POST(request: Request, { params }: RouteContext<"/api/reels/[id]/render">) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project || project.deviceId !== (await deviceId())) return Response.json({ error: "Not found" }, { status: 404 });
  if (!renderBackend()) return Response.json({ error: "No render backend configured" }, { status: 400 });
  if (project.status !== "done" && project.status !== "failed") {
    return Response.json({ error: "This Reel is still being made" }, { status: 409 });
  }

  await updateProject(id, { status: "rendering", error: null });
  await start(rerenderReel, [id, process.env.APP_URL ?? new URL(request.url).origin]);
  return Response.json({ ok: true });
}
