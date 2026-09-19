// Editor actions on a single shot: change its caption, or regenerate it with an optional instruction.
import { z } from "zod";
import { getProject, patchShot, updateProject } from "@/db";
import { reviewShot } from "@/lib/ai/agents/qa";
import { deviceId } from "@/lib/device";
import { media } from "@/lib/media/provider";

const Body = z.object({
  caption: z.string().max(60).optional(),
  regenerate: z.boolean().optional(),
  instruction: z.string().max(300).optional(),
});

export const maxDuration = 300;

export async function POST(request: Request, { params }: RouteContext<"/api/reels/[id]/shots/[index]">) {
  const { id, index: rawIndex } = await params;
  const index = Number(rawIndex);
  const body = Body.safeParse(await request.json().catch(() => ({})));
  const project = await getProject(id);
  if (!body.success || !project || project.deviceId !== (await deviceId()) || !project.plan?.shots[index]) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const plan = structuredClone(project.plan);
  const shot = plan.shots[index];
  if (body.data.caption !== undefined) shot.caption = body.data.caption;

  if (body.data.regenerate) {
    if (body.data.instruction) shot.prompt = `${shot.prompt}. Change: ${body.data.instruction}`;
    const attempts = (project.shots[index]?.attempts ?? 0) + 1;
    await patchShot(id, index, { status: "generating", attempts });
    const imageUrl = await media().image(shot.prompt, shot.style);
    const review = await reviewShot(imageUrl, shot, project.brand).catch(() => undefined);
    await patchShot(id, index, { status: "ready", imageUrl, review, attempts });
  }

  // Edits invalidate the rendered videos; the owner re-renders from the editor.
  await updateProject(id, { plan, outputs: body.data.regenerate || body.data.caption !== undefined ? null : project.outputs });
  return Response.json({ ok: true });
}
