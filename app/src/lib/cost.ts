// Cost estimates shown on approval gates. Calibrated in week 2 once the Nebius video endpoint is benchmarked.
import type { ShotList } from "./ai/schemas";
import { allShots } from "./shotlist";

export const PRICING = {
  /** Nebius H100 on-demand, USD per hour (published list price range $2–3). */
  gpuHourlyUsd: 2.5,
  /** GPU seconds to generate one ≤5 s draft take (Cosmos-Predict2.5-2B ≈ 229 s on H100). */
  gpuSecondsPerTake: 240,
} as const;

export function estimateTakes(list: ShotList, takesPerShot: number) {
  const shots = allShots(list).length;
  const takes = shots * takesPerShot;
  const gpuHours = (takes * PRICING.gpuSecondsPerTake) / 3600;
  return {
    shots,
    takes,
    gpuMinutes: Math.round(gpuHours * 60),
    usd: Math.round(gpuHours * PRICING.gpuHourlyUsd * 100) / 100,
  };
}
