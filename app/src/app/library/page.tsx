"use client";
/* eslint-disable @next/next/no-img-element */

import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AssetThumb } from "@/components/assets/asset-thumb";
import { KINDS, UploadSheet } from "@/components/assets/upload-sheet";
import { Group, LargeTitle } from "@/components/ios/primitives";
import { Sheet } from "@/components/ios/sheet";
import type { ClientAsset } from "@/components/project/types";

export default function LibraryPage() {
  const [assets, setAssets] = useState<ClientAsset[]>();
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState<ClientAsset>();

  useEffect(() => {
    fetch("/api/assets")
      .then((r) => r.json())
      .then(setAssets)
      .catch(() => setAssets([]));
  }, []);

  async function remove(asset: ClientAsset) {
    await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
    setAssets((list) => list?.filter((a) => a.id !== asset.id));
    setOpen(undefined);
  }

  const add = (
    <button onClick={() => setUploading(true)} className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-tint text-white" aria-label="Add photo">
      <Plus size={22} />
    </button>
  );

  return (
    <main>
      <LargeTitle title="Library" subtitle="Locked references the director reuses in every shot." action={add} />

      {assets?.length === 0 && (
        <div className="flex flex-col items-center gap-3 px-8 pt-20 text-center text-secondary">
          <ImagePlus size={48} strokeWidth={1.4} />
          <p className="text-[17px]">No references yet</p>
          <p className="text-[15px]">Add real photos of your product, your shop or your people.</p>
          <button onClick={() => setUploading(true)} className="text-[17px] text-tint">
            Add a photo
          </button>
        </div>
      )}

      {KINDS.map(({ kind, label }) => {
        const items = assets?.filter((a) => a.kind === kind) ?? [];
        if (!items.length) return null;
        return (
          <Group key={kind} header={`${label}s`}>
            <div className="no-scrollbar flex gap-3 overflow-x-auto p-3">
              {items.map((a) => (
                <AssetThumb key={a.id} asset={a} onClick={() => setOpen(a)} />
              ))}
            </div>
          </Group>
        );
      })}

      <Sheet open={!!open} onClose={() => setOpen(undefined)}>
        {open && (
          <div className="pb-6">
            <div className="px-4 pt-2">
              <img src={open.url} alt={open.name} className="max-h-72 w-full rounded-xl bg-card object-contain" />
            </div>
            <Group header={`${open.name} · ${open.kind}`}>
              <p className="px-4 py-3 text-[15px] text-secondary">
                {open.description ?? "No description yet — add NEBIUS_API_KEY so the vision model can study the photo."}
              </p>
            </Group>
            <div className="px-4">
              <button onClick={() => remove(open)} className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] bg-card text-[17px] text-ios-red">
                <Trash2 size={18} /> Delete reference
              </button>
            </div>
          </div>
        )}
      </Sheet>

      <UploadSheet open={uploading} onClose={() => setUploading(false)} onUploaded={(a) => setAssets((l) => [a, ...(l ?? [])])} />
    </main>
  );
}
