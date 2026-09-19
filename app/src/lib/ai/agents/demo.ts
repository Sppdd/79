// Demo outputs used when NEBIUS_API_KEY is not set, so the whole app runs offline for UI work and tests.
import type { AdCopy, BrandKit, Brief, ShotList } from "../schemas";
import type { AssetRef } from "./director";

export function demoBrief(notes: string, brand: BrandKit): Brief {
  const firstLine = notes.split("\n")[0]?.trim() || "Our new special";
  const price = notes.match(/\$\s?\d+(?:\.\d{2})?/)?.[0];
  return {
    product: firstLine,
    offer: `${firstLine}${price ? ` for ${price}` : ""}`,
    price,
    audience: brand.audience,
    goal: "sales",
    cta: "Order now",
    keyPoints: notes.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).slice(0, 4),
  };
}

export function demoShotList(brief: Brief, assets: AssetRef[], targetSec: number): ShotList {
  const product = assets.find((a) => a.kind === "product")?.name;
  const refs = product ? [product] : [];
  const perShot = Math.min(5, Math.max(2, Math.round(targetSec / 6)));
  return {
    title: `${brief.product} — spot`,
    logline: `One moment with ${brief.product} changes the whole day.`,
    stylePrefix: {
      look: "high-budget commercial, photoreal, crisp detail",
      lighting: "soft bright daylight from camera side",
      camera: "35mm, shallow depth of field, smooth gimbal moves",
      color: "clean whites with warm accents, gentle contrast",
      avoid: "on-screen text, fake logos, warped hands, extra products",
    },
    scenes: [
      {
        number: 1,
        title: "Hook",
        location: "sunlit kitchen counter",
        shots: [
          { id: "1A", beat: "Macro reveal of the product", prompt: `extreme close-up of ${brief.product} on a marble counter`, references: refs, camera: "slow push-in", motion: ["steam curls up", "light sweeps across the surface"], durationSec: perShot, transition: "cut" },
          { id: "1B", beat: "A hand reaches in", prompt: `a hand picks up ${brief.product}`, references: refs, camera: "top-down", motion: ["hand enters from right", "lifts the product", "exits frame"], durationSec: perShot, transition: "cut", continuity: "same product position as 1A" },
        ],
      },
      {
        number: 2,
        title: "Payoff",
        location: "bright living room",
        shots: [
          { id: "2A", beat: "Enjoying the product", prompt: `a person relaxes on a sofa with ${brief.product}`, references: refs, camera: "orbit left", motion: ["sits back", "smiles to camera", "raises the product slightly"], durationSec: perShot, transition: "match-cut" },
          { id: "2B", beat: "Packshot", prompt: `${brief.product} centered on a clean surface`, references: refs, camera: "slow orbit", motion: ["product rotates a quarter turn"], durationSec: perShot, transition: "dissolve" },
        ],
      },
    ],
    music: { mood: "upbeat modern pop", bpm: 110, notes: "cut on every second beat" },
    endCard: { headline: brief.offer, cta: brief.cta },
  };
}

export function demoAdCopy(brief: Brief): AdCopy {
  return {
    caption: `${brief.offer} ✨ ${brief.cta}!`,
    hashtags: ["#smallbusiness", "#shoplocal", "#new"],
    variants: [
      { headline: brief.offer, primaryText: `Don't miss it — ${brief.offer}.`, cta: brief.cta },
      { headline: `Why everyone's talking about ${brief.product}`, primaryText: brief.keyPoints.join(" · "), cta: brief.cta },
      { headline: `Limited time only`, primaryText: `${brief.product} won't be here forever.`, cta: brief.cta },
    ],
  };
}
