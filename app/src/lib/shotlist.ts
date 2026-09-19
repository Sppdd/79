// Pure helpers for the shot list. No I/O — easy to test and safe to use on client and server.
import type { Scene, Shot, ShotList, ShotListEdit } from "./ai/schemas";

/** Models sometimes write "none"/"" instead of omitting optional fields; strip those so the UI stays clean. */
export function normalize(list: ShotList): ShotList {
  const empty = (v?: string) => !v || /^(none|n\/a|null|same|-)$/i.test(v.trim());
  for (const scene of list.scenes) {
    if (empty(scene.lightingOverride)) delete scene.lightingOverride;
    for (const shot of scene.shots) {
      if (empty(shot.continuity)) delete shot.continuity;
      if (empty(shot.caption)) delete shot.caption;
    }
  }
  if (empty(list.voiceover)) delete list.voiceover;
  return list;
}

/** The exact text sent to the video model for one shot: style prefix + scene light + shot specifics. */
export function renderPrompt(list: ShotList, sceneNumber: number, shot: Shot): string {
  const scene = list.scenes.find((s) => s.number === sceneNumber);
  const p = list.stylePrefix;
  return [
    `${p.look}. Lighting: ${scene?.lightingOverride ?? p.lighting}. Camera: ${p.camera}. Color: ${p.color}.`,
    shot.prompt,
    `Camera move: ${shot.camera}.`,
    `Action: ${shot.motion.join(", then ")}.`,
    shot.continuity ? `Continuity: ${shot.continuity}.` : "",
    `Avoid: ${p.avoid}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export const allShots = (list: ShotList): { scene: Scene; shot: Shot }[] =>
  list.scenes.flatMap((scene) => scene.shots.map((shot) => ({ scene, shot })));

export const totalSeconds = (list: ShotList) => allShots(list).reduce((sum, { shot }) => sum + shot.durationSec, 0);

/**
 * Applies a director-chat edit. Only the named shots / prefix fields change; everything else is kept as-is.
 * Returns the new list plus the ids that changed (for highlighting).
 */
export function applyEdit(list: ShotList, edit: ShotListEdit): { list: ShotList; changed: string[] } {
  const next = structuredClone(list);
  const changed: string[] = [];

  if (edit.stylePrefix && Object.keys(edit.stylePrefix).length) {
    next.stylePrefix = { ...next.stylePrefix, ...definedOnly(edit.stylePrefix) };
    changed.push("style");
  }
  for (const { scene, lightingOverride } of edit.sceneLighting ?? []) {
    if (!lightingOverride.trim()) continue;
    const target = next.scenes.find((s) => s.number === scene);
    if (target) {
      target.lightingOverride = lightingOverride;
      changed.push(`scene ${scene}`);
    }
  }
  for (const op of edit.shotEdits ?? []) {
    const scene = next.scenes.find((s) => s.shots.some((sh) => sh.id === op.id));
    if (!scene) continue;
    const index = scene.shots.findIndex((sh) => sh.id === op.id);
    if (op.action === "delete") {
      scene.shots.splice(index, 1);
      changed.push(op.id);
    } else if (op.shot && op.action === "update") {
      scene.shots[index] = { ...op.shot, id: op.id };
      changed.push(op.id);
    } else if (op.shot && op.action === "insert_after") {
      const id = uniqueId(next, op.shot.id);
      scene.shots.splice(index + 1, 0, { ...op.shot, id });
      changed.push(id);
    }
  }
  next.scenes = next.scenes.filter((s) => s.shots.length > 0);
  return { list: normalize(next), changed };
}

function uniqueId(list: ShotList, wanted: string): string {
  const taken = new Set(allShots(list).map(({ shot }) => shot.id));
  if (!taken.has(wanted)) return wanted;
  const scene = wanted.match(/^\d+/)?.[0] ?? "9";
  for (let c = 65; c < 91; c++) {
    const id = `${scene}${String.fromCharCode(c)}`;
    if (!taken.has(id)) return id;
  }
  return `${wanted}-${taken.size}`;
}

function definedOnly<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== "")) as Partial<T>;
}
