// The swappable media layer. Workflows only talk to this interface, never to a vendor directly.
import type { Shot } from "../ai/schemas";
import { falProvider } from "./fal";
import { mockProvider } from "./mock";

export interface MediaProvider {
  /** Cost control: shots beyond this many are shown as animated stills instead of generated video. */
  maxVideoShots: number;
  /** Vertical 9:16 still for a shot. `style` lets the provider route to the best model. */
  image(prompt: string, style: Shot["style"]): Promise<string>;
  /** Animate a still into a short clip. Returns undefined if the provider can't do video. */
  animate(imageUrl: string, prompt: string, seconds: number): Promise<string | undefined>;
  speech(text: string): Promise<string | undefined>;
  music(mood: string, seconds: number): Promise<string | undefined>;
}

export function media(): MediaProvider {
  const choice = process.env.MEDIA_PROVIDER ?? (process.env.FAL_KEY ? "fal" : "mock");
  return choice === "fal" ? falProvider : mockProvider;
}
