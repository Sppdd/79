"use client";

import { Clapperboard, Share } from "lucide-react";
import { use, useCallback, useEffect, useState } from "react";
import { Group, NavBar, PrimaryButton } from "@/components/ios/primitives";
import { AdCopyList } from "@/components/reel/ad-copy";
import { ExportButtons } from "@/components/reel/export";
import { PreviewPlayer } from "@/components/reel/preview-player";
import { Progress } from "@/components/reel/progress";
import { ShotSheet } from "@/components/reel/shot-sheet";
import { Storyboard } from "@/components/reel/storyboard";
import type { ClientProject } from "@/components/reel/types";

const FINISHED = new Set(["done", "failed"]);

export default function ProjectPage({ params }: PageProps<"/project/[id]">) {
  const { id } = use(params);
  const [project, setProject] = useState<ClientProject>();
  const [openShot, setOpenShot] = useState<number>();

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/reels/${id}`, { cache: "no-store" });
    if (res.ok) setProject(await res.json());
  }, [id]);

  // Load immediately, then poll every 2s while the pipeline is running.
  useEffect(() => {
    if (project && FINISHED.has(project.status)) return;
    const timer = setTimeout(refresh, project ? 2000 : 0);
    return () => clearTimeout(timer);
  }, [project, refresh]);

  async function renderVideo() {
    await fetch(`/api/reels/${id}/render`, { method: "POST" });
    refresh();
  }

  const share = () => {
    const url = project?.outputs?.["9:16"];
    if (url && navigator.share) navigator.share({ title: project.plan?.title, url }).catch(() => {});
  };

  return (
    <main>
      <NavBar
        back={{ href: "/projects", label: "Reels" }}
        title={project?.plan?.title}
        action={
          project?.outputs?.["9:16"] ? (
            <button onClick={share} className="text-tint" aria-label="Share">
              <Share size={22} />
            </button>
          ) : null
        }
      />

      {!project ? (
        <p className="p-8 text-center text-secondary">Loading…</p>
      ) : (
        <>
          <PreviewPlayer project={project} />
          {project.status !== "done" && <Progress project={project} />}
          {project.status === "done" && !project.outputs && project.canRender && (
            <div className="px-4 pt-4">
              <PrimaryButton onClick={renderVideo}>
                <Clapperboard size={20} /> Render video
              </PrimaryButton>
            </div>
          )}
          {project.plan && <Storyboard project={project} onOpen={setOpenShot} />}
          {project.plan && (
            <Group header="Hook & voiceover">
              <p className="px-4 pt-3 text-[15px] font-semibold">{project.plan.hook}</p>
              <p className="px-4 pb-3 text-[15px] text-secondary">{project.plan.voiceover}</p>
            </Group>
          )}
          {project.adCopy && <AdCopyList adCopy={project.adCopy} />}
          {project.outputs && <ExportButtons outputs={project.outputs} />}
          <ShotSheet project={project} index={openShot} onClose={() => setOpenShot(undefined)} onChanged={refresh} />
        </>
      )}
    </main>
  );
}
