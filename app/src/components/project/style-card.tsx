import type { StylePrefix } from "@/lib/ai/schemas";
import { Group } from "../ios/primitives";

const ROWS: { key: keyof StylePrefix; label: string }[] = [
  { key: "look", label: "Look" },
  { key: "lighting", label: "Light" },
  { key: "camera", label: "Camera" },
  { key: "color", label: "Color" },
  { key: "avoid", label: "Avoid" },
];

/** The style prefix glued to every shot. Changing it (via the director) restyles the whole commercial. */
export function StyleCard({ prefix, highlight }: { prefix: StylePrefix; highlight: boolean }) {
  return (
    <Group header="Style · applies to every shot" footer="Ask the director to change it — every shot updates at once.">
      <div className={highlight ? "animate-[pulse_1s_ease-in-out_2] bg-tint/10" : ""}>
        {ROWS.map(({ key, label }) => (
          <div key={key} className="flex gap-3 px-4 py-2.5">
            <span className="w-16 shrink-0 text-[15px] text-secondary">{label}</span>
            <span className="text-[15px]">{prefix[key]}</span>
          </div>
        ))}
      </div>
    </Group>
  );
}
