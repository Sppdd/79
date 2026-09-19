import { NextResponse, type NextRequest } from "next/server";
import { DEVICE_COOKIE } from "@/lib/device";

// Gives every visitor a stable anonymous device id so their Brand Kit and Reels persist.
export function proxy(request: NextRequest) {
  if (request.cookies.has(DEVICE_COOKIE)) return NextResponse.next();

  const id = crypto.randomUUID();
  request.cookies.set(DEVICE_COOKIE, id); // visible to this request's handlers
  const res = NextResponse.next({ request });
  res.cookies.set(DEVICE_COOKIE, id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/" });
  return res;
}

export const config = {
  matcher: ["/((?!_next/|api/render/callback|.well-known/workflow|favicon|icons/|manifest).*)"],
};
