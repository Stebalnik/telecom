import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAdminAnalyticsSummary,
  type AnalyticsRange,
} from "@/lib/adminAnalytics";

function normalizeRange(value: string | null): AnalyticsRange {
  if (value === "1d") return "1d";
  if (value === "7d") return "7d";
  if (value === "30d") return "30d";
  return "all";
}

export async function GET(req: NextRequest) {
  try {
    const range = normalizeRange(req.nextUrl.searchParams.get("range"));

    const supabase = await createClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const summary = await getAdminAnalyticsSummary(range);

    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected analytics error" },
      { status: 500 }
    );
  }
}