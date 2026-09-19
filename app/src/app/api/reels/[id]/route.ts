import { getProject } from "@/db";
import { deviceId } from "@/lib/device";
import { renderBackend } from "@/lib/render";

export async function GET(_: Request, { params }: RouteContext<"/api/reels/[id]">) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project || project.deviceId !== (await deviceId())) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ...project, deviceId: undefined, canRender: renderBackend() !== undefined });
}
