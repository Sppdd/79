import { Download } from "lucide-react";
import type { RenderOutputs } from "@/db/schema";
import { Group } from "../ios/primitives";

const LABELS: Record<string, string> = {
  "9:16": "Reels · TikTok · Stories",
  "1:1": "Feed post",
  "4:5": "Meta feed ad",
};

export function ExportButtons({ outputs }: { outputs: RenderOutputs }) {
  return (
    <Group header="Export">
      {Object.entries(outputs).map(([aspect, url]) => (
        <a key={aspect} href={url} download className="flex items-center justify-between px-4 py-3 active:bg-fill">
          <span className="text-[17px]">
            {aspect} <span className="text-secondary">· {LABELS[aspect]}</span>
          </span>
          <Download size={20} className="text-tint" />
        </a>
      ))}
    </Group>
  );
}
