import { Loader2, ScanEye, Video } from "lucide-react";
import { motion } from "motion/react";
import type { ClientProject } from "./types";

export function Storyboard({ project, onOpen }: { project: ClientProject; onOpen: (i: number) => void }) {
  return (
    <section className="py-3">
      <h2 className="px-8 pb-1.5 text-[13px] text-secondary uppercase">Storyboard · tap a shot to edit</h2>
      <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-4 pb-1">
        {project.plan!.shots.map((shot, i) => {
          const state = project.shots[i];
          const busy = !state || state.status === "pending" || state.status === "generating";
          return (
            <motion.button
              key={i}
              onClick={() => onOpen(i)}
              whileTap={{ scale: 0.96 }}
              className="relative aspect-[9/16] w-32 shrink-0 snap-start overflow-hidden rounded-xl bg-card text-left"
            >
              {state?.imageUrl && (
                <motion.img
                  src={state.imageUrl}
                  alt={shot.description}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              {busy && (
                <div className="absolute inset-0 flex items-center justify-center bg-fill">
                  <Loader2 className="animate-spin text-secondary" />
                </div>
              )}
              <span className="absolute top-1.5 left-1.5 rounded-md bg-black/50 px-1.5 text-[11px] font-semibold text-white">
                {i + 1} · {shot.durationSec}s
              </span>
              <span className="absolute top-1.5 right-1.5 flex gap-1">
                {shot.kind === "video" && <Video size={16} className="text-white drop-shadow" />}
                {state?.status === "reviewing" && <ScanEye size={16} className="animate-pulse text-white drop-shadow" />}
              </span>
              {state?.review && state.review.score > 0 && (
                <span
                  className={`absolute right-1.5 bottom-9 rounded-md px-1.5 text-[11px] font-bold text-white ${state.review.pass ? "bg-ios-green" : "bg-ios-orange"}`}
                >
                  QA {state.review.score}/10
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-5 text-[11px] leading-tight font-semibold text-white">
                {shot.caption}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
