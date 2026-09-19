"use client";
/* eslint-disable @next/next/no-img-element */

import { Pause, Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { ClientProject } from "./types";

/**
 * Shows the rendered MP4 when it exists. Before that (or without a render backend), plays a live
 * slideshow of the generated shots with captions + voiceover, so the owner sees the Reel immediately.
 */
export function PreviewPlayer({ project }: { project: ClientProject }) {
  const rendered = project.outputs?.["9:16"];
  const shots = (project.plan?.shots ?? []).map((s, i) => ({ ...s, state: project.shots[i] }));
  const ready = shots.filter((s) => s.state?.imageUrl);

  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!playing || !ready.length) return;
    const shot = ready[index % ready.length];
    const timer = setTimeout(() => {
      if (index + 1 >= ready.length) {
        setPlaying(false);
        setIndex(0);
        audio.current?.pause();
      } else setIndex(index + 1);
    }, shot.durationSec * 1000);
    return () => clearTimeout(timer);
  }, [playing, index, ready]);

  function toggle() {
    if (playing) {
      audio.current?.pause();
      setPlaying(false);
      return;
    }
    if (audio.current) {
      audio.current.currentTime = 0;
      audio.current.play().catch(() => {});
    }
    setIndex(0);
    setPlaying(true);
  }

  const current = ready[index % Math.max(ready.length, 1)];

  return (
    <div className="flex justify-center px-4 pt-4">
      <div className="relative aspect-[9/16] w-[62%] overflow-hidden rounded-[22px] bg-black shadow-xl">
        {rendered ? (
          <video src={rendered} controls playsInline className="h-full w-full object-cover" />
        ) : current ? (
          <>
            <AnimatePresence mode="popLayout">
              <motion.div
                key={index}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.08 }}
                animate={{ opacity: 1, scale: playing ? 1.0 : 1.02 }}
                exit={{ opacity: 0 }}
                transition={{ opacity: { duration: 0.35 }, scale: { duration: current.durationSec, ease: "linear" } }}
              >
                {current.state.videoUrl && playing ? (
                  <video src={current.state.videoUrl} autoPlay muted playsInline className="h-full w-full object-cover" />
                ) : (
                  <img src={current.state.imageUrl} alt="" className="h-full w-full object-cover" />
                )}
              </motion.div>
            </AnimatePresence>
            <motion.p
              key={`c${index}`}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute inset-x-3 top-[70%] rounded-lg px-2 py-1 text-center text-[15px] leading-tight font-extrabold text-white"
              style={{ background: `${project.brand.primaryColor}d9` }}
            >
              {current.caption}
            </motion.p>
            <button onClick={toggle} className="absolute inset-0 flex items-center justify-center" aria-label="Play preview">
              {!playing && (
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/30 backdrop-blur-md">
                  <Play className="ml-1 fill-white text-white" />
                </span>
              )}
              {playing && <Pause className="absolute right-3 bottom-3 text-white/70" size={18} />}
            </button>
            {project.voiceoverUrl && <audio ref={audio} src={project.voiceoverUrl} preload="auto" />}
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-[15px] text-white/60">
            Your Reel appears here as shots are generated
          </div>
        )}
      </div>
    </div>
  );
}
