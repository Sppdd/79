"use client";
/* eslint-disable @next/next/no-img-element */

import { ImagePlus, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import type { AssetKind } from "@/lib/ai/schemas";
import type { ClientAsset } from "../project/types";
import { Group, PrimaryButton } from "../ios/primitives";
import { Sheet } from "../ios/sheet";

export const KINDS: { kind: AssetKind; label: string; hint: string }[] = [
  { kind: "product", label: "Product", hint: "The real product — front and 3/4 views work best" },
  { kind: "character", label: "Person", hint: "Someone who appears in every scene" },
  { kind: "location", label: "Location", hint: "Your shop, kitchen, street corner…" },
  { kind: "prop", label: "Prop", hint: "Packaging, a mug, a bag that repeats across shots" },
  { kind: "logo", label: "Logo", hint: "Used for the end card" },
];

/** Upload a reference photo; the vision model describes it so the director keeps it consistent. */
export function UploadSheet({
  open,
  onClose,
  onUploaded,
  defaultKind = "product",
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: (asset: ClientAsset) => void;
  defaultKind?: AssetKind;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [kind, setKind] = useState<AssetKind>(defaultKind);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  function pick(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (!name) setName(f.name.replace(/\.\w+$/, ""));
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    const form = new FormData();
    form.set("file", file);
    form.set("kind", kind);
    form.set("name", name);
    const res = await fetch("/api/assets", { method: "POST", body: form });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Upload failed");
    onUploaded(data);
    setFile(undefined);
    setPreview(undefined);
    setName("");
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="pb-6">
        <p className="px-4 pt-1 text-center text-[17px] font-semibold">Add a reference photo</p>

        <div className="px-4 pt-4">
          <button
            onClick={() => input.current?.click()}
            className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl bg-card text-secondary"
          >
            {preview ? (
              <img src={preview} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="flex flex-col items-center gap-2 text-[15px]">
                <ImagePlus size={36} strokeWidth={1.5} />
                Choose a photo
              </span>
            )}
          </button>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </div>

        <Group header="What is it?" footer={KINDS.find((k) => k.kind === kind)?.hint}>
          <div className="no-scrollbar flex gap-2 overflow-x-auto p-3">
            {KINDS.map((k) => (
              <button
                key={k.kind}
                onClick={() => setKind(k.kind)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[15px] ${kind === k.kind ? "bg-tint text-white" : "bg-fill"}`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </Group>

        <Group header="Name" footer="The director refers to it by this name in the shot list.">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. cinnamon-latte"
            className="w-full bg-transparent px-4 py-3 text-[17px] outline-none placeholder:text-secondary"
          />
        </Group>

        <div className="px-4">
          <PrimaryButton onClick={upload} disabled={!file || busy}>
            {busy && <Loader2 size={20} className="animate-spin" />}
            {busy ? "Studying the photo…" : "Lock as reference"}
          </PrimaryButton>
          {error && <p className="pt-2 text-center text-[15px] text-ios-red">{error}</p>}
        </div>
      </div>
    </Sheet>
  );
}
