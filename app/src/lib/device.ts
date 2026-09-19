// Anonymous per-device identity (no login, so judges get instant access). Cookie is set in src/proxy.ts.
import { cookies } from "next/headers";

export const DEVICE_COOKIE = "reel_device";

export async function deviceId(): Promise<string> {
  const id = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!id) throw new Error("Missing device cookie");
  return id;
}
