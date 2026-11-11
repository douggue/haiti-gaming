import { NextResponse } from "next/server";
import { assertStaff } from "@/lib/session";
import { liveNow } from "@/lib/analytics-report";

/** Admin → Visitors "Live now" box refreshes from here every 30 seconds. */
export async function GET() {
  try {
    await assertStaff("analytics.view");
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return NextResponse.json(await liveNow(), { headers: { "cache-control": "no-store" } });
}
