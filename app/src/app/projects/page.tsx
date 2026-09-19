import { ChevronRight, Film } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { listProjects } from "@/db";
import { Group, LargeTitle } from "@/components/ios/primitives";
import { StatusPill } from "@/components/reel/status";
import { DEVICE_COOKIE } from "@/lib/device";

export default async function ProjectsPage() {
  const device = (await cookies()).get(DEVICE_COOKIE)?.value;
  const projects = device ? await listProjects(device) : [];

  return (
    <main>
      <LargeTitle title="Reels" />
      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-8 pt-24 text-center text-secondary">
          <Film size={48} strokeWidth={1.4} />
          <p className="text-[17px]">No Reels yet</p>
          <Link href="/" className="text-[17px] text-tint">
            Create your first one
          </Link>
        </div>
      ) : (
        <Group>
          {projects.map((p) => {
            const thumb = p.shots.find((s) => s.imageUrl)?.imageUrl;
            return (
              <Link key={p.id} href={`/project/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 active:bg-fill">
                <div className="h-16 w-9 shrink-0 overflow-hidden rounded-md bg-fill">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px]">{p.plan?.title ?? p.notes.split("\n")[0]}</p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <StatusPill status={p.status} />
                    <span className="text-[13px] text-secondary">{p.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-secondary" />
              </Link>
            );
          })}
        </Group>
      )}
    </main>
  );
}
