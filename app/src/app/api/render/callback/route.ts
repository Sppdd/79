// Called by the Nebius render job when it finishes. HMAC-signed; resumes the paused workflow.
import { resumeHook } from "workflow/api";
import { renderHookToken, type RenderResult } from "@/lib/render/hook";
import { verifySignature } from "@/lib/render";

export async function POST(request: Request) {
  const body = await request.text();
  if (!verifySignature(body, request.headers.get("x-signature"))) {
    return Response.json({ error: "Bad signature" }, { status: 401 });
  }
  const { projectId, ...result } = JSON.parse(body) as { projectId: string } & RenderResult;
  await resumeHook(renderHookToken(projectId), result);
  return Response.json({ ok: true });
}
