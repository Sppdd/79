// Runs whatever is due: follow-ups, owner alerts, the daily summary. Called by a timer (compose) or a scheduler.
// Protected by CRON_SECRET when set, so a public URL can't be used to spam customers.
import { defaultBusiness, scheduleJob } from "@/db";
import { runDueJobs } from "@/lib/agent/jobs";

export const maxDuration = 300;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // Queue today's summary once per day, at the first run after 20:00 local time.
  const now = new Date();
  if (now.getHours() >= 20 && new URL(request.url).searchParams.get("summary") !== "0") {
    const business = await defaultBusiness();
    await scheduleJob({
      id: `summary-${business.id}-${now.toISOString().slice(0, 10)}`,
      businessId: business.id,
      customerId: null,
      kind: "daily_summary",
      runAt: now,
      payload: {},
    }).catch(() => {}); // the id makes it idempotent — a duplicate insert just means it's already queued
  }

  return Response.json(await runDueJobs());
}
