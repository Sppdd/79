// Director chat: the owner asks for a change, Nemotron edits only the named parts of the shot list.
import { z } from "zod";
import { getAssets, getProject, updateProject } from "@/db";
import type { ChatMessage } from "@/db/schema";
import { editShotList } from "@/lib/ai/agents/director-chat";
import { deviceId } from "@/lib/device";

const Body = z.object({ message: z.string().trim().min(2).max(1000) });

export const maxDuration = 120;

export async function POST(request: Request, { params }: RouteContext<"/api/projects/[id]/chat">) {
  const { id } = await params;
  const body = Body.safeParse(await request.json().catch(() => ({})));
  const device = await deviceId();
  const project = await getProject(id);
  if (!project || project.deviceId !== device) return Response.json({ error: "Not found" }, { status: 404 });
  if (!body.success) return Response.json({ error: "Say what you'd like to change." }, { status: 400 });
  if (!project.shotlist) return Response.json({ error: "The shot list isn't ready yet." }, { status: 409 });

  const assets = await getAssets(device, project.assetIds);
  const owner: ChatMessage = { role: "owner", text: body.data.message, at: new Date().toISOString() };
  try {
    const result = await editShotList({
      list: project.shotlist,
      message: body.data.message,
      history: project.chat,
      assets: assets.map((a) => ({ name: a.name, kind: a.kind, description: a.description })),
    });
    const director: ChatMessage = { role: "director", text: result.reply, changed: result.changed, at: new Date().toISOString() };
    await updateProject(id, {
      shotlist: result.list,
      shotlistVersion: project.shotlistVersion + (result.changed.length ? 1 : 0),
      chat: [...project.chat, owner, director],
    });
    return Response.json({ reply: director, changed: result.changed });
  } catch (err) {
    console.error("director chat failed", err);
    return Response.json({ error: "The director couldn't apply that. Try rephrasing." }, { status: 502 });
  }
}
