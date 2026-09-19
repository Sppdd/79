"use client";

import { MessageSquareText } from "lucide-react";
import { use, useCallback, useEffect, useState } from "react";
import { Group, NavBar } from "@/components/ios/primitives";
import { AdCopyList } from "@/components/project/ad-copy";
import { DirectorChat } from "@/components/project/director-chat";
import { Progress } from "@/components/project/progress";
import { ShootGate } from "@/components/project/shoot-gate";
import { ShotCard } from "@/components/project/shot-card";
import { StyleCard } from "@/components/project/style-card";
import type { ClientProject } from "@/components/project/types";
import { allShots, totalSeconds } from "@/lib/shotlist";

const FINISHED = new Set(["ready", "failed"]);

export default function ProjectPage({ params }: PageProps<"/project/[id]">) {
  const { id } = use(params);
  const [project, setProject] = useState<ClientProject>();
  const [chat, setChat] = useState<{ open: boolean; draft: string }>({ open: false, draft: "" });
  const [changed, setChanged] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}`, { cache: "no-store" });
    if (res.ok) setProject(await res.json());
  }, [id]);

  // Load immediately, then poll every 2s while the director is planning.
  useEffect(() => {
    if (project && FINISHED.has(project.status)) return;
    const timer = setTimeout(refresh, project ? 2000 : 0);
    return () => clearTimeout(timer);
  }, [project, refresh]);

  const list = project?.shotlist;
  const ask = (draft: string) => setChat({ open: true, draft });

  return (
    <main>
      <NavBar
        back={{ href: "/projects", label: "Projects" }}
        title={list?.title}
        action={
          list ? (
            <button onClick={() => ask("")} className="text-tint" aria-label="Talk to the director">
              <MessageSquareText size={22} />
            </button>
          ) : null
        }
      />

      {!project ? (
        <p className="p-8 text-center text-secondary">Loading…</p>
      ) : !list ? (
        <Progress project={project} />
      ) : (
        <>
          <header className="px-4 pt-5 pb-1">
            <h1 className="text-[28px] leading-tight font-bold">{list.title}</h1>
            <p className="pt-1 text-[17px] text-secondary">{list.logline}</p>
            <p className="pt-2 text-[13px] text-secondary">
              {list.scenes.length} scenes · {allShots(list).length} shots · {totalSeconds(list)}s · v{project.shotlistVersion}
            </p>
          </header>

          <StyleCard prefix={list.stylePrefix} highlight={changed.includes("style")} />

          {list.scenes.map((scene) => (
            <Group
              key={scene.number}
              header={`Scene ${scene.number} · ${scene.title}`}
              footer={scene.lightingOverride ? `Light for this scene: ${scene.lightingOverride}` : scene.location}
            >
              {scene.shots.map((shot) => (
                <ShotCard
                  key={shot.id}
                  list={list}
                  scene={scene}
                  shot={shot}
                  assets={project.assets}
                  highlight={changed.includes(shot.id) || changed.includes(`scene ${scene.number}`)}
                  onAsk={ask}
                />
              ))}
            </Group>
          ))}

          <Group header="Music & end card">
            <p className="px-4 pt-3 text-[15px]">
              {list.music.mood} · {list.music.bpm} BPM
            </p>
            <p className="px-4 text-[13px] text-secondary">{list.music.notes}</p>
            <p className="px-4 pt-2 pb-3 text-[15px]">
              <span className="font-semibold">{list.endCard.headline}</span> — {list.endCard.cta}
            </p>
          </Group>

          <ShootGate list={list} engineReady={false} />
          {project.adCopy && <AdCopyList adCopy={project.adCopy} />}

          {!chat.open && (
            <button
              onClick={() => ask("")}
              className="fixed right-4 bottom-24 z-30 flex items-center gap-2 rounded-full bg-tint px-4 py-3 text-[15px] font-semibold text-white shadow-lg active:scale-95"
          >
              <MessageSquareText size={18} /> Direct
            </button>
          )}

          <DirectorChat
            key={chat.draft}
            open={chat.open}
            onClose={() => setChat({ open: false, draft: "" })}
            projectId={project.id}
            messages={project.chat}
            draft={chat.draft}
            onEdited={(ids) => {
              setChanged(ids);
              refresh();
            }}
          />
        </>
      )}
    </main>
  );
}
