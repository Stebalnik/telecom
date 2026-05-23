import { NextResponse } from "next/server";
import { getMarketplaceLandingSnapshot } from "@/lib/marketplace/publicData";
import { withServerErrorLogging } from "@/lib/errors/withServerErrorLogging";

function numericCounter(value: string) {
  const parsed = Number.parseInt(value.replace(/,/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET() {
  try {
    const snapshot = await withServerErrorLogging(
      () => getMarketplaceLandingSnapshot(),
      {
        message: "marketplace_stats_load_failed",
        code: "marketplace_stats_load_failed",
        source: "api",
        area: "marketplace",
        path: "/api/marketplace/stats",
      }
    );

    const counterByLabel = new Map(
      snapshot.counters.map((counter) => [
        counter.label.toLowerCase(),
        numericCounter(counter.value),
      ])
    );

    return NextResponse.json({
      success: true,
      data: {
        open_jobs_count: counterByLabel.get("open jobs") ?? 0,
        active_contractors_count: counterByLabel.get("contractors") ?? 0,
        markets_count: counterByLabel.get("markets") ?? 0,
        bids_count: counterByLabel.get("bids") ?? 0,
        recent_activity_count: snapshot.recentActivity.length,
        recent_activity: snapshot.recentActivity,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to load marketplace stats.",
      },
      { status: 500 }
    );
  }
}
