/* eslint-disable @next/next/no-img-element */
import { Check, Lock } from "lucide-react";
import type { ClientAsset } from "../project/types";

export function AssetThumb({ asset, selected, onClick }: { asset: ClientAsset; selected?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-20 shrink-0 text-left active:opacity-70">
      <div className={`relative aspect-square overflow-hidden rounded-xl bg-fill ${selected ? "ring-3 ring-tint" : ""}`}>
        <img src={asset.url} alt={asset.name} className="h-full w-full object-cover" />
        {selected ? (
          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-tint text-white">
            <Check size={13} strokeWidth={3} />
          </span>
        ) : (
          asset.locked && <Lock size={12} className="absolute top-1.5 right-1.5 text-white drop-shadow" />
        )}
      </div>
      <p className="truncate pt-1 text-[12px]">{asset.name}</p>
      <p className="text-[11px] text-secondary capitalize">{asset.kind}</p>
    </button>
  );
}
