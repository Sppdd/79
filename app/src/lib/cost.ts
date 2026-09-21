// Cost estimates shown on approval gates. Rough until the Nebius engine is benchmarked (PLAN.md week 2);
// then set ENGINE_* numbers from the engine's reported gpu_seconds.
import type { ShotList } from "./ai/schemas";
import { allShots } from "./shotlist";

export const PRICING = {
  /** Nebius H100 on-demand, USD per hour (published list price range $2–3). */
  gpuHourlyUsd: 2.5,
  /** Composing a first frame from references (Qwen-Image-Edit, ~40 steps on H100) — estimate. */
  gpuSecondsPerKeyframe: 40,
  /** One ≤5 s 544×960 clip with LTX-2.5 distilled on H100 — estimate. */
  gpuSecondsPerTake: 60,
} as const;

/** One keyframe per shot (reused by all its takes) + N takes per shot. */
export function estimateTakes(list: ShotList, takesPerShot: number) {
  const shots = allShots(list).length;
  const takes = shots * takesPerShot;
  const gpuSeconds = shots * PRICING.gpuSecondsPerKeyframe + takes * PRICING.gpuSecondsPerTake;
  const gpuHours = gpuSeconds / 3600;
  return {
    shots,
    takes,
    gpuMinutes: Math.round(gpuSeconds / 60),
    usd: Math.round(gpuHours * PRICING.gpuHourlyUsd * 100) / 100,
  };
}
