// Agent 3 — the director you talk to. Turns "edit 1A: open behind him" into targeted edits → Nemotron 3 Super.
import type { ChatMessage } from "@/db/schema";
import { applyEdit } from "@/lib/shotlist";
import { askJson, hasNemotron } from "../nemotron";
import { ShotListEdit, type ShotList } from "../schemas";
import type { AssetRef } from "./director";

const SYSTEM = `You are the director's assistant editing an existing commercial shot list at the owner's request.

First split the owner's message into separate requests. Handle EVERY request — one message often asks for several
changes (e.g. "edit 1A … and make scene 3 golden hour" = one shotEdit + one sceneLighting).
Change ONLY what is asked. Everything not mentioned stays exactly as it is.
- Look/lighting/camera/color for the whole ad → stylePrefix (only the fields that change).
- Lighting for one scene only → sceneLighting with that scene number.
- A named shot ("1A", "shot 2B") → shotEdits "update" with the COMPLETE new shot (same id).
- A new shot → shotEdits "insert_after" the shot it follows, with a new id (e.g. "1B" after "1A").
- Removing a shot → shotEdits "delete".
Shot-writing rules still apply: motion move by move, a specific camera move, 2–5 s, locked asset names in references,
no style words inside shot prompts.
reply: say concretely what you changed, naming shots/scenes (e.g. "1A now orbits from behind…; scene 3 is golden
hour."). Use plain words — never field names like "lightingOverride". If something was unclear, say what you
assumed.`;

export async function editShotList(input: {
  list: ShotList;
  message: string;
  history: ChatMessage[];
  assets: AssetRef[];
}): Promise<{ list: ShotList; changed: string[]; reply: string }> {
  if (!hasNemotron()) {
    return { list: input.list, changed: [], reply: "Demo mode: add NEBIUS_API_KEY to let the director edit the shot list." };
  }
  const user = [
    `Current shot list:\n${JSON.stringify(input.list)}`,
    input.assets.length ? `Locked assets: ${input.assets.map((a) => `${a.name} (${a.kind})`).join(", ")}` : "",
    input.history.length
      ? `Recent conversation:\n${input.history
          .slice(-6)
          .map((m) => `${m.role}: ${m.text}`)
          .join("\n")}`
      : "",
    `Owner's request: ${input.message}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Models sometimes describe an edit in `reply` without emitting it. Retry once, then say so honestly.
  for (const nudge of ["", "\n\nYour previous answer contained no edits. Emit the actual edit operations."]) {
    const edit = await askJson({ tier: "super", schema: ShotListEdit, system: SYSTEM, user: user + nudge, temperature: 0.4 });
    const { list, changed } = applyEdit(input.list, edit);
    if (changed.length) return { list, changed, reply: edit.reply };
  }
  return {
    list: input.list,
    changed: [],
    reply: "I couldn't turn that into an edit. Try naming the shot or scene, e.g. \"Edit 2A: …\" or \"Make scene 2 golden hour\".",
  };
}
