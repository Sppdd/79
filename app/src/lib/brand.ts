import type { BrandKit } from "./ai/schemas";

/** Used until the owner fills in their Brand Kit, so the first Reel works immediately. */
export const defaultBrand: BrandKit = {
  name: "My Business",
  industry: "local café",
  voice: "warm, friendly, a little playful",
  audience: "locals aged 20–45 who love good coffee",
  primaryColor: "#FF6B35",
};
