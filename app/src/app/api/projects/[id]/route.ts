import { getAssets, getProject } from "@/db";
import { deviceId } from "@/lib/device";
import { engineReady } from "@/lib/video/engine";

export async function GET(_: Request, { params }: RouteContext<"/api/projects/[id]">) {
  const { id } = await params;
  const device = await deviceId();
  const project = await getProject(id);
  if (!project || project.deviceId !== device) return Response.json({ error: "Not found" }, { status: 404 });
  const assets = await getAssets(device, project.assetIds);
  return Response.json({ ...project, deviceId: undefined, assets, engineReady: engineReady() });
}
