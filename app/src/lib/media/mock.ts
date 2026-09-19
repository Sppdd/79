// Offline provider: stock placeholder stills, no video/audio. Used when FAL_KEY is not set.
import type { MediaProvider } from "./provider";

const seed = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);

export const mockProvider: MediaProvider = {
  maxVideoShots: 0,
  image: async (prompt) => `https://picsum.photos/seed/${seed(prompt)}/1080/1920`,
  animate: async () => undefined,
  speech: async () => undefined,
  music: async () => undefined,
};
