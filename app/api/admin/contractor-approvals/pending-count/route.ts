import { NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase/server";
import { unwrapSupabase } from "../../../../../lib/errors/unwrapSupabase";
import { withServerErrorLogging } from "../../../../../lib/errors/withServerErrorLogging";

type ProfileRow = {
  id: string;
  role: string | null;
};

export async function GET() {
  try {
    const result = await withServerErrorLogging(
      async () => {
        const supabase = await createServerClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const profileResult = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", user.id)
          .maybeSingle();

        const profile = unwrapSupabase(
          profileResult,
          "admin_contractor_pending_count_profile_load_failed",
          "Unable to load profile."
        ) as ProfileRow | null;

        if (!profile || profile.role !== "admin") {
          return NextResponse.json({ error: "Forbidden." }, { status: 403 });
        }

        const pendingCountResult = await supabase
          .from("contractor_companies")
          .select("id", { count: "exact", head: true })
          .eq("onboarding_status", "submitted");

        if (pendingCountResult.error) {
          throw pendingCountResult.error;
        }

        return NextResponse.json({
          count: pendingCountResult.count ?? 0,
        });
      },
      {
        message: "admin_contractor_pending_count_route_failed",
        code: "admin_contractor_pending_count_route_failed",
        source: "api",
        area: "admin",
        path: "/api/admin/contractor-approvals/pending-count",
        role: "admin",
      }
    );

    return result;
  } catch {
    return NextResponse.json(
      { error: "Unable to load contractor approval count." },
      { status: 500 }
    );
  }
}